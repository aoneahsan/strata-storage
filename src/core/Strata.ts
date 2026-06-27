/**
 * Strata Storage - Main entry point
 * Zero-dependency universal storage solution
 */

import type {
  StrataConfig,
  StorageAdapter,
  StorageOptions,
  StorageType,
  Platform,
  SizeInfo,
  ClearOptions,
  ExportOptions,
  ImportOptions,
  SubscriptionCallback,
  UnsubscribeFunction,
  QueryCondition,
  QueryOptions,
  StorageCapabilities,
  StorageChange,
  StorageValue,
} from '@/types';

import { AdapterRegistry } from './AdapterRegistry';
import {
  isBrowser,
  isNode,
  deepMerge,
  isObject,
  isValidKey,
  isValidValue,
  matchGlob,
  getObjectSize,
} from '@/utils';
import { logger, setLogLevel, exposeLogLevelControls, type LogLevel } from '@/utils/logger';
import { StorageError, EncryptionError, IntegrityError, ValidationError } from '@/utils/errors';
import { computeChecksum, verifyChecksum } from '@/features/integrity';
import { EncryptionManager, type EncryptedData } from '@/features/encryption';
import { CompressionManager, type CompressedData } from '@/features/compression';
import { SyncManager } from '@/features/sync';
import { TTLManager } from '@/features/ttl';
import { QueryEngine } from '@/features/query';

const VERBOSITY_TO_LEVEL: Record<'minimal' | 'normal' | 'verbose', LogLevel> = {
  minimal: 'warn',
  normal: 'info',
  verbose: 'debug',
};

/**
 * Main Strata class - unified storage interface
 */
