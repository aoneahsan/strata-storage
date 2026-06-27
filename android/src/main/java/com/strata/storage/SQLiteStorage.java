package com.strata.storage;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;
import com.getcapacitor.JSObject;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * SQLite-backed storage. One {@link SQLiteStorage} instance maps to a single
 * database file (one {@link SQLiteOpenHelper}). A single instance can serve
 * multiple logical tables: every public method takes a sanitized {@code table}
 * name and the table is created on first use via {@code CREATE TABLE IF NOT
 * EXISTS}.
 *
 * <p>Value-shape contract (matches the TS {@code SqliteAdapter}): {@code set}
 * receives the FULL wrapper object ({@code value, created, updated, expires?,
 * tags?, metadata?}). The entire wrapper is JSON-serialized into the
 * {@code value} column for round-trip fidelity, while {@code created},
 * {@code updated}, {@code expires}, {@code tags} and {@code metadata} are also
 * extracted into their own columns for TTL + query support. {@code get} parses
 * the {@code value} column back into a {@link JSObject} wrapper.
 *
 * <p>All database access is synchronized on the instance so overlapping bridge
 * calls cannot corrupt the connection.
 */
public class SQLiteStorage extends SQLiteOpenHelper {
    private static final int DATABASE_VERSION = 1;
    private static final String DEFAULT_TABLE = "storage";

    private static final String KEY_ID = "key";
    private static final String KEY_VALUE = "value";
    private static final String KEY_CREATED = "created";
    private static final String KEY_UPDATED = "updated";
    private static final String KEY_EXPIRES = "expires";
    private static final String KEY_TAGS = "tags";
    private static final String KEY_METADATA = "metadata";

    /** Strict SQL-identifier allow-list for table names (cannot be bound). */
    private static final Pattern IDENTIFIER = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

    /** Tables already created in this DB during the process lifetime. */
    private final Set<String> ensuredTables = new HashSet<>();

    /**
     * @param context  Android context
     * @param dbName    fully-resolved database file name (already sanitized +
     *                  suffixed with ".db" by the plugin)
     */
    public SQLiteStorage(Context context, String dbName) {
        super(context, dbName, null, DATABASE_VERSION);
    }

    /**
     * Validate a table name as a strict SQL identifier
     * ({@code ^[A-Za-z_][A-Za-z0-9_]*$}). Table names cannot be passed as bound
     * parameters in SQLite, so they MUST be validated before being interpolated
     * into DDL/DML. A null/empty name resolves to the default table; any other
     * non-conforming name is REJECTED ({@link IllegalArgumentException}) rather
     * than silently stripped — the TS adapter applies the same allow-list and
     * rejects before the call ever reaches here, so this is defense-in-depth
     * against a direct-plugin caller.
     */
    public static String sanitizeTable(String table) {
        if (table == null || table.isEmpty()) {
            return DEFAULT_TABLE;
        }
        if (!IDENTIFIER.matcher(table).matches()) {
            throw new IllegalArgumentException(
                    "Invalid SQLite table name: " + table
                    + " (must match ^[A-Za-z_][A-Za-z0-9_]*$)");
        }
        return table;
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Tables are created lazily per (database, table) via ensureTable().
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // No destructive migrations: tables are created on demand and persist.
    }

    /**
     * Create the table for {@code safeTable} if it does not yet exist. Caller
     * MUST pass an already-sanitized identifier.
     */
    private void ensureTable(SQLiteDatabase db, String safeTable) {
        if (ensuredTables.contains(safeTable)) {
            return;
        }
        String createTable = "CREATE TABLE IF NOT EXISTS " + safeTable + "("
                + KEY_ID + " TEXT PRIMARY KEY,"
                + KEY_VALUE + " TEXT NOT NULL,"
                + KEY_CREATED + " INTEGER NOT NULL,"
                + KEY_UPDATED + " INTEGER NOT NULL,"
                + KEY_EXPIRES + " INTEGER,"
                + KEY_TAGS + " TEXT,"
                + KEY_METADATA + " TEXT" + ")";
        db.execSQL(createTable);
        ensuredTables.add(safeTable);
    }

