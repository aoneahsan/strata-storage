/**
 * Filesystem Adapter - Native file system storage
 * Direct file access on iOS and Android
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo } from '@/types';
/**
 * Native filesystem adapter using Capacitor plugin
 */
export declare class FilesystemAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    /**
     * Check if filesystem is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(): Promise<void>;
    /**
     * Get a value from filesystem
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in filesystem
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from filesystem
     */
    remove(key: string): Promise<void>;
    /**
     * Clear filesystem storage
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
}
//# sourceMappingURL=FilesystemAdapter.d.ts.map