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
  StorageCapabilities,
} from '@/types';

import { AdapterRegistry } from './AdapterRegistry';
import { isBrowser, isNode, deepMerge } from '@/utils';
import { StorageError, EncryptionError } from '@/utils/errors';
import { EncryptionManager, type EncryptedData } from '@/features/encryption';
import { CompressionManager, type CompressedData } from '@/features/compression';
import { SyncManager } from '@/features/sync';
import { TTLManager } from '@/features/ttl';

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
  private _initialized: boolean = false;

  constructor(config: StrataConfig = {}) {
    this.config = this.normalizeConfig(config);
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
   * Initialize Strata with available adapters
   */
  async initialize(): Promise<void> {
    // No automatic adapter registration - adapters should be registered before initialize()
    // This allows for zero-dependency operation and explicit opt-in for features

    // Find and set default adapter
    await this.selectDefaultAdapter();

    // Initialize configured adapters
    await this.initializeAdapters();

    // Initialize encryption if enabled
    if (this.config.encryption?.enabled) {
      this.encryptionManager = new EncryptionManager(this.config.encryption);
      if (!this.encryptionManager.isAvailable()) {
        console.warn('Encryption enabled but Web Crypto API not available');
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

      // Subscribe to sync events
      this.syncManager.subscribe((_change) => {
        // Forward sync events to subscribers
        // The adapters will handle their own change events
      });
    }

    // Initialize TTL manager
    this.ttlManager = new TTLManager(this.config.ttl);

    // Set up TTL cleanup for default adapter
    if (this.defaultAdapter && this.config.ttl?.autoCleanup !== false) {
      this.ttlManager.startAutoCleanup(
        () => this.defaultAdapter!.keys(),
        (key) => this.defaultAdapter!.get(key),
        (key) => this.defaultAdapter!.remove(key),
      );
    }

    // Mark as initialized
    this._initialized = true;
  }

  /**
   * Get a value from storage
   *
   * @param key - The key to retrieve
   * @param options - Storage options
   * @param options.storage - Specific storage type to use (e.g., 'localStorage', 'indexedDB')
   * @param options.decrypt - Whether to decrypt the value (default: auto-detect)
   * @param options.decryptionPassword - Password for decryption (uses config password if not provided)
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
   *   decryptionPassword: 'myPassword'
   * });
   * ```
   */
  async get<T = unknown>(key: string, options?: StorageOptions): Promise<T | null> {
    const adapter = await this.selectAdapter(options?.storage);
    const value = await adapter.get<T>(key);

    if (!value) return null;

    // Handle TTL
    if (this.ttlManager && this.ttlManager.isExpired(value)) {
      await adapter.remove(key);
      return null;
    }

    // Update sliding TTL if configured
    if (options?.sliding && value.expires && this.ttlManager) {
      const updatedValue = this.ttlManager.updateExpiration(value, options);
      if (updatedValue !== value) {
        await adapter.set(key, updatedValue);
      }
    }

    // Handle decryption if needed
    if (value.encrypted && this.encryptionManager) {
      try {
        if (!options?.skipDecryption) {
          const password = options?.encryptionPassword || this.config.encryption?.password;
          if (!password) {
            throw new EncryptionError('Encrypted value requires password for decryption');
          }
          const decrypted = await this.encryptionManager.decrypt<T>(
            value.value as EncryptedData,
            password,
          );
          return decrypted;
        }
      } catch (error) {
        if (options?.ignoreDecryptionErrors) {
          console.warn(`Failed to decrypt key ${key}:`, error);
          return null;
        }
        throw error;
      }
    }

    // Handle decompression if needed
    if (value.compressed && this.compressionManager) {
      try {
        const decompressed = await this.compressionManager.decompress<T>(
          value.value as CompressedData,
        );
        return decompressed;
      } catch (error) {
        console.warn(`Failed to decompress key ${key}:`, error);
        return value.value;
      }
    }

    return value.value;
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
    const adapter = await this.selectAdapter(options?.storage);
    const now = Date.now();

    let processedValue: unknown = value;
    let compressed = false;

    // Handle compression if needed
    const shouldCompress = options?.compress ?? this.config.compression?.enabled;

    if (shouldCompress && this.compressionManager) {
      const compressedResult = await this.compressionManager.compress(value);
      if (this.compressionManager.isCompressedData(compressedResult)) {
        processedValue = compressedResult;
        compressed = true;
      }
    }

    // Handle encryption if needed
    const shouldEncrypt = options?.encrypt ?? this.config.encryption?.enabled;
    let encrypted = false;

    if (shouldEncrypt && this.encryptionManager) {
      const password = options?.encryptionPassword || this.config.encryption?.password;
      if (!password) {
        throw new EncryptionError('Encryption enabled but no password provided');
      }
      processedValue = await this.encryptionManager.encrypt(value, password);
      encrypted = true;
    }

    const storageValue = {
      value: processedValue,
      created: now,
      updated: now,
      expires: this.ttlManager ? this.ttlManager.calculateExpiration(options) : undefined,
      tags: options?.tags,
      metadata: options?.metadata,
      encrypted: encrypted,
      compressed: compressed,
    };

    await adapter.set(key, storageValue);

    // Broadcast change for sync
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'set',
        key,
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
    const adapter = await this.selectAdapter(options?.storage);
    await adapter.remove(key);

    // Broadcast removal for sync
    if (this.syncManager) {
      this.syncManager.broadcast({
        type: 'remove',
        key,
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
    const adapter = await this.selectAdapter(options?.storage);
    return adapter.has(key);
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
    if (options?.storage) {
      const adapter = await this.selectAdapter(options.storage);
      await adapter.clear(options);
    } else {
      // Clear all adapters
      for (const adapter of this.adapters.values()) {
        await adapter.clear(options);
      }
    }
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
    if (options?.storage) {
      const adapter = await this.selectAdapter(options.storage);
      return adapter.keys(pattern);
    }

    // Get keys from all adapters and deduplicate
    const allKeys = new Set<string>();
    for (const adapter of this.adapters.values()) {
      const keys = await adapter.keys(pattern);
      keys.forEach((key) => allKeys.add(key));
    }

    return Array.from(allKeys);
  }

  /**
   * Get storage size information
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    let total = 0;
    let count = 0;
    const byStorage: Record<string, number> = {};
    const allByKey: Record<string, number> = {};

    for (const [type, adapter] of this.adapters.entries()) {
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
    const unsubscribers: UnsubscribeFunction[] = [];

    if (options?.storage) {
      const adapter = this.adapters.get(options.storage as StorageType);
      if (adapter?.subscribe) {
        unsubscribers.push(adapter.subscribe(callback));
      }
    } else {
      // Subscribe to all adapters that support it
      for (const adapter of this.adapters.values()) {
        if (adapter.subscribe) {
          unsubscribers.push(adapter.subscribe(callback));
        }
      }
    }

    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Query storage (if supported)
   */
  async query<T = unknown>(
    condition: QueryCondition,
    options?: StorageOptions,
  ): Promise<Array<{ key: string; value: T }>> {
    const adapter = await this.selectAdapter(options?.storage);

    if (!adapter.query) {
      throw new StorageError(`Adapter ${adapter.name} does not support queries`);
    }

    return adapter.query<T>(condition);
  }

  /**
   * Export storage data
   */
  async export(options?: ExportOptions): Promise<string> {
    const data: Record<string, unknown> = {};
    const keys = options?.keys || (await this.keys());

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        if (options?.includeMetadata) {
          const adapter = await this.selectAdapter();
          const storageValue = await adapter.get(key);
          data[key] = storageValue;
        } else {
          data[key] = value;
        }
      }
    }

    const format = options?.format || 'json';
    if (format === 'json') {
      return JSON.stringify(data, null, options?.pretty ? 2 : 0);
    }

    throw new StorageError(`Export format ${format} not supported`);
  }

  /**
   * Import storage data
   */
  async import(data: string, options?: ImportOptions): Promise<void> {
    const format = options?.format || 'json';

    if (format !== 'json') {
      throw new StorageError(`Import format ${format} not supported`);
    }

    const parsed = JSON.parse(data);

    for (const [key, value] of Object.entries(parsed)) {
      const exists = await this.has(key);

      if (!exists || options?.overwrite) {
        await this.set(key, value);
      } else if (options?.merge) {
        const existing = await this.get(key);
        if (options.merge === 'deep' && typeof existing === 'object' && typeof value === 'object') {
          // Use deep merge utility for proper nested object merging
          const merged = deepMerge(
            existing as Record<string, unknown>,
            value as Record<string, unknown>,
          );
          await this.set(key, merged);
        } else {
          await this.set(key, value);
        }
      }
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
    const value = await adapter.get(key);

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
    const value = await adapter.get(key);

    if (!value) {
      throw new StorageError(`Key ${key} not found`);
    }

    const updated = this.ttlManager.extendTTL(value, extension);
    await adapter.set(key, updated);
  }

  /**
   * Make a key persistent (remove TTL)
   */
  async persist(key: string, options?: StorageOptions): Promise<void> {
    if (!this.ttlManager) {
      throw new StorageError('TTL manager not initialized');
    }

    const adapter = await this.selectAdapter(options?.storage);
    const value = await adapter.get(key);

    if (!value) {
      throw new StorageError(`Key ${key} not found`);
    }

    const persisted = this.ttlManager.persist(value);
    await adapter.set(key, persisted);
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
    return this.ttlManager.getExpiring(
      timeWindow,
      () => adapter.keys(),
      (key) => adapter.get(key),
    );
  }

  /**
   * Manually trigger TTL cleanup
   */
  async cleanupExpired(options?: StorageOptions): Promise<number> {
    if (!this.ttlManager) return 0;

    const adapter = await this.selectAdapter(options?.storage);
    const expired = await this.ttlManager.cleanup(
      () => adapter.keys(),
      (key) => adapter.get(key),
      (key) => adapter.remove(key),
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
  }

  // Private methods

  private normalizeConfig(config: StrataConfig): StrataConfig {
    return {
      platform: config.platform || this.detectPlatform(),
      defaultStorages: config.defaultStorages || ['memory'], // Default to memory adapter
      ...config,
    };
  }

  private detectPlatform(): Platform {
    if (isBrowser()) return 'web';
    if (isNode()) return 'node';
    return 'web'; // Default to web
  }

  private getDefaultStorages(): StorageType[] {
    // Only return adapters that are actually registered
    const registered = Array.from(this.registry.getAll().keys()).map((key) => String(key));

    // Prefer these storages in order if available
    const preferredOrder = ['indexedDB', 'localStorage', 'sessionStorage', 'memory'];
    const available = preferredOrder.filter((storage) => registered.includes(storage));

    // Always include memory as fallback if registered
    if (available.length === 0 && registered.includes('memory')) {
      return ['memory'];
    }

    return (available.length > 0 ? available : registered) as StorageType[];
  }

  private async selectDefaultAdapter(): Promise<void> {
    const storages = this.config.defaultStorages || this.getDefaultStorages();

    if (storages.length === 0) {
      throw new StorageError('No storage adapters registered or configured');
    }

    for (const storage of storages) {
      try {
        const adapter = this.registry.get(storage);
        if (!adapter) {
          continue;
        }

        const isAvailable = await adapter.isAvailable();
        if (!isAvailable) {
          continue;
        }

        // Initialize adapter with config if provided
        const config = this.config.adapters?.[storage as keyof typeof this.config.adapters];
        await adapter.initialize(config);

        this.defaultAdapter = adapter;
        this.adapters.set(storage, adapter);
        return;
      } catch (error) {
        console.warn(`Failed to initialize ${storage} adapter:`, error);
        // Continue to next adapter
      }
    }

    throw new StorageError(
      `No available storage adapters found. Tried: ${storages.join(', ')}. ` +
        `Registered adapters: ${Array.from(this.registry.getAll().keys()).join(', ')}`,
    );
  }

  private async initializeAdapters(): Promise<void> {
    // Adapters are already initialized in selectDefaultAdapter
    // This method is kept for compatibility but doesn't re-initialize
  }

  private async selectAdapter(storage?: StorageType | StorageType[]): Promise<StorageAdapter> {
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
