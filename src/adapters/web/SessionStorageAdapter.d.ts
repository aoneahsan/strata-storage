/**
 * SessionStorage Adapter - Browser sessionStorage implementation
 * Provides session-scoped storage with 5-10MB limit
 */
import { LocalStorageAdapter } from './LocalStorageAdapter';
import type { StorageType, StorageCapabilities } from '@/types';
/**
 * Browser sessionStorage adapter
 * Extends LocalStorageAdapter as the API is identical
 */
export declare class SessionStorageAdapter extends LocalStorageAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    constructor(prefix?: string);
    /**
     * Check if sessionStorage is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Override all methods to use sessionStorage instead of localStorage
     */
    protected getStorage(): Storage;
    /**
     * Get a value from sessionStorage
     */
    get<T = unknown>(key: string): Promise<import('@/types').StorageValue<T> | null>;
    /**
     * Set a value in sessionStorage
     */
    set<T = unknown>(key: string, value: import('@/types').StorageValue<T>): Promise<void>;
    /**
     * Remove a value from sessionStorage
     */
    remove(key: string): Promise<void>;
    /**
     * Clear sessionStorage
     */
    clear(options?: import('@/types').ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Get storage size
     */
    size(detailed?: boolean): Promise<import('@/types').SizeInfo>;
    /**
     * Subscribe to storage changes
     * Note: sessionStorage doesn't fire storage events in the same tab
     */
    subscribe(_callback: import('@/types').SubscriptionCallback): import('@/types').UnsubscribeFunction;
}
//# sourceMappingURL=SessionStorageAdapter.d.ts.map