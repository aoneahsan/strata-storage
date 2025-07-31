package com.strata.storage;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import java.util.Set;
import java.util.Map;

public class EncryptedStorage {
    private SharedPreferences encryptedPrefs;
    private SharedPreferences.Editor editor;
    
    public EncryptedStorage(Context context, String name) throws Exception {
        String fileName = name != null ? name : "StrataSecureStorage";
        
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
        editor.clear();
        return editor.commit();
    }
    
    public Set<String> keys() {
        return encryptedPrefs.getAll().keySet();
    }
    
    public boolean has(String key) {
        return encryptedPrefs.contains(key);
    }
}