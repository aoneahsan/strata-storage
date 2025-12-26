/**
 * Strata Storage Web Implementation
 * Web platform implementation of the Capacitor plugin
 */

import type {
  StrataStoragePlugin,
  NativeStorageType,
  NativeGetOptions,
  NativeSetOptions,
  NativeRemoveOptions,
  NativeClearOptions,
  NativeKeysOptions,
  NativeSizeOptions,
  NativeSizeResult,
} from './definitions';
import type { StorageValue, StorageAdapter } from '@/types';
import { LocalStorageAdapter } from '@/adapters/web/LocalStorageAdapter';
import { IndexedDBAdapter } from '@/adapters/web/IndexedDBAdapter';
import { CacheAdapter } from '@/adapters/web/CacheAdapter';
import { NotSupportedError } from '@/utils/errors';

export class StrataStorageWeb implements StrataStoragePlugin {
  private adapters: Map<NativeStorageType, StorageAdapter> = new Map();
  private initialized = false;

  private async initializeAdapters() {
    if (this.initialized) return;

    this.adapters.set('preferences', new LocalStorageAdapter('strata_prefs_'));
    this.adapters.set('secure', new IndexedDBAdapter('strata-secure'));
    this.adapters.set('sqlite', new IndexedDBAdapter('strata-db'));
    this.adapters.set('filesystem', new CacheAdapter('strata-files'));

    await Promise.all(Array.from(this.adapters.values()).map((adapter) => adapter.initialize()));

    this.initialized = true;
  }

  private getAdapter(storageType: NativeStorageType): StorageAdapter {
    const adapter = this.adapters.get(storageType);
    if (!adapter) {
      throw new NotSupportedError(`Storage type '${storageType}'`, 'web plugin', {
        availableTypes: Array.from(this.adapters.keys()),
        suggestion: this.getSuggestion(storageType),
      });
    }
    return adapter;
  }
  async isAvailable(options: { storage: NativeStorageType }): Promise<{ available: boolean }> {
    await this.initializeAdapters();
    const adapter = this.adapters.get(options.storage);
    if (!adapter) {
      return { available: false };
    }
    const available = await adapter.isAvailable();
    return { available };
  }

  async get(options: NativeGetOptions): Promise<{ value: StorageValue | null }> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    const value = await adapter.get(options.key);
    return { value };
  }

  async set(options: NativeSetOptions): Promise<void> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    await adapter.set(options.key, options.value);
  }

  async remove(options: NativeRemoveOptions): Promise<void> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    await adapter.remove(options.key);
  }

  async clear(options: NativeClearOptions): Promise<void> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    await adapter.clear();
  }

  async keys(options: NativeKeysOptions): Promise<{ keys: string[] }> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    const keys = await adapter.keys();
    return { keys };
  }

  async size(options: NativeSizeOptions): Promise<NativeSizeResult> {
    await this.initializeAdapters();
    const adapter = this.getAdapter(options.storage || 'preferences');
    const sizeInfo = await adapter.size();
    return { total: sizeInfo.total, count: sizeInfo.count };
  }

  /**
   * Get suggestion for web alternative based on native storage type
   */
  private getSuggestion(storageType: NativeStorageType): string {
    const suggestions: Record<NativeStorageType, string> = {
      preferences: 'Use localStorage adapter for persistent key-value storage.',
      secure: 'Use indexedDB adapter with encryption enabled for secure storage.',
      sqlite: 'Use indexedDB adapter for database-like storage.',
      filesystem: 'Use Cache API adapter or indexedDB for file storage.',
    };

    return (
      suggestions[storageType] ||
      'Use one of the web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache.'
    );
  }
}
