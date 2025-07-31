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
    
    @objc public func clear() -> Bool {
        if let suiteName = suiteName {
            UserDefaults(suiteName: suiteName)?.removePersistentDomain(forName: suiteName)
        } else {
            let domain = Bundle.main.bundleIdentifier!
            userDefaults.removePersistentDomain(forName: domain)
        }
        return userDefaults.synchronize()
    }
    
    @objc public func keys() -> [String] {
        return Array(userDefaults.dictionaryRepresentation().keys)
    }
    
    @objc public func has(key: String) -> Bool {
        return userDefaults.object(forKey: key) != nil
    }
}