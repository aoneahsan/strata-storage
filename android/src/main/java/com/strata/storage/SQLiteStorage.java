package com.strata.storage;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;
import org.json.JSONArray;
import java.nio.charset.StandardCharsets;

public class SQLiteStorage extends SQLiteOpenHelper {
    private static final int DATABASE_VERSION = 1;
    private static final String TABLE_NAME = "strata_storage";
    private static final String DEFAULT_DB_NAME = "strata.db";
    
    private static final String KEY_ID = "key";
    private static final String KEY_VALUE = "value";
    private static final String KEY_CREATED = "created";
    private static final String KEY_UPDATED = "updated";
    private static final String KEY_EXPIRES = "expires";
    private static final String KEY_TAGS = "tags";
    private static final String KEY_METADATA = "metadata";
    
    public SQLiteStorage(Context context) {
        this(context, DEFAULT_DB_NAME);
    }
    
    public SQLiteStorage(Context context, String dbName) {
        super(context, dbName != null ? dbName : DEFAULT_DB_NAME, null, DATABASE_VERSION);
    }
    
    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_TABLE = "CREATE TABLE " + TABLE_NAME + "("
                + KEY_ID + " TEXT PRIMARY KEY,"
                + KEY_VALUE + " BLOB NOT NULL,"
                + KEY_CREATED + " INTEGER NOT NULL,"
                + KEY_UPDATED + " INTEGER NOT NULL,"
                + KEY_EXPIRES + " INTEGER,"
                + KEY_TAGS + " TEXT,"
                + KEY_METADATA + " TEXT" + ")";
        db.execSQL(CREATE_TABLE);
    }
    
    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
        onCreate(db);
    }
    
    public boolean set(String key, Object value, Long expires, String tags, String metadata) {
        byte[] valueBytes;
        
        try {
            if (value instanceof byte[]) {
                valueBytes = (byte[]) value;
            } else if (value instanceof String) {
                valueBytes = ((String) value).getBytes(StandardCharsets.UTF_8);
            } else {
                // Convert complex objects to JSON then to bytes
                String json;
                if (value instanceof JSONObject) {
                    json = ((JSONObject) value).toString();
                } else {
                    // Use helper method to convert object to JSON string
                    try {
                        json = objectToJsonString(value);
                    } catch (Exception jsonEx) {
                        // Fallback to string representation
                        json = value.toString();
                    }
                }
                valueBytes = json.getBytes(StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        
        long now = System.currentTimeMillis();
        values.put(KEY_ID, key);
        values.put(KEY_VALUE, valueBytes);
        values.put(KEY_CREATED, now);
        values.put(KEY_UPDATED, now);
        
        if (expires != null) {
            values.put(KEY_EXPIRES, expires);
        }
        if (tags != null) {
            values.put(KEY_TAGS, tags);
        }
        if (metadata != null) {
            values.put(KEY_METADATA, metadata);
        }
        
        long result = db.insertWithOnConflict(TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
        db.close();
        return result != -1;
    }
    
    // Convenience method for simple Object values
    public boolean set(String key, Object value) {
        return set(key, value, null, null, null);
    }
    
    public Map<String, Object> get(String key) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_NAME, null, KEY_ID + "=?",
                new String[]{key}, null, null, null, null);
                
        Map<String, Object> result = null;
        if (cursor != null && cursor.moveToFirst()) {
            result = new HashMap<>();
            result.put("key", key);
            result.put("value", cursor.getBlob(cursor.getColumnIndex(KEY_VALUE)));
            result.put("created", cursor.getLong(cursor.getColumnIndex(KEY_CREATED)));
            result.put("updated", cursor.getLong(cursor.getColumnIndex(KEY_UPDATED)));
            
            int expiresIndex = cursor.getColumnIndex(KEY_EXPIRES);
            if (!cursor.isNull(expiresIndex)) {
                result.put("expires", cursor.getLong(expiresIndex));
            }
            
            int tagsIndex = cursor.getColumnIndex(KEY_TAGS);
            if (!cursor.isNull(tagsIndex)) {
                result.put("tags", cursor.getString(tagsIndex));
            }
            
            int metadataIndex = cursor.getColumnIndex(KEY_METADATA);
            if (!cursor.isNull(metadataIndex)) {
                result.put("metadata", cursor.getString(metadataIndex));
            }
            
            cursor.close();
        }
        db.close();
        return result;
    }
    
    public boolean remove(String key) {
        SQLiteDatabase db = this.getWritableDatabase();
        int result = db.delete(TABLE_NAME, KEY_ID + " = ?", new String[]{key});
        db.close();
        return result > 0;
    }
    
    public boolean clear() {
        return clear(null);
    }
    
    public boolean clear(String prefix) {
        SQLiteDatabase db = this.getWritableDatabase();
        int result;
        
        if (prefix != null) {
            // Clear only keys with the given prefix
            result = db.delete(TABLE_NAME, KEY_ID + " LIKE ?", new String[]{prefix + "%"});
        } else {
            // Clear all keys
            result = db.delete(TABLE_NAME, null, null);
        }
        
        db.close();
        return result >= 0;
    }
    
    public List<String> keys() {
        return keys(null);
    }
    
    public List<String> keys(String pattern) {
        List<String> keys = new ArrayList<>();
        String selectQuery;
        String[] selectionArgs = null;
        
        if (pattern != null) {
            selectQuery = "SELECT " + KEY_ID + " FROM " + TABLE_NAME + " WHERE " + KEY_ID + " LIKE ?";
            selectionArgs = new String[]{"% " + pattern + "%"};
        } else {
            selectQuery = "SELECT " + KEY_ID + " FROM " + TABLE_NAME;
        }
        
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery(selectQuery, selectionArgs);
        
        if (cursor.moveToFirst()) {
            do {
                keys.add(cursor.getString(0));
            } while (cursor.moveToNext());
        }
        cursor.close();
        db.close();
        return keys;
    }
    
    public boolean has(String key) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_NAME, new String[]{KEY_ID}, KEY_ID + "=?",
                new String[]{key}, null, null, null, null);
        boolean exists = cursor.getCount() > 0;
        cursor.close();
        db.close();
        return exists;
    }
    
    public SizeInfo size() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*), SUM(LENGTH(" + KEY_VALUE + ")) FROM " + TABLE_NAME, null);
        
        long totalSize = 0;
        int count = 0;
        
        if (cursor != null && cursor.moveToFirst()) {
            count = cursor.getInt(0);
            totalSize = cursor.getLong(1);
            cursor.close();
        }
        
        db.close();
        return new SizeInfo(totalSize, count);
    }
    
    /**
     * Convert an object to JSON string using reflection
     */
    private String objectToJsonString(Object obj) throws Exception {
        if (obj == null) {
            return "null";
        }
        
        if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        }
        
        if (obj instanceof Map) {
            JSONObject jsonObj = new JSONObject();
            Map<?, ?> map = (Map<?, ?>) obj;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = entry.getKey().toString();
                jsonObj.put(key, entry.getValue());
            }
            return jsonObj.toString();
        }
        
        if (obj instanceof List || obj.getClass().isArray()) {
            JSONArray jsonArray = new JSONArray();
            if (obj instanceof List) {
                List<?> list = (List<?>) obj;
                for (Object item : list) {
                    jsonArray.put(item);
                }
            } else {
                Object[] array = (Object[]) obj;
                for (Object item : array) {
                    jsonArray.put(item);
                }
            }
            return jsonArray.toString();
        }
        
        // For other objects, create a simple JSON object with their string representation
        JSONObject jsonObj = new JSONObject();
        jsonObj.put("value", obj.toString());
        jsonObj.put("type", obj.getClass().getSimpleName());
        return jsonObj.toString();
    }
    
    /**
     * Size information class
     */
    public static class SizeInfo {
        public final long total;
        public final int count;
        
        public SizeInfo(long total, int count) {
            this.total = total;
            this.count = count;
        }
    }
}