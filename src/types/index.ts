/**
 * Core type definitions for Strata Storage
 * Zero dependencies - all types defined from scratch
 */

/**
 * Supported storage types across all platforms
 */
export type StorageType =
  | 'memory'
  | 'localStorage'
  | 'sessionStorage'
  | 'indexedDB'
  | 'cookies'
  | 'cache'
  | 'url'
  | 'preferences'
  | 'sqlite'
  | 'filesystem'
  | 'secure';

/**
 * Platform types
 */
export type Platform = 'web' | 'ios' | 'android' | 'node' | 'auto';

/**
 * Options for storage operations
 */
export interface StorageOptions {
  /**
   * Storage type to use (overrides default)
   */
  storage?: StorageType | StorageType[];

  /**
   * Enable encryption for this operation
   */
  encrypt?: boolean;

  /**
   * Password for encryption/decryption
   */
  encryptionPassword?: string;

  /**
   * Skip decryption when reading encrypted values
   */
  skipDecryption?: boolean;

  /**
   * Ignore decryption errors and return null instead
   */
  ignoreDecryptionErrors?: boolean;

  /**
   * Enable compression for this operation
   */
  compress?: boolean;

  /**
   * Time to live in milliseconds
   */
  ttl?: number;

  /**
   * Sliding expiration - reset TTL on access
   */
  sliding?: boolean;

  /**
   * Expire at this absolute time — a `Date` or epoch-milliseconds timestamp
   * (overrides `ttl`). A time already in the past means the item is treated as
   * never stored with an expiry (it will not be written with a future expiry).
   */
  expireAt?: Date | number;

  /**
   * Alias of `expireAt`, kept for backward compatibility. Like `expireAt` this
   * is an ABSOLUTE `Date` / epoch-ms timestamp, NOT a duration — for a
   * duration-from-now use `ttl`. Prefer `expireAt` in new code.
   */
  expireAfter?: Date | number;

  /**
   * Tags for grouping and querying
   */
  tags?: string[];

  /**
   * Namespace for isolation
   */
  namespace?: string;

  /**
   * Metadata to attach
   */
  metadata?: Record<string, unknown>;

  /**
   * Compute + store an integrity checksum for this write and verify it on read.
   */
  verify?: boolean;

  /**
   * Durable write — read the value back and verify it after writing, retrying
   * on mismatch. Guards against silent partial writes.
   */
  durable?: boolean;

  /**
   * On a checksum mismatch during read, return null instead of throwing
   * IntegrityError (after mirror read-repair has been attempted).
   */
  ignoreCorruption?: boolean;
}

/**
 * Storage value with metadata
 */
export interface StorageValue<T = unknown> {
  /**
   * The actual stored value
   */
  value: T;

  /**
   * Creation timestamp
   */
  created: number;

  /**
   * Last update timestamp
   */
  updated: number;

  /**
   * Expiration timestamp (if TTL is set)
   */
  expires?: number;

  /**
   * Tags for grouping
   */
  tags?: string[];

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Whether value is encrypted
   */
  encrypted?: boolean;

  /**
   * Whether value is compressed
   */
  compressed?: boolean;

  /**
   * Integrity checksum (FNV-1a) over the stored value, present when integrity
   * is enabled. Verified on read to detect corruption.
   */
  checksum?: string;
}

/**
 * Storage change event
 */
export interface StorageChange<T = unknown> {
  /**
   * The key that changed
   */
  key: string;

  /**
   * Old value (if available)
   */
  oldValue?: T;

  /**
   * New value (if available)
   */
  newValue?: T;

  /**
   * Source of the change
   */
  source: 'local' | 'remote' | 'sync';

  /**
   * Storage type where change occurred
   */
  storage: StorageType;

  /**
   * Timestamp of change
   */
  timestamp: number;
}

/**
 * Subscription callback
 */
export type SubscriptionCallback<T = unknown> = (change: StorageChange<T>) => void;

/**
 * Unsubscribe function
 */
export type UnsubscribeFunction = () => void;

/**
 * Query operators for advanced operations
 */
export interface QueryOperators {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number | string;
  $gte?: number | string;
  $lt?: number | string;
  $lte?: number | string;
  $in?: unknown[];
  $nin?: unknown[];
  $regex?: string | RegExp;
  $exists?: boolean;
  $type?: string;
  $and?: QueryCondition[];
  $or?: QueryCondition[];
  $not?: QueryCondition;
}

/**
 * Query condition
 */
