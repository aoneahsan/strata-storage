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
  isAvailable(options: { storage: NativeStorageType }): Promise<{ available: boolean }>;

  /**
   * Get a value from native storage
   */
  get(options: NativeGetOptions): Promise<{ value: StorageValue<unknown> | null }>;

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
  keys(options: NativeKeysOptions): Promise<{ keys: string[] }>;

  /**
   * Get storage size information
   */
  size(options: NativeSizeOptions): Promise<NativeSizeResult>;

  /**
   * Perform native query (if supported).
   *
   * The native layer enumerates non-expired candidate rows and returns the
   * FULL `StorageValue` wrapper for each in a single round-trip, so the TS
   * adapter can run the query filter in JS without an N+1 `get()` per key.
   * `value` is optional for back-compat with older native builds that only
   * surfaced keys; the adapter falls back to `get()` when it is absent.
   */
  query?(
    options: NativeQueryOptions,
  ): Promise<{ results: Array<{ key: string; value?: StorageValue<unknown> }> }>;

  /**
   * Delete every expired row for the target store in a single native
   * round-trip, returning how many rows were removed.
   *
   * Optional: only the SQLite native backend implements it. Because `keys()`
   * and `query()` now exclude expired rows in SQL (no lazy per-key deletion on
   * read), this is what reclaims their physical storage. The TS adapter guards
   * on its presence and falls back to the base per-key sweep otherwise.
   */
  cleanupExpired?(options: NativeCleanupExpiredOptions): Promise<{ removed: number }>;

  /**
   * iOS-specific: Access UserDefaults
   */
  getUserDefaults?(options: { key: string; suiteName?: string }): Promise<{ value: unknown }>;

  /**
   * iOS-specific: Set UserDefaults
   */
  setUserDefaults?(options: { key: string; value: unknown; suiteName?: string }): Promise<void>;

  /**
   * iOS-specific: Access Keychain
   */
  getKeychain?(options: {
    key: string;
    service?: string;
    accessGroup?: string;
  }): Promise<{ value: string | null }>;

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
  getEncryptedPreference?(options: { key: string; fileName?: string }): Promise<{ value: unknown }>;

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
export type NativeStorageType =
  | 'preferences' // iOS: UserDefaults, Android: SharedPreferences
  | 'sqlite' // SQLite database
  | 'secure' // iOS: Keychain, Android: EncryptedSharedPreferences
  | 'filesystem'; // Direct file system access

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
  value: StorageValue<unknown>;
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
 * Native cleanup-expired options
 */
export interface NativeCleanupExpiredOptions {
  storage: NativeStorageType;
  database?: string;
  table?: string;
}

/**
 * iOS Keychain accessibility options
 */
export type KeychainAccessible =
  | 'whenUnlocked'
  | 'afterFirstUnlock'
  | 'whenUnlockedThisDeviceOnly'
  | 'afterFirstUnlockThisDeviceOnly'
  | 'whenPasscodeSetThisDeviceOnly';

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
