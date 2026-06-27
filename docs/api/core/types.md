# Type Definitions

Complete TypeScript type definitions for Strata Storage.

## Core Types

### Platform

```typescript
type Platform = 'web' | 'ios' | 'android' | 'node' | 'auto';
```

Supported platforms for Strata Storage.

### StorageType

```typescript
type StorageType = 
  | 'memory'
  | 'localStorage'
  | 'sessionStorage'
  | 'indexedDB'
  | 'cookies'
  | 'cache'
  | 'url'
  | 'preferences'
  | 'sqlite'
  | 'secure'
  | 'filesystem';
```

Available storage adapter types.

## Configuration Types

### StrataConfig

```typescript
interface StrataConfig {
  platform?: Platform;
  namespace?: string;
  defaultStorages?: StorageType[];
  defaultStorage?: StorageType; // normalized into defaultStorages
  adapters?: {
    [K in StorageType]?: boolean | Record<string, unknown>;
  };
  encryption?: EncryptionConfig;
  compression?: CompressionConfig;
  sync?: SyncConfig;
  ttl?: TTLConfig;
}
```

Main configuration interface for Strata. There is no `strategy` field and no
`StorageStrategy` type — order your preferred backends in `defaultStorages`
instead.

### EncryptionConfig

```typescript
interface EncryptionConfig {
  enabled?: boolean;
  password?: string;
  algorithm?: 'AES-GCM' | 'AES-CBC';
  keyLength?: 128 | 192 | 256;
  keyDerivation?: 'PBKDF2';
  iterations?: number;
  saltLength?: number;
}
```

Encryption configuration options.

### CompressionConfig

```typescript
interface CompressionConfig {
  enabled?: boolean;
  algorithm?: 'lz';
  threshold?: number;
}
```

Compression configuration options.

### SyncConfig

```typescript
interface SyncConfig {
  enabled?: boolean;
  interval?: number;
  storages?: StorageType[];
  conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
}
```

Synchronization configuration options.

### TTLConfig

```typescript
interface TTLConfig {
  defaultTTL?: number;
  cleanupInterval?: number;
  autoCleanup?: boolean;
  batchSize?: number;
  onExpire?: (keys: string[]) => void;
}
```

Time-to-live configuration options.

## Storage Types

### StorageOptions

```typescript
interface StorageOptions {
  storage?: StorageType | StorageType[];
  encrypt?: boolean;
  encryptionPassword?: string;
  skipDecryption?: boolean;
  ignoreDecryptionErrors?: boolean;
  compress?: boolean;
  ttl?: number;
  sliding?: boolean;
  expireAt?: Date | number;
  expireAfter?: Date | number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

Options for storage operations.

### StorageValue

```typescript
interface StorageValue<T = unknown> {
  value: T;
  created: number;
  updated: number;
  expires?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  encrypted?: boolean;
  compressed?: boolean;
}
```

Internal storage value structure.

### StorageChange

```typescript
interface StorageChange<T = unknown> {
  key: string;
  oldValue?: T;
  newValue?: T;
  source: 'local' | 'remote' | 'sync';
  storage: StorageType;
  timestamp: number;
}
```

Storage change event structure. `source` is the change *category* —
`'local'` (a change made by this instance), `'remote'` (a change from another
tab/window, delivered via BroadcastChannel or a native `storage` event), or
`'sync'` (reserved) — not a tab/window identifier. There is no `type` field;
filter inside the callback on `change.key` and the presence of
`newValue`/`oldValue`.

### StorageCapabilities

```typescript
interface StorageCapabilities {
  persistent: boolean;
  synchronous: boolean;
  observable: boolean;
  transactional: boolean;
  queryable: boolean;
  maxSize: number; // bytes, -1 for unlimited
  binary: boolean;
  encrypted: boolean;
  crossTab: boolean;
}
```

Storage adapter capabilities.

## Operation Types

### ClearOptions

```typescript
interface ClearOptions {
  pattern?: string | RegExp;
  prefix?: string;
  tags?: string[];
  expiredOnly?: boolean;
  olderThan?: Date | number;
  namespace?: string;
}
```

Options for clearing storage.

### SizeInfo

```typescript
interface SizeInfo {
  total: number;
  count: number;
  byStorage?: Record<StorageType, number>;
  byKey?: Record<string, number>;
}
```

Storage size information.

### ExportOptions

```typescript
interface ExportOptions {
  format?: ExportFormat;
  includeMetadata?: boolean;
  keys?: string[];
  storage?: StorageType;
  pretty?: boolean;
}
```

Options for exporting data.

### ImportOptions

```typescript
interface ImportOptions {
  format?: ExportFormat;
  storage?: StorageType;
  overwrite?: boolean;
  merge?: 'replace' | 'deep' | 'shallow';
}
```

Options for importing data.

### ExportFormat

```typescript
type ExportFormat = 'json';
```

Supported export format. JSON is the only implemented format.

## Query Types

### QueryCondition

```typescript
type QueryCondition = {
  [key: string]: unknown | QueryOperators;
};
```

A query is a map of field paths (e.g. `value`, `tags`, `metadata.role`,
`created`) to either a literal (matched with `$eq`) or a `QueryOperators` object.

```typescript
// examples
{ value: 42 }                       // value === 42
{ 'metadata.role': { $in: ['admin', 'owner'] } }
{ created: { $gte: Date.now() - 86400000 } }
```

### QueryOperators

```typescript
interface QueryOperators {
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
```

These 14 operators are the complete supported set. There are no
`$startsWith` / `$contains` / `$containsAny` / `$containsAll` operators — use
`$regex` for prefix/substring matches (e.g. `{ $regex: '^prefix' }`) and `$in`
for membership.

### QueryOptions

```typescript
interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: string | { [field: string]: 1 | -1 };
  select?: string[];
}
```

Result shaping applied by `query()` after matching.

## Adapter Types

### StorageAdapter

```typescript
interface StorageAdapter {
  readonly name: StorageType;
  readonly capabilities: StorageCapabilities;
  
  initialize(config?: unknown): Promise<void>;
  isAvailable(): Promise<boolean>;
  
  get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
  set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(options?: ClearOptions): Promise<void>;
  keys(pattern?: string | RegExp): Promise<string[]>;
  size(detailed?: boolean): Promise<SizeInfo>;
  
  subscribe(callback: SubscriptionCallback): UnsubscribeFunction;
  close(): Promise<void>;
  transaction?(): Promise<Transaction>;
  query?<T = unknown>(
    condition: QueryCondition
  ): Promise<Array<{ key: string; value: T }>>;
}
```

Storage adapter interface.

### Transaction

```typescript
interface Transaction {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

Transaction interface for atomic operations. Obtain one via the adapter's
optional `transaction(): Promise<Transaction>` method, then `commit()` or
`rollback()`.

## Callback Types

### SubscriptionCallback

```typescript
type SubscriptionCallback = (change: StorageChange) => void;
```

Callback for storage change subscriptions.

### UnsubscribeFunction

```typescript
type UnsubscribeFunction = () => void;
```

Function to unsubscribe from changes.

## Migration Types

### Migration

```typescript
interface Migration {
  version: number;
  description?: string;
  up: (adapter: StorageAdapter) => Promise<void>;
  down?: (adapter: StorageAdapter) => Promise<void>;
}
```

Migration definition structure. Migrations run against a `StorageAdapter` via
`MigrationManager` (experimental, adapter-level).

## Error Types

See [Error Classes](./errors.md) for error type definitions.

## Next Steps

- Learn about [Error Classes](./errors.md)
- Explore [Storage Adapters](../adapters/README.md)
- Read the [API Reference](../README.md)