export type QueryCondition = {
  [key: string]: unknown | QueryOperators;
};

/**
 * Clear options
 */
export interface ClearOptions {
  /**
   * Pattern to match keys (glob or regex)
   */
  pattern?: string | RegExp;

  /**
   * Prefix to match keys (simple string prefix)
   */
  prefix?: string;

  /**
   * Tags to filter by
   */
  tags?: string[];

  /**
   * Only clear expired items
   */
  expiredOnly?: boolean;

  /**
   * Only clear items created before this time — a `Date` or epoch-milliseconds
   * timestamp. Combined conjunctively with the other filters.
   */
  olderThan?: Date | number;

  /**
   * Namespace to clear. Only keys within this namespace are affected.
   */
  namespace?: string;
}

/**
 * Size information
 */
export interface SizeInfo {
  /**
   * Total size in bytes
   */
  total: number;

  /**
   * Size by storage type
   */
  byStorage?: Record<StorageType, number>;

  /**
   * Size by individual key
   */
  byKey?: Record<string, number>;

  /**
   * Number of items
   */
  count: number;

  /**
   * Detailed breakdown
   */
  detailed?: {
    keys: number;
    values: number;
    metadata: number;
  };
}

/**
 * Storage adapter capabilities
 */
export interface StorageCapabilities {
  /**
   * Supports persistence across sessions
   */
  persistent: boolean;

  /**
   * Supports synchronous operations
   */
  synchronous: boolean;

  /**
   * Supports subscriptions/watching
   */
  observable: boolean;

  /**
   * Supports transactions
   */
  transactional: boolean;

  /**
   * Supports querying
   */
  queryable: boolean;

  /**
   * Maximum storage size (bytes, -1 for unlimited)
   */
  maxSize: number;

  /**
   * Supports binary data
   */
  binary: boolean;

  /**
   * Supports encryption
   */
  encrypted: boolean;

  /**
   * Cross-tab/window support
   */
  crossTab: boolean;
}

/**
 * Strata configuration
 */
export interface StrataConfig {
  /**
   * Target platform
   */
  platform?: Platform;

  /**
   * Instance-wide key namespace. When set, every key is transparently stored
   * under `"<namespace>:<key>"` and presented back without the prefix, isolating
   * this instance's keyspace (e.g. per-tenant / per-user). A per-call
   * `options.namespace` overrides it.
   */
  namespace?: string;

  /**
   * Default storage types in order of preference
   */
  defaultStorages?: StorageType[];

