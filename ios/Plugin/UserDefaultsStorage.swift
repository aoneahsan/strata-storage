import Foundation

@objc public class UserDefaultsStorage: NSObject {
    private let suiteName: String?
    private var userDefaults: UserDefaults
    /// All Strata keys are stored under this reserved prefix so that `keys()`,
    /// `size()`, and `clear()` only ever touch Strata-owned entries — never the
    /// rest of the app's `UserDefaults`. In particular `clear()` removes only
    /// prefixed keys and NEVER calls `removePersistentDomain`, which would wipe
    /// unrelated app/SDK settings in the shared domain.
    private let keyPrefix = "strata_storage::"

    @objc public init(suiteName: String? = nil) {
        self.suiteName = suiteName
        if let suiteName = suiteName, let customDefaults = UserDefaults(suiteName: suiteName) {
            self.userDefaults = customDefaults
        } else {
            self.userDefaults = UserDefaults.standard
        }
        super.init()
    }

    private func physicalKey(_ key: String) -> String {
        return keyPrefix + key
    }

    /// The physical keys in this domain that are owned by Strata.
    private func ownedPhysicalKeys() -> [String] {
        return userDefaults.dictionaryRepresentation().keys.filter { $0.hasPrefix(keyPrefix) }
    }

    @objc public func set(key: String, value: Any) -> Bool {
        userDefaults.set(value, forKey: physicalKey(key))
        return userDefaults.synchronize()
    }

    @objc public func get(key: String) -> Any? {
        return userDefaults.object(forKey: physicalKey(key))
    }

    @objc public func remove(key: String) -> Bool {
        userDefaults.removeObject(forKey: physicalKey(key))
        return userDefaults.synchronize()
    }

    @objc public func clear(prefix: String? = nil) -> Bool {
        // Only ever remove Strata-owned keys (optionally narrowed by `prefix`);
        // never wipe the whole UserDefaults domain.
        let targetPrefix = keyPrefix + (prefix ?? "")
        for physical in userDefaults.dictionaryRepresentation().keys where physical.hasPrefix(targetPrefix) {
            userDefaults.removeObject(forKey: physical)
        }
        return userDefaults.synchronize()
    }

    @objc public func keys(pattern: String? = nil) -> [String] {
        // Present logical (un-prefixed) keys to callers.
        let logical = ownedPhysicalKeys().map { String($0.dropFirst(keyPrefix.count)) }

        guard let pattern = pattern else {
            return logical
        }

        return logical.filter { key in
            key.hasPrefix(pattern) || key.contains(pattern)
        }
    }

    @objc public func has(key: String) -> Bool {
        return userDefaults.object(forKey: physicalKey(key)) != nil
    }

    @objc public func size() -> (total: Int, count: Int) {
        let all = userDefaults.dictionaryRepresentation()
        var totalSize = 0
        var count = 0

        for (physical, value) in all where physical.hasPrefix(keyPrefix) {
            count += 1
            let logical = String(physical.dropFirst(keyPrefix.count))
            // Estimate size (logical key + value in bytes)
            totalSize += logical.data(using: .utf8)?.count ?? 0
            totalSize += "\(value)".data(using: .utf8)?.count ?? 0
        }

        return (total: totalSize, count: count)
    }
}
