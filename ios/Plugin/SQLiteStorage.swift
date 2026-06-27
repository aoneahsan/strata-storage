import Foundation
import SQLite3
import os.log

/// SQLITE_TRANSIENT tells SQLite to copy bound bytes immediately, which is
/// required when binding Swift `String`/`Data` whose buffers may be freed
/// before `sqlite3_step` runs. Passing `nil` (SQLITE_STATIC) here is a
/// use-after-free hazard for transient Swift buffers.
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

/**
 * SQLite-backed storage for one `(database, table)` pair.
 *
 * Multi-store design:
 * - One `SQLiteStorage` instance owns one open DB handle for one database file.
 * - A single instance can serve many tables in that file; tables are created
 *   on first use (see `ensureTable`).
 * - The plugin caches one instance per database filename (see
 *   `SQLiteStorageManager`) so the DB is opened once, not per call.
 *
 * Value-shape contract (matches src/plugin/definitions.ts):
 * - `set` receives the FULL `StorageValue` wrapper object
 *   `{ value, created, updated, expires?, tags?, metadata?, ... }`. The whole
 *   wrapper is JSON-serialized into the `value` column for a perfect
 *   round-trip. `created`/`updated`/`expires`/`tags`/`metadata` are ALSO
 *   mirrored into dedicated columns so native TTL cleanup + `query` can use
 *   them without re-parsing the blob.
 * - `get` parses the `value` column bytes back into the wrapper object and the
 *   plugin resolves `{ value: wrapper }`. Corrupt/legacy bytes that do not
 *   parse as a JSON object are treated as a miss (never a crash).
 *
 * SQL-safety: only the table identifier is interpolated into SQL, and it is
 * pre-sanitized to `^[A-Za-z0-9_]+$` by the plugin. All user values are bound
 * parameters.
 */
@objc public class SQLiteStorage: NSObject {
    private var db: OpaquePointer?
    private let dbName: String
    /// Tables already verified/created on this handle, to skip redundant DDL.
    private var ensuredTables: Set<String> = []
    private let logger = OSLog(subsystem: "com.strata.storage", category: "SQLiteStorage")

    /// Opens (or creates) the database file `<dbName>` under Documents.
    /// `dbName` MUST already be a sanitized filename (e.g. `storage.db`).
    @objc public init(dbName: String = "strata_storage.db") {
        self.dbName = dbName
        super.init()
        do {
            try openDatabase()
        } catch {
            os_log("Failed to initialize SQLite storage: %{public}@", log: logger, type: .error, error.localizedDescription)
        }
    }

    @objc public var isOpen: Bool {
        return db != nil
    }

    deinit {
        closeDatabase()
    }

    private func openDatabase() throws {
        guard let fileURL = try? FileManager.default
            .url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
            .appendingPathComponent(dbName) else {
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1001,
                userInfo: [NSLocalizedDescriptionKey: "Unable to access document directory"]
            )
        }