  /**
   * Adapter configuration
   */
  adapters?: {
    memory?: boolean | { maxSize?: number };
    localStorage?: boolean | { prefix?: string };
    sessionStorage?: boolean | { prefix?: string };
    indexedDB?: boolean | { dbName?: string; version?: number };
    cookies?: boolean | { secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' };
    cache?: boolean | { cacheName?: string };
    preferences?: boolean;
    sqlite?: boolean | { filename?: string };
    filesystem?: boolean | { directory?: string };
    secure?: boolean;
  };

  /**
   * Native configuration (for mobile platforms)
   */
  native?: {
    preferences?: boolean;
    sqlite?: boolean;
    secure?: boolean;
    filesystem?: boolean;
  };

  /**
   * Sync configuration
   */
  sync?: {
    enabled?: boolean;
    storages?: StorageType[];
    interval?: number;
    conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
  };

  /**
   * Cache configuration
   */
  cache?: {
    enabled?: boolean;
    maxSize?: string | number;
    ttl?: number;
  };

  /**
   * Compression configuration
   */
  compression?: {
    enabled?: boolean;
    threshold?: number;
    /**
     * Compression algorithm. Only the bundled zero-dependency LZ codec is
     * implemented (`'lz'`).
     */
    algorithm?: 'lz';
  };

  /**
   * Encryption configuration
   */
  encryption?: {
    enabled?: boolean;
    algorithm?: 'AES-GCM' | 'AES-CBC';
    password?: string;
    keyLength?: 128 | 192 | 256;
    iterations?: number;
    saltLength?: number;
    keyDerivation?: 'PBKDF2';
  };

  /**
   * TTL (Time To Live) configuration
   */
  ttl?: {
    /**
     * Default TTL in milliseconds
     */
    defaultTTL?: number;

    /**
     * Cleanup interval in milliseconds (default: 60000 - 1 minute)
     */
    cleanupInterval?: number;

    /**
     * Enable automatic cleanup (default: true)
     */
    autoCleanup?: boolean;

    /**
     * Maximum number of items to check per cleanup cycle
     */
    batchSize?: number;

    /**
     * Make reads slide (extend) the expiration by default, so callers don't have
     * to pass `{ sliding: true }` on every `get()`. A per-call `options.sliding`
     * still overrides this. Default: false.
     */
    slidingTTL?: boolean;

    /**
     * Callback when items expire
     */
    onExpire?: (keys: string[]) => void;
  };

  /**
   * Data integrity — compute + verify an FNV-1a checksum on every value so
   * corruption is detected on read. Off by default.
   */
  integrity?: boolean;

  /**
   * Durable writes — read back and verify every write, retrying on mismatch.
   * Off by default (adds one read per write).
   */
  durableWrites?: boolean;

  /**
   * Mirror every write/remove to these backup storage types. On a primary read
   * miss or corruption, the value is recovered from a mirror (read-repair).
   */
  mirror?: StorageType[];

  /**
   * Periodic automatic snapshot of all data to a durable storage type.
   */
  autoBackup?: {
    /** Interval in milliseconds between snapshots. */
    interval: number;
    /** Storage type to write the snapshot to. */
    storage: StorageType;
    /** Key to store the snapshot under (default `__strata_backup__`). */
    key?: string;
  };

  /**
   * Debug configuration
   */
  debug?: {
    enabled?: boolean;
    verbosity?: 'minimal' | 'normal' | 'verbose';
    logOperations?: boolean;
    logPerformance?: boolean;
  };

  /**
   * Performance configuration
   */
  performance?: {
    slowThreshold?: number;
    batchSize?: number;
  };

  /**
   * Auto-initialize on creation (default: true)
   * Set to false for manual initialization control
   */
  autoInitialize?: boolean;

  /**
   * Default storage type when none specified
   */
  defaultStorage?: StorageType;
}

/**
 * Storage adapter interface - all adapters must implement this
 */
export interface StorageAdapter {
  /**
   * Adapter name
   */
  readonly name: StorageType;

  /**
   * Adapter capabilities
   */
  readonly capabilities: StorageCapabilities;

  /**
   * Check if adapter is available on current platform
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize the adapter
   */
  initialize(config?: unknown): Promise<void>;

  /**
   * Get a value
   */
  get<T = unknown>(key: string): Promise<StorageValue<T> | null>;

  /**
   * Set a value
   */
  set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;

  /**
   * Remove a value
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all or matching values
   */
  clear(options?: ClearOptions): Promise<void>;

  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys
   */
  keys(pattern?: string | RegExp): Promise<string[]>;

  // --- Optional synchronous API ---------------------------------------------
  // Implemented only by sync-capable adapters (memory, localStorage,
  // sessionStorage, cookies, url). Absent on async-only backends (indexedDB,
  // cache, sqlite, filesystem, secure, preferences). `capabilities.synchronous`
  // reports whether these are available.

  /** Synchronous get — sync-capable adapters only. */
  getSync?<T = unknown>(key: string): StorageValue<T> | null;
  /** Synchronous set — sync-capable adapters only. */
  setSync?<T = unknown>(key: string, value: StorageValue<T>): void;
  /** Synchronous remove — sync-capable adapters only. */
  removeSync?(key: string): void;
  /** Synchronous existence check — sync-capable adapters only. */
  hasSync?(key: string): boolean;
  /** Synchronous keys — sync-capable adapters only. */
  keysSync?(pattern?: string | RegExp): string[];
  /** Synchronous clear — sync-capable adapters only. */
  clearSync?(options?: ClearOptions): void;

  /**
   * Get storage size
   */
  size(detailed?: boolean): Promise<SizeInfo>;

  /**
   * Subscribe to changes
   */
  subscribe(callback: SubscriptionCallback): UnsubscribeFunction;

  /**
   * Query values (if supported)
   */
  query?<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>>;

  /**
   * Reclaim expired entries from the backend and return how many were removed.
   * Implemented by `BaseAdapter` (a per-key sweep); backends that filter expired
   * rows server-side (e.g. SQLite) override it with a single bulk delete. Used
   * by both the automatic TTL tick and `Strata.cleanupExpired()`.
   */
  cleanupExpired?(): Promise<number>;

  /**
   * Begin transaction (if supported)
   */
  transaction?(): Promise<Transaction>;

