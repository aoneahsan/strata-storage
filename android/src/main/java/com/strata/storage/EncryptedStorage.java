package com.strata.storage;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import java.util.Set;
import java.util.HashSet;
import java.util.Map;

public class EncryptedStorage {
    private SharedPreferences encryptedPrefs;
    private SharedPreferences.Editor editor;
    private static final String DEFAULT_NAME = "StrataSecureStorage";
    
    public EncryptedStorage(Context context) throws Exception {
        this(context, DEFAULT_NAME);
    }
    
    public EncryptedStorage(Context context, String name) throws Exception {
        String fileName = name != null ? name : DEFAULT_NAME;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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
            
            editor = encryptedPrefs.edit();
        } else {
            // Fallback to regular SharedPreferences for older devices
            encryptedPrefs = context.getSharedPreferences(fileName, Context.MODE_PRIVATE);
            editor = encryptedPrefs.edit();
        }
    }
    
    public boolean set(String key, String value) {
        editor.putString(key, value);
        return editor.commit();
    }
    
    public String get(String key) {
        return encryptedPrefs.getString(key, null);
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
    
    public Set<String> keys() {
        return keys(null);
    }
    
    public Set<String> keys(String pattern) {
        Set<String> allKeys = encryptedPrefs.getAll().keySet();
        
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
        return encryptedPrefs.contains(key);
    }
}