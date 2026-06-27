/**
 * Memory Adapter - In-memory storage implementation
 * Provides fast, non-persistent storage using Map
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  QueryCondition,
} from '@/types';
import { deepClone } from '@/utils';
import { QuotaExceededError } from '@/utils/errors';

/**
 * In-memory storage adapter using Map
 */
export class MemoryAdapter extends BaseAdapter {
  readonly name: StorageType = 'memory';
  readonly capabilities: StorageCapabilities = {
    persistent: false,
    synchronous: true, // Map backend is synchronous
    observable: true,
    transactional: false,
    queryable: true,
    maxSize: -1, // No hard limit, but configurable
    binary: true,
    encrypted: false, // Encryption handled by feature layer
    crossTab: false, // Memory is per-instance
  };

  private storage: Map<string, StorageValue> = new Map();
  private maxSize?: number;
  private currentSize = 0;

  /**
   * Check if adapter is available (always true for memory)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: { maxSize?: number }): Promise<void> {
    this.maxSize = config?.maxSize;
    this.startTTLCleanup();
  }

  /**
   * Get a value from memory
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    return this.getSync<T>(key);
  }

  /**
   * Clone a stored value to isolate it from external mutation. Prefers
   * structuredClone (preserves Map/Set/Date/TypedArray/ArrayBuffer — so the
   * advertised `binary: true` capability holds), falling back to deepClone where
   * structuredClone is unavailable or the value isn't structured-cloneable.
   */
  private clone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value);
      } catch {
        // Fall through to deepClone (e.g. value carries a non-cloneable field).
      }
    }
    return deepClone(value) as T;
  }

  /**
   * Get a value from memory (synchronous)
   */
  getSync<T = unknown>(key: string): StorageValue<T> | null {
    const value = this.storage.get(key);

    if (!value) return null;

    // Check TTL
    if (this.isExpired(value)) {
      this.removeSync(key);
      return null;
    }

    // Return a clone to prevent external modifications
    return this.clone(value) as StorageValue<T>;
  }

  /**
   * Set a value in memory
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    this.setSync(key, value);
  }

  /**
   * Set a value in memory (synchronous)
   */
  setSync<T = unknown>(key: string, value: StorageValue<T>): void {
    const oldValue = this.storage.get(key);
    const newSize = this.calculateSize(value);

    // Check size limit if configured
    if (this.maxSize && this.maxSize > 0) {
      const oldSize = oldValue ? this.calculateSize(oldValue) : 0;
      const projectedSize = this.currentSize - oldSize + newSize;

      if (projectedSize > this.maxSize) {
        throw new QuotaExceededError('Memory storage size limit exceeded', {
          limit: this.maxSize,
          current: this.currentSize,
          projected: projectedSize,
          key,
        });
      }
    }

    // Store a clone to prevent external modifications
    const clonedValue = this.clone(value);
    this.storage.set(key, clonedValue);

    // Update size tracking
    if (oldValue) {
      this.currentSize -= this.calculateSize(oldValue);
    }
    this.currentSize += newSize;

    // Emit change event
    this.emitChange(key, oldValue?.value, value.value, 'local');
  }

  /**
   * Remove a value from memory
   */
  async remove(key: string): Promise<void> {
    this.removeSync(key);
  }

  /**
   * Remove a value from memory (synchronous)
   */
  removeSync(key: string): void {
    const value = this.storage.get(key);
    if (!value) return;

    this.storage.delete(key);
    this.currentSize -= this.calculateSize(value);

    // Emit change event
    this.emitChange(key, value.value, undefined, 'local');
  }

  /**
   * Clear memory storage
   */
  async clear(options?: ClearOptions): Promise<void> {
    this.clearSync(options);
  }

  /**
   * Clear memory storage (synchronous)
   */
  clearSync(options?: ClearOptions): void {
    if (
      !options ||
      (!options.pattern && !options.prefix && !options.tags && !options.expiredOnly)
    ) {
      // Clear everything
      this.storage.clear();
      this.currentSize = 0;
      this.emitChange('*', undefined, undefined, 'local');
      return;
    }

    // Synchronous filtered clear (mirrors BaseAdapter.clear logic)
    for (const key of this.keysSync()) {
      let shouldDelete = true;

      const pattern = options.pattern || options.prefix;
      if (pattern) {
        shouldDelete = this.filterKeys([key], pattern).length > 0;
      }

      if (shouldDelete && options.tags) {
        const value = this.getSync(key);
        if (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
          shouldDelete = false;
        }
      }

      if (shouldDelete && options.expiredOnly) {
        const value = this.storage.get(key);
        if (!value || !this.isExpired(value)) {
          shouldDelete = false;
        }
      }

      if (shouldDelete) {
        this.removeSync(key);
      }
    }

    // Recalculate size after filtered clear
    this.currentSize = 0;
    for (const value of this.storage.values()) {
      this.currentSize += this.calculateSize(value);
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    return this.hasSync(key);
  }

  /**
   * Check if key exists (synchronous)
   */
  hasSync(key: string): boolean {
    const value = this.storage.get(key);
    return value !== undefined && !this.isExpired(value);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    return this.keysSync(pattern);
  }

  /**
   * Get all keys (synchronous)
   */
  keysSync(pattern?: string | RegExp): string[] {
    const allKeys = Array.from(this.storage.keys());

    // Remove expired entries
    const validKeys: string[] = [];
    for (const key of allKeys) {
      const value = this.storage.get(key);
      if (value && !this.isExpired(value)) {
        validKeys.push(key);
      } else if (value) {
        // Clean up expired entry
        this.removeSync(key);
      }
    }

    return this.filterKeys(validKeys, pattern);
  }

  /**
   * Query implementation for memory adapter
   */
  async query<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>> {
    const results: Array<{ key: string; value: T }> = [];

    for (const [key, item] of this.storage.entries()) {
      if (!this.isExpired(item)) {
        const isStorageQuery = this.isStorageMetadataQuery(condition);
        const normalizedCondition = isStorageQuery
          ? condition
          : (this.normalizeValueQueryCondition(condition) as QueryCondition);
        const matches = isStorageQuery
          ? this.queryEngine.matches(item, normalizedCondition)
          : this.queryEngine.matches(item.value, normalizedCondition);

        if (matches) {
          results.push({
            key,
            value: this.clone(item.value) as T,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): { used: number; limit?: number } {
    return {
      used: this.currentSize,
      limit: this.maxSize,
    };
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    await super.close();
    this.storage.clear();
    this.currentSize = 0;
  }
}
