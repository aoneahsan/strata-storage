/**
 * SQLite Adapter - Native SQLite database storage
 * Available on iOS and Android
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo, QueryCondition, Transaction } from '@/types';
/**
 * Configuration options for SQLite adapter
 */
export interface SqliteConfig {
    database?: string;
    table?: string;
    version?: number;
}
/**
 * Native SQLite adapter using Capacitor plugin
 */
export declare class SqliteAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    private database;
    private table;
    constructor(config?: SqliteConfig);
    /**
     * Check if SQLite is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: SqliteConfig): Promise<void>;
    /**
     * Get a value from SQLite
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in SQLite
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from SQLite
     */
    remove(key: string): Promise<void>;
    /**
     * Clear SQLite table
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Query SQLite with conditions
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
}
//# sourceMappingURL=SqliteAdapter.d.ts.map