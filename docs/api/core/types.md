# Type Definitions

Complete TypeScript type definitions for Strata Storage.

## Core Types

### Platform

```typescript
type Platform = 'web' | 'ios' | 'android' | 'node';
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
  | 'preferences'
  | 'sqlite'
  | 'secure'
  | 'filesystem';
```

Available storage adapter types.

### StorageStrategy

```typescript
enum StorageStrategy {
  PERFORMANCE_FIRST = 'performance_first',
  RELIABILITY_FIRST = 'reliability_first',
  CAPACITY_FIRST = 'capacity_first'
}
```

Storage selection strategies.

## Configuration Types

### StrataConfig

```typescript
interface StrataConfig {
  platform?: Platform;
  defaultStorages?: StorageType[];
  strategy?: StorageStrategy;
  adapters?: {
    [K in StorageType]?: Record<string, unknown>;
  };
  encryption?: EncryptionConfig;
  compression?: CompressionConfig;
  sync?: SyncConfig;
  ttl?: TTLConfig;
}
```

Main configuration interface for Strata.

### EncryptionConfig

```typescript
interface EncryptionConfig {
  enabled?: boolean;
  password?: string;
  algorithm?: 'AES-GCM' | 'AES-CBC';
  keyDerivation?: 'PBKDF2' | 'scrypt';
  iterations?: number;
  saltLength?: number;
  ivLength?: number;
  tagLength?: number;
}
```

Encryption configuration options.

### CompressionConfig

```typescript
interface CompressionConfig {
  enabled?: boolean;
  algorithm?: 'lz' | 'gzip';
  threshold?: number;
  level?: number;
}
```

Compression configuration options.

### SyncConfig

```typescript
interface SyncConfig {
  enabled?: boolean;
  channelName?: string;
  storages?: StorageType[];
  conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
  debounceMs?: number;
}
```

Synchronization configuration options.

### TTLConfig

```typescript
interface TTLConfig {
  enabled?: boolean;
  defaultTTL?: number;
  checkInterval?: number;
  autoCleanup?: boolean;
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
  type: 'set' | 'remove' | 'clear';
  key: string;
  oldValue?: T;
  newValue?: T;
  storage: StorageType;
  timestamp: number;
  source?: 'local' | 'remote';
}
```

Storage change event structure.

### StorageCapabilities

```typescript
interface StorageCapabilities {
  persistent: boolean;
  synchronous: boolean;
  observable: boolean;
  searchable: boolean;
  iterable: boolean;
  capacity: 'small' | 'medium' | 'large' | 'unlimited';
  performance: 'slow' | 'medium' | 'fast';
  ttlSupport: boolean;
  batchSupport: boolean;
  transactionSupport: boolean;
}
```

Storage adapter capabilities.

## Operation Types

### ClearOptions

```typescript
interface ClearOptions {
  filter?: (key: string, value: StorageValue) => boolean;
  olderThan?: number | Date;
  newerThan?: number | Date;
  withTags?: string[];
  withoutTags?: string[];
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
  keys?: string[];
  filter?: (key: string, value: unknown) => boolean;
  includeMetadata?: boolean;
  pretty?: boolean;
}
```

Options for exporting data.

### ImportOptions

```typescript
interface ImportOptions {
  format?: ExportFormat;
  overwrite?: boolean;
  merge?: 'shallow' | 'deep';
  prefix?: string;
  transform?: (key: string, value: unknown) => [string, unknown];
}
```

Options for importing data.

### ExportFormat

```typescript
type ExportFormat = 'json' | 'csv' | 'sql';
```

Supported export formats.

## Query Types

### QueryCondition

```typescript
interface QueryCondition {
  key?: StringMatcher;
  value?: ValueMatcher;
  tags?: ArrayMatcher<string>;
  metadata?: ObjectMatcher;
  created?: DateMatcher;
  updated?: DateMatcher;
  expires?: DateMatcher;
  size?: NumberMatcher;
  $and?: QueryCondition[];
  $or?: QueryCondition[];
  $not?: QueryCondition;
}
```

Query condition structure.

### QueryOperators

```typescript
interface QueryOperators<T> {
  equals?: T;
  notEquals?: T;
  in?: T[];
  notIn?: T[];
  contains?: T;
  startsWith?: string;
  endsWith?: string;
  matches?: RegExp | string;
  greaterThan?: T;
  greaterThanOrEqual?: T;
  lessThan?: T;
  lessThanOrEqual?: T;
  between?: [T, T];
}
```

Query operators for different types.

### StringMatcher

```typescript
type StringMatcher = string | RegExp | QueryOperators<string>;
```

String matching options.

### NumberMatcher

```typescript
type NumberMatcher = number | QueryOperators<number>;
```

Number matching options.

### DateMatcher

```typescript
type DateMatcher = Date | number | {
  before?: Date | number;
  after?: Date | number;
  between?: [Date | number, Date | number];
};
```

Date matching options.

### ArrayMatcher

```typescript
interface ArrayMatcher<T> {
  contains?: T | T[];
  containsAll?: T[];
  containsAny?: T[];
  isEmpty?: boolean;
  length?: NumberMatcher;
}
```

Array matching options.

### ObjectMatcher

```typescript
type ObjectMatcher = {
  [key: string]: unknown | QueryOperators<unknown>;
};
```

Object matching options.

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
  
  subscribe?(callback: SubscriptionCallback): UnsubscribeFunction;
  close?(): Promise<void>;
  transaction?<T>(
    operations: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
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

Transaction interface for atomic operations.

### TransactionOptions

```typescript
interface TransactionOptions {
  mode?: 'readonly' | 'readwrite';
  durability?: 'default' | 'strict' | 'relaxed';
  timeout?: number;
}
```

Transaction configuration options.

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
  up: (storage: Strata) => Promise<void>;
  down?: (storage: Strata) => Promise<void>;
}
```

Migration definition structure.

## Utility Types

### ValueMatcher

```typescript
type ValueMatcher = 
  | unknown 
  | QueryOperators<unknown> 
  | ((value: unknown) => boolean);
```

Generic value matching type.

### DeepPartial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

Deep partial type helper.

## Error Types

See [Error Classes](./errors.md) for error type definitions.

## Next Steps

- Learn about [Error Classes](./errors.md)
- Explore [Storage Adapters](../adapters/README.md)
- Read the [API Reference](../README.md)