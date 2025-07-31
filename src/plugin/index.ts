/**
 * Strata Storage Capacitor Plugin
 * Main plugin registration and web implementation
 */

import type { StrataStoragePlugin } from './definitions';

// Mock implementation for when Capacitor is not available
const mockPlugin: StrataStoragePlugin = {
  isAvailable: async () => ({ available: false }),
  get: async () => ({ value: null }),
  set: async () => {},
  remove: async () => {},
  clear: async () => {},
  keys: async () => ({ keys: [] }),
  size: async () => ({ total: 0, count: 0 }),
};

let StrataStorage: StrataStoragePlugin;

// Only register plugin if Capacitor is available
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  const { registerPlugin } = require('@capacitor/core');
  StrataStorage = registerPlugin('StrataStorage', {
    web: () => import('./web').then((m) => new m.StrataStorageWeb()),
  }) as StrataStoragePlugin;
} else {
  StrataStorage = mockPlugin;
}

export * from './definitions';
export { StrataStorage };
