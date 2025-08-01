/**
 * LocalStorage Adapter - Browser localStorage implementation
 * Provides persistent storage with 5-10MB limit
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo, SubscriptionCallback, UnsubscribeFunction } from '@/types';
/**
 * Browser localStorage adapter
 */
export declare class LocalStorageAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    protected prefix: string;
    protected listeners: Map<SubscriptionCallback, (event: StorageEvent) => void>;
    constructor(prefix?: string);
    /**
     * Check if localStorage is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: {
        prefix?: string;
    }): Promise<void>;
    /**
     * Get a value from localStorage
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in localStorage
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from localStorage
     */
    remove(key: string): Promise<void>;
    /**
     * Clear localStorage
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Get storage size
     */
    size(detailed?: boolean): Promise<SizeInfo>;
    /**
     * Subscribe to storage changes
     */
    subscribe(callback: SubscriptionCallback): UnsubscribeFunction;
    /**
     * Close the adapter
     */
    close(): Promise<void>;
    /**
     * Check if error is quota exceeded
     */
    protected isQuotaError(error: unknown): boolean;
}
//# sourceMappingURL=LocalStorageAdapter.d.ts.map