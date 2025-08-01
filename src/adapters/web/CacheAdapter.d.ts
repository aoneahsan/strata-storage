/**
 * Cache Adapter - Service Worker Cache API implementation
 * Provides network-aware storage for offline support
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo, QueryCondition } from '@/types';
/**
 * Cache API adapter for Service Worker environments
 */
export declare class CacheAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    private cacheName;
    private baseUrl;
    private cache?;
    constructor(cacheName?: string, baseUrl?: string);
    /**
     * Check if Cache API is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: {
        cacheName?: string;
        baseUrl?: string;
    }): Promise<void>;
    /**
     * Open cache
     */
    private openCache;
    /**
     * Create URL for key
     */
    private keyToUrl;
    /**
     * Extract key from URL
     */
    private urlToKey;
    /**
     * Get a value from cache
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in cache
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from cache
     */
    remove(key: string): Promise<void>;
    /**
     * Clear cache
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Query cache with conditions
     */
    query<T = unknown>(condition: QueryCondition): Promise<Array<{
        key: string;
        value: T;
    }>>;
    /**
     * Get storage size
     */
    size(detailed?: boolean): Promise<SizeInfo>;
    /**
     * Store binary data
     */
    setBinary(key: string, data: ArrayBuffer | Blob, metadata?: Record<string, unknown>): Promise<void>;
    /**
     * Get binary data
     */
    getBinary(key: string): Promise<{
        data: ArrayBuffer;
        metadata?: Record<string, unknown>;
    } | null>;
    /**
     * Close the adapter
     */
    close(): Promise<void>;
    /**
     * Check if error is quota exceeded
     */
    private isQuotaError;
}
//# sourceMappingURL=CacheAdapter.d.ts.map