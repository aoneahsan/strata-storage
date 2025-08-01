"use strict";
/**
 * SQLite Adapter - Native SQLite database storage
 * Available on iOS and Android
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const plugin_1 = require("@/plugin");
const errors_1 = require("@/utils/errors");
const utils_1 = require("@/utils");
/**
 * Native SQLite adapter using Capacitor plugin
 */
class SqliteAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'sqlite';
    capabilities = {
        persistent: true,
        synchronous: false,
        observable: false,
        transactional: true,
        queryable: true,
        maxSize: -1, // Limited by device storage
        binary: true,
        encrypted: false, // Can be encrypted at OS level
        crossTab: true,
    };
    database;
    table;
    constructor(config = {}) {
        super();
        this.database = config.database || 'strata_storage';
        this.table = config.table || 'storage';
    }
    /**
     * Check if SQLite is available
     */
    async isAvailable() {
        if (!(0, utils_1.isCapacitor)())
            return false;
        try {
            const result = await plugin_1.StrataStorage.isAvailable({ storage: 'sqlite' });
            return result.available;
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize the adapter
     */
    async initialize(config) {
        if (config?.database)
            this.database = config.database;
        if (config?.table)
            this.table = config.table;
        this.startTTLCleanup();
    }
    /**
     * Get a value from SQLite
     */
    async get(key) {
        try {
            const result = await plugin_1.StrataStorage.get({
                key,
                storage: 'sqlite',
                database: this.database,
                table: this.table,
            });
            if (!result.value)
                return null;
            const value = result.value;
            // Check TTL
            if (this.isExpired(value)) {
                await this.remove(key);
                return null;
            }
            return value;
        }
        catch (error) {
            console.error(`Failed to get key ${key} from SQLite:`, error);
            return null;
        }
    }
    /**
     * Set a value in SQLite
     */
    async set(key, value) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.set({
                key,
                value,
                storage: 'sqlite',
                database: this.database,
                table: this.table,
            });
            this.emitChange(key, oldValue?.value, value.value, 'local');
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to set key ${key} in SQLite: ${error}`);
        }
    }
    /**
     * Remove a value from SQLite
     */
    async remove(key) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.remove({
                key,
                storage: 'sqlite',
                database: this.database,
                table: this.table,
            });
            if (oldValue) {
                this.emitChange(key, oldValue.value, undefined, 'local');
            }
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to remove key ${key} from SQLite: ${error}`);
        }
    }
    /**
     * Clear SQLite table
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            try {
                await plugin_1.StrataStorage.clear({
                    storage: 'sqlite',
                    database: this.database,
                    table: this.table,
                });
                this.emitChange('*', undefined, undefined, 'local');
                return;
            }
            catch (error) {
                throw new errors_1.StorageError(`Failed to clear SQLite: ${error}`);
            }
        }
        // Use base implementation for filtered clear
        await super.clear(options);
    }
    /**
     * Get all keys
     */
    async keys(pattern) {
        try {
            const result = await plugin_1.StrataStorage.keys({
                storage: 'sqlite',
                database: this.database,
                table: this.table,
                pattern: pattern instanceof RegExp ? pattern.source : pattern,
            });
            const keys = result.keys;
            // Check for expired keys
            const validKeys = [];
            for (const key of keys) {
                const value = await this.get(key);
                if (value) {
                    validKeys.push(key);
                }
            }
            return this.filterKeys(validKeys, pattern);
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get keys from SQLite: ${error}`);
        }
    }
    /**
     * Query SQLite with conditions
     */
    async query(condition) {
        try {
            if (!plugin_1.StrataStorage.query) {
                throw new errors_1.StorageError('Query not supported on this platform');
            }
            const result = await plugin_1.StrataStorage.query({
                storage: 'sqlite',
                database: this.database,
                table: this.table,
                condition,
            });
            // Filter expired entries
            const validResults = [];
            for (const item of result.results) {
                const value = await this.get(item.key);
                if (value) {
                    validResults.push({ key: item.key, value: value.value });
                }
            }
            return validResults;
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to query SQLite: ${error}`);
        }
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        try {
            const result = await plugin_1.StrataStorage.size({
                storage: 'sqlite',
                database: this.database,
                table: this.table,
                detailed,
            });
            return result;
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get size of SQLite: ${error}`);
        }
    }
    /**
     * Begin a transaction
     */
    async transaction() {
        // Transactions are handled natively
        // For now, return a simple implementation
        return new SqliteTransaction(this);
    }
}
exports.SqliteAdapter = SqliteAdapter;
/**
 * SQLite transaction implementation
 */
class SqliteTransaction {
    adapter;
    operations = [];
    committed = false;
    aborted = false;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async get(key) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        const value = await this.adapter.get(key);
        return value ? value.value : null;
    }
    async set(key, value) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        this.operations.push(async () => {
            const now = Date.now();
            await this.adapter.set(key, {
                value,
                created: now,
                updated: now,
            });
        });
    }
    async remove(key) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        this.operations.push(async () => {
            await this.adapter.remove(key);
        });
    }
    async commit() {
        if (this.aborted)
            throw new errors_1.TransactionError('Cannot commit aborted transaction');
        if (this.committed)
            throw new errors_1.TransactionError('Transaction already committed');
        this.committed = true;
        // Execute all operations
        for (const operation of this.operations) {
            await operation();
        }
    }
    async rollback() {
        if (this.committed)
            throw new errors_1.TransactionError('Cannot rollback committed transaction');
        if (this.aborted)
            return;
        this.aborted = true;
        this.operations = [];
    }
}
//# sourceMappingURL=SqliteAdapter.js.map