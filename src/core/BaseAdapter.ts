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
        console.error(`TTL cleanup error in ${this.name}:`, error);
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
   * Clean up expired items
   */
  protected async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const keys = await this.keys();

    for (const key of keys) {
      const item = await this.get(key);
      if (item?.expires && item.expires <= now) {
        await this.remove(key);
      }
    }
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
        // Check if querying storage metadata (tags, metadata, etc) or the actual value
        let matches = false;
        
        // Check for storage-level properties
        const storageProps = ['tags', 'metadata', 'created', 'updated', 'expires'];
        const isStorageQuery = Object.keys(condition).some(k => storageProps.includes(k));
        
        if (isStorageQuery) {
          // Query against the storage wrapper
          matches = this.queryEngine.matches(item, condition);
        } else {
          // Query against the stored value
          matches = this.queryEngine.matches(item.value, condition);
        }
        
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
