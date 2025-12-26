import Foundation
import SQLite3
import os.log

@objc public class SQLiteStorage: NSObject {
    private var db: OpaquePointer?
    private let dbName: String
    private let tableName = "strata_storage"
    private let logger = OSLog(subsystem: "com.strata.storage", category: "SQLiteStorage")
    
    @objc public init(dbName: String = "strata.db") {
        self.dbName = dbName
        super.init()
        do {
            try openDatabase()
            try createTable()
        } catch {
            os_log("Failed to initialize SQLite storage: %{public}@", log: logger, type: .error, error.localizedDescription)
        }
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
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1002,
                userInfo: [NSLocalizedDescriptionKey: "Unable to open database: \(errorMessage)"]
            )
        }
    }
    
    private func closeDatabase() {
        sqlite3_close(db)
    }
    
    private func createTable() throws {
        let createTableString = """
            CREATE TABLE IF NOT EXISTS \(tableName) (
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

        guard sqlite3_prepare_v2(db, createTableString, -1, &createTableStatement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1003,
                userInfo: [NSLocalizedDescriptionKey: "Failed to prepare CREATE TABLE: \(errorMessage)"]
            )
        }

        defer {
            sqlite3_finalize(createTableStatement)
        }

        guard sqlite3_step(createTableStatement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1004,
                userInfo: [NSLocalizedDescriptionKey: "Failed to create table: \(errorMessage)"]
            )
        }
    }
    
    @objc public func set(key: String, value: Any, expires: Int64? = nil, tags: [String]? = nil, metadata: [String: Any]? = nil) throws -> Bool {
        guard let db = db else {
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1000,
                userInfo: [NSLocalizedDescriptionKey: "Database not initialized"]
            )
        }

        let data: Data

        if let dataValue = value as? Data {
            data = dataValue
        } else if let stringValue = value as? String {
            data = stringValue.data(using: .utf8) ?? Data()
        } else {
            // Convert to JSON for complex objects
            data = try JSONSerialization.data(withJSONObject: value, options: [])
        }
        
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let tagsJson = tags != nil ? try? JSONSerialization.data(withJSONObject: tags!, options: []) : nil
        let metadataJson = metadata != nil ? try? JSONSerialization.data(withJSONObject: metadata!, options: []) : nil
        
        let insertSQL = """
            INSERT OR REPLACE INTO \(tableName) 
            (key, value, created, updated, expires, tags, metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        var statement: OpaquePointer?
        let result = sqlite3_prepare_v2(db, insertSQL, -1, &statement, nil) == SQLITE_OK &&
            sqlite3_bind_text(statement, 1, key, -1, nil) == SQLITE_OK &&
            sqlite3_bind_blob(statement, 2, (data as NSData).bytes, Int32(data.count), nil) == SQLITE_OK &&
            sqlite3_bind_int64(statement, 3, now) == SQLITE_OK &&
            sqlite3_bind_int64(statement, 4, now) == SQLITE_OK &&
            (expires != nil ? sqlite3_bind_int64(statement, 5, expires!) : sqlite3_bind_null(statement, 5)) == SQLITE_OK &&
            (tagsJson != nil ? sqlite3_bind_blob(statement, 6, (tagsJson! as NSData).bytes, Int32(tagsJson!.count), nil) : sqlite3_bind_null(statement, 6)) == SQLITE_OK &&
            (metadataJson != nil ? sqlite3_bind_blob(statement, 7, (metadataJson! as NSData).bytes, Int32(metadataJson!.count), nil) : sqlite3_bind_null(statement, 7)) == SQLITE_OK &&
            sqlite3_step(statement) == SQLITE_DONE
        
        sqlite3_finalize(statement)
        return result
    }
    
    // Convenience method for simple values
    @objc public func set(key: String, value: Any) throws -> Bool {
        return try set(key: key, value: value, expires: nil, tags: nil, metadata: nil)
    }
    
    @objc public func get(key: String) -> [String: Any]? {
        guard db != nil else {
            os_log("Database not initialized", log: logger, type: .error)
            return nil
        }

        let querySQL = "SELECT * FROM \(tableName) WHERE key = ? LIMIT 1"
        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK,
              sqlite3_bind_text(statement, 1, key, -1, nil) == SQLITE_OK else {
            sqlite3_finalize(statement)
            return nil
        }
        
        var result: [String: Any]?
        if sqlite3_step(statement) == SQLITE_ROW {
            let valueData = Data(bytes: sqlite3_column_blob(statement, 1), count: Int(sqlite3_column_bytes(statement, 1)))
            let created = sqlite3_column_int64(statement, 2)
            let updated = sqlite3_column_int64(statement, 3)
            
            result = [
                "key": key,
                "value": valueData,
                "created": created,
                "updated": updated
            ]
            
            if sqlite3_column_type(statement, 4) != SQLITE_NULL {
                result!["expires"] = sqlite3_column_int64(statement, 4)
            }
            
            if sqlite3_column_type(statement, 5) != SQLITE_NULL {
                let tagsData = Data(bytes: sqlite3_column_blob(statement, 5), count: Int(sqlite3_column_bytes(statement, 5)))
                if let tags = try? JSONSerialization.jsonObject(with: tagsData, options: []) {
                    result!["tags"] = tags
                }
            }
            
            if sqlite3_column_type(statement, 6) != SQLITE_NULL {
                let metadataData = Data(bytes: sqlite3_column_blob(statement, 6), count: Int(sqlite3_column_bytes(statement, 6)))
                if let metadata = try? JSONSerialization.jsonObject(with: metadataData, options: []) {
                    result!["metadata"] = metadata
                }
            }
        }
        
        sqlite3_finalize(statement)
        return result
    }
    
    @objc public func remove(key: String) -> Bool {
        guard db != nil else {
            os_log("Database not initialized", log: logger, type: .error)
            return false
        }

        let deleteSQL = "DELETE FROM \(tableName) WHERE key = ?"
        var statement: OpaquePointer?

        let result = sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK &&
            sqlite3_bind_text(statement, 1, key, -1, nil) == SQLITE_OK &&
            sqlite3_step(statement) == SQLITE_DONE

        sqlite3_finalize(statement)
        return result
    }
    
    @objc public func clear(prefix: String? = nil) -> Bool {
        guard db != nil else {
            os_log("Database not initialized", log: logger, type: .error)
            return false
        }

        let deleteSQL: String
        if let prefix = prefix {
            deleteSQL = "DELETE FROM \(tableName) WHERE key LIKE ?"
        } else {
            deleteSQL = "DELETE FROM \(tableName)"
        }

        var statement: OpaquePointer?
        var result = sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK

        if result && prefix != nil {
            result = sqlite3_bind_text(statement, 1, "\(prefix!)%", -1, nil) == SQLITE_OK
        }

        if result {
            result = sqlite3_step(statement) == SQLITE_DONE
        }

        sqlite3_finalize(statement)
        return result
    }
    
    @objc public func keys(pattern: String? = nil) -> [String] {
        guard db != nil else {
            os_log("Database not initialized", log: logger, type: .error)
            return []
        }

        let querySQL: String
        if let pattern = pattern {
            querySQL = "SELECT key FROM \(tableName) WHERE key LIKE ?"
        } else {
            querySQL = "SELECT key FROM \(tableName)"
        }

        var statement: OpaquePointer?
        var keys: [String] = []

        if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
            if let pattern = pattern {
                // Use % wildcard for SQL LIKE pattern matching
                sqlite3_bind_text(statement, 1, "%\(pattern)%", -1, nil)
            }

            while sqlite3_step(statement) == SQLITE_ROW {
                if let key = sqlite3_column_text(statement, 0) {
                    keys.append(String(cString: key))
                }
            }
        }

        sqlite3_finalize(statement)
        return keys
    }
    
    @objc public func size() throws -> (total: Int, count: Int) {
        guard db != nil else {
            throw NSError(
                domain: "StrataStorage.SQLiteStorage",
                code: 1000,
                userInfo: [NSLocalizedDescriptionKey: "Database not initialized"]
            )
        }

        let querySQL = "SELECT COUNT(*), SUM(LENGTH(value)) FROM \(tableName)"
        var statement: OpaquePointer?

        var totalSize = 0
        var count = 0

        if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) == SQLITE_ROW {
                count = Int(sqlite3_column_int(statement, 0))
                totalSize = Int(sqlite3_column_int64(statement, 1))
            }
        }

        sqlite3_finalize(statement)
        return (total: totalSize, count: count)
    }
}