/**
 * Preferences Adapter - Native preferences storage
 * iOS: UserDefaults, Android: SharedPreferences
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo } from '@/types';
/**
 * Native preferences adapter using Capacitor plugin
 */
export declare class PreferencesAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    /**
     * Check if preferences are available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(): Promise<void>;
    /**
     * Get a value from preferences
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in preferences
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from preferences
     */
    remove(key: string): Promise<void>;
    /**
     * Clear preferences
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
//# sourceMappingURL=PreferencesAdapter.d.ts.map