    /**
     * Persist the full wrapper for {@code key}. The wrapper is stored verbatim
     * as JSON in the {@code value} column; {@code created}/{@code updated}/
     * {@code expires}/{@code tags}/{@code metadata} are mirrored into columns
     * for TTL + query.
     *
     * @param wrapper the full {@link StorageValue} wrapper as a {@link JSObject}
     */
    public synchronized boolean set(String table, String key, JSObject wrapper) {
        if (wrapper == null) {
            return false;
        }
        String safeTable = sanitizeTable(table);
        long now = System.currentTimeMillis();

        // Column extraction for TTL + query. Defaults keep legacy fidelity.
        long created = wrapper.optLong(KEY_CREATED, now);
        long updated = wrapper.optLong(KEY_UPDATED, now);

        ContentValues values = new ContentValues();
        values.put(KEY_ID, key);
        values.put(KEY_VALUE, wrapper.toString());
        values.put(KEY_CREATED, created);
        values.put(KEY_UPDATED, updated);

        if (wrapper.has(KEY_EXPIRES) && !wrapper.isNull(KEY_EXPIRES)) {
            values.put(KEY_EXPIRES, wrapper.optLong(KEY_EXPIRES));
        }
        // tags / metadata are stored as their JSON text for query use.
        Object tags = wrapper.opt(KEY_TAGS);
        if (tags != null && tags != JSONObject.NULL) {
            values.put(KEY_TAGS, tags.toString());
        }
        Object metadata = wrapper.opt(KEY_METADATA);
        if (metadata != null && metadata != JSONObject.NULL) {
            values.put(KEY_METADATA, metadata.toString());
        }

        try {
            SQLiteDatabase db = getWritableDatabase();
            ensureTable(db, safeTable);
            long result = db.insertWithOnConflict(
                    safeTable, null, values, SQLiteDatabase.CONFLICT_REPLACE);
            return result != -1;
        } catch (Exception e) {
            Log.e("StrataStorage", "Failed to set value in SQLite", e);
            return false;
        }
    }

