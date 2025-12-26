/**
 * Strata Storage Capacitor Plugin
 * Main plugin registration and web implementation
 * This is now optional and only loaded when Capacitor adapters are used
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
import { NotSupportedError } from '@/utils/errors';

// Mock implementation for when Capacitor is not available
const mockPlugin: StrataStoragePlugin = {
  isAvailable: async () => ({ available: false }),
  get: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
  set: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
  remove: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
  clear: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
  keys: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
  size: async () => {
    throw new NotSupportedError('Native storage', 'web platform without Capacitor', {
      suggestion:
        'Use web adapters: localStorage, sessionStorage, indexedDB, cookies, or cache instead',
    });
  },
};

// Create a lazy-loading wrapper that only attempts to load Capacitor when actually used
class LazyStrataStoragePlugin implements StrataStoragePlugin {
  private plugin?: StrataStoragePlugin;
  private attempted = false;

  private getPlugin(): StrataStoragePlugin {
    if (this.attempted) {
      return this.plugin || mockPlugin;
    }

    this.attempted = true;

    if (typeof window !== 'undefined') {
      const cap = (
        window as Window & {
          Capacitor?: { registerPlugin: (name: string, config: unknown) => StrataStoragePlugin };
        }
      ).Capacitor;

      if (cap && cap.registerPlugin) {
        try {
          this.plugin = cap.registerPlugin('StrataStorage', {
            web: () => import('./web').then((m) => new m.StrataStorageWeb()),
          });
        } catch (error) {
          console.warn('Failed to register StrataStorage plugin:', error);
          this.plugin = mockPlugin;
        }
      } else {
        this.plugin = mockPlugin;
      }
    } else {
      this.plugin = mockPlugin;
    }

    return this.plugin;
  }

  async isAvailable(options: { storage: NativeStorageType }): Promise<{ available: boolean }> {
    return this.getPlugin().isAvailable(options);
  }

  async get(options: NativeGetOptions): Promise<{ value: StorageValue<unknown> | null }> {
    return this.getPlugin().get(options);
  }

  async set(options: NativeSetOptions): Promise<void> {
    return this.getPlugin().set(options);
  }

  async remove(options: NativeRemoveOptions): Promise<void> {
    return this.getPlugin().remove(options);
  }

  async clear(options: NativeClearOptions): Promise<void> {
    return this.getPlugin().clear(options);
  }

  async keys(options: NativeKeysOptions): Promise<{ keys: string[] }> {
    return this.getPlugin().keys(options);
  }

  async size(options: NativeSizeOptions): Promise<NativeSizeResult> {
    return this.getPlugin().size(options);
  }

  // Optional methods delegated to the underlying plugin
  get setKeychain() {
    return this.getPlugin().setKeychain;
  }

  get getKeychain() {
    return this.getPlugin().getKeychain;
  }

  get setEncryptedPreference() {
    return this.getPlugin().setEncryptedPreference;
  }

  get getEncryptedPreference() {
    return this.getPlugin().getEncryptedPreference;
  }

  get query() {
    return this.getPlugin().query;
  }

  get getUserDefaults() {
    return this.getPlugin().getUserDefaults;
  }

  get setUserDefaults() {
    return this.getPlugin().setUserDefaults;
  }
}

// Export the lazy-loading plugin
export const StrataStorage: StrataStoragePlugin = new LazyStrataStoragePlugin();

export * from './definitions';
