"use strict";
/**
 * IndexedDB Adapter - Browser IndexedDB implementation
 * Provides large-scale persistent storage with advanced features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexedDBAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const utils_1 = require("@/utils");
const errors_1 = require("@/utils/errors");
/**
 * Browser IndexedDB adapter
 */
class IndexedDBAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'indexedDB';
    capabilities = {
        persistent: true,
        synchronous: false,
        observable: false, // No native change events
        transactional: true,
        queryable: true,
        maxSize: -1, // Browser dependent, typically GBs
        binary: true,
        encrypted: false,
        crossTab: false, // No built-in cross-tab sync
    };
    dbName;
    storeName;
    version;
    db;
    constructor(dbName = 'StrataStorage', storeName = 'storage', version = 1) {
        super();
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version;
    }
    /**
     * Check if IndexedDB is available
     */
    async isAvailable() {
        return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
    }
    /**
     * Initialize the adapter
     */
    async initialize(config) {
        if (config?.dbName)
            this.dbName = config.dbName;
        if (config?.storeName)
            this.storeName = config.storeName;
        if (config?.version)
            this.version = config.version;
        await this.openDatabase();
        this.startTTLCleanup();
    }
    /**
     * Open IndexedDB database
     */
    async openDatabase() {
        if (this.db)
            return this.db;
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const request = window.indexedDB.open(this.dbName, this.version);
        request.onerror = () => reject(new errors_1.StorageError(`Failed to open IndexedDB: ${request.error}`));
        request.onsuccess = () => {
            this.db = request.result;
            resolve(request.result);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(this.storeName)) {
                const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                // Create indexes for efficient querying
                store.createIndex('expires', 'expires', { unique: false });
                store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                store.createIndex('created', 'created', { unique: false });
                store.createIndex('updated', 'updated', { unique: false });
            }
        };
        return promise;
    }
    /**
     * Get a value from IndexedDB
     */
    async get(key) {
        const db = await this.openDatabase();
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => {
            const result = request.result;
            if (!result) {
                resolve(null);
                return;
            }
            // Remove the key property as it's not part of StorageValue
            const { key: _, ...value } = result;
            // Check TTL
            if (this.isExpired(value)) {
                // Don't wait for removal
                this.remove(key).catch(console.error);
                resolve(null);
            }
            else {
                resolve(value);
            }
        };
        request.onerror = () => reject(new errors_1.StorageError(`Failed to get key ${key}: ${request.error}`));
        return promise;
    }
    /**
     * Set a value in IndexedDB
     */
    async set(key, value) {
        const db = await this.openDatabase();
        const oldValue = await this.get(key);
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        // Add key to the value for IndexedDB storage
        const record = { key, ...value };
        const request = store.put(record);
        request.onsuccess = () => {
            resolve();
            this.emitChange(key, oldValue?.value, value.value, 'local');
        };
        request.onerror = () => {
            if (this.isQuotaError(request.error)) {
                reject(new errors_1.QuotaExceededError('IndexedDB quota exceeded', { key, size: (0, utils_1.getObjectSize)(value) }));
            }
            else {
                reject(new errors_1.StorageError(`Failed to set key ${key}: ${request.error}`));
            }
        };
        return promise;
    }
    /**
     * Remove a value from IndexedDB
     */
    async remove(key) {
        const db = await this.openDatabase();
        const oldValue = await this.get(key);
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
        request.onsuccess = () => {
            resolve();
            if (oldValue) {
                this.emitChange(key, oldValue.value, undefined, 'local');
            }
        };
        request.onerror = () => reject(new errors_1.StorageError(`Failed to remove key ${key}: ${request.error}`));
        return promise;
    }
    /**
     * Clear IndexedDB
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            // Clear everything
            const db = await this.openDatabase();
            const { promise, resolve, reject } = (0, utils_1.createDeferred)();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            request.onsuccess = () => {
                resolve();
                this.emitChange('*', undefined, undefined, 'local');
            };
            request.onerror = () => reject(new errors_1.StorageError(`Failed to clear store: ${request.error}`));
            return promise;
        }
        // Use base implementation for filtered clear
        await super.clear(options);
    }
    /**
     * Get all keys
     */
    async keys(pattern) {
        const db = await this.openDatabase();
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();
        request.onsuccess = async () => {
            const allKeys = request.result;
            // Filter expired keys
            const validKeys = [];
            for (const key of allKeys) {
                const value = await this.get(key);
                if (value) {
                    validKeys.push(key);
                }
            }
            resolve(this.filterKeys(validKeys, pattern));
        };
        request.onerror = () => reject(new errors_1.StorageError(`Failed to get keys: ${request.error}`));
        return promise;
    }
    /**
     * Query IndexedDB with conditions
     */
    async query(condition) {
        const db = await this.openDatabase();
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const results = [];
        // For now, we'll do a full scan and filter
        // In the future, we can optimize using indexes
        const request = store.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const record = cursor.value;
                const { key, ...value } = record;
                if (!this.isExpired(value) && this.queryEngine.matches(value.value, condition)) {
                    results.push({ key, value: value.value });
                }
                cursor.continue();
            }
            else {
                resolve(results);
            }
        };
        request.onerror = () => reject(new errors_1.StorageError(`Query failed: ${request.error}`));
        return promise;
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        const db = await this.openDatabase();
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        let total = 0;
        let count = 0;
        let keySize = 0;
        let valueSize = 0;
        let metadataSize = 0;
        const request = store.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const record = cursor.value;
                const { key, value, ...metadata } = record;
                count++;
                const recordKeySize = key.length * 2;
                const recordValueSize = (0, utils_1.getObjectSize)(value);
                const recordMetadataSize = (0, utils_1.getObjectSize)(metadata);
                total += recordKeySize + recordValueSize + recordMetadataSize;
                if (detailed) {
                    keySize += recordKeySize;
                    valueSize += recordValueSize;
                    metadataSize += recordMetadataSize;
                }
                cursor.continue();
            }
            else {
                const result = { total, count };
                if (detailed) {
                    result.detailed = {
                        keys: keySize,
                        values: valueSize,
                        metadata: metadataSize,
                    };
                }
                resolve(result);
            }
        };
        request.onerror = () => reject(new errors_1.StorageError(`Failed to calculate size: ${request.error}`));
        return promise;
    }
    /**
     * Begin a transaction
     */
    async transaction() {
        const db = await this.openDatabase();
        const txn = db.transaction([this.storeName], 'readwrite');
        const store = txn.objectStore(this.storeName);
        return new IndexedDBTransaction(store, txn);
    }
    /**
     * Close the adapter
     */
    async close() {
        if (this.db) {
            this.db.close();
            this.db = undefined;
        }
        if (super.close) {
            await super.close();
        }
    }
    /**
     * Check if error is quota exceeded
     */
    isQuotaError(error) {
        if (error instanceof Error || error instanceof DOMException) {
            return error.name === 'QuotaExceededError' || error.message.toLowerCase().includes('quota');
        }
        return false;
    }
}
exports.IndexedDBAdapter = IndexedDBAdapter;
/**
 * IndexedDB transaction implementation
 */
