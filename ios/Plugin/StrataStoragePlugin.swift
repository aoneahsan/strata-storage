import Foundation
import Capacitor

/**
 * Main Capacitor plugin for Strata Storage
 * Coordinates between different storage types on iOS.
 *
 * NOTE: Method registration with the Capacitor bridge lives in
 * StrataStoragePlugin.m (CAP_PLUGIN / CAP_PLUGIN_METHOD). Keep the two in
 * sync when adding or renaming methods.
 */
@objc(StrataStoragePlugin)
public class StrataStoragePlugin: CAPPlugin {
    private let userDefaultsStorage = UserDefaultsStorage()
    private let keychainStorage = KeychainStorage()
    private let filesystemStorage = FilesystemStorage()

    /// Storage types that have a real native backend on iOS.
    private let supportedStorageTypes: Set<String> = ["preferences", "secure", "sqlite", "filesystem"]

    // MARK: - SQLite multi-store helpers

    /// Default database name (→ file `strata_storage.db`) and table.
    private static let defaultDatabase = "strata_storage"
    private static let defaultTable = "storage"

    /// Allowed characters for a SQLite identifier body (the first character must
    /// additionally not be a digit).
    private static let sqliteIdentifierChars =
        CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_")

    /// Validates a `database`/`table` identifier against `^[A-Za-z_][A-Za-z0-9_]*$`.
    /// These two cannot be bound as parameters (they are interpolated into SQL /
    /// the `.db` filename), so they are the single injection surface; every
    /// other value is bound. Non-conforming identifiers are REJECTED rather than
    /// silently stripped — the TS adapter applies the same allow-list and rejects
    /// first, so this is defense-in-depth (and also blocks path traversal).
    private func isValidSqliteIdentifier(_ s: String) -> Bool {
        guard let first = s.unicodeScalars.first else { return false }
        if CharacterSet(charactersIn: "0123456789").contains(first) { return false }
        return s.unicodeScalars.allSatisfy { StrataStoragePlugin.sqliteIdentifierChars.contains($0) }
    }

    /// Returns the validated table identifier for the call, or nil after
    /// rejecting `call` with a clear error.
    private func validatedTable(_ call: CAPPluginCall) -> String? {
        let table = call.getString("table") ?? StrataStoragePlugin.defaultTable
        guard isValidSqliteIdentifier(table) else {
            call.reject("Invalid SQLite table name: \(table)")
            return nil
        }
        return table
    }

    /// Returns the cached SQLite store for the call's validated `database`, or
    /// nil after rejecting `call`. The filename cannot be a bound parameter, so
    /// the name is validated before `.db` is appended.
    private func validatedSqliteStore(for call: CAPPluginCall) -> SQLiteStorage? {
        let database = call.getString("database") ?? StrataStoragePlugin.defaultDatabase
        guard isValidSqliteIdentifier(database) else {
            call.reject("Invalid SQLite database name: \(database)")
            return nil
        }
        return SQLiteStorageManager.shared.store(forFile: "\(database).db")
    }

    /**
     * Check if a specific storage type is available.
     * Matches the JS contract: resolves `{ available: boolean }`.
     */
    @objc func isAvailable(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        let available: Bool
        switch storage {
        case "sqlite":
            let database = call.getString("database") ?? StrataStoragePlugin.defaultDatabase
            available = isValidSqliteIdentifier(database)
                && SQLiteStorageManager.shared.store(forFile: "\(database).db").isOpen
        case "filesystem":
            available = filesystemStorage.isAvailable()
        case "preferences", "secure":
            available = true
        default:
            available = false
        }
        call.resolve([
            "available": available
        ])
    }

