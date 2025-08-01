/**
 * Registry for managing storage adapters
 */
import type { StorageAdapter, StorageType } from '@/types';
/**
 * Adapter registry for managing storage adapters
 */
export declare class AdapterRegistry {
    private adapters;
    private initialized;
    /**
     * Register a storage adapter
     */
    register(adapter: StorageAdapter): void;
    /**
     * Get a storage adapter by name
     */
    get(name: StorageType): StorageAdapter | undefined;
    /**
     * Get an adapter and ensure it's initialized
     */
    getInitialized(name: StorageType, config?: unknown): Promise<StorageAdapter>;
    /**
     * Check if an adapter is registered
     */
    has(name: StorageType): boolean;
    /**
     * Get all registered adapter names
     */
    getNames(): StorageType[];
    /**
     * Get all registered adapters
     */
    getAll(): StorageAdapter[];
    /**
     * Get available adapters for current platform
     */
    getAvailable(): Promise<StorageAdapter[]>;
    /**
     * Unregister an adapter
     */
    unregister(name: StorageType): boolean;
    /**
     * Clear all adapters
     */
    clear(): void;
    /**
     * Close all adapters
     */
    closeAll(): Promise<void>;
}
//# sourceMappingURL=AdapterRegistry.d.ts.map