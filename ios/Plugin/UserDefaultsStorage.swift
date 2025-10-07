import Foundation

@objc public class UserDefaultsStorage: NSObject {
    private let suiteName: String?
    private var userDefaults: UserDefaults
    
    @objc public init(suiteName: String? = nil) {
        self.suiteName = suiteName
        self.userDefaults = suiteName != nil ? UserDefaults(suiteName: suiteName)! : UserDefaults.standard
        super.init()
    }
    
    @objc public func set(key: String, value: Any) -> Bool {
        userDefaults.set(value, forKey: key)
        return userDefaults.synchronize()
    }
    
    @objc public func get(key: String) -> Any? {
        return userDefaults.object(forKey: key)
    }
    
    @objc public func remove(key: String) -> Bool {
        userDefaults.removeObject(forKey: key)
        return userDefaults.synchronize()
    }
    
    @objc public func clear(prefix: String? = nil) -> Bool {
        if let prefix = prefix {
            // Clear only keys with the given prefix
            let keysToRemove = keys(pattern: prefix)
            for key in keysToRemove {
                userDefaults.removeObject(forKey: key)
            }
        } else {
            // Clear all keys
            if let suiteName = suiteName {
                UserDefaults(suiteName: suiteName)?.removePersistentDomain(forName: suiteName)
            } else {
                let domain = Bundle.main.bundleIdentifier!
                userDefaults.removePersistentDomain(forName: domain)
            }
        }
        return userDefaults.synchronize()
    }
    
    @objc public func keys(pattern: String? = nil) -> [String] {
        let allKeys = Array(userDefaults.dictionaryRepresentation().keys)
        
        guard let pattern = pattern else {
            return allKeys
        }
        
        // Filter keys by pattern (simple prefix matching)
        return allKeys.filter { key in
            key.hasPrefix(pattern) || key.contains(pattern)
        }
    }
    
    @objc public func has(key: String) -> Bool {
        return userDefaults.object(forKey: key) != nil
    }
    
    @objc public func size() -> (total: Int, count: Int) {
        let all = userDefaults.dictionaryRepresentation()
        var totalSize = 0
        let count = all.count
        
        for (key, value) in all {
            // Estimate size (key + value in bytes)
            totalSize += key.data(using: .utf8)?.count ?? 0
            totalSize += "\(value)".data(using: .utf8)?.count ?? 0
        }
        
        return (total: totalSize, count: count)
    }
}