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
import { logger } from '@/utils/logger';

/**
 * Configuration options for SQLite adapter
 */
export interface SqliteConfig {
  database?: string;
  table?: string;
  version?: number;
}

/**
 * Strict SQL-identifier allow-list for the `database` (file stem) and `table`
 * names. These two cannot be bound as parameters, so they are the only place a
 * SQL injection could occur; everything else (keys, values) is bound.
 */
const SQLITE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Reject — loudly — any `database`/`table` that is not a strict SQL identifier,
 * instead of silently stripping illegal characters (which could let two
 * distinct logical stores collapse into one physical table). This is the
 * authoritative guard: hostile identifiers never reach the native layer, which
 * also applies the same allow-list as defense-in-depth.
 */
function assertValidIdentifier(kind: 'database' | 'table', value: string): void {
  if (!SQLITE_IDENTIFIER.test(value)) {
    throw new StorageError(
      `Invalid SQLite ${kind} name "${value}": must match ${SQLITE_IDENTIFIER.source} ` +
        '(letters, digits and underscore only, not starting with a digit).',
    );
  }
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
    // `transaction()` queues operations and runs them sequentially on commit();
    // it is NOT a single atomic native SQLite transaction (no BEGIN/COMMIT/
    // ROLLBACK across the connection), so we report this honestly. See the
    // SqliteTransaction note below.
    transactional: false,
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
    assertValidIdentifier('database', this.database);
    assertValidIdentifier('table', this.table);
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
    if (config?.database) {
      assertValidIdentifier('database', config.database);
      this.database = config.database;
    }
    if (config?.table) {
      assertValidIdentifier('table', config.table);
      this.table = config.table;
    }

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
      logger.error(`Failed to get key ${key} from SQLite:`, error);
      return null;
    }
  }

  /**
   * Set a value in SQLite
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    // Only pay for a read-before-write (a native bridge round-trip) when a
    // subscriber actually needs the previous value for the change event.
    const oldValue = this.hasChangeListeners() ? await this.get(key) : null;

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
    // Only pay for a read-before-write (a native bridge round-trip) when a
    // subscriber actually needs the previous value for the change event.
    const oldValue = this.hasChangeListeners() ? await this.get(key) : null;

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

      // The native layer excludes expired rows in SQL (a single round-trip),
      // so there is no per-key `get()` loop here. We still run `filterKeys`
      // for the adapter's exact prefix/glob/RegExp semantics — native `LIKE`
      // is only a coarse pre-filter.
      return this.filterKeys(result.keys, pattern);
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

      // The native layer returns the full non-expired wrapper for every
      // candidate row in ONE round-trip, so the real query filter runs here in
      // JS (mirroring BaseAdapter.query) without an N+1 `get()` per key.
      const isStorageQuery = this.isStorageMetadataQuery(condition);
      const normalizedCondition = isStorageQuery
        ? condition
        : (this.normalizeValueQueryCondition(condition) as QueryCondition);

      const validResults: Array<{ key: string; value: T }> = [];
      for (const item of result.results) {
        // Use the batched wrapper; fall back to a per-key `get()` only for
        // older native builds that surface keys alone (item.value undefined).
        const stored = (item.value as StorageValue<T> | undefined) ?? (await this.get<T>(item.key));
        if (!stored) continue; // missing
        if (this.isExpired(stored)) continue; // defensive: native already filters
        const matches = isStorageQuery
          ? this.queryEngine.matches(stored, normalizedCondition)
          : this.queryEngine.matches(stored.value, normalizedCondition);
        if (matches) {
          validResults.push({ key: item.key, value: stored.value });
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
   * Reclaim expired rows in a single native round-trip and return the count.
   *
   * Because `keys()` and `query()` now exclude expired rows in SQL (there is no
   * lazy per-key deletion on read anymore), this is what physically deletes
   * them — driven by both the automatic TTL tick and `Strata.cleanupExpired()`.
   *
   * If the native bulk delete is present but fails at runtime, we log and return
   * 0 (reads stay correct — expired rows are filtered — and the next tick
   * retries); we deliberately do NOT fall back to the base per-key sweep, which
   * cannot see expired rows on a build whose `keys()` already filters them. The
   * base sweep is used only when no native bulk delete exists at all (an older
   * native build whose `keys()` still surfaces expired rows).
   */
  async cleanupExpired(): Promise<number> {
    if (StrataStorage.cleanupExpired) {
      try {
        const result = await StrataStorage.cleanupExpired({
          storage: 'sqlite',
          database: this.database,
          table: this.table,
        });
        return result.removed;
      } catch (error) {
        logger.error('Native SQLite cleanupExpired failed; will retry next tick:', error);
        return 0;
      }
    }
    return super.cleanupExpired();
  }

  /**
   * Begin a transaction.
   *
   * NOTE: this is a best-effort batch, not an atomic native SQLite transaction.
   * Operations are queued and executed sequentially on commit(); there is no
   * native BEGIN/COMMIT/ROLLBACK across the connection, so a failure midway
   * cannot roll back already-applied writes. `capabilities.transactional` is
   * therefore reported as `false`.
   */
  async transaction(): Promise<Transaction> {
    return new SqliteTransaction(this);
  }
}

/**
 * SQLite transaction implementation.
 *
 * Best-effort sequential batch (see SqliteAdapter.transaction): rollback() only
 * discards queued-but-not-yet-committed operations; it cannot undo writes that
 * commit() has already applied. Do not rely on this for atomic multi-key writes.
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
