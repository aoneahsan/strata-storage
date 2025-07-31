package com.strata.storage;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import org.json.JSONObject;
import org.json.JSONArray;

public class SharedPreferencesStorage {
    private final SharedPreferences prefs;
    private final SharedPreferences.Editor editor;
    
    public SharedPreferencesStorage(Context context, String name) {
        this.prefs = context.getSharedPreferences(name != null ? name : "StrataStorage", Context.MODE_PRIVATE);
        this.editor = prefs.edit();
    }
    
    public boolean set(String key, Object value) {
        try {
            if (value instanceof String) {
                editor.putString(key, (String) value);
            } else if (value instanceof Integer) {
                editor.putInt(key, (Integer) value);
            } else if (value instanceof Long) {
                editor.putLong(key, (Long) value);
            } else if (value instanceof Float) {
                editor.putFloat(key, (Float) value);
            } else if (value instanceof Boolean) {
                editor.putBoolean(key, (Boolean) value);
            } else if (value instanceof Set) {
                editor.putStringSet(key, (Set<String>) value);
            } else {
                // Convert complex objects to JSON
                String json = value instanceof JSONObject ? 
                    ((JSONObject) value).toString() : 
                    new JSONObject(value).toString();
                editor.putString(key, json);
            }
            return editor.commit();
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    public Object get(String key) {
        Map<String, ?> all = prefs.getAll();
        return all.get(key);
    }
    
    public boolean remove(String key) {
        editor.remove(key);
        return editor.commit();
    }
    
    public boolean clear() {
        editor.clear();
        return editor.commit();
    }
    
    public Set<String> keys() {
        return prefs.getAll().keySet();
    }
    
    public boolean has(String key) {
        return prefs.contains(key);
    }
    
    public Map<String, ?> getAll() {
        return prefs.getAll();
    }
}