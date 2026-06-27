/**
 * LocalStorage Adapter - Browser localStorage implementation
 * Provides persistent storage with 5-10MB limit
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  SizeInfo,
  SubscriptionCallback,
  UnsubscribeFunction,
} from '@/types';
import { serialize, deserialize, getObjectSize } from '@/utils';
import { QuotaExceededError, SerializationError, StorageError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter extends BaseAdapter {
  readonly name: StorageType = 'localStorage';
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: true, // window.localStorage backend is synchronous
    observable: true, // Via storage events
    transactional: false,
    queryable: true,
    maxSize: 10 * 1024 * 1024, // Typically 5-10MB
    binary: false, // Only strings
    encrypted: false,
    crossTab: true, // Storage events work across tabs
  };

  protected prefix: string;
  protected listeners: Map<SubscriptionCallback, (event: StorageEvent) => void> = new Map();

  constructor(prefix = '') {
    super();
    this.prefix = prefix;
  }

  /**
   * Check if localStorage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // Test if we can actually use it
      const testKey = `${this.prefix}__test__`;
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: { prefix?: string }): Promise<void> {
    if (config?.prefix) {
      this.prefix = config.prefix;
    }
    this.startTTLCleanup();
  }

  /**
   * Get the backing Storage object.
   * Subclasses (e.g. SessionStorageAdapter) override this to target a
   * different Storage. All sync/async methods route through it so the
   * subclass inherits correct behavior.
   */
  protected getStorage(): Storage {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new StorageError(`${this.name} is not available in this environment (no window).`);
    }
    return window.localStorage;
  }

  /**
   * Get a value from localStorage
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    return this.getSync<T>(key);
  }

  /**
   * Get a value from localStorage (synchronous)
   */
  getSync<T = unknown>(key: string): StorageValue<T> | null {
    try {
      const item = this.getStorage().getItem(this.prefix + key);
      if (!item) return null;

      const value = deserialize(item) as StorageValue<T>;

      // Check TTL
      if (this.isExpired(value)) {
        this.removeSync(key);
        return null;
      }

      return value;
    } catch (error) {
      logger.error(`Failed to get key ${key} from ${this.name}:`, error);
      return null;
    }
  }

  /**
   * Set a value in localStorage
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    this.setSync(key, value);
  }

  /**
   * Set a value in localStorage (synchronous)
   */
  setSync<T = unknown>(key: string, value: StorageValue<T>): void {
    const fullKey = this.prefix + key;
    const oldValue = this.getSync(key);

    try {
      const serialized = serialize(value);
      this.getStorage().setItem(fullKey, serialized);
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw new QuotaExceededError(`${this.name} quota exceeded`, {
          key,
          size: getObjectSize(value),
        });
      }
      throw new SerializationError(`Failed to store key ${key} in ${this.name}`, error);
    }

    // Emit change event (storage events don't fire in same window)
    this.emitChange(key, oldValue?.value, value.value, 'local');
  }

  /**
   * Remove a value from localStorage
   */
  async remove(key: string): Promise<void> {
    this.removeSync(key);
  }

  /**
   * Remove a value from localStorage (synchronous)
   */
  removeSync(key: string): void {
    // Read the raw stored value directly — NOT via getSync(), which deletes an
    // expired entry by calling removeSync(), recursing here forever (stack
    // overflow). Only read when a listener actually needs the old value.
    let oldValue: StorageValue | null = null;
    if (this.hasChangeListeners()) {
      const item = this.getStorage().getItem(this.prefix + key);
      if (item) {
        try {
          oldValue = deserialize(item) as StorageValue;
        } catch {
          oldValue = null;
        }
      }
    }

    this.getStorage().removeItem(this.prefix + key);

    if (oldValue) {
      this.emitChange(key, oldValue.value, undefined, 'local');
    }
  }

  /**
   * Clear localStorage
   */
  async clear(options?: ClearOptions): Promise<void> {
    this.clearSync(options);
  }

  /**
   * Clear localStorage (synchronous)
   */
  clearSync(options?: ClearOptions): void {
    if (
      !options ||
      (!options.pattern && !options.prefix && !options.tags && !options.expiredOnly)
    ) {
      // Clear all with our prefix
      const storage = this.getStorage();
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => storage.removeItem(key));
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
    const storage = this.getStorage();
    const keys: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const fullKey = storage.key(i);
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
  async size(detailed?: boolean): Promise<SizeInfo> {
    let total = 0;
    let count = 0;
    let keySize = 0;
    let valueSize = 0;
    const byKey: Record<string, number> = {};

    for (let i = 0; i < window.localStorage.length; i++) {
      const fullKey = window.localStorage.key(i);
      if (fullKey?.startsWith(this.prefix)) {
        const item = window.localStorage.getItem(fullKey);
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

    const result: SizeInfo = { total, count };

    if (detailed) {
      result.byKey = byKey;
      result.detailed = {
        keys: keySize,
        values: valueSize,
        metadata: 0, // Metadata is included in values for localStorage
      };
    }

    return result;
  }

  /**
   * Subscribe to storage changes
   */
  subscribe(callback: SubscriptionCallback): UnsubscribeFunction {
    // Subscribe to local changes from this adapter
    const unsubscribeLocal = super.subscribe(callback);

    // Also subscribe to remote changes via storage events
    const listener = (event: StorageEvent) => {
      // Only process events from other windows/tabs
      if (event.storageArea !== window.localStorage) return;

      // Check if the key belongs to us
      if (!event.key || !event.key.startsWith(this.prefix)) return;

      const key = event.key.substring(this.prefix.length);
      const oldValue = event.oldValue ? (deserialize(event.oldValue) as StorageValue | null) : null;
      const newValue = event.newValue ? (deserialize(event.newValue) as StorageValue | null) : null;

      callback({
        key,
        oldValue: oldValue?.value ?? undefined,
        newValue: newValue?.value ?? undefined,
        source: 'remote',
        storage: this.name,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('storage', listener);
    this.listeners.set(callback, listener);

    return () => {
      unsubscribeLocal();
      const storedListener = this.listeners.get(callback);
      if (storedListener) {
        window.removeEventListener('storage', storedListener);
        this.listeners.delete(callback);
      }
    };
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    // Remove all storage event listeners
    this.listeners.forEach((listener) => {
      window.removeEventListener('storage', listener);
    });
    this.listeners.clear();

    await super.close();
  }

  /**
   * Check if error is quota exceeded
   */
  protected isQuotaError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.message.toLowerCase().includes('quota')
      );
    }
    return false;
  }
}
