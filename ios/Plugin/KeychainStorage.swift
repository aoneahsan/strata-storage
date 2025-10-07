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
    
    @objc public func set(key: String, value: Any) throws -> Bool {
        let data: Data
        
        if let dataValue = value as? Data {
            data = dataValue
        } else if let stringValue = value as? String {
            data = stringValue.data(using: .utf8) ?? Data()
        } else {
            // Convert to JSON for complex objects
            let jsonData = try JSONSerialization.data(withJSONObject: value, options: [])
            data = jsonData
        }
        
        let query = createQuery(key: key)
        SecItemDelete(query as CFDictionary)
        
        var newItem = query
        newItem[kSecValueData as String] = data
        
        let status = SecItemAdd(newItem as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    @objc public func get(key: String) throws -> Any? {
        var query = createQuery(key: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else { return nil }
        guard let data = result as? Data else { return nil }
        
        // Try to parse as JSON first, fallback to string
        if let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []) {
            return jsonObject
        } else {
            return String(data: data, encoding: .utf8)
        }
    }
    
    @objc public func remove(key: String) throws -> Bool {
        let query = createQuery(key: key)
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
    
    @objc public func clear(prefix: String? = nil) throws -> Bool {
        if let prefix = prefix {
            // Clear only keys with the given prefix
            let keysToRemove = try keys(pattern: prefix)
            var allSuccess = true
            for key in keysToRemove {
                if !(try remove(key: key)) {
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
    
    @objc public func keys(pattern: String? = nil) throws -> [String] {
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
    
    @objc public func size() throws -> (total: Int, count: Int) {
        let allKeys = try keys()
        var totalSize = 0
        
        for key in allKeys {
            if let data = try get(key: key) as? Data {
                totalSize += data.count
            } else if let string = try get(key: key) as? String {
                totalSize += string.data(using: .utf8)?.count ?? 0
            }
            totalSize += key.data(using: .utf8)?.count ?? 0
        }
        
        return (total: totalSize, count: allKeys.count)
    }
}