/**
 * Strata Storage - Main entry point
 * Zero-dependency universal storage solution
 */
import type { StrataConfig, StorageOptions, StorageType, SizeInfo, ClearOptions, ExportOptions, ImportOptions, SubscriptionCallback, UnsubscribeFunction, QueryCondition, StorageCapabilities } from '@/types';
/**
 * Main Strata class - unified storage interface
 */
export declare class Strata {
    private config;
    private registry;
    private defaultAdapter?;
    private adapters;
    private platform;
    private encryptionManager?;
    private compressionManager?;
    private syncManager?;
    private ttlManager?;
    constructor(config?: StrataConfig);
    /**
     * Initialize Strata with available adapters
     */
    initialize(): Promise<void>;
    /**
     * Get a value from storage
     */
    get<T = unknown>(key: string, options?: StorageOptions): Promise<T | null>;
    /**
     * Set a value in storage
     */
    set<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<void>;
    /**
     * Remove a value from storage
     */
    remove(key: string, options?: StorageOptions): Promise<void>;
    /**
     * Check if a key exists
     */
    has(key: string, options?: StorageOptions): Promise<boolean>;
    /**
     * Clear storage
     */
    clear(options?: ClearOptions & StorageOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp, options?: StorageOptions): Promise<string[]>;
    /**
     * Get storage size information
     */
    size(detailed?: boolean): Promise<SizeInfo>;
    /**
     * Subscribe to storage changes
     */
    subscribe(callback: SubscriptionCallback, options?: StorageOptions): UnsubscribeFunction;
    /**
     * Query storage (if supported)
     */
    query<T = unknown>(condition: QueryCondition, options?: StorageOptions): Promise<Array<{
        key: string;
        value: T;
    }>>;
    /**
     * Export storage data
     */
    export(options?: ExportOptions): Promise<string>;
    /**
     * Import storage data
     */
    import(data: string, options?: ImportOptions): Promise<void>;
    /**
     * Get available storage types
     */
    getAvailableStorageTypes(): StorageType[];
    /**
     * Get adapter capabilities
     */
    getCapabilities(storage?: StorageType): StorageCapabilities | Record<string, StorageCapabilities>;
    /**
     * Generate a secure password for encryption
     */
    generatePassword(length?: number): string;
    /**
     * Hash data using SHA-256
     */
    hash(data: string): Promise<string>;
    /**
     * Get TTL (time to live) for a key
     */
    getTTL(key: string, options?: StorageOptions): Promise<number | null>;
    /**
     * Extend TTL for a key
     */
    extendTTL(key: string, extension: number, options?: StorageOptions): Promise<void>;
    /**
     * Make a key persistent (remove TTL)
     */
    persist(key: string, options?: StorageOptions): Promise<void>;
    /**
     * Get items expiring within a time window
     */
    getExpiring(timeWindow: number, options?: StorageOptions): Promise<Array<{
        key: string;
        expiresIn: number;
    }>>;
    /**
     * Manually trigger TTL cleanup
     */
    cleanupExpired(options?: StorageOptions): Promise<number>;
    /**
     * Close all adapters
     */
    close(): Promise<void>;
    private normalizeConfig;
    private detectPlatform;
    private getDefaultStorages;
    private registerAdapters;
    private selectDefaultAdapter;
    private initializeAdapters;
    private selectAdapter;
}
//# sourceMappingURL=Strata.d.ts.map