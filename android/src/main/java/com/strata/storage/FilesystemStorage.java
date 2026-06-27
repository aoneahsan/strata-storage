package com.strata.storage;

import android.content.Context;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.json.JSONException;

/**
 * Filesystem-backed storage. One file per key lives under
 * {@code <filesDir>/strata_storage}. The file name is a reversible
 * URL-encoding of the key (no path separators survive encoding) and the file
 * contents are the JSON-serialized FULL wrapper object ({@code value, created,
 * updated, expires?, tags?, metadata?}), mirroring the SQLite value-shape
 * contract.
 *
 * <p>Writes are atomic: a temp file is written then renamed over the target.
 * All access is synchronized on the instance so overlapping bridge calls are
 * safe.
 */
public class FilesystemStorage {
    private static final String DIR_NAME = "strata_storage";
    private static final String ENCODING = "UTF-8";
    /**
     * Reserved subdirectory (inside the storage dir) that holds in-flight temp
     * files for atomic writes. Because it is a directory, the file-only
     * enumeration in keys()/size()/clear() skips it automatically, and temp
     * names therefore can never collide with an encoded key file in the storage
     * dir (e.g. a real key {@code "backup.tmp"}).
     */
    private static final String STAGING_DIR_NAME = ".strata-staging";

    private final File baseDir;
    private final File stagingDir;

    public FilesystemStorage(Context context) {
        this.baseDir = new File(context.getFilesDir(), DIR_NAME);
        this.stagingDir = new File(baseDir, STAGING_DIR_NAME);
        ensureDir();
    }

    private synchronized void ensureDir() {
        if (!baseDir.exists()) {
            // mkdirs() returns false if it already exists due to a race; the
            // subsequent exists() check below is the real guard.
            baseDir.mkdirs();
        }
        if (!stagingDir.exists()) {
            stagingDir.mkdirs();
        }
    }

    /** Reversibly encode a key into a path-separator-free file name. */
    private static String encodeKey(String key) {
        try {
            return URLEncoder.encode(key, ENCODING);
        } catch (Exception e) {
            // UTF-8 is always supported; fall back defensively.
            return key.replaceAll("[^A-Za-z0-9_-]", "_");
        }
    }

    /** Inverse of {@link #encodeKey(String)}. */
    private static String decodeKey(String fileName) {
        try {
            return URLDecoder.decode(fileName, ENCODING);
        } catch (Exception e) {
            return fileName;
        }
    }

    private File fileForKey(String key) {
        return new File(baseDir, encodeKey(key));
    }

    /**
     * Read + parse the full wrapper for {@code key}. Missing file → {@code null}.
     * Unparseable contents → {@code null} (treated as a miss; never throws).
     */
    public synchronized JSObject get(String key) {
        File file = fileForKey(key);
        if (!file.exists() || !file.isFile()) {
            return null;
        }
        try {
            String json = readFile(file);
            return new JSObject(json);
        } catch (JSONException parseError) {
            Log.w("StrataStorage", "Unparseable filesystem value for key " + key);
            return null;
        } catch (IOException ioError) {
            Log.e("StrataStorage", "Failed to read filesystem value for key " + key, ioError);
            return null;
        }
    }

    /**
     * Atomically persist the full wrapper for {@code key}: write a temp file
     * then rename it over the destination.
     */
    public synchronized boolean set(String key, JSObject wrapper) {
        if (wrapper == null) {
            return false;
        }
        ensureDir();
        File target = fileForKey(key);
        // Temp file lives in the staging subdir (same filesystem → atomic
        // rename) with a UUID name, so it can never collide with a key file.
        File tmp = new File(stagingDir, UUID.randomUUID().toString() + ".tmp");
        FileOutputStream fos = null;
        try {
            fos = new FileOutputStream(tmp);
            fos.write(wrapper.toString().getBytes(StandardCharsets.UTF_8));
            fos.flush();
            fos.getFD().sync();
            fos.close();
            fos = null;

            // Commit the temp file over the target WITHOUT a delete-then-rename
            // window (which could lose the existing value if the rename failed).
            return commitAtomically(tmp, target, key);
        } catch (IOException e) {
            Log.e("StrataStorage", "Failed to set filesystem value for key " + key, e);
            if (tmp.exists()) {
                tmp.delete();
            }
            return false;
        } finally {
            if (fos != null) {
                try {
                    fos.close();
                } catch (IOException ignored) {
                    // best-effort close
                }
            }
        }
    }

