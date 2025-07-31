/**
 * Strata Storage - Zero-dependency universal storage plugin
 *
 * @packageDocumentation
 */

// Main export
export { Strata } from './core/Strata';
import { Strata } from './core/Strata';

// Types
export type {
  // Core types
  Platform,
  StorageType,
  StorageStrategy,
  StorageOptions,
  StorageValue,
  StorageChange,
  StorageCapabilities,
  StrataConfig,

  // Adapter types
  StorageAdapter,
  Transaction,

  // Operation types
  ClearOptions,
  SizeInfo,
  ExportOptions,
  ImportOptions,
  QueryCondition,
  QueryOperators,

  // Callback types
  SubscriptionCallback,
  UnsubscribeFunction,

  // Migration types
  Migration,
  ExportFormat,
} from './types';

// Errors
export {
  StrataError,
  StorageError,
  NotFoundError,
  QuotaExceededError,
  AdapterNotAvailableError,
  NotSupportedError,
  EncryptionError,
  CompressionError,
  SerializationError,
  ValidationError,
  TransactionError,
  MigrationError,
  SyncError,
  isStrataError,
  isQuotaError,
} from './utils/errors';

// Utilities (selected exports for advanced users)
export {
  serialize,
  deserialize,
  deepClone,
  deepMerge,
  formatBytes,
  parseSize,
  EventEmitter,
} from './utils';

// Base classes for custom adapters
export { BaseAdapter } from './core/BaseAdapter';
export { AdapterRegistry } from './core/AdapterRegistry';

// Features
export { EncryptionManager } from './features/encryption';
export type { EncryptionConfig, EncryptedData } from './features/encryption';
export { CompressionManager } from './features/compression';
export type { CompressionConfig, CompressedData } from './features/compression';
export { SyncManager, createSyncManager } from './features/sync';
export type { SyncConfig, SyncMessage } from './features/sync';
export { QueryEngine, createQueryEngine } from './features/query';
export { TTLManager, createTTLManager } from './features/ttl';
export type { TTLConfig, TTLOptions, ExpiredItem } from './features/ttl';
export { MigrationManager } from './features/migration';

// Plugin definitions and main plugin
export * from './plugin/definitions';
export { StrataStorage } from './plugin';

/**
 * Create a new Strata instance with optional configuration
 *
 * @example
 * ```typescript
 * import { Strata } from 'strata-storage';
 *
 * const storage = new Strata({
 *   defaultStorages: ['indexedDB', 'localStorage', 'memory'],
 *   encryption: { enabled: true },
 *   compression: { enabled: true }
 * });
 *
 * await storage.initialize();
 * await storage.set('key', 'value');
 * const value = await storage.get('key');
 * ```
 */
export function createStrata(config?: import('./types').StrataConfig): InstanceType<typeof Strata> {
  return new Strata(config);
}