    /**
     * Get value from storage.
     * For sqlite/filesystem the resolved `value` is the full StorageValue
     * wrapper object (or NSNull on a miss).
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
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                value = store.get(table: table, key: key)
            case "filesystem":
                value = filesystemStorage.get(key: key)
            case "preferences":
                fallthrough
            default:
                value = userDefaultsStorage.get(key: key)
            }

            call.resolve([
                "value": value ?? NSNull()
            ])
        } catch {
            call.reject("Failed to get value", nil, error)
        }
    }

    /**
     * Set value in storage.
     * For sqlite/filesystem the `value` option is the full StorageValue
     * wrapper object and is stored verbatim (JSON) for a perfect round-trip.
     */
    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }

        let storage = call.getString("storage") ?? "preferences"

        do {
            switch storage {
            case "secure":
                let value = call.getValue("value") ?? NSNull()
                _ = try keychainStorage.set(key: key, value: value)
            case "sqlite":
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                // getObject returns JSObject ([String: JSValue]); upcast each
                // value to Any (the canonical Capacitor pattern) so the bridged
                // Foundation values are JSONSerialization-compatible.
                guard let jsObject = call.getObject("value") else {
                    call.reject("SQLite value must be a StorageValue object")
                    return
                }
                let ok = try store.set(
                    table: table,
                    key: key,
                    wrapper: jsObject as [String: Any]
                )
                if !ok {
                    call.reject("Failed to write value to SQLite")
                    return
                }
            case "filesystem":
                guard let jsObject = call.getObject("value") else {
                    call.reject("Filesystem value must be a StorageValue object")
                    return
                }
                let ok = try filesystemStorage.set(key: key, wrapper: jsObject as [String: Any])
                if !ok {
                    call.reject("Failed to write value to filesystem")
                    return
                }
            case "preferences":
                fallthrough
            default:
                let value = call.getValue("value") ?? NSNull()
                userDefaultsStorage.set(key: key, value: value)
            }

            call.resolve()
        } catch {
            call.reject("Failed to set value", nil, error)
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
                _ = try keychainStorage.remove(key: key)
            case "sqlite":
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                _ = store.remove(table: table, key: key)
            case "filesystem":
                _ = filesystemStorage.remove(key: key)
            case "preferences":
                fallthrough
            default:
                userDefaultsStorage.remove(key: key)
            }

            call.resolve()
        } catch {
            call.reject("Failed to remove value", nil, error)
        }
    }

    /**
     * Clear storage.
     * The JS contract sends an optional `pattern`. The native backends accept
     * a prefix; we use `pattern` as that prefix (prefix/contains matching).
     */
    @objc func clear(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        // Accept both `pattern` (JS contract) and legacy `prefix`.
        let prefix = call.getString("pattern") ?? call.getString("prefix")

        do {
            switch storage {
            case "secure":
                _ = try keychainStorage.clear(prefix: prefix)
            case "sqlite":
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                _ = store.clear(table: table, prefix: prefix)
            case "filesystem":
                _ = filesystemStorage.clear(prefix: prefix)
            case "preferences":
                fallthrough
            default:
                userDefaultsStorage.clear(prefix: prefix)
            }

            call.resolve()
        } catch {
            call.reject("Failed to clear storage", nil, error)
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
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                keys = store.keys(table: table, pattern: pattern)
            case "filesystem":
                keys = filesystemStorage.keys(pattern: pattern)
            case "preferences":
                fallthrough
            default:
                keys = userDefaultsStorage.keys(pattern: pattern)
            }

            call.resolve([
                "keys": keys
            ])
        } catch {
            call.reject("Failed to get keys", nil, error)
        }
    }

    /**
     * Get storage size information.
     * When `detailed` is true, resolves `{ total, count, detailed: { keys,
     * values, metadata } }`; otherwise `{ total, count }`.
     */
    @objc func size(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "preferences"
        let detailed = call.getBool("detailed") ?? false

        do {
            // segments carries total/count/keys/values/metadata in bytes.
            let segments: [String: Int]

            switch storage {
            case "secure":
                let info = try keychainStorage.size()
                segments = ["total": info.total, "count": info.count, "keys": 0, "values": info.total, "metadata": 0]
            case "sqlite":
                guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
                segments = try store.size(table: table)
            case "filesystem":
                segments = filesystemStorage.size()
            case "preferences":
                fallthrough
            default:
                let info = userDefaultsStorage.size()
                segments = ["total": info.total, "count": info.count, "keys": 0, "values": info.total, "metadata": 0]
            }

            var result: [String: Any] = [
                "total": segments["total"] ?? 0,
                "count": segments["count"] ?? 0
            ]
            if detailed {
                result["detailed"] = [
                    "keys": segments["keys"] ?? 0,
                    "values": segments["values"] ?? 0,
                    "metadata": segments["metadata"] ?? 0
                ]
            }
            call.resolve(result)
        } catch {
            call.reject("Failed to get size", nil, error)
        }
    }

    /**
     * Query SQLite-backed storage.
     * Matches the optional `query` method in the JS contract: resolves
     * `{ results: [{ key, value }] }` where `value` is the full StorageValue
     * wrapper for each non-expired row, so the JS adapter applies the condition
     * in one round-trip without re-fetching each key.
     */
    @objc func query(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "sqlite"

        guard storage == "sqlite" else {
            call.reject("Query is only supported for the 'sqlite' storage type")
            return
        }

        guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
        let condition = call.getObject("condition") ?? [:]
        let results = store.query(table: table, condition: condition)
        call.resolve([
            "results": results
        ])
    }

    /**
     * Delete every expired row for a SQLite store and resolve `{ removed }`.
     * The JS adapter calls this on its TTL cleanup tick, since `keys`/`query`
     * now exclude expired rows in SQL (no lazy per-key deletion on read).
     */
    @objc func cleanupExpired(_ call: CAPPluginCall) {
        let storage = call.getString("storage") ?? "sqlite"

        guard storage == "sqlite" else {
            call.reject("cleanupExpired is only supported for the 'sqlite' storage type")
            return
        }

        guard let store = validatedSqliteStore(for: call), let table = validatedTable(call) else { return }
        let removed = store.cleanupExpired(table: table)
        call.resolve([
            "removed": removed
        ])
    }

    /**
     * iOS-specific: read a UserDefaults value.
     * Resolves `{ value: unknown }`.
     */
    @objc func getUserDefaults(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        let suiteName = call.getString("suiteName")
        let store = suiteName != nil ? UserDefaultsStorage(suiteName: suiteName) : userDefaultsStorage
        call.resolve([
            "value": store.get(key: key) ?? NSNull()
        ])
    }

    /**
     * iOS-specific: write a UserDefaults value.
     */
    @objc func setUserDefaults(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        let value = call.getValue("value") ?? NSNull()
        let suiteName = call.getString("suiteName")
        let store = suiteName != nil ? UserDefaultsStorage(suiteName: suiteName) : userDefaultsStorage
        _ = store.set(key: key, value: value)
        call.resolve()
    }

    /**
     * iOS-specific: read a Keychain value. Resolves `{ value: string | null }`.
     */
    @objc func getKeychain(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        let service = call.getString("service")
        let accessGroup = call.getString("accessGroup")
        let store = (service != nil || accessGroup != nil)
            ? KeychainStorage(service: service, accessGroup: accessGroup)
            : keychainStorage

        do {
            let value = try store.get(key: key)
            // The JS contract types this as `string | null`. Serialize
            // non-string values to a JSON string so the bridge stays typed.
            if let value = value {
                if let str = value as? String {
                    call.resolve(["value": str])
                } else if let data = try? JSONSerialization.data(withJSONObject: value, options: []),
                          let str = String(data: data, encoding: .utf8) {
                    call.resolve(["value": str])
                } else {
                    call.resolve(["value": NSNull()])
                }
            } else {
                call.resolve(["value": NSNull()])
            }
        } catch {
            call.reject("Failed to read keychain item", nil, error)
        }
    }

    /**
     * iOS-specific: write a Keychain value, honoring the `accessible` option.
     */
    @objc func setKeychain(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Key is required")
            return
        }
        guard let value = call.getString("value") else {
            call.reject("Value is required and must be a string")
            return
        }
        let service = call.getString("service")
        let accessGroup = call.getString("accessGroup")
        let accessible = call.getString("accessible")
        let store = (service != nil || accessGroup != nil)
            ? KeychainStorage(service: service, accessGroup: accessGroup)
            : keychainStorage

        do {
            _ = try store.set(key: key, value: value, accessible: accessible)
            call.resolve()
        } catch {
            call.reject("Failed to write keychain item", nil, error)
        }
    }
}
