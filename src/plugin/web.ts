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
    return { available: false };
  }

  async get(_options: NativeGetOptions): Promise<{ value: StorageValue | null }> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }

  async set(_options: NativeSetOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }

  async remove(_options: NativeRemoveOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }

  async clear(_options: NativeClearOptions): Promise<void> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }

  async keys(_options: NativeKeysOptions): Promise<{ keys: string[] }> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }

  async size(_options: NativeSizeOptions): Promise<NativeSizeResult> {
    // Not implemented for web - use web adapters instead
    throw new Error('Native storage not available on web platform');
  }
}
