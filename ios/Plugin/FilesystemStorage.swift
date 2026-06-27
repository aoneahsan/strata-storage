import Foundation
import os.log

/**
 * Filesystem-backed storage: one file per key under
 * `<Documents>/strata_storage/`.
 *
 * Value-shape contract (matches src/plugin/definitions.ts, same as SQLite):
 * - File contents are the JSON-serialized FULL `StorageValue` wrapper
 *   `{ value, created, updated, expires?, tags?, metadata?, ... }`.
 * - `get` parses the bytes back into the wrapper object; the plugin resolves
 *   `{ value: wrapper }`. Missing file OR non-object bytes → miss (no crash).
 *
 * File naming: the storage key is percent-encoded with an allowed set that
 * EXCLUDES `/` (and `%`), so the encoding is reversible and never escapes the
 * storage directory. `decodeFileName` reverses it for `keys()`.
 *
 * Durability: writes go to a temp file in the same directory and are then
 * atomically replaced into place, so a crash mid-write cannot leave a torn
 * file at the real path.
 */
@objc public class FilesystemStorage: NSObject {
    private let directory: URL
    private let stagingDirectory: URL
    private let logger = OSLog(subsystem: "com.strata.storage", category: "FilesystemStorage")
    private let lock = NSLock()

    /// Reserved staging subdirectory name (inside the storage dir) holding
    /// in-flight temp files for atomic writes. Enumeration skips it by name, so
    /// a temp file can never collide with an encoded key file (e.g. a real key
    /// literally named ".tmp-x").
    private static let stagingDirName = ".strata-staging"

    /// Characters allowed verbatim in an on-disk file name. Anything else
    /// (notably `/` and `%`) is percent-escaped, keeping the name reversible
    /// and confined to a single path component.
    private static let fileNameAllowed: CharacterSet = {
        var set = CharacterSet.alphanumerics
        set.insert(charactersIn: "-_. ")
        return set
    }()

    @objc public override init() {
        let base = (try? FileManager.default.url(
            for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        )) ?? URL(fileURLWithPath: NSTemporaryDirectory())
        let storageDir = base.appendingPathComponent("strata_storage", isDirectory: true)
        self.directory = storageDir
        self.stagingDirectory = storageDir.appendingPathComponent(FilesystemStorage.stagingDirName, isDirectory: true)
        super.init()
        ensureDirectory()
    }

    private func ensureDirectory() {
        for dir in [directory, stagingDirectory] {
            if !FileManager.default.fileExists(atPath: dir.path) {
                do {
                    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                } catch {
                    os_log("Failed to create filesystem storage dir: %{public}@", log: logger, type: .error, error.localizedDescription)
                }
            }
        }
    }

    @objc public func isAvailable() -> Bool {
        ensureDirectory()
        var isDirectory: ObjCBool = false
        return FileManager.default.fileExists(atPath: directory.path, isDirectory: &isDirectory) && isDirectory.boolValue
    }

    /// Reversible encoding of a storage key → safe single-component file name.
    private func encodeFileName(_ key: String) -> String {
        // addingPercentEncoding only returns nil for invalid unichar sequences,
        // which a Swift String key cannot contain; fall back defensively.
        return key.addingPercentEncoding(withAllowedCharacters: FilesystemStorage.fileNameAllowed) ?? key
    }

    /// Reverses `encodeFileName`. Returns nil if the name cannot be decoded.
    private func decodeFileName(_ name: String) -> String? {
        return name.removingPercentEncoding
    }

    private func fileURL(forKey key: String) -> URL {
        return directory.appendingPathComponent(encodeFileName(key), isDirectory: false)
    }

    /**
     * Persist the full `StorageValue` wrapper for `key`. The wrapper is
     * JSON-encoded and written atomically (temp file + replace).
     */
    @objc public func set(key: String, wrapper: [String: Any]) throws -> Bool {
        lock.lock()
        defer { lock.unlock() }
        ensureDirectory()
        let data = try JSONSerialization.data(withJSONObject: wrapper, options: [])
        let target = fileURL(forKey: key)

        // Atomic write: stage to a unique temp file in the reserved staging
        // subdir (same volume → atomic rename), then replace. The staging subdir
        // keeps temp names out of the key namespace entirely.
        let temp = stagingDirectory.appendingPathComponent(UUID().uuidString, isDirectory: false)
        do {
            try data.write(to: temp, options: .atomic)
            if FileManager.default.fileExists(atPath: target.path) {
                _ = try FileManager.default.replaceItemAt(target, withItemAt: temp)
            } else {
                try FileManager.default.moveItem(at: temp, to: target)
            }
        } catch {
            // Clean up the temp file on any failure so we don't leak partials.
            try? FileManager.default.removeItem(at: temp)
            throw error
        }
        return true
    }

