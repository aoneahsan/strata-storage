import Foundation
import Security

/**
 * Keychain-backed secure storage.
 *
 * Security notes:
 * - Items default to `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`,
 *   which keeps data available to background tasks after the first unlock
 *   while preventing it from leaving the device via encrypted backups.
 *   `kSecAttrAccessibleAlways` / `kSecAttrAccessibleAlwaysThisDeviceOnly`
 *   are deprecated and insecure and are intentionally NOT used.
 * - Callers may pass a stricter accessibility class from JS via the
 *   `accessible` option (see KeychainAccessible in definitions.ts).
 * - Secret values are never logged.
 */
@objc public class KeychainStorage: NSObject {
    private let service: String
    private let accessGroup: String?
    private let defaultAccessible: CFString

    @objc public init(service: String? = nil, accessGroup: String? = nil) {
        self.service = service ?? Bundle.main.bundleIdentifier ?? "StrataStorage"
        self.accessGroup = accessGroup
        // After-first-unlock + this-device-only is a safe, widely-recommended
        // default for app secrets. It is more permissive than whenUnlocked
        // (so background access works) but still excluded from backups.
        self.defaultAccessible = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        super.init()
    }

    /// Maps a JS `KeychainAccessible` string to the matching Security framework
    /// constant. Unknown / nil values fall back to the secure default.
    private func accessibleConstant(for raw: String?) -> CFString {
        switch raw {
        case "whenUnlocked":
            return kSecAttrAccessibleWhenUnlocked
        case "afterFirstUnlock":
            return kSecAttrAccessibleAfterFirstUnlock
        case "whenUnlockedThisDeviceOnly":
            return kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        case "afterFirstUnlockThisDeviceOnly":
            return kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        case "whenPasscodeSetThisDeviceOnly":
            return kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
        default:
            return defaultAccessible
        }
    }

    /// Builds an NSError that surfaces the OSStatus to the JS bridge without
    /// leaking any stored secret value.
    private func keychainError(_ status: OSStatus, operation: String) -> NSError {
        let message: String
        if #available(iOS 11.3, *), let str = SecCopyErrorMessageString(status, nil) as String? {
            message = str
        } else {
            message = "OSStatus \(status)"
        }
        return NSError(
            domain: "StrataStorage.KeychainStorage",
            code: Int(status),
            userInfo: [NSLocalizedDescriptionKey: "Keychain \(operation) failed: \(message)"]
        )
    }

    @objc public func set(key: String, value: Any, accessible: String? = nil) throws -> Bool {
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

        // Remove any existing item first so the accessibility class is applied
        // cleanly (SecItemUpdate cannot change accessibility reliably).
        let deleteQuery = createQuery(key: key)
        SecItemDelete(deleteQuery as CFDictionary)

        var newItem = createQuery(key: key, accessible: accessibleConstant(for: accessible))
        newItem[kSecValueData as String] = data

        let status = SecItemAdd(newItem as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw keychainError(status, operation: "set")
        }
        return true
    }

    // Convenience overload kept for existing Objective-C callers.
    @objc public func set(key: String, value: Any) throws -> Bool {
        return try set(key: key, value: value, accessible: nil)
    }

    @objc public func get(key: String) throws -> Any? {
        var query = createQuery(key: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw keychainError(status, operation: "get")
        }
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
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw keychainError(status, operation: "remove")
        }
        return true
    }

    @objc public func clear(prefix: String? = nil) throws -> Bool {
        if let prefix = prefix {
            // Clear only keys with the given prefix
            let keysToRemove = try keys(pattern: prefix)
            for key in keysToRemove {
                _ = try remove(key: key)
            }
            return true
        } else {
            // Clear all keys for this service (and access group, if any).
            var query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service
            ]
            if let accessGroup = accessGroup {
                query[kSecAttrAccessGroup as String] = accessGroup
            }
            let status = SecItemDelete(query as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else {
                throw keychainError(status, operation: "clear")
            }
            return true
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

        if status == errSecItemNotFound {
            return []
        }
        guard status == errSecSuccess,
              let items = result as? [[String: Any]] else {
            if status == errSecSuccess { return [] }
            throw keychainError(status, operation: "keys")
        }

        let allKeys = items.compactMap { $0[kSecAttrAccount as String] as? String }

        guard let pattern = pattern else {
            return allKeys
        }

        // Filter keys by pattern (simple prefix / contains matching)
        return allKeys.filter { key in
            key.hasPrefix(pattern) || key.contains(pattern)
        }
    }

    private func createQuery(key: String, accessible: CFString? = nil) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        // Accessibility only needs to be set when adding/writing an item.
        // Including it on read/delete queries can over-constrain matching.
        if let accessible = accessible {
            query[kSecAttrAccessible as String] = accessible
        }

        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }

        return query
    }

    @objc public func size() throws -> (total: Int, count: Int) {
        let allKeys = try keys()
        var totalSize = 0

        for key in allKeys {
            if let value = try get(key: key) {
                if let data = value as? Data {
                    totalSize += data.count
                } else if let string = value as? String {
                    totalSize += string.data(using: .utf8)?.count ?? 0
                } else if let jsonData = try? JSONSerialization.data(withJSONObject: value, options: []) {
                    totalSize += jsonData.count
                }
            }
            totalSize += key.data(using: .utf8)?.count ?? 0
        }

        return (total: totalSize, count: allKeys.count)
    }
}
