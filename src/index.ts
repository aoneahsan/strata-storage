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
export { URLAdapter, type URLAdapterConfig } from './adapters/web/URLAdapter';
export { DEFAULT_WEB_KEY_PREFIX } from './adapters/web/LocalStorageAdapter';

// Core features
export { EncryptionManager } from './features/encryption';
export { CompressionManager } from './features/compression';
export { TTLManager } from './features/ttl';
export { QueryEngine } from './features/query';
export { SyncManager } from './features/sync';
export { StorageObserver } from './features/observer';
export { computeChecksum, verifyChecksum } from './features/integrity';
// Migrations — standalone, adapter-level utility (experimental). Operates on a
// StorageAdapter, NOT via StrataConfig. See docs/api/features/migration.md.
export { MigrationManager } from './features/migration';
export type { Migration } from './features/migration';

// Error classes (exported as values so consumers can use `instanceof`)
export {
  StrataError,
  StorageError,
  IntegrityError,
  QuotaExceededError,
  EncryptionError,
  CompressionError,
  SerializationError,
  ValidationError,
  NotSupportedError,
  AdapterNotAvailableError,
} from './utils/errors';

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
  StorageCapabilities,
  StorageMetadata,
  TTLConfig,
  StrataConfig,
  StorageChange,
  SubscriptionCallback,
  UnsubscribeFunction,
} from './types';

// Diagnostics.
//
// 🔴 The logger's own documentation names `setLogLevel('debug')` as the way to
// raise verbosity, and it was never exported from this entry point — so the
// documented control was unreachable. That matters as of 2.9.0: keys this
// library does not own are now SKIPPED and reported at `debug`, which is below
// the default `warn`. Raising the level is how a consumer answers "why is my
// key missing from keys()?", so the control has to be reachable.
export { setLogLevel, getLogLevel, type LogLevel } from './utils/logger';

// Utils
export {
  isValidKey,
  isValidValue,
  isStorageEnvelope,
  serializeValue,
  deserializeValue,
  generateId,
  createError,
  retry,
  debounce,
  throttle,
} from './utils';

// Create and export a default storage instance that works immediately
import { Strata } from './core/Strata';
import { LocalStorageAdapter } from './adapters/web/LocalStorageAdapter';
import { SessionStorageAdapter } from './adapters/web/SessionStorageAdapter';
import { IndexedDBAdapter } from './adapters/web/IndexedDBAdapter';
import { CookieAdapter } from './adapters/web/CookieAdapter';
import { CacheAdapter } from './adapters/web/CacheAdapter';
import { MemoryAdapter } from './adapters/web/MemoryAdapter';
import { logger } from '@/utils/logger';
import type { StrataConfig } from './types';

/**
 * Register the standard web storage adapters on a Strata instance: memory,
 * localStorage, sessionStorage, indexedDB, cookies, and cache. Exported so any
 * custom instance can opt into the same default set. Returns the same instance
 * for chaining.
 */
export function registerWebAdapters(strata: Strata, config?: StrataConfig): Strata {
  // `adapters: { <name>: false }` opts an adapter out of REGISTRATION, not just
  // out of initialization. Registering one the instance will never use still
  // costs a TTL sweep over a storage area it does not own.
  //
  // 🔴 `defaultStorages` is NOT this switch. It is the preference order for
  // picking the DEFAULT adapter; multi-adapter operations (keys/clear/size/
  // subscribe with no `storage`) deliberately span everything registered. That
  // distinction was undocumented, and reading `defaultStorages` as a
  // registration allow-list is what produced ISSUE-09.
  const enabled = (name: keyof NonNullable<StrataConfig['adapters']>): boolean =>
    config?.adapters?.[name] !== false;

  try {
    strata.registerAdapter(new MemoryAdapter()); // always-available fallback
    if (enabled('localStorage')) strata.registerAdapter(new LocalStorageAdapter());
    if (enabled('sessionStorage')) strata.registerAdapter(new SessionStorageAdapter());
    if (enabled('indexedDB')) strata.registerAdapter(new IndexedDBAdapter());
    if (enabled('cookies')) strata.registerAdapter(new CookieAdapter());
    if (enabled('cache')) strata.registerAdapter(new CacheAdapter());
  } catch (error) {
    logger.warn('Strata Storage adapter registration warning:', error);
  }
  return strata;
}

/**
 * Create a ready-to-use Strata instance with the standard web adapters
 * pre-registered — the framework-agnostic, Zustand-style entry point. Create it
 * once anywhere and use it everywhere; NO Provider required.
 *
 * The instance initializes lazily on first use (each operation awaits readiness
 * internally), so you can call get/set/subscribe immediately after creating it.
 *
 * @example
 * ```ts
 * import { defineStorage } from 'strata-storage';
 * export const storage = defineStorage({ defaultStorages: ['localStorage'] });
 * await storage.set('user', { id: 1 });
 * const user = await storage.get('user');
 * ```
 */
export function defineStorage(config?: StrataConfig): Strata {
  return registerWebAdapters(new Strata(config), config);
}

// Default singleton — created via the same factory so behavior is identical.
// It initializes lazily on first use, so importing the package has no I/O cost.
// Persistent backends are preferred first so default writes survive a reload;
// volatile `memory` is the last-resort fallback (e.g. SSR / no web storage).
const storage = defineStorage({
  defaultStorages: ['localStorage', 'indexedDB', 'sessionStorage', 'memory'],
});

/**
 * Force initialization of the default `storage` singleton and await readiness.
 * Optional — every operation auto-awaits readiness — but handy when you want
 * adapters ready before a burst of calls. Idempotent.
 */
async function ensureInitialized(): Promise<void> {
  await storage.initialize();
}

// Export the ready-to-use storage instance
export { storage, ensureInitialized };

// Default export for convenience
export default storage;
