/**
 * Secure Adapter - Native secure storage
 * iOS: Keychain, Android: EncryptedSharedPreferences
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  SizeInfo,
} from '@/types';
import { StrataStorage } from '@/plugin';
import { StorageError } from '@/utils/errors';
import { isCapacitor } from '@/utils';

/**
 * Native secure storage adapter using Capacitor plugin
 */
export class SecureAdapter extends BaseAdapter {
  readonly name: StorageType = 'secure';
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: false,
    observable: false,
    transactional: false,
    queryable: true,
    maxSize: -1, // Platform dependent
    binary: false, // String data only
    encrypted: true, // Native encryption
    crossTab: true,
  };

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    if (!isCapacitor()) return false;

    try {
      const result = await StrataStorage.isAvailable({ storage: 'secure' });
      return result.available;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    this.startTTLCleanup();
  }

  /**
   * Get a value from secure storage
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    try {
      const result = await StrataStorage.get({
        key,
        storage: 'secure',
      });

      if (!result.value) return null;

      const value = result.value as StorageValue<T>;

      // Check TTL
      if (this.isExpired(value)) {
        await this.remove(key);
        return null;
      }

      return value;
    } catch (error) {
      console.error(`Failed to get key ${key} from secure storage:`, error);
      return null;
    }
  }

  /**
   * Set a value in secure storage
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.set({
        key,
        value,
        storage: 'secure',
      });

      this.emitChange(key, oldValue?.value, value.value, 'local');
    } catch (error) {
      throw new StorageError(`Failed to set key ${key} in secure storage: ${error}`);
    }
  }

  /**
   * Remove a value from secure storage
   */
  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.remove({
        key,
        storage: 'secure',
      });

      if (oldValue) {
        this.emitChange(key, oldValue.value, undefined, 'local');
      }
    } catch (error) {
      throw new StorageError(`Failed to remove key ${key} from secure storage: ${error}`);
    }
  }

  /**
   * Clear secure storage
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      try {
        await StrataStorage.clear({
          storage: 'secure',
        });
        this.emitChange('*', undefined, undefined, 'local');
        return;
      } catch (error) {
        throw new StorageError(`Failed to clear secure storage: ${error}`);
      }
    }

    // Use base implementation for filtered clear
    await super.clear(options);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    try {
      const result = await StrataStorage.keys({
        storage: 'secure',
        pattern: pattern instanceof RegExp ? pattern.source : pattern,
      });

      const keys = result.keys;

      // Check for expired keys
      const validKeys: string[] = [];
      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          validKeys.push(key);
        }
      }

      return this.filterKeys(validKeys, pattern);
    } catch (error) {
      throw new StorageError(`Failed to get keys from secure storage: ${error}`);
    }
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    try {
      const result = await StrataStorage.size({
        storage: 'secure',
        detailed,
      });

      return result;
    } catch (error) {
      throw new StorageError(`Failed to get size of secure storage: ${error}`);
    }
  }

  /**
   * iOS-specific: Store in Keychain with options
   */
  async setKeychainItem(
    key: string,
    value: string,
    options?: {
      service?: string;
      accessGroup?: string;
      accessible?: import('@/plugin/definitions').KeychainAccessible;
    },
  ): Promise<void> {
    if (!StrataStorage.setKeychain) {
      throw new StorageError('Keychain not available on this platform');
    }

    await StrataStorage.setKeychain({
      key,
      value,
      ...options,
    });
  }

  /**
   * iOS-specific: Get from Keychain
   */
  async getKeychainItem(
    key: string,
    options?: {
      service?: string;
      accessGroup?: string;
    },
  ): Promise<string | null> {
    if (!StrataStorage.getKeychain) {
      throw new StorageError('Keychain not available on this platform');
    }

    const result = await StrataStorage.getKeychain({
      key,
      ...options,
    });

    return result.value;
  }

  /**
   * Android-specific: Store encrypted preference
   */
  async setEncryptedPreference(key: string, value: unknown, fileName?: string): Promise<void> {
    if (!StrataStorage.setEncryptedPreference) {
      throw new StorageError('Encrypted preferences not available on this platform');
    }

    await StrataStorage.setEncryptedPreference({
      key,
      value,
      fileName,
    });
  }

  /**
   * Android-specific: Get encrypted preference
   */
  async getEncryptedPreference(key: string, fileName?: string): Promise<unknown> {
    if (!StrataStorage.getEncryptedPreference) {
      throw new StorageError('Encrypted preferences not available on this platform');
    }

    const result = await StrataStorage.getEncryptedPreference({
      key,
      fileName,
    });

    return result.value;
  }
}
