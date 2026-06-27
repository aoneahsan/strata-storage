package com.stratastorage;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.strata.storage.SharedPreferencesStorage;
import com.strata.storage.EncryptedStorage;
import com.strata.storage.FilesystemStorage;
import com.strata.storage.SQLiteStorage;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Main Capacitor plugin for Strata Storage
 * Coordinates between different storage types on Android.
 *
 * Storage types with a real native backend: preferences, secure, sqlite,
 * filesystem.
 *
 * SQLite supports multi-store: the `database` option selects the DB file and
 * `table` selects the table within it. SQLite helper instances are cached per
 * database name so the connection is not reopened per call.
 */
@CapacitorPlugin(name = "StrataStorage")
public class StrataStoragePlugin extends Plugin {
    private static final String DEFAULT_DATABASE = "strata_storage";
    private static final String DEFAULT_TABLE = "storage";

    /** Strict SQL-identifier allow-list for the database file stem. */
    private static final Pattern SQLITE_IDENTIFIER = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

    private SharedPreferencesStorage sharedPrefsStorage;
    private EncryptedStorage encryptedStorage;
    private FilesystemStorage filesystemStorage;

    /** SQLite helper cache keyed by resolved database name (without ".db"). */
    private final Map<String, SQLiteStorage> sqliteStores = new HashMap<>();

    @Override
    public void load() {
        try {
            sharedPrefsStorage = new SharedPreferencesStorage(getContext());
        } catch (Exception e) {
            Log.e("StrataStorage", "Failed to initialize preferences storage", e);
        }
        try {
            encryptedStorage = new EncryptedStorage(getContext());
        } catch (Exception e) {
            // Secure storage may be unavailable on some devices/keystores —
            // keep the rest of the plugin functional.
            Log.e("StrataStorage", "Failed to initialize encrypted storage", e);
        }
        try {
            filesystemStorage = new FilesystemStorage(getContext());
        } catch (Exception e) {
            Log.e("StrataStorage", "Failed to initialize filesystem storage", e);
        }
    }

    /**
     * Validate a database name as a strict SQL identifier
     * ({@code ^[A-Za-z_][A-Za-z0-9_]*$}) and return it as the file stem. The
     * ".db" suffix is appended when opening. A null/empty name resolves to the
     * default; any other non-conforming name is REJECTED rather than silently
     * stripped (the TS adapter applies the same allow-list and rejects first —
     * this is defense-in-depth, and also blocks path separators / traversal).
     */
    private static String sanitizeDatabase(String database) {
        if (database == null || database.isEmpty()) {
            return DEFAULT_DATABASE;
        }
        if (!SQLITE_IDENTIFIER.matcher(database).matches()) {
            throw new IllegalArgumentException("Invalid SQLite database name: " + database);
        }
        return database;
    }

    /**
     * Return (creating + caching on first use) the SQLite helper for the given
     * database name. The cache is keyed by the validated DB stem so the
     * connection is reused across bridge calls. Returns {@code null} if the name
     * is invalid or the helper cannot be constructed — callers reject the call.
     */
    private synchronized SQLiteStorage getSqliteStore(String database) {
        final String dbStem;
        try {
            dbStem = sanitizeDatabase(database);
        } catch (IllegalArgumentException e) {
            Log.e("StrataStorage", "Invalid SQLite database name", e);
            return null;
        }
        SQLiteStorage store = sqliteStores.get(dbStem);
        if (store == null) {
            try {
                store = new SQLiteStorage(getContext(), dbStem + ".db");
                sqliteStores.put(dbStem, store);
            } catch (Exception e) {
                Log.e("StrataStorage", "Failed to open SQLite database " + dbStem, e);
                return null;
            }
        }
        return store;
    }

    /**
     * Check if a specific storage type is available.
     * Matches the JS contract: resolves { available: boolean }.
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        boolean available;
        switch (storage) {
            case "secure":
                available = encryptedStorage != null;
                break;
            case "sqlite":
                available = getSqliteStore(call.getString("database", DEFAULT_DATABASE)) != null;
                break;
            case "filesystem":
                available = filesystemStorage != null;
                break;
            case "preferences":
            default:
                available = sharedPrefsStorage != null;
                break;
        }

        JSObject result = new JSObject();
        result.put("available", available);
        call.resolve(result);
    }

    /**
     * Get value from storage.
     *
     * For sqlite/filesystem the resolved `value` is the full wrapper object
     * (parsed back from JSON). A miss resolves `value` = null.
     */
    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        String storage = call.getString("storage", "preferences");

