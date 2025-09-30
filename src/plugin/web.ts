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
import type { StorageValue } from '@/types';

export class StrataStorageWeb implements StrataStoragePlugin {
  async isAvailable(_options: { storage: NativeStorageType }): Promise<{ available: boolean }> {
    // Web platform doesn't support native storage types
    // This is handled by the web adapters instead
    return {
      available: false,
      platform: 'web',
      message:
        'Native storage not available on web. Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead.',
    } as { available: boolean; platform: string; message: string };
  }

  async get(options: NativeGetOptions): Promise<{ value: StorageValue | null }> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
  }

  async set(options: NativeSetOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
  }

  async remove(options: NativeRemoveOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
  }

  async clear(options: NativeClearOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
  }

  async keys(options: NativeKeysOptions): Promise<{ keys: string[] }> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
  }

  async size(options: NativeSizeOptions): Promise<NativeSizeResult> {
    // Not implemented for web - use web adapters instead
    const storageType = options.storage || 'preferences';
    const suggestion = this.getSuggestion(storageType);
    throw new Error(`Native storage '${storageType}' not available on web platform. ${suggestion}`);
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