    /**
     * Commit {@code tmp} over {@code target} without ever leaving the key with no
     * value. The old delete-then-rename approach could lose the existing value
     * if the rename failed after the delete succeeded.
     *
     * <p>Strategy: on API 26+ use an atomic NIO move (REPLACE_EXISTING +
     * ATOMIC_MOVE). Otherwise try a direct {@code renameTo} (which atomically
     * replaces on app-internal ext4/f2fs); only if that fails do we move the old
     * value aside to a backup, swap in the new one, and restore the backup if the
     * final rename fails — so the old value is never destroyed before the new one
     * is committed.
     */
    private boolean commitAtomically(File tmp, File target, String key) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                java.nio.file.Files.move(
                    tmp.toPath(),
                    target.toPath(),
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING,
                    java.nio.file.StandardCopyOption.ATOMIC_MOVE);
                return true;
            } catch (Exception nioError) {
                Log.w("StrataStorage", "Atomic NIO move failed, falling back for key " + key, nioError);
                // fall through to the legacy strategy
            }
        }

        // Direct rename — atomic replace on POSIX/ext4 internal storage.
        if (tmp.renameTo(target)) {
            return true;
        }

        // Rename-over-existing failed: move the old value aside first.
        File backup = null;
        if (target.exists()) {
            backup = new File(stagingDir, UUID.randomUUID().toString() + ".bak");
            if (!target.renameTo(backup)) {
                // Could not preserve the old value — abort without data loss.
                tmp.delete();
                return false;
            }
        }

        if (tmp.renameTo(target)) {
            if (backup != null) {
                backup.delete();
            }
            return true;
        }

        // New value did not land — restore the old value from backup.
        if (backup != null && backup.renameTo(target)) {
            Log.w("StrataStorage", "Restored previous value after failed write for key " + key);
        }
        tmp.delete();
        return false;
    }

    public synchronized boolean remove(String key) {
        File file = fileForKey(key);
        if (!file.exists()) {
            return false;
        }
        return file.delete();
    }

    /**
     * Delete all stored entries. {@code prefix}, when non-null, restricts the
     * delete to keys whose (decoded) name starts with the prefix.
     */
    public synchronized boolean clear(String prefix) {
        File[] files = baseDir.listFiles();
        if (files == null) {
            return true;
        }
        boolean ok = true;
        for (File file : files) {
            // Skips the staging subdirectory (and any other non-file entry).
            if (!file.isFile()) {
                continue;
            }
            if (prefix == null || decodeKey(file.getName()).startsWith(prefix)) {
                if (!file.delete()) {
                    ok = false;
                }
            }
        }
        // On a full clear, also drop any orphaned in-flight temp files.
        if (prefix == null) {
            File[] temps = stagingDir.listFiles();
            if (temps != null) {
                for (File t : temps) {
                    t.delete();
                }
            }
        }
        return ok;
    }

    public synchronized List<String> keys(String pattern) {
        List<String> keys = new ArrayList<>();
        File[] files = baseDir.listFiles();
        if (files == null) {
            return keys;
        }
        for (File file : files) {
            // Skips the staging subdirectory (and any other non-file entry).
            if (!file.isFile()) {
                continue;
            }
            String key = decodeKey(file.getName());
            if (pattern == null || key.contains(pattern)) {
                keys.add(key);
            }
        }
        return keys;
    }

    public synchronized boolean has(String key) {
        File file = fileForKey(key);
        return file.exists() && file.isFile();
    }

    /**
     * Size information. {@code total} = {@code keys} + {@code values} (matching
     * the web adapters' convention), {@code values} = Σ file byte sizes,
     * {@code keys} = Σ decoded-key byte lengths, {@code metadata} = Σ length of
     * the parsed {@code metadata} field (0 when absent or unparseable),
     * {@code count} = number of stored files. The detailed breakdown is only
     * surfaced to JS when {@code detailed} is true.
     */
    public synchronized SQLiteStorage.SizeInfo size(boolean detailed) {
        File[] files = baseDir.listFiles();
        long valuesBytes = 0;
        long keysBytes = 0;
        long metadataBytes = 0;
        int count = 0;

        if (files != null) {
            for (File file : files) {
                // Skips the staging subdirectory (and any other non-file entry).
                if (!file.isFile()) {
                    continue;
                }
                count++;
                valuesBytes += file.length();
                keysBytes += decodeKey(file.getName()).getBytes(StandardCharsets.UTF_8).length;
                if (detailed) {
                    metadataBytes += metadataByteLength(file);
                }
            }
        }

        if (!detailed) {
            return new SQLiteStorage.SizeInfo(keysBytes + valuesBytes, count);
        }
        return new SQLiteStorage.SizeInfo(keysBytes + valuesBytes, count, keysBytes, valuesBytes, metadataBytes);
    }

    /** Parse the file and return the byte length of its {@code metadata} field. */
    private long metadataByteLength(File file) {
        try {
            JSObject wrapper = new JSObject(readFile(file));
            Object metadata = wrapper.opt("metadata");
            if (metadata != null && metadata != org.json.JSONObject.NULL) {
                return metadata.toString().getBytes(StandardCharsets.UTF_8).length;
            }
        } catch (Exception ignored) {
            // Unparseable → contributes 0 metadata bytes.
        }
        return 0;
    }

    private String readFile(File file) throws IOException {
        byte[] data = new byte[(int) file.length()];
        java.io.FileInputStream fis = null;
        try {
            fis = new java.io.FileInputStream(file);
            int offset = 0;
            int read;
            while (offset < data.length
                    && (read = fis.read(data, offset, data.length - offset)) != -1) {
                offset += read;
            }
        } finally {
            if (fis != null) {
                fis.close();
            }
        }
        return new String(data, StandardCharsets.UTF_8);
    }
}