    /**
     * Read the full wrapper for {@code key}, parsed back from the JSON stored in
     * the {@code value} column. Missing row → {@code null}. Unparseable legacy
     * bytes → {@code null} (treated as a miss; never throws).
     */
    public synchronized JSObject get(String table, String key) {
        String safeTable = sanitizeTable(table);
        SQLiteDatabase db = getReadableDatabase();
        ensureTable(db, safeTable);
        Cursor cursor = null;
        try {
            cursor = db.query(safeTable, new String[]{KEY_VALUE}, KEY_ID + "=?",
                    new String[]{key}, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                String stored = cursor.getString(0);
                if (stored == null) {
                    return null;
                }
                try {
                    return new JSObject(stored);
                } catch (JSONException parseError) {
                    // Legacy / corrupted payload: treat as a miss rather than throw.
                    Log.w("StrataStorage", "Unparseable SQLite value for key " + key);
                    return null;
                }
            }
            return null;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    public synchronized boolean remove(String table, String key) {
        String safeTable = sanitizeTable(table);
        SQLiteDatabase db = getWritableDatabase();
        ensureTable(db, safeTable);
        int result = db.delete(safeTable, KEY_ID + " = ?", new String[]{key});
        return result > 0;
    }

    public synchronized boolean clear(String table, String prefix) {
        String safeTable = sanitizeTable(table);
        SQLiteDatabase db = getWritableDatabase();
        ensureTable(db, safeTable);
        int result;
        if (prefix != null) {
            result = db.delete(safeTable, KEY_ID + " LIKE ?", new String[]{prefix + "%"});
        } else {
            result = db.delete(safeTable, null, null);
        }
        return result >= 0;
    }

    public synchronized List<String> keys(String table, String pattern) {
        String safeTable = sanitizeTable(table);
        long now = System.currentTimeMillis();
        List<String> keys = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        ensureTable(db, safeTable);
        Cursor cursor = null;
        // Exclude expired rows in SQL so the TS adapter does not need a per-key
        // get() to drop them (eliminates the keys() N+1).
        String notExpired = "(" + KEY_EXPIRES + " IS NULL OR " + KEY_EXPIRES + " > ?)";
        String nowArg = String.valueOf(now);
        try {
            if (pattern != null) {
                cursor = db.query(safeTable, new String[]{KEY_ID},
                        KEY_ID + " LIKE ? AND " + notExpired,
                        new String[]{"%" + pattern + "%", nowArg}, null, null, null, null);
            } else {
                cursor = db.query(safeTable, new String[]{KEY_ID},
                        notExpired, new String[]{nowArg}, null, null, null, null);
            }
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    keys.add(cursor.getString(0));
                } while (cursor.moveToNext());
            }
            return keys;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    public synchronized boolean has(String table, String key) {
        String safeTable = sanitizeTable(table);
        SQLiteDatabase db = getReadableDatabase();
        ensureTable(db, safeTable);
        Cursor cursor = null;
        try {
            cursor = db.query(safeTable, new String[]{KEY_ID}, KEY_ID + "=?",
                    new String[]{key}, null, null, null, null);
            return cursor != null && cursor.getCount() > 0;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    /**
     * Enumerate non-expired rows as {@code { key, value }} where {@code value}
     * is the full {@link StorageValue} wrapper (parsed from the stored JSON).
     * Returning the wrapper here lets the TS {@code SqliteAdapter} run the real
     * query condition in JS from a SINGLE round-trip instead of re-fetching
     * each key (eliminates the query() N+1). Expired rows are filtered in SQL;
     * an unparseable legacy payload surfaces as key-only (the TS side then
     * falls back to {@code get()}, which treats it as a miss).
     */
    public synchronized List<Map<String, Object>> query(String table) {
        String safeTable = sanitizeTable(table);
        long now = System.currentTimeMillis();
        List<Map<String, Object>> rows = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        ensureTable(db, safeTable);
        Cursor cursor = null;
        try {
            cursor = db.query(safeTable, new String[]{KEY_ID, KEY_VALUE},
                    "(" + KEY_EXPIRES + " IS NULL OR " + KEY_EXPIRES + " > ?)",
                    new String[]{String.valueOf(now)}, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    Map<String, Object> row = new HashMap<>();
                    row.put("key", cursor.getString(0));
                    String stored = cursor.getString(1);
                    if (stored != null) {
                        try {
                            row.put("value", new JSObject(stored));
                        } catch (JSONException parseError) {
                            // Unparseable legacy payload: surface key only.
                            Log.w("StrataStorage", "Unparseable SQLite value in query for key "
                                    + cursor.getString(0));
                        }
                    }
                    rows.add(row);
                } while (cursor.moveToNext());
            }
            return rows;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    /**
     * Delete every expired row ({@code expires <= now}) in one statement and
     * return the number removed. Because {@link #keys} and {@link #query} now
     * filter expired rows in SQL (no lazy per-key deletion on read), this is
     * what reclaims their physical storage; the TS adapter calls it on its TTL
     * cleanup tick.
     */
    public synchronized int cleanupExpired(String table) {
        String safeTable = sanitizeTable(table);
        long now = System.currentTimeMillis();
        SQLiteDatabase db = getWritableDatabase();
        ensureTable(db, safeTable);
        return db.delete(safeTable,
                KEY_EXPIRES + " IS NOT NULL AND " + KEY_EXPIRES + " <= ?",
                new String[]{String.valueOf(now)});
    }

    /**
     * Size information. {@code total} = Σ(length(key) + length(value)), matching
     * the web adapters' convention (key bytes are included). When {@code
     * detailed} is true the byte breakdown is also populated: {@code keys} = Σ
     * length(key), {@code values} = Σ length(value), {@code metadata} = Σ
     * length(metadata) (0 for null); {@code count} is the row count.
     */
    public synchronized SizeInfo size(String table, boolean detailed) {
        String safeTable = sanitizeTable(table);
        SQLiteDatabase db = getReadableDatabase();
        ensureTable(db, safeTable);
        Cursor cursor = null;
        try {
            if (!detailed) {
                cursor = db.rawQuery("SELECT COUNT(*), SUM(LENGTH(" + KEY_ID + ") + LENGTH("
                        + KEY_VALUE + ")) FROM " + safeTable, null);
                long totalSize = 0;
                int count = 0;
                if (cursor != null && cursor.moveToFirst()) {
                    count = cursor.getInt(0);
                    if (!cursor.isNull(1)) {
                        totalSize = cursor.getLong(1);
                    }
                }
                return new SizeInfo(totalSize, count);
            }

            cursor = db.query(safeTable,
                    new String[]{KEY_ID, KEY_VALUE, KEY_METADATA},
                    null, null, null, null, null);
            long keysBytes = 0;
            long valuesBytes = 0;
            long metadataBytes = 0;
            int count = 0;
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    count++;
                    String key = cursor.getString(0);
                    String value = cursor.getString(1);
                    String metadata = cursor.getString(2);
                    if (key != null) {
                        keysBytes += key.getBytes(StandardCharsets.UTF_8).length;
                    }
                    if (value != null) {
                        valuesBytes += value.getBytes(StandardCharsets.UTF_8).length;
                    }
                    if (metadata != null) {
                        metadataBytes += metadata.getBytes(StandardCharsets.UTF_8).length;
                    }
                } while (cursor.moveToNext());
            }
            return new SizeInfo(keysBytes + valuesBytes, count, keysBytes, valuesBytes, metadataBytes);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    /**
     * Size information. The detailed byte breakdown is only meaningful when
     * {@link #detailed} is true.
     */
    public static class SizeInfo {
        public final long total;
        public final int count;
        public final boolean detailed;
        public final long keysBytes;
        public final long valuesBytes;
        public final long metadataBytes;

        public SizeInfo(long total, int count) {
            this.total = total;
            this.count = count;
            this.detailed = false;
            this.keysBytes = 0;
            this.valuesBytes = 0;
            this.metadataBytes = 0;
        }

        public SizeInfo(long total, int count, long keysBytes, long valuesBytes, long metadataBytes) {
            this.total = total;
            this.count = count;
            this.detailed = true;
            this.keysBytes = keysBytes;
            this.valuesBytes = valuesBytes;
            this.metadataBytes = metadataBytes;
        }
    }
}
