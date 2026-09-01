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
import { serialize, getObjectSize } from '@/utils';
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
   * Apply configuration synchronously. See `BaseAdapter.configure` for why the
   * prefix cannot wait for the async `initialize()`.
   */
  configure(config?: { prefix?: string }): void {
    if (config?.prefix !== undefined) {
      this.prefix = config.prefix;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: { prefix?: string }): Promise<void> {
    this.configure(config);
    this.startTTLCleanup();
  }

  /**
   * Whether this storage area is usable RIGHT NOW, without awaiting anything.
   * The synchronous API needs this: `defaultStorages` reads as an ordered
   * fallback list, and without a sync probe `setSync` selects an unusable
   * backend and throws instead of falling through to the next one.
   */
  isAvailableSync(): boolean {
    try {
      const storage = this.getStorage();
      const testKey = `${this.prefix}__test__`;
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
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
    let item: string | null;
    try {
      item = this.getStorage().getItem(this.prefix + key);
    } catch (error) {
      // A genuine storage-access fault — the area is blocked (private mode, a
      // cookie policy, a SecurityError on an opaque origin). This one IS ours to
      // report: the read we were asked for did not happen.
      logger.error(`Failed to read key ${key} from ${this.name}:`, error);
      return null;
    }

    // A value that is not our envelope belongs to somebody else sharing this
    // area. parseOwnValue() logs it at debug and returns null — never an error.
    const value = this.parseOwnValue<T>(item, key);
    if (!value) return null;

    if (this.isExpired(value)) {
      this.removeSync(key);
      return null;
    }

    return value;
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
      oldValue = this.parseOwnValue(this.getStorage().getItem(this.prefix + key), key);
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
      // Clear everything WE wrote — never the whole area. With an empty prefix a
      // name-only sweep here deletes every key on the origin, including another
      // application's; ownKeys() bounds it to our own envelopes.
      const storage = this.getStorage();
      for (const { fullKey } of this.ownKeys(true)) {
        storage.removeItem(fullKey);
      }
      this.emitChange('*', undefined, undefined, 'local');
      return;
    }

    // Synchronous filtered clear (mirrors BaseAdapter.clear logic).
    // Iterates owned entries INCLUDING expired ones: `expiredOnly` filters on
    // exactly the entries `keysSync()` leaves out, so driving this loop from
    // `keysSync()` made that option a guaranteed no-op.
    for (const { key, value } of this.ownKeys(true)) {
      let shouldDelete = true;

      const pattern = options.pattern || options.prefix;
      if (pattern) {
        shouldDelete = this.filterKeys([key], pattern).length > 0;
      }

      if (shouldDelete && options.tags) {
        if (!value.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
          shouldDelete = false;
        }
      }

      if (shouldDelete && options.expiredOnly && !this.isExpired(value)) {
        shouldDelete = false;
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
    return this.filterKeys(
      this.ownKeys().map((entry) => entry.key),
      pattern,
    );
  }

  /**
   * Every key in this storage area that this adapter actually owns, with the
   * envelope already parsed (one read per key, not two).
   *
   * 🔴 Name is not enough. With the default empty prefix `startsWith(prefix)` is
   * true for EVERY key on the origin, so this method — not the prefix — is what
   * keeps `keys()`, the TTL sweep and `clear()` off other scripts' data. An
   * expired entry is skipped here exactly as before.
   */
  protected ownKeys(
    includeExpired = false,
  ): Array<{ key: string; fullKey: string; value: StorageValue }> {
    const storage = this.getStorage();
    const owned: Array<{ key: string; fullKey: string; value: StorageValue }> = [];

    for (let i = 0; i < storage.length; i++) {
      const fullKey = storage.key(i);
      if (!fullKey?.startsWith(this.prefix)) continue;

      const key = fullKey.substring(this.prefix.length);
      const value = this.parseOwnValue(storage.getItem(fullKey), key);
      if (!value) continue;
      if (!includeExpired && this.isExpired(value)) continue;

      owned.push({ key, fullKey, value });
    }

    return owned;
  }

  /**
   * Reclaim expired entries, returning how many were removed.
   *
   * Overrides the base per-key sweep for two reasons. It reads each key once
   * instead of twice, and — the load-bearing one — the base sweep is built on
   * `keys()`, which does not surface expired entries here, so it could only ever
   * report 0. Before this override the reaping happened as an undocumented side
   * effect of `getSync()` deleting what it found expired during enumeration,
   * while the returned count stayed 0.
   */
  async cleanupExpired(): Promise<number> {
    let removed = 0;
    for (const { key, value } of this.ownKeys(true)) {
      if (this.isExpired(value)) {
        this.removeSync(key);
        removed++;
      }
    }
    return removed;
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

    // `this.getStorage()`, never `window.localStorage` — the subclass points at a
    // different area, and hard-coding it here made every inherited method wrong
    // for sessionStorage until the subclass re-implemented it. Owned keys only,
    // so a shared area is not reported as this adapter's footprint.
    const storage = this.getStorage();
    for (const { fullKey, key } of this.ownKeys(true)) {
      const item = storage.getItem(fullKey);
      if (item) {
        count++;
        const itemSize = (fullKey.length + item.length) * 2; // UTF-16
        total += itemSize;

        if (detailed) {
          keySize += fullKey.length * 2;
          valueSize += item.length * 2;
          byKey[key] = itemSize;
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
      // Only process events from this adapter's own area. Comparing against
      // `window.localStorage` by name meant the sessionStorage subclass could
      // never match its own events.
      let area: Storage;
      try {
        area = this.getStorage();
      } catch {
        return;
      }
      if (event.storageArea !== area) return;

      // Check if the key belongs to us — by name AND by shape, since an empty
      // prefix matches every key another script on this origin writes.
      if (!event.key || !event.key.startsWith(this.prefix)) return;

      const key = event.key.substring(this.prefix.length);
      const oldValue = this.parseOwnValue(event.oldValue, key);
      const newValue = this.parseOwnValue(event.newValue, key);
      if (!oldValue && !newValue) return;

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
