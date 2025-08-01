/**
 * Strata Storage Capacitor Plugin Definitions
 * Interface definitions for native platform implementations
 */
import type { StorageValue } from '@/types';
/**
 * Main plugin interface
 */
export interface StrataStoragePlugin {
    /**
     * Check if a specific storage type is available on the platform
     */
    isAvailable(options: {
        storage: NativeStorageType;
    }): Promise<{
        available: boolean;
    }>;
    /**
     * Get a value from native storage
     */
    get(options: NativeGetOptions): Promise<{
        value: StorageValue | null;
    }>;
    /**
     * Set a value in native storage
     */
    set(options: NativeSetOptions): Promise<void>;
    /**
     * Remove a value from native storage
     */
    remove(options: NativeRemoveOptions): Promise<void>;
    /**
     * Clear native storage
     */
    clear(options: NativeClearOptions): Promise<void>;
    /**
     * Get all keys from native storage
     */
    keys(options: NativeKeysOptions): Promise<{
        keys: string[];
    }>;
    /**
     * Get storage size information
     */
    size(options: NativeSizeOptions): Promise<NativeSizeResult>;
    /**
     * Perform native query (if supported)
     */
    query?(options: NativeQueryOptions): Promise<{
        results: Array<{
            key: string;
            value: unknown;
        }>;
    }>;
    /**
     * iOS-specific: Access UserDefaults
     */
    getUserDefaults?(options: {
        key: string;
        suiteName?: string;
    }): Promise<{
        value: unknown;
    }>;
    /**
     * iOS-specific: Set UserDefaults
     */
    setUserDefaults?(options: {
        key: string;
        value: unknown;
        suiteName?: string;
    }): Promise<void>;
    /**
     * iOS-specific: Access Keychain
     */
    getKeychain?(options: {
        key: string;
        service?: string;
        accessGroup?: string;
    }): Promise<{
        value: string | null;
    }>;
    /**
     * iOS-specific: Set Keychain
     */
    setKeychain?(options: {
        key: string;
        value: string;
        service?: string;
        accessGroup?: string;
        accessible?: KeychainAccessible;
    }): Promise<void>;
    /**
     * Android-specific: Get encrypted preference
     */
    getEncryptedPreference?(options: {
        key: string;
        fileName?: string;
    }): Promise<{
        value: unknown;
    }>;
    /**
     * Android-specific: Set encrypted preference
     */
    setEncryptedPreference?(options: {
        key: string;
        value: unknown;
        fileName?: string;
    }): Promise<void>;
}
/**
 * Native storage types
 */
export type NativeStorageType = 'preferences' | 'sqlite' | 'secure' | 'filesystem';
/**
 * Native get options
 */
export interface NativeGetOptions {
    key: string;
    storage: NativeStorageType;
    database?: string;
    table?: string;
}
/**
 * Native set options
 */
export interface NativeSetOptions {
    key: string;
    value: StorageValue;
    storage: NativeStorageType;
    database?: string;
    table?: string;
}
/**
 * Native remove options
 */
export interface NativeRemoveOptions {
    key: string;
    storage: NativeStorageType;
    database?: string;
    table?: string;
}
/**
 * Native clear options
 */
export interface NativeClearOptions {
    storage: NativeStorageType;
    database?: string;
    table?: string;
    pattern?: string;
}
/**
 * Native keys options
 */
export interface NativeKeysOptions {
    storage: NativeStorageType;
    database?: string;
    table?: string;
    pattern?: string;
}
/**
 * Native size options
 */
export interface NativeSizeOptions {
    storage: NativeStorageType;
    database?: string;
    table?: string;
    detailed?: boolean;
}
/**
 * Native size result
 */
export interface NativeSizeResult {
    total: number;
    count: number;
    detailed?: {
        keys: number;
        values: number;
        metadata: number;
    };
}
/**
 * Native query options
 */
export interface NativeQueryOptions {
    storage: NativeStorageType;
    database?: string;
    table?: string;
    condition: Record<string, unknown>;
}
/**
 * iOS Keychain accessibility options
 */
export type KeychainAccessible = 'whenUnlocked' | 'afterFirstUnlock' | 'whenUnlockedThisDeviceOnly' | 'afterFirstUnlockThisDeviceOnly' | 'whenPasscodeSetThisDeviceOnly';
/**
 * Platform information
 */
export interface PlatformInfo {
    platform: 'ios' | 'android' | 'web';
    version: string;
    isSimulator: boolean;
}
/**
 * Storage permissions
 */
export interface StoragePermissions {
    read: boolean;
    write: boolean;
    delete: boolean;
}
/**
 * Migration options
 */
export interface MigrationOptions {
    fromStorage: NativeStorageType;
    toStorage: NativeStorageType;
    keys?: string[];
    transform?: (value: unknown) => unknown;
}
//# sourceMappingURL=definitions.d.ts.map