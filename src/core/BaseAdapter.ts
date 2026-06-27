/**
 * Base adapter implementation with common functionality
 */

import type {
  StorageAdapter,
  StorageValue,
  StorageType,
  StorageCapabilities,
  StorageChange,
  ClearOptions,
  SizeInfo,
  SubscriptionCallback,
  UnsubscribeFunction,
  QueryCondition,
} from '@/types';
import { NotSupportedError } from '@/utils/errors';
import { EventEmitter, matchGlob, getObjectSize } from '@/utils';
import { logger } from '@/utils/logger';
import { QueryEngine } from '@/features/query';

/**
 * Abstract base adapter that implements common functionality
 */
export abstract class BaseAdapter implements StorageAdapter {
  abstract readonly name: StorageType;
  abstract readonly capabilities: StorageCapabilities;

  protected eventEmitter = new EventEmitter();
  protected queryEngine = new QueryEngine();
  protected ttlCleanupInterval?: ReturnType<typeof setInterval>;
  protected ttlCheckInterval = 60000; // Check every minute

  /**
   * Initialize TTL cleanup if needed
   */
  protected startTTLCleanup(): void {
    if (this.ttlCleanupInterval) return;

    this.ttlCleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        logger.error(`TTL cleanup error in ${this.name}:`, error);
      }
    }, this.ttlCheckInterval);
  }

  /**
   * Stop TTL cleanup
   */
  protected stopTTLCleanup(): void {
    if (this.ttlCleanupInterval) {
      clearInterval(this.ttlCleanupInterval);
      this.ttlCleanupInterval = undefined;
    }
  }

  /**
   * Clean up expired items, returning how many were removed.
   *
   * Default implementation is a per-key sweep (enumerate keys, drop the expired
   * ones). Backends that can filter expired rows in the storage engine itself
   * (e.g. SQLite) override this with a single bulk delete — and because such a
   * backend's `keys()` no longer surfaces expired entries, this per-key sweep
   * would not see them anyway. Called by the automatic TTL tick and by
   * `Strata.cleanupExpired()`.
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    const keys = await this.keys();

    let removed = 0;
    for (const key of keys) {
      const item = await this.get(key);
      if (item?.expires && item.expires <= now) {
        await this.remove(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Check if value is expired
   */
  protected isExpired(value: StorageValue): boolean {
    if (!value.expires) return false;
    return Date.now() > value.expires;
  }

  /**
   * Filter keys by pattern
   */
  protected filterKeys(keys: string[], pattern?: string | RegExp): string[] {
    if (!pattern) return keys;

    if (pattern instanceof RegExp) {
      return keys.filter((key) => pattern.test(key));
    }

    // If pattern doesn't contain glob characters, treat it as a prefix
    if (!pattern.includes('*') && !pattern.includes('?')) {
      return keys.filter((key) => key.startsWith(pattern));
    }

    return keys.filter((key) => matchGlob(pattern, key));
  }

  /**
   * Calculate size of storage value
   */
  protected calculateSize(value: StorageValue): number {
    return getObjectSize(value);
  }

  /**
   * Determine whether a query targets wrapper metadata instead of the stored value.
   */
  protected isStorageMetadataQuery(condition: QueryCondition): boolean {
    const storageProps = ['tags', 'metadata', 'created', 'updated', 'expires'];

    return Object.keys(condition).some((key) =>
      storageProps.some((storageProp) => key === storageProp || key.startsWith(`${storageProp}.`)),
    );
  }

  /**
   * Normalize value-targeted queries so callers can use either `name` or `value.name`.
   */
  protected normalizeValueQueryCondition(condition: unknown): unknown {
    if (Array.isArray(condition)) {
      return condition.map((entry) => this.normalizeValueQueryCondition(entry));
    }

    if (!condition || typeof condition !== 'object') {
      return condition;
    }

    return Object.fromEntries(
      Object.entries(condition).map(([key, value]) => {
        if (key.startsWith('$')) {
          return [key, this.normalizeValueQueryCondition(value)];
        }

        const normalizedKey = key.startsWith('value.') ? key.slice(6) : key;
        return [normalizedKey, this.normalizeValueQueryCondition(value)];
      }),
    );
  }

  /**
   * Default has implementation using get
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null && !this.isExpired(value);
  }

  /**
   * Default clear implementation
   */
  async clear(options?: ClearOptions): Promise<void> {
    const keys = await this.keys();

    for (const key of keys) {
      let shouldDelete = true;

      // Support both pattern and prefix options
      const pattern = options?.pattern || options?.prefix;
      if (pattern) {
        shouldDelete = this.filterKeys([key], pattern).length > 0;
      }

      if (shouldDelete && options?.tags) {
        const value = await this.get(key);
        if (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
          shouldDelete = false;
        }
      }

      if (shouldDelete && options?.expiredOnly) {
        const value = await this.get(key);
        if (!value || !this.isExpired(value)) {
          shouldDelete = false;
        }
      }

      if (shouldDelete && options?.olderThan !== undefined) {
        const value = await this.get(key);
        const olderThan =
          options.olderThan instanceof Date ? options.olderThan.getTime() : options.olderThan;
        if (!value || value.created >= olderThan) {
          shouldDelete = false;
        }
      }

      if (shouldDelete) {
        await this.remove(key);
      }
    }
  }

  /**
   * Default size implementation
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    const keys = await this.keys();
    let total = 0;
    let keySize = 0;
    let valueSize = 0;
    let metadataSize = 0;
    const byKey: Record<string, number> = {};

    for (const key of keys) {
      const keyLength = key.length * 2; // UTF-16
      keySize += keyLength;

      const item = await this.get(key);
      if (item) {
        const size = this.calculateSize(item);
        valueSize += getObjectSize(item.value);
        metadataSize += size - getObjectSize(item.value);
        total += size;

        if (detailed) {
          byKey[key] = size + keyLength;
        }
      }
    }

    const result: SizeInfo = {
      total: total + keySize,
      count: keys.length,
    };

    if (detailed) {
      result.byKey = byKey;
      result.detailed = {
        keys: keySize,
        values: valueSize,
        metadata: metadataSize,
      };
    }

    return result;
  }

  /**
   * Subscribe to changes (if supported)
   */
  subscribe(callback: SubscriptionCallback): UnsubscribeFunction {
    if (!this.capabilities.observable) {
      throw new NotSupportedError('subscribe', this.name);
    }

    const handler = (...args: unknown[]) => {
      const change = args[0] as StorageChange;
      callback(change);
    };
    this.eventEmitter.on('change', handler);

    return () => {
      this.eventEmitter.off('change', handler);
    };
  }

  /**
   * Whether any subscriber is currently attached to this adapter's change
   * stream. Adapters that talk to a slow backend (native bridge, network) use
   * this to avoid a wasted read-before-write: fetching the previous value just
   * to populate a change event is pointless when nobody is listening. When a
   * subscriber IS attached, callers must still capture the old value so the
   * emitted change is complete. See `SqliteAdapter.set`/`remove`.
   */
  protected hasChangeListeners(): boolean {
    return this.eventEmitter.listenerCount('change') > 0;
  }

  /**
   * Emit change event
   */
  protected emitChange(
    key: string,
    oldValue: unknown | undefined,
    newValue: unknown | undefined,
    source: 'local' | 'remote' = 'local',
  ): void {
    this.eventEmitter.emit('change', {
      key,
      oldValue,
      newValue,
      source,
      storage: this.name,
      timestamp: Date.now(),
    });
  }

  /**
   * Query implementation (override in adapters that support it)
   */
  async query?<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>> {
    if (!this.capabilities.queryable) {
      throw new NotSupportedError('query', this.name);
    }

    // Basic implementation for adapters that don't have native query support
    const results: Array<{ key: string; value: T }> = [];
    const keys = await this.keys();

    for (const key of keys) {
      const item = await this.get<T>(key);
      if (item && !this.isExpired(item)) {
        const isStorageQuery = this.isStorageMetadataQuery(condition);
        const normalizedCondition = isStorageQuery
          ? condition
          : (this.normalizeValueQueryCondition(condition) as QueryCondition);
        const matches = isStorageQuery
          ? this.queryEngine.matches(item, normalizedCondition)
          : this.queryEngine.matches(item.value, normalizedCondition);

        if (matches) {
          results.push({ key, value: item.value });
        }
      }
    }

    return results;
  }

  /**
   * Close adapter (cleanup)
   */
  async close(): Promise<void> {
    this.stopTTLCleanup();
    this.eventEmitter.removeAllListeners();
  }

  // Abstract methods that must be implemented
  abstract isAvailable(): Promise<boolean>;
  abstract initialize(config?: unknown): Promise<void>;
  abstract get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
  abstract set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract keys(pattern?: string | RegExp): Promise<string[]>;
}
