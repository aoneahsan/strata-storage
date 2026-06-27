package com.strata.storage;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import java.security.GeneralSecurityException;
import java.io.IOException;
import java.lang.reflect.Array;
import java.util.Set;
import java.util.HashSet;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import org.json.JSONObject;
import org.json.JSONArray;

public class EncryptedStorage {
    private SharedPreferences encryptedPrefs;
    private static final String DEFAULT_NAME = "StrataSecureStorage";
    
    public EncryptedStorage(Context context) throws GeneralSecurityException, IOException {
        this(context, DEFAULT_NAME);
    }

    public EncryptedStorage(Context context, String name) throws GeneralSecurityException, IOException {
        String fileName = name != null ? name : DEFAULT_NAME;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();

                encryptedPrefs = EncryptedSharedPreferences.create(
                    context,
                    fileName,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                );

            } catch (GeneralSecurityException | IOException e) {
                Log.e("StrataStorage", "Failed to initialize encrypted storage", e);
                throw e;
            }
        } else {
            // SECURITY: EncryptedSharedPreferences requires API 23+. Refuse to
            // silently fall back to UNENCRYPTED SharedPreferences for "secure"
            // storage — that would persist sensitive data in plaintext while the
            // caller believes it is encrypted. Reject so the caller can decide.
            // (minSdkVersion is also raised to 23, so this is defense in depth.)
            Log.e("StrataStorage", "Secure storage unavailable on API " + Build.VERSION.SDK_INT + " (< 23)");
            throw new GeneralSecurityException(
                "Secure storage requires Android API 23 (Marshmallow) or higher; refusing to "
                    + "fall back to unencrypted storage on API " + Build.VERSION.SDK_INT);
        }
    }
    
    public synchronized boolean set(String key, Object value) {
        try {
            String stringValue;
            if (value instanceof String) {
                stringValue = (String) value;
            } else {
                // Convert complex objects to JSON
                if (value instanceof JSONObject) {
                    stringValue = ((JSONObject) value).toString();
                } else {
                    // Use helper method to convert object to JSON string
                    try {
                        stringValue = objectToJsonString(value);
                    } catch (Exception e) {
                        // Fallback to string representation
                        stringValue = value.toString();
                    }
                }
            }
            SharedPreferences.Editor editor = encryptedPrefs.edit();
            editor.putString(key, stringValue);
            return editor.commit();
        } catch (Exception e) {
            Log.e("StrataStorage", "Failed to set value in encrypted storage", e);
            return false;
        }
    }
    
    public synchronized String get(String key) {
        return encryptedPrefs.getString(key, null);
    }

    public synchronized boolean remove(String key) {
        SharedPreferences.Editor editor = encryptedPrefs.edit();
        editor.remove(key);
        return editor.commit();
    }
    
    public boolean clear() {
        return clear(null);
    }
    
    public synchronized boolean clear(String prefix) {
        SharedPreferences.Editor editor = encryptedPrefs.edit();
        if (prefix != null) {
            // Clear only keys with the given prefix
            Set<String> keysToRemove = new HashSet<>();
            for (String key : encryptedPrefs.getAll().keySet()) {
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
    
    public synchronized List<String> keys(String pattern) {
        Set<String> allKeys = encryptedPrefs.getAll().keySet();
        
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
    
    public synchronized boolean has(String key) {
        return encryptedPrefs.contains(key);
    }

    public synchronized SizeInfo size() {
        Map<String, ?> all = encryptedPrefs.getAll();
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
                // Use java.lang.reflect.Array so EVERY array type round-trips,
                // including primitive arrays (int[], long[], double[], boolean[],
                // ...). A direct `(Object[]) obj` cast throws ClassCastException for
                // primitive arrays, which the caller would swallow and replace with
                // the lossy `value.toString()` (e.g. "[I@1a2b3c"). Array.get boxes
                // each primitive element so JSONArray.put stores a real value.
                int len = Array.getLength(obj);
                for (int i = 0; i < len; i++) {
                    jsonArray.put(Array.get(obj, i));
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