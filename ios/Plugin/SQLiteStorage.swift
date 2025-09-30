import Foundation
import SQLite3

@objc public class SQLiteStorage: NSObject {
    private var db: OpaquePointer?
    private let dbName: String
    private let tableName = "strata_storage"
    
    @objc public init(dbName: String = "strata.db") {
        self.dbName = dbName
        super.init()
        openDatabase()
        createTable()
    }
    
    deinit {
        closeDatabase()
    }
    
    private func openDatabase() {
        let fileURL = try! FileManager.default
            .url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
            .appendingPathComponent(dbName)
        
        if sqlite3_open(fileURL.path, &db) != SQLITE_OK {
            print("Unable to open database")
        }
    }
    
    private func closeDatabase() {
        sqlite3_close(db)
    }
    
    private func createTable() {
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
        if sqlite3_prepare_v2(db, createTableString, -1, &createTableStatement, nil) == SQLITE_OK {
            if sqlite3_step(createTableStatement) == SQLITE_DONE {
                print("Storage table created.")
            }
        }
        sqlite3_finalize(createTableStatement)
    }
    
    @objc public func set(key: String, value: Data, expires: Int64? = nil, tags: [String]? = nil, metadata: [String: Any]? = nil) -> Bool {
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
            sqlite3_bind_blob(statement, 2, (value as NSData).bytes, Int32(value.count), nil) == SQLITE_OK &&
            sqlite3_bind_int64(statement, 3, now) == SQLITE_OK &&
            sqlite3_bind_int64(statement, 4, now) == SQLITE_OK &&
            (expires != nil ? sqlite3_bind_int64(statement, 5, expires!) : sqlite3_bind_null(statement, 5)) == SQLITE_OK &&
            (tagsJson != nil ? sqlite3_bind_blob(statement, 6, (tagsJson! as NSData).bytes, Int32(tagsJson!.count), nil) : sqlite3_bind_null(statement, 6)) == SQLITE_OK &&
            (metadataJson != nil ? sqlite3_bind_blob(statement, 7, (metadataJson! as NSData).bytes, Int32(metadataJson!.count), nil) : sqlite3_bind_null(statement, 7)) == SQLITE_OK &&
            sqlite3_step(statement) == SQLITE_DONE
        
        sqlite3_finalize(statement)
        return result
    }
    
    @objc public func get(key: String) -> [String: Any]? {
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
        let deleteSQL = "DELETE FROM \(tableName) WHERE key = ?"
        var statement: OpaquePointer?
        
        let result = sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK &&
            sqlite3_bind_text(statement, 1, key, -1, nil) == SQLITE_OK &&
            sqlite3_step(statement) == SQLITE_DONE
        
        sqlite3_finalize(statement)
        return result
    }
    
    @objc public func clear(prefix: String? = nil) -> Bool {
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
}