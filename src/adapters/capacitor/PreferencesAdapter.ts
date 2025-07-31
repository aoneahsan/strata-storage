/**
 * Preferences Adapter - Native preferences storage
 * iOS: UserDefaults, Android: SharedPreferences
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
 * Native preferences adapter using Capacitor plugin
 */
export class PreferencesAdapter extends BaseAdapter {
  readonly name: StorageType = 'preferences';
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: false,
    observable: false, // No native change events
    transactional: false,
    queryable: true,
    maxSize: -1, // Platform dependent
    binary: false, // Only JSON-serializable data
    encrypted: false,
    crossTab: true, // Shared across app
  };

  /**
   * Check if preferences are available
   */
  async isAvailable(): Promise<boolean> {
    if (!isCapacitor()) return false;

    try {
      const result = await StrataStorage.isAvailable({ storage: 'preferences' });
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
   * Get a value from preferences
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    try {
      const result = await StrataStorage.get({
        key,
        storage: 'preferences',
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
      console.error(`Failed to get key ${key} from preferences:`, error);
      return null;
    }
  }

  /**
   * Set a value in preferences
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.set({
        key,
        value,
        storage: 'preferences',
      });

      this.emitChange(key, oldValue?.value, value.value, 'local');
    } catch (error) {
      throw new StorageError(`Failed to set key ${key} in preferences: ${error}`);
    }
  }

  /**
   * Remove a value from preferences
   */
  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);

    try {
      await StrataStorage.remove({
        key,
        storage: 'preferences',
      });

      if (oldValue) {
        this.emitChange(key, oldValue.value, undefined, 'local');
      }
    } catch (error) {
      throw new StorageError(`Failed to remove key ${key} from preferences: ${error}`);
    }
  }

  /**
   * Clear preferences
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      try {
        await StrataStorage.clear({
          storage: 'preferences',
        });
        this.emitChange('*', undefined, undefined, 'local');
        return;
      } catch (error) {
        throw new StorageError(`Failed to clear preferences: ${error}`);
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
        storage: 'preferences',
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
      throw new StorageError(`Failed to get keys from preferences: ${error}`);
    }
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    try {
      const result = await StrataStorage.size({
        storage: 'preferences',
        detailed,
      });

      return result;
    } catch (error) {
      throw new StorageError(`Failed to get size of preferences: ${error}`);
    }
  }
}
