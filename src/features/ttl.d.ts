/**
 * TTL (Time To Live) Manager
 * Handles automatic expiration of storage items
 */
import type { StorageValue } from '@/types';
import { EventEmitter } from '@/utils';
export interface TTLConfig {
    /**
     * Default TTL in milliseconds
     */
    defaultTTL?: number;
    /**
     * Cleanup interval in milliseconds (default: 60000 - 1 minute)
     */
    cleanupInterval?: number;
    /**
     * Enable automatic cleanup (default: true)
     */
    autoCleanup?: boolean;
    /**
     * Maximum number of items to check per cleanup cycle
     */
    batchSize?: number;
    /**
     * Callback when items expire
     */
    onExpire?: (keys: string[]) => void;
}
export interface TTLOptions {
    /**
     * TTL in milliseconds
     */
    ttl?: number;
    /**
     * Sliding expiration - reset TTL on access
     */
    sliding?: boolean;
    /**
     * Expire at specific time (overrides ttl)
     */
    expireAt?: Date | number;
    /**
     * Expire after a certain date
     */
    expireAfter?: Date | number;
}
export interface ExpiredItem {
    key: string;
    value: unknown;
    expiredAt: number;
}
/**
 * TTL Manager for handling item expiration
 */
export declare class TTLManager extends EventEmitter {
    private config;
    private cleanupInterval?;
    private cleanupCallbacks;
    constructor(config?: TTLConfig);
    /**
     * Calculate expiration timestamp
     */
    calculateExpiration(options?: TTLOptions): number | undefined;
    /**
     * Check if a value is expired
     */
    isExpired(value: StorageValue): boolean;
    /**
     * Update expiration for sliding TTL
     */
    updateExpiration(value: StorageValue, options?: TTLOptions): StorageValue;
    /**
     * Start automatic cleanup
     */
    startAutoCleanup(getKeys: () => Promise<string[]>, getItem: (key: string) => Promise<StorageValue | null>, removeItem: (key: string) => Promise<void>): void;
    /**
     * Stop automatic cleanup
     */
    stopAutoCleanup(): void;
    /**
     * Perform cleanup of expired items
     */
    cleanup(getKeys: () => Promise<string[]>, getItem: (key: string) => Promise<StorageValue | null>, removeItem: (key: string) => Promise<void>): Promise<ExpiredItem[]>;
    /**
     * Register a cleanup callback for a specific key
     */
    onCleanup(key: string, callback: () => Promise<void>): void;
    /**
     * Remove cleanup callback
     */
    removeCleanupCallback(key: string): void;
    /**
     * Get all items that will expire within a time window
     */
    getExpiring(timeWindow: number, getKeys: () => Promise<string[]>, getItem: (key: string) => Promise<StorageValue | null>): Promise<Array<{
        key: string;
        expiresIn: number;
    }>>;
    /**
     * Extend TTL for a key
     */
    extendTTL(value: StorageValue, extension: number): StorageValue;
    /**
     * Set item to never expire
     */
    persist(value: StorageValue): StorageValue;
    /**
     * Get time until expiration
     */
    getTimeToLive(value: StorageValue): number | null;
    /**
     * Format TTL for display
     */
    formatTTL(milliseconds: number): string;
    /**
     * Clear all data
     */
    clear(): void;
}
/**
 * Create a TTL manager instance
 */
export declare function createTTLManager(config?: TTLConfig): TTLManager;
//# sourceMappingURL=ttl.d.ts.map