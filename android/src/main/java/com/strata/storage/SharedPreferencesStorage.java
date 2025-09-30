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
    private static final String DEFAULT_NAME = "StrataStorage";
    
    public SharedPreferencesStorage(Context context) {
        this(context, DEFAULT_NAME);
    }
    
    public SharedPreferencesStorage(Context context, String name) {
        this.prefs = context.getSharedPreferences(name != null ? name : DEFAULT_NAME, Context.MODE_PRIVATE);
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
        return clear(null);
    }
    
    public boolean clear(String prefix) {
        if (prefix != null) {
            // Clear only keys with the given prefix
            Set<String> keysToRemove = new HashSet<>();
            for (String key : prefs.getAll().keySet()) {
                if (key.startsWith(prefix) || key.contains(prefix)) {
                    keysToRemove.add(key);
                }
            }
            for (String key : keysToRemove) {
                editor.remove(key);
            }
        } else {
            // Clear all keys
            editor.clear();
        }
        return editor.commit();
    }
    
    public Set<String> keys() {
        return keys(null);
    }
    
    public Set<String> keys(String pattern) {
        Set<String> allKeys = prefs.getAll().keySet();
        
        if (pattern == null) {
            return allKeys;
        }
        
        // Filter keys by pattern
        Set<String> filteredKeys = new HashSet<>();
        for (String key : allKeys) {
            if (key.startsWith(pattern) || key.contains(pattern)) {
                filteredKeys.add(key);
            }
        }
        return filteredKeys;
    }
    
    public boolean has(String key) {
        return prefs.contains(key);
    }
    
    public Map<String, ?> getAll() {
        return prefs.getAll();
    }
}