        try {
            switch (storage) {
                case "secure": {
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    resolveValue(call, encryptedStorage.get(key));
                    return;
                }
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    String table = call.getString("table", DEFAULT_TABLE);
                    resolveValue(call, store.get(table, key));
                    return;
                }
                case "filesystem": {
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    resolveValue(call, filesystemStorage.get(key));
                    return;
                }
                case "preferences":
                default: {
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    resolveValue(call, sharedPrefsStorage.get(key));
                    return;
                }
            }
        } catch (Exception e) {
            call.reject("Failed to get value", e);
        }
    }

    /**
     * Resolve a get() call, mapping a Java {@code null} to a JS {@code null}
     * value so the TS adapters treat it as a miss.
     */
    private void resolveValue(PluginCall call, Object value) {
        JSObject result = new JSObject();
        if (value == null) {
            result.put("value", JSObject.NULL);
        } else if (value instanceof String) {
            // preferences/secure persist the full StorageValue wrapper as a JSON
            // string; parse it back to an object so TTL/tags/metadata round-trip
            // (matching the sqlite/filesystem contract). Legacy/plain strings are
            // returned unchanged.
            result.put("value", parseWrapperOrRaw((String) value));
        } else {
            result.put("value", value);
        }
        call.resolve(result);
    }

    /** Parse a stored JSON-object wrapper string back into a {@link JSObject};
     * return the raw string for non-JSON-object payloads. */
    private Object parseWrapperOrRaw(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("{")) {
            try {
                return new JSObject(raw);
            } catch (JSONException ignored) {
                // Not a JSON object — fall through and return the raw string.
            }
        }
        return raw;
    }

    /**
     * Set value in storage.
     *
     * For sqlite/filesystem the `value` is the FULL wrapper object
     * ({ value, created, updated, expires?, tags?, metadata? }); it is read via
     * call.getObject("value") and stored verbatim (with TTL/query columns
     * extracted for sqlite). For preferences/secure the raw value is forwarded
     * unchanged.
     */
    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        String storage = call.getString("storage", "preferences");

        try {
            boolean ok;
            switch (storage) {
                case "secure":
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    ok = encryptedStorage.set(key, call.getData().opt("value"));
                    break;
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    JSObject wrapper = call.getObject("value");
                    if (wrapper == null) {
                        call.reject("A wrapper object 'value' is required for sqlite storage");
                        return;
                    }
                    ok = store.set(call.getString("table", DEFAULT_TABLE), key, wrapper);
                    break;
                }
                case "filesystem": {
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    JSObject wrapper = call.getObject("value");
                    if (wrapper == null) {
                        call.reject("A wrapper object 'value' is required for filesystem storage");
                        return;
                    }
                    ok = filesystemStorage.set(key, wrapper);
                    break;
                }
                case "preferences":
                default:
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    ok = sharedPrefsStorage.set(key, call.getData().opt("value"));
                    break;
            }

            if (!ok) {
                call.reject("Failed to persist value to " + storage + " storage");
                return;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set value", e);
        }
    }

    /**
     * Remove value from storage
     */
    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        String storage = call.getString("storage", "preferences");

        try {
            switch (storage) {
                case "secure":
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    encryptedStorage.remove(key);
                    break;
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    store.remove(call.getString("table", DEFAULT_TABLE), key);
                    break;
                }
                case "filesystem":
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    filesystemStorage.remove(key);
                    break;
                case "preferences":
                default:
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    sharedPrefsStorage.remove(key);
                    break;
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to remove value", e);
        }
    }

    /**
     * Clear storage.
     * Accepts the JS `pattern` (used as a key prefix) and a legacy `prefix`.
     */
    @PluginMethod
    public void clear(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        String prefix = call.getString("pattern");
        if (prefix == null) {
            prefix = call.getString("prefix");
        }

        try {
            switch (storage) {
                case "secure":
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    encryptedStorage.clear(prefix);
                    break;
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    store.clear(call.getString("table", DEFAULT_TABLE), prefix);
                    break;
                }
                case "filesystem":
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    filesystemStorage.clear(prefix);
                    break;
                case "preferences":
                default:
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    sharedPrefsStorage.clear(prefix);
                    break;
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to clear storage", e);
        }
    }

    /**
     * Get all keys from storage
     */
    @PluginMethod
    public void keys(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        String pattern = call.getString("pattern");

        try {
            List<String> keys;

            switch (storage) {
                case "secure":
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    keys = encryptedStorage.keys(pattern);
                    break;
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    keys = store.keys(call.getString("table", DEFAULT_TABLE), pattern);
                    break;
                }
                case "filesystem":
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    keys = filesystemStorage.keys(pattern);
                    break;
                case "preferences":
                default:
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    keys = sharedPrefsStorage.keys(pattern);
                    break;
            }

            JSObject result = new JSObject();
            result.put("keys", new JSONArray(keys));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get keys", e);
        }
    }

    /**
     * Get storage size information.
     *
     * When `detailed` is true the result also carries a byte breakdown
     * { detailed: { keys, values, metadata } }.
     */
    @PluginMethod
    public void size(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        boolean detailed = Boolean.TRUE.equals(call.getBoolean("detailed", false));

        try {
            JSObject result = new JSObject();

            switch (storage) {
                case "secure": {
                    if (encryptedStorage == null) {
                        call.reject("Encrypted storage not available");
                        return;
                    }
                    EncryptedStorage.SizeInfo encryptedSizeInfo = encryptedStorage.size();
                    result.put("total", encryptedSizeInfo.total);
                    result.put("count", encryptedSizeInfo.count);
                    break;
                }
                case "sqlite": {
                    SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
                    if (store == null) {
                        call.reject("SQLite storage not available");
                        return;
                    }
                    SQLiteStorage.SizeInfo sqliteSizeInfo =
                            store.size(call.getString("table", DEFAULT_TABLE), detailed);
                    putSizeInfo(result, sqliteSizeInfo);
                    break;
                }
                case "filesystem": {
                    if (filesystemStorage == null) {
                        call.reject("Filesystem storage not available");
                        return;
                    }
                    SQLiteStorage.SizeInfo fsSizeInfo = filesystemStorage.size(detailed);
                    putSizeInfo(result, fsSizeInfo);
                    break;
                }
                case "preferences":
                default: {
                    if (sharedPrefsStorage == null) {
                        call.reject("Preferences storage not available");
                        return;
                    }
                    SharedPreferencesStorage.SizeInfo prefsSizeInfo = sharedPrefsStorage.size();
                    result.put("total", prefsSizeInfo.total);
                    result.put("count", prefsSizeInfo.count);
                    break;
                }
            }

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get size", e);
        }
    }

    /**
     * Populate a size result, including the detailed byte breakdown when the
     * {@link SQLiteStorage.SizeInfo} carries one.
     */
    private void putSizeInfo(JSObject result, SQLiteStorage.SizeInfo info) {
        result.put("total", info.total);
        result.put("count", info.count);
        if (info.detailed) {
            JSObject breakdown = new JSObject();
            breakdown.put("keys", info.keysBytes);
            breakdown.put("values", info.valuesBytes);
            breakdown.put("metadata", info.metadataBytes);
            result.put("detailed", breakdown);
        }
    }

    /**
     * Query SQLite-backed storage.
     * Matches the optional `query` method in the JS contract: resolves
     * { results: [{ key, value }] } where `value` is the full StorageValue
     * wrapper for each non-expired row, so the JS SqliteAdapter can apply the
     * condition in one round-trip without re-fetching each key.
     */
    @PluginMethod
    public void query(PluginCall call) {
        String storage = call.getString("storage", "sqlite");
        if (!"sqlite".equals(storage)) {
            call.reject("Query is only supported for the 'sqlite' storage type");
            return;
        }
        SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
        if (store == null) {
            call.reject("SQLite storage not available");
            return;
        }

        try {
            List<Map<String, Object>> rows = store.query(call.getString("table", DEFAULT_TABLE));
            JSArray results = new JSArray();
            for (Map<String, Object> row : rows) {
                JSObject obj = new JSObject();
                obj.put("key", row.get("key"));
                Object value = row.get("value");
                if (value != null) {
                    obj.put("value", value);
                }
                results.put(obj);
            }
            JSObject result = new JSObject();
            result.put("results", results);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to query SQLite", e);
        }
    }

    /**
     * Delete every expired row for a SQLite store in one statement and resolve
     * { removed: <count> }. The JS adapter calls this on its TTL cleanup tick,
     * since keys()/query() now exclude expired rows in SQL (no per-key delete).
     */
    @PluginMethod
    public void cleanupExpired(PluginCall call) {
        String storage = call.getString("storage", "sqlite");
        if (!"sqlite".equals(storage)) {
            call.reject("cleanupExpired is only supported for the 'sqlite' storage type");
            return;
        }
        SQLiteStorage store = getSqliteStore(call.getString("database", DEFAULT_DATABASE));
        if (store == null) {
            call.reject("SQLite storage not available");
            return;
        }
        try {
            int removed = store.cleanupExpired(call.getString("table", DEFAULT_TABLE));
            JSObject result = new JSObject();
            result.put("removed", removed);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to clean up expired SQLite rows", e);
        }
    }

    /**
     * Android-specific: read an encrypted preference.
     * Resolves { value: unknown }. Honors an optional `fileName`.
     */
    @PluginMethod
    public void getEncryptedPreference(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }
        String fileName = call.getString("fileName");

        try {
            EncryptedStorage store = resolveEncryptedStore(fileName);
            if (store == null) {
                call.reject("Encrypted storage not available");
                return;
            }
            JSObject result = new JSObject();
            result.put("value", store.get(key));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to read encrypted preference", e);
        }
    }

    /**
     * Android-specific: write an encrypted preference. Honors an optional
     * `fileName`.
     */
    @PluginMethod
    public void setEncryptedPreference(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }
        Object value = call.getData().opt("value");
        String fileName = call.getString("fileName");

        try {
            EncryptedStorage store = resolveEncryptedStore(fileName);
            if (store == null) {
                call.reject("Encrypted storage not available");
                return;
            }
            if (!store.set(key, value)) {
                call.reject("Failed to persist encrypted preference");
                return;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to write encrypted preference", e);
        }
    }

    /**
     * Returns the default encrypted store, or builds a file-specific one when a
     * custom file name is supplied.
     */
    private EncryptedStorage resolveEncryptedStore(String fileName) throws Exception {
        if (fileName == null || fileName.isEmpty()) {
            return encryptedStorage;
        }
        return new EncryptedStorage(getContext(), fileName);
    }
}
