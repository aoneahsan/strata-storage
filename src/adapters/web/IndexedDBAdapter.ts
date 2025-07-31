/**
 * IndexedDB Adapter - Browser IndexedDB implementation
 * Provides large-scale persistent storage with advanced features
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  SizeInfo,
  QueryCondition,
  Transaction,
} from '@/types';
import { createDeferred, getObjectSize } from '@/utils';
import { StorageError, QuotaExceededError, TransactionError } from '@/utils/errors';

/**
 * Browser IndexedDB adapter
 */
export class IndexedDBAdapter extends BaseAdapter {
  readonly name: StorageType = 'indexedDB';
  readonly capabilities: StorageCapabilities = {
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

  private dbName: string;
  private storeName: string;
  private version: number;
  private db?: IDBDatabase;

  constructor(dbName = 'StrataStorage', storeName = 'storage', version = 1) {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  /**
   * Check if IndexedDB is available
   */
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: {
    dbName?: string;
    storeName?: string;
    version?: number;
  }): Promise<void> {
    if (config?.dbName) this.dbName = config.dbName;
    if (config?.storeName) this.storeName = config.storeName;
    if (config?.version) this.version = config.version;

    await this.openDatabase();
    this.startTTLCleanup();
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    const { promise, resolve, reject } = createDeferred<IDBDatabase>();

    const request = window.indexedDB.open(this.dbName, this.version);

    request.onerror = () => reject(new StorageError(`Failed to open IndexedDB: ${request.error}`));

    request.onsuccess = () => {
      this.db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

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
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    const db = await this.openDatabase();
    const { promise, resolve, reject } = createDeferred<StorageValue<T> | null>();

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
      if (this.isExpired(value as StorageValue<T>)) {
        // Don't wait for removal
        this.remove(key).catch(console.error);
        resolve(null);
      } else {
        resolve(value as StorageValue<T>);
      }
    };

    request.onerror = () => reject(new StorageError(`Failed to get key ${key}: ${request.error}`));

    return promise;
  }

  /**
   * Set a value in IndexedDB
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const db = await this.openDatabase();
    const oldValue = await this.get(key);
    const { promise, resolve, reject } = createDeferred<void>();

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
        reject(
          new QuotaExceededError('IndexedDB quota exceeded', { key, size: getObjectSize(value) }),
        );
      } else {
        reject(new StorageError(`Failed to set key ${key}: ${request.error}`));
      }
    };

    return promise;
  }

  /**
   * Remove a value from IndexedDB
   */
  async remove(key: string): Promise<void> {
    const db = await this.openDatabase();
    const oldValue = await this.get(key);
    const { promise, resolve, reject } = createDeferred<void>();

    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
      if (oldValue) {
        this.emitChange(key, oldValue.value, undefined, 'local');
      }
    };

    request.onerror = () =>
      reject(new StorageError(`Failed to remove key ${key}: ${request.error}`));

    return promise;
  }

  /**
   * Clear IndexedDB
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      // Clear everything
      const db = await this.openDatabase();
      const { promise, resolve, reject } = createDeferred<void>();

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
        this.emitChange('*', undefined, undefined, 'local');
      };

      request.onerror = () => reject(new StorageError(`Failed to clear store: ${request.error}`));

      return promise;
    }

    // Use base implementation for filtered clear
    await super.clear(options);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    const db = await this.openDatabase();
    const { promise, resolve, reject } = createDeferred<string[]>();

    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const request = store.getAllKeys();

    request.onsuccess = async () => {
      const allKeys = request.result as string[];

      // Filter expired keys
      const validKeys: string[] = [];
      for (const key of allKeys) {
        const value = await this.get(key);
        if (value) {
          validKeys.push(key);
        }
      }

      resolve(this.filterKeys(validKeys, pattern));
    };

    request.onerror = () => reject(new StorageError(`Failed to get keys: ${request.error}`));

    return promise;
  }

  /**
   * Query IndexedDB with conditions
   */
  async query<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>> {
    const db = await this.openDatabase();
    const { promise, resolve, reject } = createDeferred<Array<{ key: string; value: T }>>();

    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const results: Array<{ key: string; value: T }> = [];

    // For now, we'll do a full scan and filter
    // In the future, we can optimize using indexes
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const record = cursor.value;
        const { key, ...value } = record;

        if (!this.isExpired(value) && this.matchesCondition(value.value, condition)) {
          results.push({ key, value: value.value as T });
        }

        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(new StorageError(`Query failed: ${request.error}`));

    return promise;
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    const db = await this.openDatabase();
    const { promise, resolve, reject } = createDeferred<SizeInfo>();

    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    let total = 0;
    let count = 0;
    let keySize = 0;
    let valueSize = 0;
    let metadataSize = 0;

    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const record = cursor.value;
        const { key, value, ...metadata } = record;

        count++;
        const recordKeySize = key.length * 2;
        const recordValueSize = getObjectSize(value);
        const recordMetadataSize = getObjectSize(metadata);

        total += recordKeySize + recordValueSize + recordMetadataSize;

        if (detailed) {
          keySize += recordKeySize;
          valueSize += recordValueSize;
          metadataSize += recordMetadataSize;
        }

        cursor.continue();
      } else {
        const result: SizeInfo = { total, count };

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

    request.onerror = () => reject(new StorageError(`Failed to calculate size: ${request.error}`));

    return promise;
  }

  /**
   * Begin a transaction
   */
  async transaction(): Promise<Transaction> {
    const db = await this.openDatabase();
    const txn = db.transaction([this.storeName], 'readwrite');
    const store = txn.objectStore(this.storeName);

    return new IndexedDBTransaction(store, txn);
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
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
  private isQuotaError(error: unknown): boolean {
    if (error instanceof Error || error instanceof DOMException) {
      return error.name === 'QuotaExceededError' || error.message.toLowerCase().includes('quota');
    }
    return false;
  }
}

/**
 * IndexedDB transaction implementation
 */
class IndexedDBTransaction implements Transaction {
  private store: IDBObjectStore;
  private txn: IDBTransaction;
  private committed = false;
  private aborted = false;

  constructor(store: IDBObjectStore, txn: IDBTransaction) {
    this.store = store;
    this.txn = txn;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    const { promise, resolve, reject } = createDeferred<T | null>();
    const request = this.store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };

    request.onerror = () => reject(new StorageError(`Transaction get failed: ${request.error}`));

    return promise;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    const { promise, resolve, reject } = createDeferred<void>();
    const now = Date.now();

    const record = {
      key,
      value,
      created: now,
      updated: now,
    };

    const request = this.store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new StorageError(`Transaction set failed: ${request.error}`));

    return promise;
  }

  async remove(key: string): Promise<void> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    const { promise, resolve, reject } = createDeferred<void>();
    const request = this.store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new StorageError(`Transaction remove failed: ${request.error}`));

    return promise;
  }

  async commit(): Promise<void> {
    if (this.aborted) throw new TransactionError('Cannot commit aborted transaction');
    if (this.committed) throw new TransactionError('Transaction already committed');

    this.committed = true;
    // IndexedDB auto-commits when transaction completes
  }

  async rollback(): Promise<void> {
    if (this.committed) throw new TransactionError('Cannot rollback committed transaction');
    if (this.aborted) return;

    this.aborted = true;
    this.txn.abort();
  }
}
