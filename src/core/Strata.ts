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
import { isBrowser, isNode, isCapacitor } from '@/utils';
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
  private platform: Platform;
  private encryptionManager?: EncryptionManager;
  private compressionManager?: CompressionManager;
  private syncManager?: SyncManager;
  private ttlManager?: TTLManager;

  constructor(config: StrataConfig = {}) {
    this.config = this.normalizeConfig(config);
    this.platform = this.detectPlatform();
    this.registry = new AdapterRegistry();
  }

  /**
   * Initialize Strata with available adapters
   */
  async initialize(): Promise<void> {
    // Register all adapters based on platform
    await this.registerAdapters();

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
  }

  /**
   * Get a value from storage
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
   * Check if a key exists
   */
  async has(key: string, options?: StorageOptions): Promise<boolean> {
    const adapter = await this.selectAdapter(options?.storage);
    return adapter.has(key);
  }

  /**
   * Clear storage
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
   * Get all keys
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

    for (const [type, adapter] of this.adapters.entries()) {
      const sizeInfo = await adapter.size(detailed);
      total += sizeInfo.total;
      count += sizeInfo.count;
      byStorage[type] = sizeInfo.total;
    }

    return {
      total,
      count,
      byStorage: byStorage as Record<StorageType, number>,
    };
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
          // Deep merge will be implemented with utils
          await this.set(key, {
            ...(existing as Record<string, unknown>),
            ...(value as Record<string, unknown>),
          });
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
  getCapabilities(storage?: StorageType): StorageCapabilities | Record<string, StorageCapabilities> {
    if (storage) {
      const adapter = this.adapters.get(storage);
      return adapter ? adapter.capabilities : {} as StorageCapabilities;
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
      defaultStorages: config.defaultStorages || this.getDefaultStorages(),
      ...config,
    };
  }

  private detectPlatform(): Platform {
    if (isCapacitor()) return 'web'; // Capacitor runs in web context
    if (isBrowser()) return 'web';
    if (isNode()) return 'node';
    return 'web'; // Default to web
  }

  private getDefaultStorages(): StorageType[] {
    switch (this.platform) {
      case 'web':
        if (isCapacitor()) {
          return ['preferences', 'sqlite', 'indexedDB', 'localStorage', 'memory'];
        }
        return ['indexedDB', 'localStorage', 'memory'];
      case 'node':
        return ['filesystem', 'memory'];
      case 'ios':
      case 'android':
        return ['preferences', 'sqlite', 'secure', 'memory'];
      default:
        return ['memory'];
    }
  }

  private async registerAdapters(): Promise<void> {
    // Register adapters based on platform
    if (this.platform === 'web') {
      // Dynamically import and register web adapters
      const { MemoryAdapter } = await import('@/adapters/web/MemoryAdapter');
      const { LocalStorageAdapter } = await import('@/adapters/web/LocalStorageAdapter');
      const { SessionStorageAdapter } = await import('@/adapters/web/SessionStorageAdapter');
      const { IndexedDBAdapter } = await import('@/adapters/web/IndexedDBAdapter');
      const { CookieAdapter } = await import('@/adapters/web/CookieAdapter');
      const { CacheAdapter } = await import('@/adapters/web/CacheAdapter');

      this.registry.register(new MemoryAdapter());
      this.registry.register(new LocalStorageAdapter());
      this.registry.register(new SessionStorageAdapter());
      this.registry.register(new IndexedDBAdapter());
      this.registry.register(new CookieAdapter());
      this.registry.register(new CacheAdapter());

      // If running in Capacitor, also register native adapters
      if (isCapacitor()) {
        const { PreferencesAdapter } = await import('@/adapters/capacitor/PreferencesAdapter');
        const { SqliteAdapter } = await import('@/adapters/capacitor/SqliteAdapter');
        const { SecureAdapter } = await import('@/adapters/capacitor/SecureAdapter');
        const { FilesystemAdapter } = await import('@/adapters/capacitor/FilesystemAdapter');

        this.registry.register(new PreferencesAdapter());
        this.registry.register(new SqliteAdapter());
        this.registry.register(new SecureAdapter());
        this.registry.register(new FilesystemAdapter());
      }
    }
    // Additional adapters will be registered as they are implemented
  }

  private async selectDefaultAdapter(): Promise<void> {
    const storages = this.config.defaultStorages || this.getDefaultStorages();

    for (const storage of storages) {
      try {
        const adapter = await this.registry.getInitialized(
          storage,
          this.config.adapters?.[storage as keyof typeof this.config.adapters],
        );
        this.defaultAdapter = adapter;
        this.adapters.set(storage, adapter);
        return;
      } catch {
        // Continue to next adapter
      }
    }

    throw new StorageError('No available storage adapters found');
  }

  private async initializeAdapters(): Promise<void> {
    for (const [type, adapter] of this.adapters.entries()) {
      const config = this.config.adapters?.[type as keyof typeof this.config.adapters];
      if (config && typeof config === 'object') {
        await adapter.initialize(config);
      } else {
        await adapter.initialize();
      }
    }
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
