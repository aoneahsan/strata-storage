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

public class SQLiteStorage extends SQLiteOpenHelper {
    private static final int DATABASE_VERSION = 1;
    private static final String TABLE_NAME = "strata_storage";
    
    private static final String KEY_ID = "key";
    private static final String KEY_VALUE = "value";
    private static final String KEY_CREATED = "created";
    private static final String KEY_UPDATED = "updated";
    private static final String KEY_EXPIRES = "expires";
    private static final String KEY_TAGS = "tags";
    private static final String KEY_METADATA = "metadata";
    
    public SQLiteStorage(Context context, String dbName) {
        super(context, dbName != null ? dbName : "strata.db", null, DATABASE_VERSION);
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
    
    public boolean set(String key, byte[] value, Long expires, String tags, String metadata) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        
        long now = System.currentTimeMillis();
        values.put(KEY_ID, key);
        values.put(KEY_VALUE, value);
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
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_NAME, null, null);
        db.close();
        return true;
    }
    
    public List<String> keys() {
        List<String> keys = new ArrayList<>();
        String selectQuery = "SELECT " + KEY_ID + " FROM " + TABLE_NAME;
        
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery(selectQuery, null);
        
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
}