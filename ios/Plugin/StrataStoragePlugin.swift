import Foundation
import Capacitor

/**
 * Main Capacitor plugin for Strata Storage
 * Coordinates between different storage types on iOS
 */
@objc(StrataStoragePlugin)
public class StrataStoragePlugin: CAPPlugin {
    private let userDefaultsStorage = UserDefaultsStorage()
    private let keychainStorage = KeychainStorage()
    private let sqliteStorage = SQLiteStorage()
    
    /**
     * Check if storage is available
     */
    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "platform": "ios",
            "adapters": [
                "preferences": true,
                "secure": true,
                "sqlite": true,
                "filesystem": true
            ]
        ])
    }
    
    /**
     * Get value from storage
     */
    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        
        let storage = call.getString("storage") ?? "preferences"
        
        do {
            let value: Any?
            
            switch storage {
            case "secure":
                value = try keychainStorage.get(key: key)
            case "sqlite":
                value = try sqliteStorage.get(key: key)
            case "preferences":
                fallthrough
            default:
                value = userDefaultsStorage.get(key: key)
            }
            
            call.resolve([
                "value": value ?? NSNull()
            ])
        } catch {
            call.reject("Failed to get value", error.localizedDescription)
        }
    }
    
    /**
     * Set value in storage
     */
    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        
        let value = call.getValue("value") ?? NSNull()
        let storage = call.getString("storage") ?? "preferences"
        
        do {
            switch storage {
            case "secure":
                try keychainStorage.set(key: key, value: value)
            case "sqlite":
                try sqliteStorage.set(key: key, value: value)
            case "preferences":
                fallthrough
            default:
                userDefaultsStorage.set(key: key, value: value)
            }
            
            call.resolve()
        } catch {
            call.reject("Failed to set value", error.localizedDescription)
        }
    }
    
    /**
     * Remove value from storage
     */
    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        
        let storage = call.getString("storage") ?? "preferences"
        
        do {
            switch storage {
            case "secure":
                try keychainStorage.remove(key: key)
            case "sqlite":
                try sqliteStorage.remove(key: key)
            case "preferences":
                fallthrough
            default:
                userDefaultsStorage.remove(key: key)
            }
            
            call.resolve()
        } catch {
            call.reject("Failed to remove value", error.localizedDescription)
        }
    }
    
    /**
     * Clear storage
     */
    @objc func clear(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        let prefix = call.getString("prefix")
        
        do {
            switch storage {
            case "secure":
                try keychainStorage.clear(prefix: prefix)
            case "sqlite":
                try sqliteStorage.clear(prefix: prefix)
            case "preferences":
                fallthrough
            default:
                userDefaultsStorage.clear(prefix: prefix)
            }
            
            call.resolve()
        } catch {
            call.reject("Failed to clear storage", error.localizedDescription)
        }
    }
    
    /**
     * Get all keys from storage
     */
    @objc func keys(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        let pattern = call.getString("pattern")
        
        do {
            let keys: [String]
            
            switch storage {
            case "secure":
                keys = try keychainStorage.keys(pattern: pattern)
            case "sqlite":
                keys = try sqliteStorage.keys(pattern: pattern)
            case "preferences":
                fallthrough
            default:
                keys = userDefaultsStorage.keys(pattern: pattern)
            }
            
            call.resolve([
                "keys": keys
            ])
        } catch {
            call.reject("Failed to get keys", error.localizedDescription)
        }
    }
    
    /**
     * Get storage size information
     */
    @objc func size(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        
        do {
            let sizeInfo: (total: Int, count: Int)
            
            switch storage {
            case "secure":
                sizeInfo = try keychainStorage.size()
            case "sqlite":
                sizeInfo = try sqliteStorage.size()
            case "preferences":
                fallthrough
            default:
                sizeInfo = userDefaultsStorage.size()
            }
            
            call.resolve([
                "total": sizeInfo.total,
                "count": sizeInfo.count
            ])
        } catch {
            call.reject("Failed to get size", error.localizedDescription)
        }
    }
}