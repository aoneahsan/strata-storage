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
/**
 * The key prefix web adapters use unless told otherwise, as of 3.0.0.
 *
 * 🔴 Before 3.0.0 this was the empty string, which meant this library's keys sat
 * unprefixed among every other script's in a shared storage area. 2.9.0 made that
 * safe (a key is ours only if its value is a `StorageValue` envelope); this makes
 * it tidy as well, so our keys are identifiable by name too.
 *
 * Opt out with `defineStorage({ keyPrefix: false })` — see `StrataConfig`.
 */
export const DEFAULT_WEB_KEY_PREFIX = 'strata:';

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

  /**
   * Whether to adopt pre-3.0 unprefixed entries on read.
   *
   * 🔴 Defaults to FALSE, and only `Strata` turns it on — for the adapters whose
   * prefix it resolved. A directly constructed adapter must never adopt bare
   * keys: `plugin/web.ts` builds a `strata_prefs_` instance beside the main one,
   * and if that adopted every unprefixed entry it found, it would take them from
   * the instance they belong to.
   */
  protected migrateLegacyKeys = false;

  constructor(prefix = DEFAULT_WEB_KEY_PREFIX) {
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
  configure(config?: { prefix?: string; migrateLegacyKeys?: boolean }): void {
    if (config?.prefix !== undefined) {
      this.prefix = config.prefix;
    }
    if (config?.migrateLegacyKeys !== undefined) {
      this.migrateLegacyKeys = config.migrateLegacyKeys;
    }
  }

  /**
   * Adopt a pre-3.0 unprefixed entry for `key`, moving it under the current
   * prefix. Returns the adopted value, or null when there is nothing to adopt.
   *
   * This is the whole of the 3.0.0 migration, and it is deliberately **per key,
   * on read** rather than a bulk sweep. A sweep would adopt every unprefixed
   * envelope on the origin — including keys belonging to another instance that
   * opted out of the prefix, or to a sibling application still on 2.x. Adopting
   * only what the caller actually asks for keeps the blast radius to keys this
   * instance already uses.
   *
   * Three conditions, all required:
   *  1. migration is enabled and a prefix is actually in effect (nothing to move
   *     data *into* otherwise);
   *  2. the legacy value is **ours** — `parseOwnValue`, the 2.9.0 shape check. It
   *     is what makes this safe at all: with no prefix to go on, shape is the only
   *     way to tell our data from a third party's;
   *  3. the prefixed slot is **empty**. A value already there is authoritative, so
   *     the legacy entry is left alone rather than overwriting newer data.
   *
   * It MOVES rather than copies. A copy leaves a stale duplicate that diverges the
   * moment anything writes — a silent wrong answer, worse than a clean break. A
   * consumer that needs the bare key to keep existing (a pre-paint script, a
   * logger reading its own level) takes `keyPrefix: false` instead.
   */
  protected adoptLegacyKey<T = unknown>(key: string): StorageValue<T> | null {
    if (!this.migrateLegacyKeys || !this.prefix) return null;
    // A key already carrying our prefix is not a legacy key.
    if (key.startsWith(this.prefix)) return null;

    let storage: Storage;
    try {
      storage = this.getStorage();
    } catch {
      return null;
    }

    const raw = storage.getItem(key);
    if (raw === null) return null;

    const value = this.parseOwnValue<T>(raw, key);
    if (!value) return null;

    if (storage.getItem(this.prefix + key) !== null) {
      logger.debug(
        `${this.name}: legacy key "${key}" not adopted — "${this.prefix}${key}" already exists and wins.`,
      );
      return null;
    }

    try {
      storage.setItem(this.prefix + key, raw);
      storage.removeItem(key);
    } catch (error) {
      // Out of quota, or the area turned read-only mid-flight. The legacy entry
      // is still intact and still readable, so report and return it.
      logger.warn(`${this.name}: could not migrate legacy key "${key}":`, error);
      return value;
    }

    logger.debug(`${this.name}: migrated legacy key "${key}" to "${this.prefix}${key}".`);
    return value;
  }

  /**
   * Adopt ONE named foreign entry — a raw value this library did not write, such
   * as a pre-strata zustand store — into `key`, then delete the original.
   *
   * 🔴 Explicit by design. The implicit paths (`get`, `keys`, the 3.0.0 legacy
   * migration) keep the 2.9.0 shape check and never touch a foreign value; this
   * reads only the exact physical key the caller names. The raw string is kept
   * as-is (never parsed), so a consumer that stored JSON text gets that text back.
   *
   * An existing value at `key` is authoritative: nothing is adopted and the
   * foreign entry is left in place. Returns the adopted envelope, or null.
   */
  importRawSync(rawKey: string, key: string): StorageValue<string> | null {
    let storage: Storage;
    try {
      storage = this.getStorage();
    } catch {
      return null;
    }
    const raw = storage.getItem(rawKey);
    if (raw === null) return null;
    if (this.getSync(key) !== null) {
      logger.debug(`${this.name}: "${rawKey}" not imported — "${key}" already holds a value.`);
      return null;
    }
    const now = Date.now();
    const value: StorageValue<string> = { value: raw, created: now, updated: now };
    this.setSync(key, value);
    storage.removeItem(rawKey);
    logger.debug(`${this.name}: imported foreign key "${rawKey}" as "${key}".`);
    return value;
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
    // A miss falls through to a pre-3.0 unprefixed entry, if there is one.
    const value = this.parseOwnValue<T>(item, key) ?? this.adoptLegacyKey<T>(key);
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
    for (const entry of this.ownKeys(true)) {
      const { key, value } = entry;
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
        this.removeOwnedEntry(entry);
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
    const seen = new Set<string>();

    for (let i = 0; i < storage.length; i++) {
      const fullKey = storage.key(i);
      if (!fullKey?.startsWith(this.prefix)) continue;

      const key = fullKey.substring(this.prefix.length);
      const value = this.parseOwnValue(storage.getItem(fullKey), key);
      if (!value) continue;
      if (!includeExpired && this.isExpired(value)) continue;

      seen.add(key);
      owned.push({ key, fullKey, value });
    }

    // Pre-3.0 unprefixed entries are still ours and must appear here, or `keys()`,
    // `clear()` and `size()` would silently omit everything not yet read back
    // (adoption is per-read, so a freshly upgraded app has migrated nothing yet).
    //
    // 🔴 Listing is NOT adopting. Enumerating must not move data — a `keys()` call
    // is a question, not a write — so these are reported at their real physical
    // key and migrate only when actually read. A prefixed entry for the same
    // logical key always wins, so upgraded keys are never listed twice.
    if (this.migrateLegacyKeys && this.prefix) {
      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);
        if (!fullKey || fullKey.startsWith(this.prefix) || seen.has(fullKey)) continue;

        const value = this.parseOwnValue(storage.getItem(fullKey), fullKey);
        if (!value) continue;
        if (!includeExpired && this.isExpired(value)) continue;

        seen.add(fullKey);
        owned.push({ key: fullKey, fullKey, value });
      }
    }

    return owned;
  }

  /**
   * Remove an entry `ownKeys()` returned, by its PHYSICAL key.
   *
   * 🔴 Not `removeSync(key)`. That rebuilds the physical key as `prefix + key`,
   * which is wrong for a pre-3.0 legacy entry — those live at the bare key, so
   * `ownKeys()` reports `fullKey === key` for them. Rebuilding would delete
   * `strata:<key>` instead and leave the legacy entry behind, so `clear()` and
   * the expiry sweep would silently skip exactly the entries not yet migrated.
   */
  protected removeOwnedEntry(entry: { key: string; fullKey: string; value: StorageValue }): void {
    this.getStorage().removeItem(entry.fullKey);
    if (this.hasChangeListeners()) {
      this.emitChange(entry.key, entry.value.value, undefined, 'local');
    }
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
    for (const entry of this.ownKeys(true)) {
      if (this.isExpired(entry.value)) {
        this.removeOwnedEntry(entry);
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
