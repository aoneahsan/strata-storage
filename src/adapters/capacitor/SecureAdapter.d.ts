/**
 * Secure Adapter - Native secure storage
 * iOS: Keychain, Android: EncryptedSharedPreferences
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo } from '@/types';
/**
 * Native secure storage adapter using Capacitor plugin
 */
export declare class SecureAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    /**
     * Check if secure storage is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(): Promise<void>;
    /**
     * Get a value from secure storage
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in secure storage
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from secure storage
     */
    remove(key: string): Promise<void>;
    /**
     * Clear secure storage
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
     * iOS-specific: Store in Keychain with options
     */
    setKeychainItem(key: string, value: string, options?: {
        service?: string;
        accessGroup?: string;
        accessible?: import('@/plugin/definitions').KeychainAccessible;
    }): Promise<void>;
    /**
     * iOS-specific: Get from Keychain
     */
    getKeychainItem(key: string, options?: {
        service?: string;
        accessGroup?: string;
    }): Promise<string | null>;
    /**
     * Android-specific: Store encrypted preference
     */
    setEncryptedPreference(key: string, value: unknown, fileName?: string): Promise<void>;
    /**
     * Android-specific: Get encrypted preference
     */
    getEncryptedPreference(key: string, fileName?: string): Promise<unknown>;
}
//# sourceMappingURL=SecureAdapter.d.ts.map