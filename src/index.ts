// Core exports - zero dependencies, works everywhere
export { Strata } from './core/Strata';
export { BaseAdapter } from './core/BaseAdapter';
export { AdapterRegistry } from './core/AdapterRegistry';

// Web adapters - work in any JavaScript environment
export { LocalStorageAdapter } from './adapters/web/LocalStorageAdapter';
export { SessionStorageAdapter } from './adapters/web/SessionStorageAdapter';
export { IndexedDBAdapter } from './adapters/web/IndexedDBAdapter';
export { CookieAdapter } from './adapters/web/CookieAdapter';
export { CacheAdapter } from './adapters/web/CacheAdapter';
export { MemoryAdapter } from './adapters/web/MemoryAdapter';

// Core features
export { EncryptionManager } from './features/encryption';
export { CompressionManager } from './features/compression';
export { TTLManager } from './features/ttl';
export { QueryEngine } from './features/query';
export { SyncManager } from './features/sync';
export { StorageObserver } from './features/observer';

// Types
export type {
  StorageType,
  StorageOptions,
  StorageValue,
  StorageAdapter,
  AdapterConfig,
  QueryOptions,
  SyncConfig,
  EncryptionConfig,
  CompressionConfig,
  ObserverCallback,
  StorageEvent,
  StorageError,
  StorageCapabilities,
  StorageMetadata,
  TTLConfig
} from './types';

// Utils
export {
  isValidKey,
  isValidValue,
  serializeValue,
  deserializeValue,
  generateId,
  createError,
  retry,
  debounce,
  throttle
} from './utils';

// Create and export a default storage instance that works immediately
import { Strata } from './core/Strata';
import { LocalStorageAdapter } from './adapters/web/LocalStorageAdapter';
import { SessionStorageAdapter } from './adapters/web/SessionStorageAdapter';
import { IndexedDBAdapter } from './adapters/web/IndexedDBAdapter';
import { CookieAdapter } from './adapters/web/CookieAdapter';
import { CacheAdapter } from './adapters/web/CacheAdapter';
import { MemoryAdapter } from './adapters/web/MemoryAdapter';

// Create a singleton instance with web adapters pre-registered
const storage = new Strata({
  defaultStorage: 'memory', // Always available fallback
  autoInitialize: false // We'll initialize it ourselves
});

// Register only web adapters by default
storage.registerAdapter(new MemoryAdapter());
storage.registerAdapter(new LocalStorageAdapter());
storage.registerAdapter(new SessionStorageAdapter());
storage.registerAdapter(new IndexedDBAdapter());
storage.registerAdapter(new CookieAdapter());
storage.registerAdapter(new CacheAdapter());

// Initialize the storage instance
(async () => {
  try {
    await storage.initialize();
  } catch (error) {
    console.warn('Strata Storage initialization warning:', error);
    // Continue working even if some adapters fail
  }
})();

// Export the ready-to-use storage instance
export { storage };

// Default export for convenience
export default storage;