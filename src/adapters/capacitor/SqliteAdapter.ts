/**
 * SQLite Adapter - Native SQLite database storage
 * Available on iOS and Android
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
import { StrataStorage } from '@/plugin';
import { StorageError, TransactionError } from '@/utils/errors';
import { isCapacitor } from '@/utils';

/**
 * Configuration options for SQLite adapter
 */
export interface SqliteConfig {
  database?: string;
  table?: string;
  version?: number;
}

/**
 * Native SQLite adapter using Capacitor plugin
 */
export class SqliteAdapter extends BaseAdapter {
  readonly name: StorageType = 'sqlite';
  readonly capabilities: StorageCapabilities = {
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

  private database: string;
  private table: string;

  constructor(config: SqliteConfig = {}) {
    super();
    this.database = config.database || 'strata_storage';
    this.table = config.table || 'storage';
  }

  /**
   * Check if SQLite is available
   */
  async isAvailable(): Promise<boolean> {
    if (!isCapacitor()) return false;

    try {
      const result = await StrataStorage.isAvailable({ storage: 'sqlite' });
      return result.available;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: SqliteConfig): Promise<void> {
    if (config?.database) this.database = config.database;
    if (config?.table) this.table = config.table;

    this.startTTLCleanup();
  }

  /**
   * Get a value from SQLite
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    try {
      const result = await StrataStorage.get({
        key,
        storage: 'sqlite',
        database: this.database,
        table: this.table,
      });

      if (!result.value) return null;

      const value = result.value as StorageValue<T>;

      // Check TTL
      if (this.isExpired(value)) {
        await this.remove(key);
        return null;
      }

      return value;
    } catch (error) {
      console.error(`Failed to get key ${key} from SQLite:`, error);
      return null;
    }
  }

  /**
   * Set a value in SQLite
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.set({
        key,
        value,
        storage: 'sqlite',
        database: this.database,
        table: this.table,
      });

      this.emitChange(key, oldValue?.value, value.value, 'local');
    } catch (error) {
      throw new StorageError(`Failed to set key ${key} in SQLite: ${error}`);
    }
  }

  /**
   * Remove a value from SQLite
   */
  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.remove({
        key,
        storage: 'sqlite',
        database: this.database,
        table: this.table,
      });

      if (oldValue) {
        this.emitChange(key, oldValue.value, undefined, 'local');
      }
    } catch (error) {
      throw new StorageError(`Failed to remove key ${key} from SQLite: ${error}`);
    }
  }

  /**
   * Clear SQLite table
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      try {
        await StrataStorage.clear({
          storage: 'sqlite',
          database: this.database,
          table: this.table,
        });
        this.emitChange('*', undefined, undefined, 'local');
        return;
      } catch (error) {
        throw new StorageError(`Failed to clear SQLite: ${error}`);
      }
    }

    // Use base implementation for filtered clear
    await super.clear(options);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    try {
      const result = await StrataStorage.keys({
        storage: 'sqlite',
        database: this.database,
        table: this.table,
        pattern: pattern instanceof RegExp ? pattern.source : pattern,
      });

      const keys = result.keys;

      // Check for expired keys
      const validKeys: string[] = [];
      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          validKeys.push(key);
        }
      }

      return this.filterKeys(validKeys, pattern);
    } catch (error) {
      throw new StorageError(`Failed to get keys from SQLite: ${error}`);
    }
  }

  /**
   * Query SQLite with conditions
   */
  async query<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>> {
    try {
      if (!StrataStorage.query) {
        throw new StorageError('Query not supported on this platform');
      }

      const result = await StrataStorage.query({
        storage: 'sqlite',
        database: this.database,
        table: this.table,
        condition,
      });

      // Filter expired entries
      const validResults: Array<{ key: string; value: T }> = [];
      for (const item of result.results) {
        const value = await this.get<T>(item.key);
        if (value) {
          validResults.push({ key: item.key, value: value.value });
        }
      }

      return validResults;
    } catch (error) {
      throw new StorageError(`Failed to query SQLite: ${error}`);
    }
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    try {
      const result = await StrataStorage.size({
        storage: 'sqlite',
        database: this.database,
        table: this.table,
        detailed,
      });

      return result;
    } catch (error) {
      throw new StorageError(`Failed to get size of SQLite: ${error}`);
    }
  }

  /**
   * Begin a transaction
   */
  async transaction(): Promise<Transaction> {
    // Transactions are handled natively
    // For now, return a simple implementation
    return new SqliteTransaction(this);
  }
}

/**
 * SQLite transaction implementation
 */
class SqliteTransaction implements Transaction {
  private adapter: SqliteAdapter;
  private operations: Array<() => Promise<void>> = [];
  private committed = false;
  private aborted = false;

  constructor(adapter: SqliteAdapter) {
    this.adapter = adapter;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    const value = await this.adapter.get<T>(key);
    return value ? value.value : null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    this.operations.push(async () => {
      const now = Date.now();
      await this.adapter.set(key, {
        value,
        created: now,
        updated: now,
      });
    });
  }

  async remove(key: string): Promise<void> {
    if (this.aborted) throw new TransactionError('Transaction already aborted');

    this.operations.push(async () => {
      await this.adapter.remove(key);
    });
  }

  async commit(): Promise<void> {
    if (this.aborted) throw new TransactionError('Cannot commit aborted transaction');
    if (this.committed) throw new TransactionError('Transaction already committed');

    this.committed = true;

    // Execute all operations
    for (const operation of this.operations) {
      await operation();
    }
  }

  async rollback(): Promise<void> {
    if (this.committed) throw new TransactionError('Cannot rollback committed transaction');
    if (this.aborted) return;

    this.aborted = true;
    this.operations = [];
  }
}