class IndexedDBTransaction {
    store;
    txn;
    committed = false;
    aborted = false;
    constructor(store, txn) {
        this.store = store;
        this.txn = txn;
    }
    async get(key) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const request = this.store.get(key);
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.value : null);
        };
        request.onerror = () => reject(new errors_1.StorageError(`Transaction get failed: ${request.error}`));
        return promise;
    }
    async set(key, value) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const now = Date.now();
        const record = {
            key,
            value,
            created: now,
            updated: now,
        };
        const request = this.store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new errors_1.StorageError(`Transaction set failed: ${request.error}`));
        return promise;
    }
    async remove(key) {
        if (this.aborted)
            throw new errors_1.TransactionError('Transaction already aborted');
        const { promise, resolve, reject } = (0, utils_1.createDeferred)();
        const request = this.store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new errors_1.StorageError(`Transaction remove failed: ${request.error}`));
        return promise;
    }
    async commit() {
        if (this.aborted)
            throw new errors_1.TransactionError('Cannot commit aborted transaction');
        if (this.committed)
            throw new errors_1.TransactionError('Transaction already committed');
        this.committed = true;
        // IndexedDB auto-commits when transaction completes
    }
    async rollback() {
        if (this.committed)
            throw new errors_1.TransactionError('Cannot rollback committed transaction');
        if (this.aborted)
            return;
        this.aborted = true;
        this.txn.abort();
    }
}
//# sourceMappingURL=IndexedDBAdapter.js.map