import Foundation
import Security

@objc public class KeychainStorage: NSObject {
    private let service: String
    private let accessGroup: String?
    
    @objc public init(service: String? = nil, accessGroup: String? = nil) {
        self.service = service ?? Bundle.main.bundleIdentifier ?? "StrataStorage"
        self.accessGroup = accessGroup
        super.init()
    }
    
    @objc public func set(key: String, value: Data) -> Bool {
        let query = createQuery(key: key)
        SecItemDelete(query as CFDictionary)
        
        var newItem = query
        newItem[kSecValueData as String] = value
        
        let status = SecItemAdd(newItem as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    @objc public func get(key: String) -> Data? {
        var query = createQuery(key: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }
    
    @objc public func remove(key: String) -> Bool {
        let query = createQuery(key: key)
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
    
    @objc public func clear(prefix: String? = nil) -> Bool {
        if let prefix = prefix {
            // Clear only keys with the given prefix
            let keysToRemove = keys(pattern: prefix)
            var allSuccess = true
            for key in keysToRemove {
                if !remove(key: key) {
                    allSuccess = false
                }
            }
            return allSuccess
        } else {
            // Clear all keys
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service
            ]
            let status = SecItemDelete(query as CFDictionary)
            return status == errSecSuccess || status == errSecItemNotFound
        }
    }
    
    @objc public func keys(pattern: String? = nil) -> [String] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitAll
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let items = result as? [[String: Any]] else { return [] }
        
        let allKeys = items.compactMap { $0[kSecAttrAccount as String] as? String }
        
        guard let pattern = pattern else {
            return allKeys
        }
        
        // Filter keys by pattern (simple prefix matching)
        return allKeys.filter { key in
            key.hasPrefix(pattern) || key.contains(pattern)
        }
    }
    
    private func createQuery(key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        return query
    }
}