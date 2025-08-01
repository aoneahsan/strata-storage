/**
 * Memory Adapter - In-memory storage implementation
 * Provides fast, non-persistent storage using Map
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, QueryCondition } from '@/types';
/**
 * In-memory storage adapter using Map
 */
export declare class MemoryAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    private storage;
    private maxSize?;
    private currentSize;
    /**
     * Check if adapter is available (always true for memory)
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: {
        maxSize?: number;
    }): Promise<void>;
    /**
     * Get a value from memory
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in memory
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from memory
     */
    remove(key: string): Promise<void>;
    /**
     * Clear memory storage
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Query implementation for memory adapter
     */
    query<T = unknown>(condition: QueryCondition): Promise<Array<{
        key: string;
        value: T;
    }>>;
    /**
     * Get current memory usage
     */
    getMemoryUsage(): {
        used: number;
        limit?: number;
    };
    /**
     * Close the adapter
     */
    close(): Promise<void>;
}
//# sourceMappingURL=MemoryAdapter.d.ts.map