export class Strata {
  private config: StrataConfig;
  private registry: AdapterRegistry;
  private defaultAdapter?: StorageAdapter;
  private adapters: Map<StorageType, StorageAdapter> = new Map();
  private readonly _platform: Platform;
  private encryptionManager?: EncryptionManager;
  private compressionManager?: CompressionManager;
  private syncManager?: SyncManager;
  private ttlManager?: TTLManager;
  private readonly queryEngine = new QueryEngine();
  private _initialized: boolean = false;
  private _readyPromise?: Promise<void>;
  private _autoBackupTimer?: ReturnType<typeof setInterval>;
  private _ttlCleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: StrataConfig = {}) {
    this.config = this.normalizeConfig(config);
    if (this.config.debug?.enabled) {
      setLogLevel(VERBOSITY_TO_LEVEL[this.config.debug.verbosity ?? 'normal']);
      exposeLogLevelControls();
    }
    this._platform = this.detectPlatform();
    this.registry = new AdapterRegistry();
  }

  /**
   * Check if Strata has been initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get the detected platform
   */
  get platform(): Platform {
    return this._platform;
  }

  /**
   * Initialize Strata with available adapters. Idempotent — repeated calls
   * return the same in-flight/completed promise, so it is safe to call from a
   * framework Provider, from defineStorage(), or lazily on first operation.
   */
  async initialize(): Promise<void> {
    if (!this._readyPromise) {
      // On failure, clear the cached promise so a later call can retry instead
      // of permanently re-awaiting a rejected promise (e.g. a transient adapter
      // error during init should not brick the instance forever).
      this._readyPromise = this._performInitialization().catch((error) => {
        this._readyPromise = undefined;
        throw error;
      });
    }
    return this._readyPromise;
  }

  private async _performInitialization(): Promise<void> {
    // Initialize every registered adapter that is available on this platform, so
    // multi-adapter operations (keys/clear/size/subscribe without an explicit
    // `storage`) span everything the user registered — not just the default.
    await this.initializeAdapters();

    // Pick the default adapter (first available in the configured preference order).
    this.selectDefaultAdapter();

    if (!this.defaultAdapter) {
      throw new StorageError(
        `No available storage adapters. Configured preference: ` +
          `${(this.config.defaultStorages ?? []).join(', ') || '(none)'}. ` +
          `Registered: ${this.registry.getNames().join(', ') || '(none)'}.`,
      );
    }

    // Initialize encryption if enabled
    if (this.config.encryption?.enabled) {
      this.encryptionManager = new EncryptionManager(this.config.encryption);
      if (!this.encryptionManager.isAvailable()) {
        logger.warn('Encryption enabled but Web Crypto API not available');
      }
    }

    // Initialize compression if enabled
    if (this.config.compression?.enabled) {
      this.compressionManager = new CompressionManager(this.config.compression);
    }

    // Initialize sync if enabled
    if (this.config.sync?.enabled) {
      this.syncManager = new SyncManager(this.config.sync);
      await this.syncManager.initialize();

      // Apply changes received from other tabs/devices to the matching local
      // adapter so BroadcastChannel-only backends (memory/indexedDB/cache) stay
      // in sync, then let that adapter notify local subscribers.
      this.syncManager.subscribe((change) => {
        void this.applyRemoteChange(change);
      });
    }

    // Initialize TTL manager
    this.ttlManager = new TTLManager(this.config.ttl);

    // Set up periodic TTL cleanup across ALL initialized adapters (not just the
    // default), so expired items in every registered backend are reaped.
    if (this.config.ttl?.autoCleanup !== false) {
      const interval = this.config.ttl?.cleanupInterval ?? 60000;
      this._ttlCleanupTimer = setInterval(() => {
        void this.cleanupAllAdapters();
      }, interval);
    }

    // Start periodic auto-backup if configured
    if (this.config.autoBackup?.interval) {
      this.startAutoBackup();
    }

    // Mark as initialized
    this._initialized = true;
  }

  /**
   * Ensure the instance is initialized before an operation runs. This powers the
   * "create an instance and use it anywhere" pattern — callers never have to
   * await initialize() manually unless autoInitialize is explicitly disabled.
   */
  private async ensureReady(): Promise<void> {
    if (this._initialized) return;
    if (this._readyPromise) {
      await this._readyPromise;
      return;
    }
    if (this.config.autoInitialize === false) {
      throw new StorageError(
        'Strata is not initialized. Call initialize() first (autoInitialize is disabled).',
      );
    }
    await this.initialize();
  }

  /**
   * Get a value from storage
   *
   * @param key - The key to retrieve
   * @param options - Storage options
   * @param options.storage - Specific storage type to use (e.g., 'localStorage', 'indexedDB')
   * @param options.decrypt - Whether to decrypt the value (default: auto-detect)
   * @param options.encryptionPassword - Password for decryption (uses config password if not provided)
   * @returns The stored value or null if not found
   * @throws {StorageError} If the storage adapter is not available
   * @throws {EncryptionError} If decryption fails
   *
   * @example
   * ```typescript
   * // Simple get
   * const value = await storage.get('myKey');
   *
   * // Get from specific storage
   * const value = await storage.get('myKey', { storage: 'indexedDB' });
   *
   * // Get encrypted value
   * const value = await storage.get('secure-key', {
   *   encryptionPassword: 'myPassword'
   * });
   * ```
   */
  async get<T = unknown>(key: string, options?: StorageOptions): Promise<T | null> {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    const adapter = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    const value = await adapter.get<T>(physicalKey);

    if (!value) return null;

    // Handle TTL
    if (this.ttlManager && this.ttlManager.isExpired(value)) {
      await adapter.remove(physicalKey);
      return null;
    }

    // Update sliding TTL — honored per-call (`options.sliding`) or via the
    // instance default (`config.ttl.slidingTTL`).
    const shouldSlide = options?.sliding ?? this.config.ttl?.slidingTTL;
    if (shouldSlide && value.expires && this.ttlManager) {
      const updatedValue = this.ttlManager.updateExpiration(value, { ...options, sliding: true });
      if (updatedValue !== value) {
        await adapter.set(physicalKey, updatedValue);
      }
    }

    // Verify integrity; on corruption, try mirror read-repair, then honor the
    // ignoreCorruption option, else surface a typed IntegrityError.
    if (value.checksum && !verifyChecksum(value.value, value.checksum)) {
      const repaired = await this.repairFromMirror<T>(key, options);
      if (repaired !== undefined) return repaired;
      if (options?.ignoreCorruption) return null;
      throw new IntegrityError(`Integrity check failed for key "${key}" (data may be corrupted)`, {
        key,
        storage: adapter.name,
      });
    }

    // Decode through the shared pipeline: decrypt first, then decompress (the
    // write path is compress -> encrypt, so the read path must reverse it).
    return this.decodeStoredValue<T>(value, key, options);
  }

  /**
   * Reverse the write-time transform pipeline on a stored wrapper: decrypt (if
   * encrypted) and then decompress (if compressed). Shared by get() and query()
   * so query results are decoded identically to direct reads. Returns the raw
   * encrypted payload when `skipDecryption` is set.
   */
  private async decodeStoredValue<T>(
    value: StorageValue,
    key: string,
    options?: StorageOptions,
  ): Promise<T | null> {
    let payload: unknown = value.value;

    if (value.encrypted && this.encryptionManager) {
      if (options?.skipDecryption) {
        return payload as T;
      }
      try {
        const password = options?.encryptionPassword || this.config.encryption?.password;
        if (!password) {
          throw new EncryptionError('Encrypted value requires password for decryption');
        }
        payload = await this.encryptionManager.decrypt(payload as EncryptedData, password);
      } catch (error) {
        if (options?.ignoreDecryptionErrors) {
          logger.warn(`Failed to decrypt key ${key}:`, error);
          return null;
        }
        throw error;
      }
    }

    if (value.compressed && this.compressionManager) {
      return this.compressionManager.decompress<T>(payload as CompressedData);
    }

    return payload as T;
  }

  /**
   * Set a value in storage
   *
   * @param key - The key to store under
   * @param value - The value to store (can be any serializable type)
   * @param options - Storage options
   * @param options.storage - Specific storage type to use
   * @param options.encrypt - Whether to encrypt the value
   * @param options.encryptionPassword - Password for encryption
   * @param options.compress - Whether to compress the value
   * @param options.ttl - Time-to-live in milliseconds
   * @param options.tags - Tags for categorization
   * @param options.metadata - Additional metadata to store
   * @throws {StorageError} If the storage adapter is not available
   * @throws {EncryptionError} If encryption fails
   *
   * @example
   * ```typescript
   * // Simple set
   * await storage.set('myKey', 'myValue');
   *
   * // Set with TTL (expires in 1 hour)
   * await storage.set('tempKey', data, { ttl: 3600000 });
   *
   * // Set with encryption and compression
   * await storage.set('secure-key', sensitiveData, {
   *   encrypt: true,
   *   compress: true,
   *   encryptionPassword: 'myPassword'
   * });
   *
   * // Set with metadata
   * await storage.set('user-123', userData, {
   *   tags: ['user', 'active'],
   *   metadata: { version: 2, source: 'api' }
   * });
   * ```
   */
  async set<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<void> {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    if (!isValidValue(value)) {
      throw new ValidationError(
        'Invalid storage value: undefined, functions, and symbols cannot be stored',
        { key },
      );
    }
    const adapter = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    const now = Date.now();

    let processedValue: unknown = value;
    let compressed = false;

    // Handle compression if needed
    const shouldCompress = options?.compress ?? this.config.compression?.enabled;

    if (shouldCompress && this.compressionManager) {
      const compressedResult = await this.compressionManager.compress(processedValue);
      if (this.compressionManager.isCompressedData(compressedResult)) {
        processedValue = compressedResult;
        compressed = true;
      }
    }

    // Handle encryption if needed. Encrypt whatever `processedValue` currently
    // holds — the compressed payload when compression ran — so the transforms
    // compose as compress-then-encrypt and the `compressed` flag stays truthful.
    const shouldEncrypt = options?.encrypt ?? this.config.encryption?.enabled;
    let encrypted = false;

    if (shouldEncrypt && this.encryptionManager) {
      const password = options?.encryptionPassword || this.config.encryption?.password;
      if (!password) {
        throw new EncryptionError('Encryption enabled but no password provided');
      }
      processedValue = await this.encryptionManager.encrypt(processedValue, password);
      encrypted = true;
    }

    const storageValue: StorageValue = {
      value: processedValue,
      created: now,
      updated: now,
      expires: this.ttlManager ? this.ttlManager.calculateExpiration(options) : undefined,
      tags: options?.tags,
      metadata: options?.metadata,
      encrypted: encrypted,
      compressed: compressed,
    };

    // Integrity checksum over the stored (processed) value, when enabled.
    if (this.config.integrity || options?.verify) {
      storageValue.checksum = computeChecksum(processedValue);
    }

    await adapter.set(physicalKey, storageValue);

    // Durable write: read back and verify, retrying on mismatch.
    if (this.config.durableWrites || options?.durable) {
      await this.verifyDurableWrite(adapter, physicalKey, storageValue);
    }

    // Mirror the write to any configured backup adapters.
    await this.mirrorWrite(physicalKey, storageValue, adapter.name);

    // Broadcast change for sync
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'set',
        key: physicalKey,
        value: storageValue,
        storage: adapter.name,
        timestamp: now,
      });
    }
  }

  /**
   * Remove a value from storage
   *
   * @param key - The key to remove
   * @param options - Storage options
   * @param options.storage - Specific storage type to use
   * @throws {StorageError} If the storage adapter is not available
   *
   * @example
   * ```typescript
   * // Remove from default storage
   * await storage.remove('myKey');
   *
   * // Remove from specific storage
   * await storage.remove('myKey', { storage: 'cookies' });
   * ```
   */
  async remove(key: string, options?: StorageOptions): Promise<void> {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    const adapter = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    await adapter.remove(physicalKey);

    // Mirror the removal to any configured backup adapters.
    await this.mirrorRemove(physicalKey, adapter.name);

    // Broadcast removal for sync
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'remove',
        key: physicalKey,
        storage: adapter.name,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check if a key exists in storage
   *
   * @param key - The key to check
   * @param options - Storage options
   * @param options.storage - Specific storage type to check
   * @returns True if the key exists, false otherwise
   * @throws {StorageError} If the storage adapter is not available
   *
   * @example
   * ```typescript
   * // Check in default storage
   * const exists = await storage.has('myKey');
   *
   * // Check in specific storage
   * const exists = await storage.has('myKey', { storage: 'sessionStorage' });
   * ```
   */
  async has(key: string, options?: StorageOptions): Promise<boolean> {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    const adapter = await this.selectAdapter(options?.storage);
    return adapter.has(this.resolveKey(key, options));
  }

  /**
   * Clear storage
   *
   * @param options - Clear options
   * @param options.storage - Specific storage to clear (clears all if not specified)
   * @param options.prefix - Only clear keys with this prefix
   * @param options.tags - Only clear items with these tags
   * @param options.olderThan - Only clear items older than this date
   * @throws {StorageError} If the storage adapter is not available
   *
   * @example
   * ```typescript
   * // Clear all storage
   * await storage.clear();
   *
   * // Clear specific storage
   * await storage.clear({ storage: 'localStorage' });
   *
   * // Clear by prefix
   * await storage.clear({ prefix: 'temp-' });
   *
   * // Clear old items
   * const yesterday = Date.now() - 86400000;
   * await storage.clear({ olderThan: yesterday });
   * ```
   */
  async clear(options?: ClearOptions & StorageOptions): Promise<void> {
    await this.ensureReady();
    const adapters = options?.storage
      ? [await this.selectAdapter(options.storage)]
      : Array.from(this.adapters.values());

    const ns = this.effectiveNamespace(options);
    const olderThanTs =
      options?.olderThan !== undefined ? Strata.normalizeTimestamp(options.olderThan) : undefined;
    const needsInspection = !!(
      ns ||
      options?.prefix ||
      options?.pattern ||
      options?.tags ||
      options?.expiredOnly ||
      olderThanTs !== undefined
    );

    for (const adapter of adapters) {
      // Fast path: an unfiltered, un-namespaced clear wipes the whole adapter.
      if (!needsInspection) {
        await adapter.clear();
        // Propagate the full clear cross-tab so other tabs converge, matching
        // the set/remove broadcasts. ONLY full clears broadcast — a filtered or
        // namespaced clear must not wipe the whole adapter elsewhere.
        // localStorage/sessionStorage propagate natively and are skipped on the
        // receiving side; applyRemoteChange clears the adapter directly (no
        // re-broadcast), so there is no sync loop.
        if (this.syncManager) {
          this.syncManager.broadcast({
            type: 'clear',
            storage: adapter.name,
            timestamp: Date.now(),
          });
        }
        continue;
      }

      // `expiredOnly` with no other narrowing filter: delegate to the adapter's
      // bulk expired-reclamation when it has one (SQLite reaps in a single
      // DELETE). The key-inspection loop below cannot reach expired rows on
      // backends whose keys() already filters them out (SQLite filters in SQL),
      // so without this it would be a silent no-op there.
      if (
        options?.expiredOnly &&
        !ns &&
        !options?.prefix &&
        !options?.pattern &&
        !options?.tags &&
        olderThanTs === undefined &&
        typeof adapter.cleanupExpired === 'function'
      ) {
        await adapter.cleanupExpired();
        continue;
      }

      // Filtered/namespaced clear: inspect keys and remove only the matches.
      const scopedPrefix = ns
        ? `${this.namespacePrefix(ns)}${options?.prefix ?? ''}`
        : options?.prefix;
      for (const physicalKey of await adapter.keys()) {
        if (ns && !physicalKey.startsWith(this.namespacePrefix(ns))) continue;
        if (scopedPrefix && !physicalKey.startsWith(scopedPrefix)) continue;
        if (
          options?.pattern &&
          this.filterKeysByPattern([physicalKey], options.pattern).length === 0
        )
          continue;

        if (options?.tags || options?.expiredOnly || olderThanTs !== undefined) {
          const value = await adapter.get(physicalKey);
          if (
            options?.tags &&
            (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag)))
          )
            continue;
          if (options?.expiredOnly && (!value || !this.isItemExpired(value))) continue;
          if (olderThanTs !== undefined && (!value || value.created >= olderThanTs)) continue;
        }

        await adapter.remove(physicalKey);
      }
    }
  }

  /** Expiry check that works before the TTL manager exists (e.g. pre-init). */
  private isItemExpired(value: StorageValue): boolean {
    if (this.ttlManager) return this.ttlManager.isExpired(value);
    return value.expires !== undefined && Date.now() > value.expires;
  }

  /**
   * Get all keys from storage
   *
   * @param pattern - Optional pattern to filter keys (string prefix or RegExp)
   * @param options - Storage options
   * @param options.storage - Specific storage to get keys from (gets from all if not specified)
   * @returns Array of matching keys
   * @throws {StorageError} If the storage adapter is not available
   *
   * @example
   * ```typescript
   * // Get all keys
   * const keys = await storage.keys();
   *
   * // Get keys with prefix
   * const userKeys = await storage.keys('user-');
   *
   * // Get keys with regex pattern
   * const tempKeys = await storage.keys(/^temp-.*$/);
   *
   * // Get keys from specific storage
   * const localKeys = await storage.keys(null, { storage: 'localStorage' });
   * ```
   */
  async keys(pattern?: string | RegExp, options?: StorageOptions): Promise<string[]> {
    await this.ensureReady();
    const ns = this.effectiveNamespace(options);

    if (options?.storage) {
      const adapter = await this.selectAdapter(options.storage);
      // When namespaced, fetch all physical keys and strip/scope ourselves;
      // otherwise let the adapter apply the pattern directly.
      const raw = ns ? await adapter.keys() : await adapter.keys(pattern);
      return ns ? this.scopeAndStripKeys(raw, ns, pattern) : raw;
    }

    // Get keys from all adapters and deduplicate
    const allKeys = new Set<string>();
    for (const adapter of this.adapters.values()) {
      const raw = ns ? await adapter.keys() : await adapter.keys(pattern);
      for (const key of raw) allKeys.add(key);
    }

    const collected = Array.from(allKeys);
    return ns ? this.scopeAndStripKeys(collected, ns, pattern) : collected;
  }

  // ===========================================================================
  // Synchronous API
  //
  // Works only on sync-capable adapters (memory, localStorage, sessionStorage,
  // cookies, url). Throws a clear error on async-only backends (indexedDB,
  // cache, sqlite, filesystem, secure, preferences) and when encryption or
  // compression is requested (those are inherently async — use the async API).
  // No await is needed; the adapter lookup falls back to the registry so sync
  // calls work even before async initialize() has completed.
  // ===========================================================================

  /** Synchronous get. Throws on async-only backends and on encrypted/compressed values. */
  getSync<T = unknown>(key: string, options?: StorageOptions): T | null {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    const adapter = this.requireSyncAdapter(options?.storage);
    const value = adapter.getSync!(this.resolveKey(key, options)) as StorageValue<T> | null;
    if (!value) return null;
    if (value.encrypted || value.compressed) {
      throw new StorageError(
        `Cannot synchronously read encrypted/compressed key "${key}". Use the async get() instead.`,
      );
    }
    return value.value;
  }

  /** Synchronous set. Cannot encrypt or compress (those operations are async). */
  setSync<T = unknown>(key: string, value: T, options?: StorageOptions): void {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    if (!isValidValue(value)) {
      throw new ValidationError(
        'Invalid storage value: undefined, functions, and symbols cannot be stored',
        { key },
      );
    }
    if (options?.encrypt || options?.compress) {
      throw new StorageError(
        'Synchronous set cannot encrypt or compress (those operations are async). Use the async set() instead.',
      );
    }
    const adapter = this.requireSyncAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    const now = Date.now();
    const storageValue: StorageValue = {
      value,
      created: now,
      updated: now,
      expires: this.computeExpiration(options),
      tags: options?.tags,
      metadata: options?.metadata,
      encrypted: false,
      compressed: false,
    };
    adapter.setSync!(physicalKey, storageValue);
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'set',
        key: physicalKey,
        value: storageValue,
        storage: adapter.name,
        timestamp: now,
      });
    }
  }

  /** Synchronous remove. */
  removeSync(key: string, options?: StorageOptions): void {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    const adapter = this.requireSyncAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    adapter.removeSync!(physicalKey);
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'remove',
        key: physicalKey,
        storage: adapter.name,
        timestamp: Date.now(),
      });
    }
  }

  /** Synchronous existence check. */
  hasSync(key: string, options?: StorageOptions): boolean {
    if (!isValidKey(key)) {
      throw new ValidationError('Invalid storage key', { key });
    }
    return this.requireSyncAdapter(options?.storage).hasSync!(this.resolveKey(key, options));
  }

  /** Synchronous keys. With no `storage`, aggregates across sync-capable adapters. */
  keysSync(pattern?: string | RegExp, options?: StorageOptions): string[] {
    const ns = this.effectiveNamespace(options);
    if (options?.storage) {
      const adapter = this.requireSyncAdapter(options.storage);
      const raw = ns ? adapter.keysSync!() : adapter.keysSync!(pattern);
      return ns ? this.scopeAndStripKeys(raw, ns, pattern) : raw;
    }
    const all = new Set<string>();
    for (const adapter of this.syncCapableAdapters()) {
      try {
        for (const key of ns ? adapter.keysSync!() : adapter.keysSync!(pattern)) {
          all.add(key);
        }
      } catch (error) {
        // An adapter may be registered but unusable in this environment (e.g.
        // localStorage during SSR) — skipping it is expected, not a problem.
        logger.debug(`Synchronous keys: skipped unavailable adapter "${adapter.name}"`, error);
      }
    }
    const collected = Array.from(all);
    return ns ? this.scopeAndStripKeys(collected, ns, pattern) : collected;
  }

  /** Synchronous clear. With no `storage`, clears all sync-capable adapters. */
  clearSync(options?: ClearOptions & StorageOptions): void {
    const ns = this.effectiveNamespace(options);
    const olderThanTs =
      options?.olderThan !== undefined ? Strata.normalizeTimestamp(options.olderThan) : undefined;
    const needsInspection = !!(
      ns ||
      options?.prefix ||
      options?.pattern ||
      options?.tags ||
      options?.expiredOnly ||
      olderThanTs !== undefined
    );

    const adapters = options?.storage
      ? [this.requireSyncAdapter(options.storage)]
      : this.syncCapableAdapters();

    for (const adapter of adapters) {
      try {
        if (!needsInspection) {
          adapter.clearSync!();
          // Propagate the full clear cross-tab (see clear()). Only full clears
          // broadcast; localStorage/sessionStorage are skipped on receive.
          if (this.syncManager) {
            this.syncManager.broadcast({
              type: 'clear',
              storage: adapter.name,
              timestamp: Date.now(),
            });
          }
          continue;
        }
        const scopedPrefix = ns
          ? `${this.namespacePrefix(ns)}${options?.prefix ?? ''}`
          : options?.prefix;
        for (const physicalKey of adapter.keysSync!()) {
          if (ns && !physicalKey.startsWith(this.namespacePrefix(ns))) continue;
          if (scopedPrefix && !physicalKey.startsWith(scopedPrefix)) continue;
          if (
            options?.pattern &&
            this.filterKeysByPattern([physicalKey], options.pattern).length === 0
          )
            continue;
          if (options?.tags || options?.expiredOnly || olderThanTs !== undefined) {
            const value = adapter.getSync!(physicalKey);
            if (
              options?.tags &&
              (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag)))
            )
              continue;
            if (options?.expiredOnly && (!value || !this.isItemExpired(value))) continue;
            if (olderThanTs !== undefined && (!value || value.created >= olderThanTs)) continue;
          }
          adapter.removeSync!(physicalKey);
        }
      } catch (error) {
        logger.debug(`Synchronous clear: skipped unavailable adapter "${adapter.name}"`, error);
      }
    }
  }

  // Resolve a single sync-capable adapter or throw a clear, actionable error.
  private requireSyncAdapter(storage?: StorageType | StorageType[]): StorageAdapter {
    const adapter = this.selectAdapterSync(storage);
    if (!adapter.capabilities.synchronous || !adapter.getSync) {
      throw new StorageError(
        `Storage "${adapter.name}" does not support synchronous operations. Use the async API, ` +
          `or target a sync-capable adapter (memory, localStorage, sessionStorage, cookies, url).`,
      );
    }
    return adapter;
  }

  // Synchronous adapter lookup — falls back to the registry so sync operations
  // work even before async initialize() has completed.
  private selectAdapterSync(storage?: StorageType | StorageType[]): StorageAdapter {
    if (storage) {
      const names = Array.isArray(storage) ? storage : [storage];
      for (const name of names) {
        const adapter = this.adapters.get(name) ?? this.registry.get(name);
        if (adapter) return adapter;
      }
      throw new StorageError(`No adapter registered for storage type(s): ${names.join(', ')}`);
    }

    if (this.defaultAdapter) return this.defaultAdapter;

    const preferred = this.config.defaultStorages ?? [];
    for (const name of preferred) {
      const adapter = this.adapters.get(name) ?? this.registry.get(name);
      if (adapter) return adapter;
    }

    const first = this.registry.getAll().values().next().value;
    if (first) return first;
    throw new StorageError('No storage adapter registered for synchronous operation.');
  }

  // All sync-capable adapters (initialized set, or the registry before init).
  private syncCapableAdapters(): StorageAdapter[] {
    const source =
      this.adapters.size > 0 ? this.adapters.values() : this.registry.getAll().values();
    const result: StorageAdapter[] = [];
    for (const adapter of source) {
      if (adapter.capabilities.synchronous && adapter.keysSync && adapter.clearSync) {
        result.push(adapter);
      }
    }
    return result;
  }

  // Compute an expiration timestamp from options without requiring the TTL
  // manager (which only exists after initialize()).
  private computeExpiration(options?: StorageOptions): number | undefined {
    if (this.ttlManager) return this.ttlManager.calculateExpiration(options);
    // Pre-init fallback: mirror TTLManager.calculateExpiration's precedence
    // (expireAt > expireAfter > ttl > defaultTTL) and past-guarding, so a write
    // issued before initialize() expires identically to one issued after.
    if (options?.expireAt !== undefined) {
      const t = options.expireAt instanceof Date ? options.expireAt.getTime() : options.expireAt;
      return t > Date.now() ? t : undefined;
    }
    if (options?.expireAfter !== undefined) {
      const t =
        options.expireAfter instanceof Date ? options.expireAfter.getTime() : options.expireAfter;
      return t > Date.now() ? t : undefined;
    }
    if (typeof options?.ttl === 'number') return Date.now() + options.ttl;
    if (this.config.ttl?.defaultTTL) return Date.now() + this.config.ttl.defaultTTL;
    return undefined;
  }

  /**
   * Get storage size information
   */
  async size(detailed?: boolean, options?: StorageOptions): Promise<SizeInfo> {
    await this.ensureReady();
    const ns = this.effectiveNamespace(options);
    let total = 0;
    let count = 0;
    const byStorage: Record<string, number> = {};
    const allByKey: Record<string, number> = {};

    for (const [type, adapter] of this.adapters.entries()) {
      if (!ns) {
        const sizeInfo = await adapter.size(detailed);
        total += sizeInfo.total;
        count += sizeInfo.count;
        byStorage[type] = sizeInfo.total;

        // Aggregate byKey data if detailed
        if (detailed && sizeInfo.byKey) {
          for (const [key, size] of Object.entries(sizeInfo.byKey)) {
            allByKey[key] = (allByKey[key] || 0) + size;
          }
        }
        continue;
      }

      let storageTotal = 0;
      const prefix = this.namespacePrefix(ns);
      for (const physicalKey of await adapter.keys()) {
        if (!physicalKey.startsWith(prefix)) continue;
        const value = await adapter.get(physicalKey);
        if (!value) continue;

        const logicalKey = physicalKey.slice(prefix.length);
        const keySize = logicalKey.length * 2;
        const valueSize = getObjectSize(value);
        const entrySize = keySize + valueSize;

        total += entrySize;
        storageTotal += entrySize;
        count++;

        if (detailed) {
          allByKey[logicalKey] = (allByKey[logicalKey] || 0) + entrySize;
        }
      }
      byStorage[type] = storageTotal;
    }

    const result: SizeInfo = {
      total,
      count,
      byStorage: byStorage as Record<StorageType, number>,
    };

    if (detailed) {
      result.byKey = allByKey;
    }

    return result;
  }

  /**
   * Subscribe to storage changes
   */
  subscribe(callback: SubscriptionCallback, options?: StorageOptions): UnsubscribeFunction {
    let cancelled = false;
    const unsubscribers: UnsubscribeFunction[] = [];

    // When namespaced, only forward changes for keys this namespace owns and
    // present the logical (un-prefixed) key to the subscriber.
    const ns = this.effectiveNamespace(options);
    const effectiveCallback: SubscriptionCallback = ns
      ? (change) => {
          if (change.key === '*') {
            callback(change);
            return;
          }
          const prefix = this.namespacePrefix(ns);
          if (!change.key.startsWith(prefix)) return;
          callback({ ...change, key: change.key.slice(prefix.length) });
        }
      : callback;

    const attach = (): void => {
      if (cancelled) return;
      const targets =
        options?.storage !== undefined
          ? [this.adapters.get(options.storage as StorageType)]
          : Array.from(this.adapters.values());
      for (const adapter of targets) {
        if (adapter?.subscribe) {
          unsubscribers.push(adapter.subscribe(effectiveCallback));
        }
      }
    };

    // Attach now if ready; otherwise once initialization completes — so a
    // subscription created before initialization still receives changes.
    if (this._initialized) {
      attach();
    } else {
      void this.ensureReady()
        .then(attach)
        .catch(() => {
          /* init errors surface through operations, not subscriptions */
        });
    }

    // Return a function that unsubscribes from all (even if attach ran later).
    return () => {
      cancelled = true;
      while (unsubscribers.length > 0) {
        unsubscribers.pop()?.();
      }
    };
  }

  /**
   * Query storage (if supported)
   */
  async query<T = unknown>(
    condition: QueryCondition,
    options?: StorageOptions & QueryOptions,
  ): Promise<Array<{ key: string; value: T }>> {
    const adapter = await this.selectAdapter(options?.storage);
    const ns = this.effectiveNamespace(options);
    const rawKeys = await adapter.keys();

    // Query decoded values, not adapter-level stored wrappers. This keeps
    // query() behavior aligned with get(), including namespace scoping, TTL,
    // integrity repair, decryption, and decompression.
    const decoded: Array<{ key: string; value: T }> = [];
    for (const physicalKey of rawKeys) {
      if (ns && !physicalKey.startsWith(this.namespacePrefix(ns))) continue;
      const logicalKey = ns ? physicalKey.slice(this.namespacePrefix(ns).length) : physicalKey;
      if (!isValidKey(logicalKey)) continue;
      const value = await this.get<T>(logicalKey, options);
      if (value === null) continue;
      if (this.queryEngine.matches(value, condition)) {
        decoded.push({ key: logicalKey, value });
      }
    }

    return this.applyQueryOptions(decoded, options);
  }

  /** Apply QueryOptions (sort → skip → limit → select) to decoded query results. */
  private applyQueryOptions<T>(
    items: Array<{ key: string; value: T }>,
    options?: QueryOptions,
  ): Array<{ key: string; value: T }> {
    let result = items;

    if (options?.sort) {
      const spec =
        typeof options.sort === 'string'
          ? { [options.sort]: 1 as const }
          : (options.sort as Record<string, 1 | -1>);
      // Sort by fields of the stored value (prefix paths so the engine reads
      // `item.value.<field>`).
      const sortBy = Object.fromEntries(
        Object.entries(spec).map(([field, dir]) => [`value.${field}`, dir]),
      );
      result = this.queryEngine.sort(result, sortBy as Record<string, 1 | -1>);
    }

    if (typeof options?.skip === 'number' && options.skip > 0) {
      result = result.slice(options.skip);
    }

    if (typeof options?.limit === 'number') {
      result = result.slice(0, Math.max(0, options.limit));
    }

    if (options?.select && options.select.length > 0) {
      const projection: Record<string, 1> = {};
      for (const field of options.select) projection[field] = 1;
      result = result.map((item) => ({
        key: item.key,
        value: this.queryEngine.project(item.value, projection) as T,
      }));
    }

    return result;
  }

  /**
   * Export storage data
   */
  async export(options?: ExportOptions): Promise<string> {
    const data: Record<string, unknown> = {};
    const opts: StorageOptions | undefined = options?.storage
      ? { storage: options.storage }
      : undefined;
    const keys = options?.keys || (await this.keys(undefined, opts));

    for (const key of keys) {
      if (options?.includeMetadata) {
        // Read the full wrapper from the targeted adapter (physical key).
        const adapter = await this.selectAdapter(options?.storage);
        const storageValue = await adapter.get(this.resolveKey(key, opts));
        if (storageValue) data[key] = storageValue;
      } else {
        const value = await this.get(key, opts);
        if (value !== null) data[key] = value;
      }
    }

    const format = options?.format || 'json';
    if (format === 'json') {
      return JSON.stringify(data, null, options?.pretty ? 2 : 0);
    }

    throw new StorageError(`Export format ${format} not supported`);
  }

  /** Detect a full StorageValue wrapper (e.g. from export({ includeMetadata })). */
  private isStorageValueWrapper(value: unknown): value is StorageValue {
    if (!isObject(value)) return false;
    return (
      'value' in value && typeof value.created === 'number' && typeof value.updated === 'number'
    );
  }

  /**
   * Import storage data
   */
  async import(data: string, options?: ImportOptions): Promise<void> {
    const format = options?.format || 'json';

    if (format !== 'json') {
      throw new StorageError(`Import format ${format} not supported`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new StorageError('Cannot import: data is not valid JSON');
    }
    if (!isObject(parsed)) {
      throw new StorageError('Cannot import: expected a JSON object of key/value pairs');
    }

    const opts: StorageOptions | undefined = options?.storage
      ? { storage: options.storage }
      : undefined;

    for (const [key, value] of Object.entries(parsed)) {
      // Never write a prototype-pollution / invalid key, and never let it reach
      // deepMerge below (isValidKey also rejects __proto__/constructor/prototype).
      if (!isValidKey(key)) continue;

      const exists = await this.has(key, opts);

      // A full StorageValue wrapper (from export({ includeMetadata })) is written
      // straight to the adapter so its TTL/tags/metadata/flags survive — routing
      // it through set() would wrap the wrapper and corrupt the shape.
      if (this.isStorageValueWrapper(value)) {
        if (!exists || options?.overwrite) {
          const adapter = await this.selectAdapter(options?.storage);
          await adapter.set(this.resolveKey(key, opts), value);
        }
        continue;
      }

      if (!exists || options?.overwrite) {
        await this.set(key, value, opts);
      } else if (options?.merge) {
        const existing = await this.get(key, opts);
        if (options.merge === 'deep' && typeof existing === 'object' && typeof value === 'object') {
          // Use deep merge utility for proper nested object merging.
          // deepMerge itself strips prototype-pollution keys defensively.
          const merged = deepMerge(
            existing as Record<string, unknown>,
            value as Record<string, unknown>,
          );
          await this.set(key, merged, opts);
        } else {
          await this.set(key, value, opts);
        }
      }
    }
  }

  /**
   * Create a portable, integrity-verified snapshot of all stored data. The
   * returned string embeds a manifest (version, timestamp, checksum) so
   * restore() can detect a corrupted backup. Pair with config.autoBackup for
   * scheduled snapshots.
   */
  async snapshot(options?: ExportOptions): Promise<string> {
    const payload = await this.export({ includeMetadata: true, ...options });
    const manifest = {
      __strataSnapshot: 1 as const,
      createdAt: Date.now(),
      checksum: computeChecksum(payload),
      payload,
    };
    return JSON.stringify(manifest);
  }

  /**
   * Restore data from a snapshot() string. Validates the manifest checksum and
   * throws IntegrityError if the backup is corrupted. A raw export string (no
   * manifest) is also accepted.
   */
  async restore(snapshot: string, options?: ImportOptions): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(snapshot);
    } catch {
      throw new IntegrityError('Cannot restore: snapshot is not valid JSON');
    }

    const manifest = parsed as { __strataSnapshot?: number; checksum?: string; payload?: string };

    // A plain export string (no manifest) — import directly.
    if (!manifest || manifest.__strataSnapshot === undefined) {
      await this.import(snapshot, { overwrite: true, ...options });
      return;
    }

    if (
      typeof manifest.payload !== 'string' ||
      typeof manifest.checksum !== 'string' ||
      !verifyChecksum(manifest.payload, manifest.checksum)
    ) {
      throw new IntegrityError('Cannot restore: snapshot checksum mismatch (backup is corrupted)');
    }

    // Snapshots embed full value wrappers (metadata + checksum), so write them
    // back directly — going through set() would re-wrap them and lose TTL, tags,
    // encryption flags, and checksums.
    let data: unknown;
    try {
      data = JSON.parse(manifest.payload);
    } catch {
      throw new IntegrityError('Cannot restore: snapshot payload is not valid JSON');
    }
    if (!isObject(data)) {
      throw new IntegrityError('Cannot restore: snapshot payload is not an object');
    }
    const adapter = await this.selectAdapter(options?.storage);
    for (const [key, wrapper] of Object.entries(data)) {
      // Skip prototype-pollution / invalid keys; never use them as a storage key.
      if (!isValidKey(key)) continue;
      // Snapshots have no per-call namespace; the instance-level namespace (if
      // any) is applied via resolveKey().
      await adapter.set(this.resolveKey(key), wrapper as StorageValue);
    }
  }

  /**
   * Get available storage types
   */
  getAvailableStorageTypes(): StorageType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(
    storage?: StorageType,
  ): StorageCapabilities | Record<string, StorageCapabilities> {
    if (storage) {
      const adapter = this.adapters.get(storage);
      return adapter ? adapter.capabilities : ({} as StorageCapabilities);
    }

    // Return capabilities of all adapters
    const capabilities: Record<string, StorageCapabilities> = {};
    for (const [type, adapter] of this.adapters.entries()) {
      capabilities[type] = adapter.capabilities;
    }
    return capabilities;
  }

  /**
   * Generate a secure password for encryption
   */
  generatePassword(length?: number): string {
    if (!this.encryptionManager) {
      throw new EncryptionError('Encryption not initialized');
    }
    return this.encryptionManager.generatePassword(length);
  }

  /**
   * Hash data using SHA-256
   */
  async hash(data: string): Promise<string> {
    if (!this.encryptionManager) {
      throw new EncryptionError('Encryption not initialized');
    }
    return this.encryptionManager.hash(data);
  }

  /**
   * Get TTL (time to live) for a key
   */
  async getTTL(key: string, options?: StorageOptions): Promise<number | null> {
    if (!this.ttlManager) return null;

    const adapter = await this.selectAdapter(options?.storage);
    const value = await adapter.get(this.resolveKey(key, options));

    if (!value) return null;
    return this.ttlManager.getTimeToLive(value);
  }

  /**
   * Extend TTL for a key
   */
  async extendTTL(key: string, extension: number, options?: StorageOptions): Promise<void> {
    if (!this.ttlManager) {
      throw new StorageError('TTL manager not initialized');
    }

    const adapter = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    const value = await adapter.get(physicalKey);

    if (!value) {
      throw new StorageError(`Key ${key} not found`);
    }

    const updated = this.ttlManager.extendTTL(value, extension);
    await adapter.set(physicalKey, updated);
  }

  /**
   * Make a key persistent (remove TTL)
   */
  async persist(key: string, options?: StorageOptions): Promise<void> {
    if (!this.ttlManager) {
      throw new StorageError('TTL manager not initialized');
    }

    const adapter = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    const value = await adapter.get(physicalKey);

    if (!value) {
      throw new StorageError(`Key ${key} not found`);
    }

    const persisted = this.ttlManager.persist(value);
    await adapter.set(physicalKey, persisted);
  }

  /**
   * Get items expiring within a time window
   */
  async getExpiring(
    timeWindow: number,
    options?: StorageOptions,
  ): Promise<Array<{ key: string; expiresIn: number }>> {
    if (!this.ttlManager) return [];

    const adapter = await this.selectAdapter(options?.storage);
    const ns = this.effectiveNamespace(options);
    const items = await this.ttlManager.getExpiring(
      timeWindow,
      () => adapter.keys(),
      (physicalKey) => adapter.get(physicalKey),
    );

    return ns
      ? items
          .filter((item) => item.key.startsWith(this.namespacePrefix(ns)))
          .map((item) => ({ ...item, key: item.key.slice(this.namespacePrefix(ns).length) }))
      : items;
  }

  /**
   * Manually trigger TTL cleanup
   */
  async cleanupExpired(options?: StorageOptions): Promise<number> {
    if (!this.ttlManager) return 0;

    const adapter = await this.selectAdapter(options?.storage);

    // SQLite filters expired rows in SQL, so its keys() no longer surfaces them
    // — the per-key sweep below would reclaim nothing. Delegate to the adapter's
    // own bulk reclamation (one DELETE), matching what the automatic TTL tick
    // does. Reclamation here is backend-wide (not namespace-scoped), consistent
    // with that tick.
    if (adapter.name === 'sqlite' && typeof adapter.cleanupExpired === 'function') {
      return adapter.cleanupExpired();
    }

    const ns = this.effectiveNamespace(options);
    const expired = await this.ttlManager.cleanup(
      async () => {
        const keys = await adapter.keys();
        return ns ? keys.filter((key) => key.startsWith(this.namespacePrefix(ns))) : keys;
      },
      (physicalKey) => adapter.get(physicalKey),
      (physicalKey) => adapter.remove(physicalKey),
    );

    return expired.length;
  }

  /**
   * Register a custom storage adapter
   * This allows external adapters to be registered after initialization
   *
   * @example
   * ```typescript
   * import { MyCustomAdapter } from './my-adapter';
   * storage.registerAdapter(new MyCustomAdapter());
   * ```
   */
  registerAdapter(adapter: StorageAdapter): void {
    this.registry.register(adapter);
  }

  /**
   * Initialize and attach any registered adapters that are not yet active, then
   * re-pick the default adapter. Call this after `registerAdapter()` on an
   * already-initialized instance (e.g. `registerCapacitorAdapters()`), so the
   * newly registered adapters become available to multi-adapter operations
   * (keys/clear/size/subscribe) — not just to explicit `{ storage }` calls.
   */
  async refreshAdapters(): Promise<void> {
    if (!this._initialized) {
      await this.initialize();
      return;
    }
    await this.initializeAdapters();
    this.selectDefaultAdapter();
  }

  /**
   * Get the adapter registry (for advanced use cases)
   * @internal
   */
  getRegistry(): AdapterRegistry {
    return this.registry;
  }

  /**
   * Close all adapters
   */
  async close(): Promise<void> {
    if (this._autoBackupTimer) {
      clearInterval(this._autoBackupTimer);
      this._autoBackupTimer = undefined;
    }

    if (this._ttlCleanupTimer) {
      clearInterval(this._ttlCleanupTimer);
      this._ttlCleanupTimer = undefined;
    }

    for (const adapter of this.adapters.values()) {
      if (adapter.close) {
        await adapter.close();
      }
    }
    this.adapters.clear();

    // Clear encryption cache
    if (this.encryptionManager) {
      this.encryptionManager.clearCache();
    }

    // Close sync manager
    if (this.syncManager) {
      this.syncManager.close();
    }

    // Clear TTL manager
    if (this.ttlManager) {
      this.ttlManager.clear();
    }

    // Reset initialization state so the instance can be re-initialized after
    // close() (framework unmount/remount, test teardown, adapter swap).
    this.defaultAdapter = undefined;
    this._initialized = false;
    this._readyPromise = undefined;
  }

  // Private methods

  private normalizeConfig(config: StrataConfig): StrataConfig {
    const normalized: StrataConfig = {
      platform: config.platform || this.detectPlatform(),
      ...config,
    };

    // Normalize the singular `defaultStorage` into `defaultStorages` so it is no
    // longer a silent no-op: it is prepended to (or seeds) the preference list.
    if (config.defaultStorage) {
      const existing = config.defaultStorages ?? [];
      normalized.defaultStorages = existing.includes(config.defaultStorage)
        ? existing
        : [config.defaultStorage, ...existing];
    }

    if (!normalized.defaultStorages || normalized.defaultStorages.length === 0) {
      // Persistent-first, matching the default `storage` singleton: prefer
      // durable backends so writes survive a reload, with sync-capable
      // localStorage ahead of async-only indexedDB, and volatile `memory` as the
      // last-resort fallback (SSR / no web storage). selectDefaultAdapter only
      // picks from adapters that are actually available, so unusable entries are
      // skipped. (A bare instance previously defaulted to memory-only, silently
      // contradicting the documented persistent-first behavior.)
      normalized.defaultStorages = ['localStorage', 'indexedDB', 'sessionStorage', 'memory'];
    }

    return normalized;
  }

  private detectPlatform(): Platform {
    if (isBrowser()) return 'web';
    if (isNode()) return 'node';
    return 'web'; // Default to web
  }

  // --- Namespace + key helpers ----------------------------------------------

  /** Effective namespace for an operation: a per-call value wins over the
   * instance default (`config.namespace`). Empty strings are treated as none. */
  private effectiveNamespace(options?: { namespace?: string }): string | undefined {
    const ns = options?.namespace ?? this.config.namespace;
    return ns && ns.length > 0 ? ns : undefined;
  }

  /**
   * Encode a namespace into an unambiguous physical-key prefix component.
   * `:` is a legal character in user keys, so a bare `${ns}:${key}` join lets
   * namespace `a` + key `b:c` collide with namespace `a:b` + key `c` (both
   * `a:b:c`), leaking keys across namespaces. Percent-encoding `:` (and the `%`
   * escape itself) in the namespace component removes the ambiguity while
   * leaving the user key — including any `:` — untouched. Namespaces without a
   * `:` are unchanged, so existing namespaced data keeps the same physical key.
   */
  private encodeNamespace(ns: string): string {
    return ns.replace(/%/g, '%25').replace(/:/g, '%3A');
  }

  /** The physical-key prefix (with trailing `:`) for a namespace. */
  private namespacePrefix(ns: string): string {
    return `${this.encodeNamespace(ns)}:`;
  }

  /** Map a logical key to the physical key actually stored (namespace-prefixed). */
  private resolveKey(key: string, options?: { namespace?: string }): string {
    const ns = this.effectiveNamespace(options);
    return ns ? `${this.encodeNamespace(ns)}:${key}` : key;
  }

  /** Reduce physical keys to the logical keys owned by `ns`, then apply pattern. */
  private scopeAndStripKeys(
    physicalKeys: string[],
    ns: string,
    pattern?: string | RegExp,
  ): string[] {
    const prefix = `${this.encodeNamespace(ns)}:`;
    const logical = physicalKeys
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
    return this.filterKeysByPattern(logical, pattern);
  }

  /** Pattern matcher mirroring BaseAdapter.filterKeys (prefix / glob / RegExp). */
  private filterKeysByPattern(keys: string[], pattern?: string | RegExp): string[] {
    if (!pattern) return keys;
    if (pattern instanceof RegExp) return keys.filter((key) => pattern.test(key));
    if (!pattern.includes('*') && !pattern.includes('?')) {
      return keys.filter((key) => key.startsWith(pattern));
    }
    return keys.filter((key) => matchGlob(pattern, key));
  }

  private static normalizeTimestamp(value: Date | number): number {
    return value instanceof Date ? value.getTime() : value;
  }

  private getDefaultStorages(): StorageType[] {
    // Only return adapters that are actually registered
    const registered = Array.from(this.registry.getAll().keys()).map((key) => String(key));

    // Prefer these storages in order if available (sync-capable localStorage
    // ahead of async-only indexedDB, mirroring normalizeConfig's default).
    const preferredOrder = ['localStorage', 'indexedDB', 'sessionStorage', 'memory'];
    const available = preferredOrder.filter((storage) => registered.includes(storage));

    // Always include memory as fallback if registered
    if (available.length === 0 && registered.includes('memory')) {
      return ['memory'];
    }

    return (available.length > 0 ? available : registered) as StorageType[];
  }

  private async initializeAdapters(): Promise<void> {
    for (const [name, adapter] of this.registry.getAll()) {
      if (this.adapters.has(name)) continue;

      // Honor an explicit `adapters: { <name>: false }` opt-out.
      const rawConfig = this.config.adapters?.[name as keyof NonNullable<StrataConfig['adapters']>];
      if (rawConfig === false) continue;

      try {
        if (!(await adapter.isAvailable())) continue;
        const adapterConfig = typeof rawConfig === 'object' ? rawConfig : undefined;
        await adapter.initialize(adapterConfig);
        this.adapters.set(name, adapter);
      } catch (error) {
        logger.warn(`Failed to initialize ${name} adapter:`, error);
      }
    }
  }

  private selectDefaultAdapter(): void {
    const preferred = this.config.defaultStorages ?? this.getDefaultStorages();
    for (const name of preferred) {
      const adapter = this.adapters.get(name);
      if (adapter) {
        this.defaultAdapter = adapter;
        return;
      }
    }

    // Fall back to any initialized adapter so a misconfigured preference list
    // still yields a usable default instead of leaving the instance unusable.
    const fallback = this.adapters.values().next().value;
    if (fallback) {
      this.defaultAdapter = fallback;
    }
  }

  /**
   * Apply a change received from another tab/device (via the sync manager) to
   * the matching local adapter, then let the adapter notify local subscribers.
   * Never re-broadcasts — prevents sync loops. localStorage propagates cross-tab
   * natively via the `storage` event and sessionStorage is per-tab, so both are
   * skipped here to avoid redundant re-writes.
   */
  // Run a TTL cleanup pass across every initialized adapter.
  private async cleanupAllAdapters(): Promise<void> {
    if (!this.ttlManager) return;
    for (const adapter of this.adapters.values()) {
      try {
        await this.ttlManager.cleanup(
          () => adapter.keys(),
          (key) => adapter.get(key),
          (key) => adapter.remove(key),
        );
      } catch (error) {
        logger.debug(`TTL cleanup failed for adapter "${adapter.name}":`, error);
      }
    }
  }

  private async applyRemoteChange(change: StorageChange): Promise<void> {
    if (change.source !== 'remote' || !change.key) return;

    // A full-clear broadcast arrives as a keyless ('*') change. Apply it to the
    // matching adapter so cleared state stays consistent cross-tab. Clearing the
    // adapter directly (not this.clear()) avoids re-broadcasting, so no loop.
    if (change.key === '*') {
      if (change.storage === 'localStorage' || change.storage === 'sessionStorage') return;
      const clearTarget = this.adapters.get(change.storage);
      if (clearTarget) {
        try {
          await clearTarget.clear();
        } catch (error) {
          logger.warn(`Failed to apply remote clear for "${change.storage}":`, error);
        }
      }
      return;
    }

    if (change.storage === 'localStorage' || change.storage === 'sessionStorage') return;

    const adapter = this.adapters.get(change.storage);
    if (!adapter) return;

    try {
      if (change.newValue === undefined || change.newValue === null) {
        await adapter.remove(change.key);
      } else {
        let incoming = change.newValue as StorageValue;
        // When a local value already exists for this key, apply the configured
        // conflict-resolution strategy (default 'latest' keeps the incoming
        // value, matching prior behavior; 'merge' / a custom resolver now take
        // effect instead of being silently ignored).
        if (this.syncManager) {
          const existing = await adapter.get(change.key);
          if (existing) {
            incoming = this.syncManager.resolveConflict([existing, incoming]) as StorageValue;
          }
        }
        await adapter.set(change.key, incoming);
      }
    } catch (error) {
      logger.warn(`Failed to apply remote sync change for "${change.key}":`, error);
    }
  }

  // --- Recovery helpers ------------------------------------------------------

  // Resolve the configured mirror adapters, excluding the primary.
  private mirrorAdapters(excludeName: StorageType): StorageAdapter[] {
    const mirrors = this.config.mirror;
    if (!mirrors?.length) return [];
    const result: StorageAdapter[] = [];
    for (const name of mirrors) {
      if (name === excludeName) continue;
      const adapter = this.adapters.get(name);
      if (adapter) result.push(adapter);
    }
    return result;
  }

  private async mirrorWrite(
    key: string,
    value: StorageValue,
    primaryName: StorageType,
  ): Promise<void> {
    for (const adapter of this.mirrorAdapters(primaryName)) {
      try {
        await adapter.set(key, value);
      } catch (error) {
        logger.warn(`Mirror write to "${adapter.name}" failed for key "${key}":`, error);
      }
    }
  }

  private async mirrorRemove(key: string, primaryName: StorageType): Promise<void> {
    for (const adapter of this.mirrorAdapters(primaryName)) {
      try {
        await adapter.remove(key);
      } catch (error) {
        logger.warn(`Mirror remove on "${adapter.name}" failed for key "${key}":`, error);
      }
    }
  }

  // Read the value back after writing and verify it; rewrite + retry on mismatch.
  private async verifyDurableWrite(
    adapter: StorageAdapter,
    key: string,
    expected: StorageValue,
  ): Promise<void> {
    const expectedChecksum = expected.checksum ?? computeChecksum(expected.value);
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const readback = await adapter.get(key);
      const actualChecksum = readback
        ? (readback.checksum ?? computeChecksum(readback.value))
        : undefined;
      if (actualChecksum === expectedChecksum) return;
      if (attempt < maxAttempts) await adapter.set(key, expected);
    }
    throw new StorageError(
      `Durable write verification failed for key "${key}" after ${maxAttempts} attempts`,
      { key, storage: adapter.name },
    );
  }

  // Recover a corrupted primary value from a mirror that still verifies, writing
  // it back to the primary (read-repair). Returns the decoded value or undefined.
  private async repairFromMirror<T>(key: string, options?: StorageOptions): Promise<T | undefined> {
    const mirrors = this.config.mirror;
    if (!mirrors?.length) return undefined;
    const primary = await this.selectAdapter(options?.storage);
    const physicalKey = this.resolveKey(key, options);
    for (const name of mirrors) {
      if (name === primary.name) continue;
      const mirror = this.adapters.get(name);
      if (!mirror) continue;
      try {
        const mirrorValue = await mirror.get(physicalKey);
        if (mirrorValue && verifyChecksum(mirrorValue.value, mirrorValue.checksum)) {
          await primary.set(physicalKey, mirrorValue); // read-repair the primary
          logger.warn(`Repaired corrupted key "${key}" from mirror "${name}"`);
          // Decode via the normal path now that the primary is valid again.
          return (await this.get<T>(key, { ...options, ignoreCorruption: false })) ?? undefined;
        }
      } catch (error) {
        logger.debug(`Mirror read-repair from "${name}" failed for "${key}":`, error);
      }
    }
    return undefined;
  }

  private startAutoBackup(): void {
    const cfg = this.config.autoBackup;
    if (!cfg?.interval) return;
    const backupKey = cfg.key ?? '__strata_backup__';
    this._autoBackupTimer = setInterval(() => {
      void (async () => {
        try {
          // Exclude the backup key itself so each snapshot doesn't nest the
          // previous backup (which would grow without bound).
          const keys = (await this.keys()).filter((key) => key !== backupKey);
          const snap = await this.snapshot({ keys });
          await this.set(backupKey, snap, { storage: cfg.storage });
        } catch (error) {
          logger.warn('Auto-backup failed:', error);
        }
      })();
    }, cfg.interval);
  }

  private async selectAdapter(storage?: StorageType | StorageType[]): Promise<StorageAdapter> {
    await this.ensureReady();

    if (!storage) {
      if (!this.defaultAdapter) {
        throw new StorageError('No default adapter available');
      }
      return this.defaultAdapter;
    }

    const storages = Array.isArray(storage) ? storage : [storage];

    for (const s of storages) {
      const adapter = this.adapters.get(s);
      if (adapter) return adapter;
    }

    // Try to load adapter if not already loaded
    for (const s of storages) {
      const adapter = this.registry.get(s);
      if (adapter && (await adapter.isAvailable())) {
        await adapter.initialize();
        this.adapters.set(s, adapter);
        return adapter;
      }
    }

    throw new StorageError(`No available adapter found for storage types: ${storages.join(', ')}`);
  }
}