  /**
   * Close/cleanup adapter
   */
  close(): Promise<void>;
}

/**
 * Transaction interface for atomic operations
 */
export interface Transaction {
  /**
   * Get within transaction
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * Set within transaction
   */
  set<T = unknown>(key: string, value: T): Promise<void>;

  /**
   * Remove within transaction
   */
  remove(key: string): Promise<void>;

  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;
}

/**
 * Migration interface
 */
export interface Migration {
  /**
   * Migration version
   */
  version: number;

  /**
   * Migration description
   */
  description?: string;

  /**
   * Run the migration
   */
  up(storage: StorageAdapter): Promise<void>;

  /**
   * Rollback the migration
   */
  down?(storage: StorageAdapter): Promise<void>;
}

/**
 * Export/Import formats
 */
export type ExportFormat = 'json';

/**
 * Export options
 */
export interface ExportOptions {
  /**
   * Format to export in
   */
  format?: ExportFormat;

  /**
   * Include metadata
   */
  includeMetadata?: boolean;

  /**
   * Keys to export (all if not specified)
   */
  keys?: string[];

  /**
   * Export only from this storage type. When omitted, keys are gathered across
   * all adapters and read from the default adapter.
   */
  storage?: StorageType;

  /**
   * Pretty print JSON
   */
  pretty?: boolean;
}

/**
 * Import options
 */
export interface ImportOptions {
  /**
   * Format to import from
   */
  format?: ExportFormat;

  /**
   * Import into this storage type (defaults to the default adapter).
   */
  storage?: StorageType;

  /**
   * Overwrite existing keys
   */
  overwrite?: boolean;

  /**
   * Merge strategy
   */
  merge?: 'replace' | 'deep' | 'shallow';
}

/**
 * Adapter configuration type
 */
export interface AdapterConfig {
  /**
   * Adapter-specific configuration
   */
  [key: string]: unknown;
}

/**
 * Query options
 */
export interface QueryOptions {
  /**
   * Limit number of results
   */
  limit?: number;

  /**
   * Skip number of results
   */
  skip?: number;

  /**
   * Sort by field
   */
  sort?: string | { [field: string]: 1 | -1 };

  /**
   * Select specific fields
   */
  select?: string[];
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /**
   * Enable sync
   */
  enabled?: boolean;

  /**
   * Sync interval in milliseconds
   */
  interval?: number;

  /**
   * Storage types to sync
   */
  storages?: StorageType[];

  /**
   * Conflict resolution strategy
   */
  conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /**
   * Enable encryption
   */
  enabled?: boolean;

  /**
   * Encryption algorithm
   */
  algorithm?: 'AES-GCM' | 'AES-CBC';

  /**
   * Default password
   */
  password?: string;

  /**
   * Key derivation settings
   */
  keyLength?: 128 | 192 | 256;
  iterations?: number;
  saltLength?: number;
  keyDerivation?: 'PBKDF2';
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /**
   * Enable compression
   */
  enabled?: boolean;

  /**
   * Minimum size to compress (bytes)
   */
  threshold?: number;

  /**
   * Compression algorithm. Only the bundled zero-dependency LZ codec is
   * implemented (`'lz'`).
   */
  algorithm?: 'lz';
}

/**
 * Observer callback type
 */
export type ObserverCallback = (event: StorageEvent) => void;

/**
 * Storage event
 */
export interface StorageEvent {
  /**
   * Event type
   */
  type: 'set' | 'remove' | 'clear' | 'expire';

  /**
   * Affected key(s)
   */
  key?: string | string[];

  /**
   * New value (for set events)
   */
  value?: unknown;

  /**
   * Storage type
   */
  storage: StorageType;

  /**
   * Event timestamp
   */
  timestamp: number;
}

/**
 * Storage metadata
 */
export interface StorageMetadata {
  /**
   * Creation timestamp
   */
  created?: number;

  /**
   * Last update timestamp
   */
  updated?: number;

  /**
   * Expiration timestamp
   */
  expires?: number;

  /**
   * Associated tags
   */
  tags?: string[];

  /**
   * Custom metadata
   */
  [key: string]: unknown;
}

/**
 * TTL configuration
 */
export interface TTLConfig {
  /**
   * Default TTL in milliseconds
   */
  defaultTTL?: number;

  /**
   * Cleanup interval
   */
  cleanupInterval?: number;

  /**
   * Auto cleanup
   */
  autoCleanup?: boolean;

  /**
   * Batch size for cleanup
   */
  batchSize?: number;

  /**
   * Expiration callback
   */
  onExpire?: (keys: string[]) => void;
}
