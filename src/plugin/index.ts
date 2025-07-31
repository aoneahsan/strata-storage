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

// Export the plugin - will be initialized based on environment
export let StrataStorage: StrataStoragePlugin = mockPlugin;

// Initialize plugin when module loads
if (typeof window !== 'undefined') {
  // Check if Capacitor is available
  const cap = (window as any).Capacitor;
  if (cap && cap.registerPlugin) {
    StrataStorage = cap.registerPlugin('StrataStorage', {
      web: () => import('./web').then((m) => new m.StrataStorageWeb()),
    });
  }
}

export * from './definitions';