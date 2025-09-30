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

/**
 * In-memory storage adapter using Map
 */
export class MemoryAdapter extends BaseAdapter {
  readonly name: StorageType = 'memory';
  readonly capabilities: StorageCapabilities = {
    persistent: false,
    synchronous: false, // We use async for consistency
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
    const value = this.storage.get(key);

    if (!value) return null;

    // Check TTL
    if (this.isExpired(value)) {
      await this.remove(key);
      return null;
    }

    // Return a deep clone to prevent external modifications
    return deepClone(value) as StorageValue<T>;
  }

  /**
   * Set a value in memory
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const oldValue = this.storage.get(key);
    const newSize = this.calculateSize(value);

    // Check size limit if configured
    if (this.maxSize && this.maxSize > 0) {
      const oldSize = oldValue ? this.calculateSize(oldValue) : 0;
      const projectedSize = this.currentSize - oldSize + newSize;

      if (projectedSize > this.maxSize) {
        throw new Error(
          `Memory storage size limit exceeded. Limit: ${this.maxSize}, Projected: ${projectedSize}`,
        );
      }
    }

    // Store a deep clone to prevent external modifications
    const clonedValue = deepClone(value);
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
    if (!options || (!options.pattern && !options.prefix && !options.tags && !options.expiredOnly)) {
      // Clear everything
      this.storage.clear();
      this.currentSize = 0;
      this.emitChange('*', undefined, undefined, 'local');
      return;
    }

    // Use base implementation for filtered clear
    await super.clear(options);
    
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
    const value = this.storage.get(key);
    return value !== undefined && !this.isExpired(value);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());

    // Remove expired entries
    const validKeys: string[] = [];
    for (const key of allKeys) {
      const value = this.storage.get(key);
      if (value && !this.isExpired(value)) {
        validKeys.push(key);
      } else if (value) {
        // Clean up expired entry
        await this.remove(key);
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
      if (!this.isExpired(item) && this.queryEngine.matches(item, condition)) {
        results.push({
          key,
          value: deepClone(item.value) as T,
        });
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