    /**
     * Read the wrapper object for `key`. Missing file OR bytes that are not a
     * JSON object → nil (treated as a miss; never throws on corrupt data).
     */
    @objc public func get(key: String) -> [String: Any]? {
        lock.lock()
        defer { lock.unlock() }
        let url = fileURL(forKey: key)
        guard let data = try? Data(contentsOf: url) else {
            return nil
        }
        guard let wrapper = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            return nil
        }
        return wrapper
    }

    @objc public func remove(key: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        let url = fileURL(forKey: key)
        if !FileManager.default.fileExists(atPath: url.path) {
            return true // already absent — treat as success/idempotent
        }
        do {
            try FileManager.default.removeItem(at: url)
            return true
        } catch {
            os_log("Failed to remove filesystem key: %{public}@", log: logger, type: .error, error.localizedDescription)
            return false
        }
    }

    /// Clears stored entries. When `prefix` is set, only keys starting with it
    /// are removed; otherwise the whole storage directory contents are removed.
    @objc public func clear(prefix: String? = nil) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        let names = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        var ok = true
        for name in names {
            // Skip the staging subdirectory (never a key).
            if name == FilesystemStorage.stagingDirName { continue }
            guard let key = decodeFileName(name) else { continue }
            if let prefix = prefix, !key.hasPrefix(prefix) { continue }
            do {
                try FileManager.default.removeItem(at: directory.appendingPathComponent(name, isDirectory: false))
            } catch {
                ok = false
            }
        }
        // On a full clear, also drop any orphaned in-flight temp files.
        if prefix == nil, let temps = try? FileManager.default.contentsOfDirectory(atPath: stagingDirectory.path) {
            for temp in temps {
                try? FileManager.default.removeItem(at: stagingDirectory.appendingPathComponent(temp, isDirectory: false))
            }
        }
        return ok
    }

    /// Lists stored keys, decoding file names back to their original keys.
    /// When `pattern` is set, applies the same prefix/contains matching the
    /// other backends use.
    @objc public func keys(pattern: String? = nil) -> [String] {
        lock.lock()
        defer { lock.unlock() }
        let names = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        var keys: [String] = []
        for name in names {
            if name == FilesystemStorage.stagingDirName { continue }
            guard let key = decodeFileName(name) else { continue }
            keys.append(key)
        }
        guard let pattern = pattern else { return keys }
        return keys.filter { $0.hasPrefix(pattern) || $0.contains(pattern) }
    }

    /**
     * Aggregate sizes over the storage directory.
     *
     * `count` = number of entry files; `values` = sum of file byte sizes;
     * `keys` = sum of decoded-key UTF-8 byte lengths; `metadata` = sum of the
     * serialized `metadata` segment per file (0 when absent or unparseable);
     * `total` = `keys` + `values`.
     */
    @objc public func size() -> [String: Int] {
        lock.lock()
        defer { lock.unlock() }
        let names = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        var count = 0
        var keysSize = 0
        var valuesSize = 0
        var metadataSize = 0

        for name in names {
            if name == FilesystemStorage.stagingDirName { continue }
            guard let key = decodeFileName(name) else { continue }
            let url = directory.appendingPathComponent(name, isDirectory: false)
            count += 1
            keysSize += key.data(using: .utf8)?.count ?? 0

            if let data = try? Data(contentsOf: url) {
                valuesSize += data.count
                if let wrapper = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                   let metadata = wrapper["metadata"],
                   let metadataData = try? JSONSerialization.data(withJSONObject: metadata, options: []) {
                    metadataSize += metadataData.count
                }
            }
        }

        return [
            "count": count,
            "keys": keysSize,
            "values": valuesSize,
            "metadata": metadataSize,
            "total": keysSize + valuesSize
        ]
    }
}
