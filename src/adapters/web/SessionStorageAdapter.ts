/**
 * SessionStorage Adapter - Browser sessionStorage implementation
 * Provides session-scoped storage with 5-10MB limit
 */

import { LocalStorageAdapter } from './LocalStorageAdapter';
import { serialize, deserialize } from '@/utils';
import { QuotaExceededError, SerializationError, StorageError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { StorageType, StorageCapabilities } from '@/types';

/**
 * Browser sessionStorage adapter
 * Extends LocalStorageAdapter as the API is identical
 */
export class SessionStorageAdapter extends LocalStorageAdapter {
  readonly name: StorageType = 'sessionStorage';
  readonly capabilities: StorageCapabilities = {
    persistent: false, // Only for session
    synchronous: true, // window.sessionStorage backend is synchronous
    observable: true,
    transactional: false,
    queryable: true,
    maxSize: 10 * 1024 * 1024, // Typically 5-10MB
    binary: false,
    encrypted: false,
    crossTab: false, // Session storage is per-tab
  };

  constructor(prefix = '') {
    super(prefix);
  }

  /**
   * Check if sessionStorage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return false;
      }

      // Test if we can actually use it
      const testKey = `${this.prefix}__test__`;
      window.sessionStorage.setItem(testKey, 'test');
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Override all methods to use sessionStorage instead of localStorage
   */
  protected getStorage(): Storage {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      throw new StorageError(`${this.name} is not available in this environment (no window).`);
    }
    return window.sessionStorage;
  }

  /**
   * Get a value from sessionStorage
   */
  async get<T = unknown>(key: string): Promise<import('@/types').StorageValue<T> | null> {
    return this.getSync<T>(key);
  }

  /**
   * Get a value from sessionStorage (synchronous)
   */
  getSync<T = unknown>(key: string): import('@/types').StorageValue<T> | null {
    try {
      const item = window.sessionStorage.getItem(this.prefix + key);
      if (!item) return null;

      const value = deserialize(item) as import('@/types').StorageValue<T>;

      // Check TTL
      if (this.isExpired(value)) {
        this.removeSync(key);
        return null;
      }

      return value;
    } catch (error) {
      logger.error(`Failed to get key ${key} from sessionStorage:`, error);
      return null;
    }
  }

  /**
   * Set a value in sessionStorage
   */
  async set<T = unknown>(key: string, value: import('@/types').StorageValue<T>): Promise<void> {
    this.setSync(key, value);
  }

  /**
   * Set a value in sessionStorage (synchronous)
   */
  setSync<T = unknown>(key: string, value: import('@/types').StorageValue<T>): void {
    const fullKey = this.prefix + key;
    const oldValue = this.getSync(key);

    try {
      const serialized = serialize(value);
      window.sessionStorage.setItem(fullKey, serialized);
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw new QuotaExceededError('SessionStorage quota exceeded', { key, error });
      }
      throw new SerializationError(`Failed to store key ${key} in sessionStorage`, error);
    }

    // Emit change event
    this.emitChange(key, oldValue?.value, value.value, 'local');
  }

  /**
   * Remove a value from sessionStorage
   */
  async remove(key: string): Promise<void> {
    this.removeSync(key);
  }

  /**
   * Remove a value from sessionStorage (synchronous)
   */
  removeSync(key: string): void {
    // Read raw — NOT via getSync(), which deletes expired entries by calling
    // removeSync() and would recurse here forever. Only read with a listener.
    let oldValue: import('@/types').StorageValue | null = null;
    if (this.hasChangeListeners()) {
      const item = window.sessionStorage.getItem(this.prefix + key);
      if (item) {
        try {
          oldValue = deserialize(item) as import('@/types').StorageValue;
        } catch {
          oldValue = null;
        }
      }
    }

    window.sessionStorage.removeItem(this.prefix + key);

    if (oldValue) {
      this.emitChange(key, oldValue.value, undefined, 'local');
    }
  }

  /**
   * Clear sessionStorage
   */
  async clear(options?: import('@/types').ClearOptions): Promise<void> {
    this.clearSync(options);
  }

  /**
   * Clear sessionStorage (synchronous)
   */
  clearSync(options?: import('@/types').ClearOptions): void {
    if (
      !options ||
      (!options.pattern && !options.prefix && !options.tags && !options.expiredOnly)
    ) {
      // Clear all with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
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
        const value = this.getSync(key);
        if (!value || !this.isExpired(value)) {
          shouldDelete = false;
        }
      }

      if (shouldDelete) {
        this.removeSync(key);
      }
    }
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
    const keys: string[] = [];

    for (let i = 0; i < window.sessionStorage.length; i++) {
      const fullKey = window.sessionStorage.key(i);
      if (fullKey?.startsWith(this.prefix)) {
        const key = fullKey.substring(this.prefix.length);

        // Check if not expired
        const value = this.getSync(key);
        if (value) {
          keys.push(key);
        }
      }
    }

    return this.filterKeys(keys, pattern);
  }

  /**
   * Check if key exists (synchronous)
   */
  hasSync(key: string): boolean {
    const value = this.getSync(key);
    return value !== null && !this.isExpired(value);
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<import('@/types').SizeInfo> {
    let total = 0;
    let count = 0;
    let keySize = 0;
    let valueSize = 0;
    const byKey: Record<string, number> = {};

    for (let i = 0; i < window.sessionStorage.length; i++) {
      const fullKey = window.sessionStorage.key(i);
      if (fullKey?.startsWith(this.prefix)) {
        const item = window.sessionStorage.getItem(fullKey);
        if (item) {
          count++;
          const key = fullKey.substring(this.prefix.length);
          const itemSize = (fullKey.length + item.length) * 2; // UTF-16
          total += itemSize;

          if (detailed) {
            keySize += fullKey.length * 2;
            valueSize += item.length * 2;
            byKey[key] = itemSize;
          }
        }
      }
    }

    const result: import('@/types').SizeInfo = { total, count };

    if (detailed) {
      result.byKey = byKey;
      result.detailed = {
        keys: keySize,
        values: valueSize,
        metadata: 0,
      };
    }

    return result;
  }

  /**
   * Subscribe to storage changes
   * Note: sessionStorage doesn't fire storage events in the same tab
   */
  subscribe(
    callback: import('@/types').SubscriptionCallback,
  ): import('@/types').UnsubscribeFunction {
    // For sessionStorage, we only get local changes, not cross-tab
    // Use the base class subscription for local changes
    return super.subscribe(callback);
  }
}
