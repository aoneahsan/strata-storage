/**
 * IndexedDB Adapter - Browser IndexedDB implementation
 * Provides large-scale persistent storage with advanced features
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo, QueryCondition, Transaction } from '@/types';
/**
 * Browser IndexedDB adapter
 */
export declare class IndexedDBAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    private dbName;
    private storeName;
    private version;
    private db?;
    constructor(dbName?: string, storeName?: string, version?: number);
    /**
     * Check if IndexedDB is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: {
        dbName?: string;
        storeName?: string;
        version?: number;
    }): Promise<void>;
    /**
     * Open IndexedDB database
     */
    private openDatabase;
    /**
     * Get a value from IndexedDB
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in IndexedDB
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from IndexedDB
     */
    remove(key: string): Promise<void>;
    /**
     * Clear IndexedDB
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Query IndexedDB with conditions
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
     * Begin a transaction
     */
    transaction(): Promise<Transaction>;
    /**
     * Close the adapter
     */
    close(): Promise<void>;
    /**
     * Check if error is quota exceeded
     */
    private isQuotaError;
}
//# sourceMappingURL=IndexedDBAdapter.d.ts.map