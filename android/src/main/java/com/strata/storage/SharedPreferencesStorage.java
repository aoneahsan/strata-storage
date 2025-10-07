package com.strata.storage;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
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
                String json;
                if (value instanceof JSONObject) {
                    json = ((JSONObject) value).toString();
                } else {
                    // Use reflection to convert object to JSON string
                    try {
                        json = objectToJsonString(value);
                    } catch (Exception e) {
                        // Fallback to string representation
                        json = value.toString();
                    }
                }
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
    
    public List<String> keys() {
        return keys(null);
    }
    
    public List<String> keys(String pattern) {
        Set<String> allKeys = prefs.getAll().keySet();
        
        if (pattern == null) {
            return new ArrayList<>(allKeys);
        }
        
        // Filter keys by pattern
        List<String> filteredKeys = new ArrayList<>();
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
    
    public SizeInfo size() {
        Map<String, ?> all = prefs.getAll();
        long totalSize = 0;
        int count = all.size();
        
        for (Map.Entry<String, ?> entry : all.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            
            // Estimate size (key + value in bytes)
            totalSize += key.getBytes().length;
            if (value != null) {
                totalSize += value.toString().getBytes().length;
            }
        }
        
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