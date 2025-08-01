"use strict";
/**
 * Strata Storage - Main entry point
 * Zero-dependency universal storage solution
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strata = void 0;
const AdapterRegistry_1 = require("./AdapterRegistry");
const utils_1 = require("@/utils");
const errors_1 = require("@/utils/errors");
const encryption_1 = require("@/features/encryption");
const compression_1 = require("@/features/compression");
const sync_1 = require("@/features/sync");
const ttl_1 = require("@/features/ttl");
/**
 * Main Strata class - unified storage interface
 */
class Strata {
    config;
    registry;
    defaultAdapter;
    adapters = new Map();
    platform;
    encryptionManager;
    compressionManager;
    syncManager;
    ttlManager;
    constructor(config = {}) {
        this.config = this.normalizeConfig(config);
        this.platform = this.detectPlatform();
        this.registry = new AdapterRegistry_1.AdapterRegistry();
    }
    /**
     * Initialize Strata with available adapters
     */
    async initialize() {
        // Register all adapters based on platform
        await this.registerAdapters();
        // Find and set default adapter
        await this.selectDefaultAdapter();
        // Initialize configured adapters
        await this.initializeAdapters();
        // Initialize encryption if enabled
        if (this.config.encryption?.enabled) {
            this.encryptionManager = new encryption_1.EncryptionManager(this.config.encryption);
            if (!this.encryptionManager.isAvailable()) {
                console.warn('Encryption enabled but Web Crypto API not available');
            }
        }
        // Initialize compression if enabled
        if (this.config.compression?.enabled) {
            this.compressionManager = new compression_1.CompressionManager(this.config.compression);
        }
        // Initialize sync if enabled
        if (this.config.sync?.enabled) {
            this.syncManager = new sync_1.SyncManager(this.config.sync);
            await this.syncManager.initialize();
            // Subscribe to sync events
            this.syncManager.subscribe((_change) => {
                // Forward sync events to subscribers
                // The adapters will handle their own change events
            });
        }
        // Initialize TTL manager
        this.ttlManager = new ttl_1.TTLManager(this.config.ttl);
        // Set up TTL cleanup for default adapter
        if (this.defaultAdapter && this.config.ttl?.autoCleanup !== false) {
            this.ttlManager.startAutoCleanup(() => this.defaultAdapter.keys(), (key) => this.defaultAdapter.get(key), (key) => this.defaultAdapter.remove(key));
        }
    }
    /**
     * Get a value from storage
     */
    async get(key, options) {
        const adapter = await this.selectAdapter(options?.storage);
        const value = await adapter.get(key);
        if (!value)
            return null;
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
                        throw new errors_1.EncryptionError('Encrypted value requires password for decryption');
                    }
                    const decrypted = await this.encryptionManager.decrypt(value.value, password);
                    return decrypted;
                }
            }
            catch (error) {
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
                const decompressed = await this.compressionManager.decompress(value.value);
                return decompressed;
            }
            catch (error) {
                console.warn(`Failed to decompress key ${key}:`, error);
                return value.value;
            }
        }
        return value.value;
    }
    /**
     * Set a value in storage
     */
    async set(key, value, options) {
        const adapter = await this.selectAdapter(options?.storage);
        const now = Date.now();
        let processedValue = value;
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
                throw new errors_1.EncryptionError('Encryption enabled but no password provided');
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
    async remove(key, options) {
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
    async has(key, options) {
        const adapter = await this.selectAdapter(options?.storage);
        return adapter.has(key);
    }
    /**
     * Clear storage
     */
    async clear(options) {
        if (options?.storage) {
            const adapter = await this.selectAdapter(options.storage);
            await adapter.clear(options);
        }
        else {
            // Clear all adapters
            for (const adapter of this.adapters.values()) {
                await adapter.clear(options);
            }
        }
    }
    /**
     * Get all keys
     */
    async keys(pattern, options) {
        if (options?.storage) {
            const adapter = await this.selectAdapter(options.storage);
            return adapter.keys(pattern);
        }
        // Get keys from all adapters and deduplicate
        const allKeys = new Set();
        for (const adapter of this.adapters.values()) {
            const keys = await adapter.keys(pattern);
            keys.forEach((key) => allKeys.add(key));
        }
        return Array.from(allKeys);
    }
    /**
     * Get storage size information
     */
    async size(detailed) {
        let total = 0;
        let count = 0;
        const byStorage = {};
        for (const [type, adapter] of this.adapters.entries()) {
            const sizeInfo = await adapter.size(detailed);
            total += sizeInfo.total;
            count += sizeInfo.count;
            byStorage[type] = sizeInfo.total;
        }
        return {
            total,
            count,
            byStorage: byStorage,
        };
    }
    /**
     * Subscribe to storage changes
     */
    subscribe(callback, options) {
        const unsubscribers = [];
        if (options?.storage) {
            const adapter = this.adapters.get(options.storage);
            if (adapter?.subscribe) {
                unsubscribers.push(adapter.subscribe(callback));
            }
        }
        else {
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
    async query(condition, options) {
        const adapter = await this.selectAdapter(options?.storage);
        if (!adapter.query) {
            throw new errors_1.StorageError(`Adapter ${adapter.name} does not support queries`);
        }
        return adapter.query(condition);
    }
    /**
     * Export storage data
     */
    async export(options) {
        const data = {};
        const keys = options?.keys || (await this.keys());
        for (const key of keys) {
            const value = await this.get(key);
            if (value !== null) {
                if (options?.includeMetadata) {
                    const adapter = await this.selectAdapter();
                    const storageValue = await adapter.get(key);
                    data[key] = storageValue;
                }
                else {
                    data[key] = value;
                }
            }
        }
        const format = options?.format || 'json';
        if (format === 'json') {
            return JSON.stringify(data, null, options?.pretty ? 2 : 0);
        }
        throw new errors_1.StorageError(`Export format ${format} not supported`);
    }
    /**
     * Import storage data
     */
    async import(data, options) {
        const format = options?.format || 'json';
        if (format !== 'json') {
            throw new errors_1.StorageError(`Import format ${format} not supported`);
        }
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
            const exists = await this.has(key);
            if (!exists || options?.overwrite) {
                await this.set(key, value);
            }
            else if (options?.merge) {
                const existing = await this.get(key);
                if (options.merge === 'deep' && typeof existing === 'object' && typeof value === 'object') {
                    // Deep merge will be implemented with utils
                    await this.set(key, {
                        ...existing,
                        ...value,
                    });
                }
                else {
                    await this.set(key, value);
                }
            }
        }
    }
    /**
     * Get available storage types
     */
    getAvailableStorageTypes() {
        return Array.from(this.adapters.keys());
    }
    /**
     * Get adapter capabilities
     */
    getCapabilities(storage) {
        if (storage) {
            const adapter = this.adapters.get(storage);
            return adapter ? adapter.capabilities : {};
        }
        // Return capabilities of all adapters
        const capabilities = {};
        for (const [type, adapter] of this.adapters.entries()) {
            capabilities[type] = adapter.capabilities;
        }
        return capabilities;
    }
    /**
     * Generate a secure password for encryption
     */
    generatePassword(length) {
        if (!this.encryptionManager) {
            throw new errors_1.EncryptionError('Encryption not initialized');
        }
        return this.encryptionManager.generatePassword(length);
    }
    /**
     * Hash data using SHA-256
     */
    async hash(data) {
        if (!this.encryptionManager) {
            throw new errors_1.EncryptionError('Encryption not initialized');
        }
        return this.encryptionManager.hash(data);
    }
    /**
     * Get TTL (time to live) for a key
     */
    async getTTL(key, options) {
        if (!this.ttlManager)
            return null;
        const adapter = await this.selectAdapter(options?.storage);
        const value = await adapter.get(key);
        if (!value)
            return null;
        return this.ttlManager.getTimeToLive(value);
    }
    /**
     * Extend TTL for a key
     */
    async extendTTL(key, extension, options) {
        if (!this.ttlManager) {
            throw new errors_1.StorageError('TTL manager not initialized');
        }
        const adapter = await this.selectAdapter(options?.storage);
        const value = await adapter.get(key);
        if (!value) {
            throw new errors_1.StorageError(`Key ${key} not found`);
        }
        const updated = this.ttlManager.extendTTL(value, extension);
        await adapter.set(key, updated);
    }
    /**
     * Make a key persistent (remove TTL)
     */
    async persist(key, options) {
        if (!this.ttlManager) {
            throw new errors_1.StorageError('TTL manager not initialized');
        }
        const adapter = await this.selectAdapter(options?.storage);
        const value = await adapter.get(key);
        if (!value) {
            throw new errors_1.StorageError(`Key ${key} not found`);
        }
        const persisted = this.ttlManager.persist(value);
        await adapter.set(key, persisted);
    }
    /**
     * Get items expiring within a time window
     */
    async getExpiring(timeWindow, options) {
        if (!this.ttlManager)
            return [];
        const adapter = await this.selectAdapter(options?.storage);
        return this.ttlManager.getExpiring(timeWindow, () => adapter.keys(), (key) => adapter.get(key));
    }
    /**
     * Manually trigger TTL cleanup
     */
    async cleanupExpired(options) {
        if (!this.ttlManager)
            return 0;
        const adapter = await this.selectAdapter(options?.storage);
        const expired = await this.ttlManager.cleanup(() => adapter.keys(), (key) => adapter.get(key), (key) => adapter.remove(key));
        return expired.length;
    }
    /**
     * Close all adapters
     */
    async close() {
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
    normalizeConfig(config) {
        return {
            platform: config.platform || this.detectPlatform(),
            defaultStorages: config.defaultStorages || this.getDefaultStorages(),
            ...config,
        };
    }
    detectPlatform() {
        if ((0, utils_1.isCapacitor)())
            return 'web'; // Capacitor runs in web context
        if ((0, utils_1.isBrowser)())
            return 'web';
        if ((0, utils_1.isNode)())
            return 'node';
        return 'web'; // Default to web
    }
    getDefaultStorages() {
        switch (this.platform) {
            case 'web':
                if ((0, utils_1.isCapacitor)()) {
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
    async registerAdapters() {
        // Register adapters based on platform
        if (this.platform === 'web') {
            // Dynamically import and register web adapters
            const { MemoryAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/MemoryAdapter')));
            const { LocalStorageAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/LocalStorageAdapter')));
            const { SessionStorageAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/SessionStorageAdapter')));
            const { IndexedDBAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/IndexedDBAdapter')));
            const { CookieAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/CookieAdapter')));
            const { CacheAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/web/CacheAdapter')));
            this.registry.register(new MemoryAdapter());
            this.registry.register(new LocalStorageAdapter());
            this.registry.register(new SessionStorageAdapter());
            this.registry.register(new IndexedDBAdapter());
            this.registry.register(new CookieAdapter());
            this.registry.register(new CacheAdapter());
            // If running in Capacitor, also register native adapters
            if ((0, utils_1.isCapacitor)()) {
                const { PreferencesAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/capacitor/PreferencesAdapter')));
                const { SqliteAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/capacitor/SqliteAdapter')));
                const { SecureAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/capacitor/SecureAdapter')));
                const { FilesystemAdapter } = await Promise.resolve().then(() => __importStar(require('@/adapters/capacitor/FilesystemAdapter')));
                this.registry.register(new PreferencesAdapter());
                this.registry.register(new SqliteAdapter());
                this.registry.register(new SecureAdapter());
                this.registry.register(new FilesystemAdapter());
            }
        }
        // Additional adapters will be registered as they are implemented
    }
    async selectDefaultAdapter() {
        const storages = this.config.defaultStorages || this.getDefaultStorages();
        for (const storage of storages) {
            try {
                const adapter = await this.registry.getInitialized(storage, this.config.adapters?.[storage]);
                this.defaultAdapter = adapter;
                this.adapters.set(storage, adapter);
                return;
            }
            catch {
                // Continue to next adapter
            }
        }
        throw new errors_1.StorageError('No available storage adapters found');
    }
    async initializeAdapters() {
        for (const [type, adapter] of this.adapters.entries()) {
            const config = this.config.adapters?.[type];
            if (config && typeof config === 'object') {
                await adapter.initialize(config);
            }
            else {
                await adapter.initialize();
            }
        }
    }
    async selectAdapter(storage) {
        if (!storage) {
            if (!this.defaultAdapter) {
                throw new errors_1.StorageError('No default adapter available');
            }
            return this.defaultAdapter;
        }
        const storages = Array.isArray(storage) ? storage : [storage];
        for (const s of storages) {
            const adapter = this.adapters.get(s);
            if (adapter)
                return adapter;
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
        throw new errors_1.StorageError(`No available adapter found for storage types: ${storages.join(', ')}`);
    }
}
exports.Strata = Strata;
//# sourceMappingURL=Strata.js.map