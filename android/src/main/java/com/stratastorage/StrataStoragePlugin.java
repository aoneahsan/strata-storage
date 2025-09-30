package com.stratastorage;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.strata.storage.SharedPreferencesStorage;
import com.strata.storage.EncryptedStorage;
import com.strata.storage.SQLiteStorage;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.List;
import java.util.Set;

/**
 * Main Capacitor plugin for Strata Storage
 * Coordinates between different storage types on Android
 */
@CapacitorPlugin(name = "StrataStorage")
public class StrataStoragePlugin extends Plugin {
    private SharedPreferencesStorage sharedPrefsStorage;
    private EncryptedStorage encryptedStorage;
    private SQLiteStorage sqliteStorage;

    @Override
    public void load() {
        try {
            sharedPrefsStorage = new SharedPreferencesStorage(getContext());
            encryptedStorage = new EncryptedStorage(getContext());
            sqliteStorage = new SQLiteStorage(getContext());
        } catch (Exception e) {
            // Log error but don't crash - some storage types may not be available
            e.printStackTrace();
        }
    }

    /**
     * Check if storage is available
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("platform", "android");
        
        JSObject adapters = new JSObject();
        adapters.put("preferences", true);
        adapters.put("secure", true);
        adapters.put("sqlite", true);
        adapters.put("filesystem", true);
        result.put("adapters", adapters);
        
        call.resolve(result);
    }

    /**
     * Get value from storage
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
            Object value = null;
            
            switch (storage) {
                case "secure":
                    value = encryptedStorage.get(key);
                    break;
                case "sqlite":
                    value = sqliteStorage.get(key);
                    break;
                case "preferences":
                default:
                    value = sharedPrefsStorage.get(key);
                    break;
            }
            
            JSObject result = new JSObject();
            result.put("value", value);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get value", e);
        }
    }

    /**
     * Set value in storage
     */
    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        Object value = call.getData().opt("value");
        String storage = call.getString("storage", "preferences");
        
        try {
            switch (storage) {
                case "secure":
                    encryptedStorage.set(key, value);
                    break;
                case "sqlite":
                    sqliteStorage.set(key, value);
                    break;
                case "preferences":
                default:
                    sharedPrefsStorage.set(key, value);
                    break;
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
                    encryptedStorage.remove(key);
                    break;
                case "sqlite":
                    sqliteStorage.remove(key);
                    break;
                case "preferences":
                default:
                    sharedPrefsStorage.remove(key);
                    break;
            }
            
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to remove value", e);
        }
    }

    /**
     * Clear storage
     */
    @PluginMethod
    public void clear(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        String prefix = call.getString("prefix");
        
        try {
            switch (storage) {
                case "secure":
                    encryptedStorage.clear(prefix);
                    break;
                case "sqlite":
                    sqliteStorage.clear(prefix);
                    break;
                case "preferences":
                default:
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
            List<String> keys = null;
            
            switch (storage) {
                case "secure":
                    keys = encryptedStorage.keys(pattern);
                    break;
                case "sqlite":
                    keys = sqliteStorage.keys(pattern);
                    break;
                case "preferences":
                default:
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
     * Get storage size information
     */
    @PluginMethod
    public void size(PluginCall call) {
        String storage = call.getString("storage", "preferences");
        
        try {
            SizeInfo sizeInfo = null;
            
            switch (storage) {
                case "secure":
                    sizeInfo = encryptedStorage.size();
                    break;
                case "sqlite":
                    sizeInfo = sqliteStorage.size();
                    break;
                case "preferences":
                default:
                    sizeInfo = sharedPrefsStorage.size();
                    break;
            }
            
            JSObject result = new JSObject();
            result.put("total", sizeInfo.total);
            result.put("count", sizeInfo.count);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get size", e);
        }
    }
    
    /**
     * Size information class
     */
    static class SizeInfo {
        public final long total;
        public final int count;
        
        public SizeInfo(long total, int count) {
            this.total = total;
            this.count = count;
        }
    }
}