        guard sqlite3_open(fileURL.path, &db) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            sqlite3_close(db)
            db = nil
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1002,
                userInfo: [NSLocalizedDescriptionKey: "Unable to open database: \(errorMessage)"]
            )
        }
    }

    private func closeDatabase() {
        if db != nil {
            sqlite3_close(db)
            db = nil
        }
    }

    /// Creates the table for `table` if it does not exist yet. Cached per
    /// instance so repeated calls are cheap. `table` MUST be pre-sanitized.
    private func ensureTable(_ table: String) throws {
        guard let db = db else {
            throw notInitializedError()
        }
        if ensuredTables.contains(table) { return }

        let createTableString = """
            CREATE TABLE IF NOT EXISTS \(table) (
                key TEXT PRIMARY KEY NOT NULL,
                value BLOB NOT NULL,
                created INTEGER NOT NULL,
                updated INTEGER NOT NULL,
                expires INTEGER,
                tags TEXT,
                metadata TEXT
            );
        """

        var createTableStatement: OpaquePointer?
        defer { sqlite3_finalize(createTableStatement) }

        guard sqlite3_prepare_v2(db, createTableString, -1, &createTableStatement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1003,
                userInfo: [NSLocalizedDescriptionKey: "Failed to prepare CREATE TABLE: \(errorMessage)"]
            )
        }

        guard sqlite3_step(createTableStatement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1004,
                userInfo: [NSLocalizedDescriptionKey: "Failed to create table: \(errorMessage)"]
            )
        }

        ensuredTables.insert(table)
    }

    private func notInitializedError() -> NSError {
        return NSError(
            domain: "StrataStorage.SQLiteStorage",
            code: 1000,
            userInfo: [NSLocalizedDescriptionKey: "Database not initialized"]
        )
    }

    /**
     * Persist a full `StorageValue` wrapper for `key` in `table`.
     *
     * The entire `wrapper` dictionary is JSON-encoded into the `value` column
     * (perfect round-trip). `created`/`updated`/`expires` and the JSON of
     * `tags`/`metadata` are extracted into their own columns for TTL + query.
     * Values are bound parameters; only `table` is interpolated (pre-sanitized).
     */
    @objc public func set(table: String, key: String, wrapper: [String: Any]) throws -> Bool {
        guard let db = db else { throw notInitializedError() }
        try ensureTable(table)

        // Serialize the whole wrapper for round-trip storage.
        let blob = try JSONSerialization.data(withJSONObject: wrapper, options: [])

        // Extract mirror columns from the wrapper. created/updated are required
        // by the wrapper contract; fall back to "now" defensively.
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let created = (wrapper["created"] as? NSNumber)?.int64Value ?? now
        let updated = (wrapper["updated"] as? NSNumber)?.int64Value ?? now
        let expires = (wrapper["expires"] as? NSNumber)?.int64Value

        let tagsData: Data?
        if let tags = wrapper["tags"] {
            tagsData = try? JSONSerialization.data(withJSONObject: tags, options: [])
        } else {
            tagsData = nil
        }

        let metadataData: Data?
        if let metadata = wrapper["metadata"] {
            metadataData = try? JSONSerialization.data(withJSONObject: metadata, options: [])
        } else {
            metadataData = nil
        }

        let insertSQL = """
            INSERT OR REPLACE INTO \(table)
            (key, value, created, updated, expires, tags, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """

        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, insertSQL, -1, &statement, nil) == SQLITE_OK else {
            return false
        }

        let ok =
            sqlite3_bind_text(statement, 1, key, -1, SQLITE_TRANSIENT) == SQLITE_OK &&
            blob.withUnsafeBytes { sqlite3_bind_blob(statement, 2, $0.baseAddress, Int32(blob.count), SQLITE_TRANSIENT) } == SQLITE_OK &&
            sqlite3_bind_int64(statement, 3, created) == SQLITE_OK &&
            sqlite3_bind_int64(statement, 4, updated) == SQLITE_OK &&
            (expires != nil ? sqlite3_bind_int64(statement, 5, expires!) : sqlite3_bind_null(statement, 5)) == SQLITE_OK &&
            bindOptionalBlob(statement, 6, tagsData) == SQLITE_OK &&
            bindOptionalBlob(statement, 7, metadataData) == SQLITE_OK

        guard ok else { return false }
        return sqlite3_step(statement) == SQLITE_DONE
    }

    /// Binds `data` as a blob to `index`, or NULL when `data` is nil.
    private func bindOptionalBlob(_ statement: OpaquePointer?, _ index: Int32, _ data: Data?) -> Int32 {
        guard let data = data else {
            return sqlite3_bind_null(statement, index)
        }
        return data.withUnsafeBytes {
            sqlite3_bind_blob(statement, index, $0.baseAddress, Int32(data.count), SQLITE_TRANSIENT)
        }
    }

    /**
     * Read the wrapper object for `key` from `table`.
     *
     * Returns the decoded `StorageValue` wrapper dictionary, or `nil` for a
     * missing row OR when stored bytes do not parse as a JSON object
     * (legacy/corrupt data is treated as a miss, never a crash).
     */
    @objc public func get(table: String, key: String) -> [String: Any]? {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return nil
        }
        // Reading a table that was never created is a miss, not an error.
        try? ensureTable(table)

        let querySQL = "SELECT value FROM \(table) WHERE key = ? LIMIT 1"
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK,
              sqlite3_bind_text(statement, 1, key, -1, SQLITE_TRANSIENT) == SQLITE_OK else {
            return nil
        }

        guard sqlite3_step(statement) == SQLITE_ROW,
              let blob = sqlite3_column_blob(statement, 0) else {
            return nil
        }

        let valueData = Data(bytes: blob, count: Int(sqlite3_column_bytes(statement, 0)))
        // The wrapper is always a JSON object. Anything else = legacy/corrupt → miss.
        guard let wrapper = try? JSONSerialization.jsonObject(with: valueData, options: []) as? [String: Any] else {
            return nil
        }
        return wrapper
    }

    @objc public func remove(table: String, key: String) -> Bool {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return false
        }
        try? ensureTable(table)

        let deleteSQL = "DELETE FROM \(table) WHERE key = ?"
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK,
              sqlite3_bind_text(statement, 1, key, -1, SQLITE_TRANSIENT) == SQLITE_OK else {
            return false
        }
        return sqlite3_step(statement) == SQLITE_DONE
    }

    @objc public func clear(table: String, prefix: String? = nil) -> Bool {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return false
        }
        try? ensureTable(table)

        let deleteSQL: String
        if prefix != nil {
            deleteSQL = "DELETE FROM \(table) WHERE key LIKE ?"
        } else {
            deleteSQL = "DELETE FROM \(table)"
        }

        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK else {
            return false
        }
        if let prefix = prefix {
            guard sqlite3_bind_text(statement, 1, "\(prefix)%", -1, SQLITE_TRANSIENT) == SQLITE_OK else {
                return false
            }
        }
        return sqlite3_step(statement) == SQLITE_DONE
    }

    @objc public func keys(table: String, pattern: String? = nil) -> [String] {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return []
        }
        try? ensureTable(table)

        // Exclude expired rows in SQL so the TS adapter does not need a per-key
        // get() to drop them (eliminates the keys() N+1).
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let notExpired = "(expires IS NULL OR expires > ?)"
        let querySQL: String
        if pattern != nil {
            querySQL = "SELECT key FROM \(table) WHERE key LIKE ? AND \(notExpired)"
        } else {
            querySQL = "SELECT key FROM \(table) WHERE \(notExpired)"
        }

        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }
        var keys: [String] = []

        if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
            var bindIndex: Int32 = 1
            if let pattern = pattern {
                // `%pattern%` mirrors the contains-matching used by other backends.
                sqlite3_bind_text(statement, bindIndex, "%\(pattern)%", -1, SQLITE_TRANSIENT)
                bindIndex += 1
            }
            sqlite3_bind_int64(statement, bindIndex, now)
            while sqlite3_step(statement) == SQLITE_ROW {
                if let key = sqlite3_column_text(statement, 0) {
                    keys.append(String(cString: key))
                }
            }
        }
        return keys
    }

    /**
     * Aggregate sizes for `table`.
     *
     * Returns `count`, `total` (= `keys` + `values`), and per-segment byte
     * sums: `keys` = SUM(LENGTH(key)), `values` = SUM(LENGTH(value)),
     * `metadata` = SUM(LENGTH(metadata)) treating NULL as 0. The plugin decides
     * whether to surface the `detailed` segment based on the `detailed` flag.
     */
    @objc public func size(table: String) throws -> [String: Int] {
        guard let db = db else { throw notInitializedError() }
        try ensureTable(table)

        let querySQL = """
            SELECT COUNT(*),
                   COALESCE(SUM(LENGTH(key)), 0),
                   COALESCE(SUM(LENGTH(value)), 0),
                   COALESCE(SUM(LENGTH(metadata)), 0)
            FROM \(table)
        """
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        var count = 0
        var keysSize = 0
        var valuesSize = 0
        var metadataSize = 0

        if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK,
           sqlite3_step(statement) == SQLITE_ROW {
            count = Int(sqlite3_column_int(statement, 0))
            keysSize = Int(sqlite3_column_int64(statement, 1))
            valuesSize = Int(sqlite3_column_int64(statement, 2))
            metadataSize = Int(sqlite3_column_int64(statement, 3))
        }

        return [
            "count": count,
            "keys": keysSize,
            "values": valuesSize,
            "metadata": metadataSize,
            "total": keysSize + valuesSize
        ]
    }

    /**
     * Returns non-expired rows as `{ key, value }` where `value` is the full
     * `StorageValue` wrapper (parsed from the stored JSON blob). Returning the
     * wrapper here lets the JS SqliteAdapter run the real query `condition` in
     * JS from a SINGLE round-trip instead of re-fetching each key (eliminates
     * the query() N+1). Expired rows are filtered in SQL; an unparseable legacy
     * payload surfaces as key-only (the JS side falls back to `get()`, a miss).
     * The `condition` argument is accepted for forward-compatibility but is not
     * yet pushed down into SQL.
     */
    @objc public func query(table: String, condition: [String: Any]) -> [[String: Any]] {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return []
        }
        try? ensureTable(table)

        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let querySQL = "SELECT key, value FROM \(table) WHERE (expires IS NULL OR expires > ?)"
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }
        var rows: [[String: Any]] = []

        if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_int64(statement, 1, now)
            while sqlite3_step(statement) == SQLITE_ROW {
                guard let keyCString = sqlite3_column_text(statement, 0) else { continue }
                var row: [String: Any] = ["key": String(cString: keyCString)]
                if let blob = sqlite3_column_blob(statement, 1) {
                    let valueData = Data(bytes: blob, count: Int(sqlite3_column_bytes(statement, 1)))
                    if let wrapper = try? JSONSerialization.jsonObject(with: valueData, options: []) as? [String: Any] {
                        row["value"] = wrapper
                    }
                }
                rows.append(row)
            }
        }
        return rows
    }

    /**
     * Delete every expired row (`expires <= now`) in one statement and return
     * the number removed. Because `keys` and `query` now filter expired rows in
     * SQL (no lazy per-key deletion on read), this is what reclaims their
     * physical storage; the JS adapter calls it on its TTL cleanup tick.
     */
    @objc public func cleanupExpired(table: String) -> Int {
        guard let db = db else {
            os_log("Database not initialized", log: logger, type: .error)
            return 0
        }
        try? ensureTable(table)

        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let deleteSQL = "DELETE FROM \(table) WHERE expires IS NOT NULL AND expires <= ?"
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK,
              sqlite3_bind_int64(statement, 1, now) == SQLITE_OK,
              sqlite3_step(statement) == SQLITE_DONE else {
            return 0
        }
        return Int(sqlite3_changes(db))
    }
}

/**
 * Caches one open `SQLiteStorage` (and thus one DB handle) per database
 * filename, so the database is opened once per file instead of on every
 * bridge call. Access is serialized with a lock because Capacitor may dispatch
 * plugin calls on a background queue.
 */
final class SQLiteStorageManager {
    static let shared = SQLiteStorageManager()

    private var stores: [String: SQLiteStorage] = [:]
    private let lock = NSLock()

    private init() {}

    /// Returns the cached store for `fileName` (e.g. `storage.db`), creating it
    /// on first use. `fileName` MUST already be sanitized.
    func store(forFile fileName: String) -> SQLiteStorage {
        lock.lock()
        defer { lock.unlock() }
        if let existing = stores[fileName] {
            return existing
        }
        let created = SQLiteStorage(dbName: fileName)
        stores[fileName] = created
        return created
    }
}
