# Strata Class API

The main class for interacting with Strata Storage.

## Creating an instance

There are three ways to get a working storage instance. Most apps should use `defineStorage()` or the default `storage` singleton — both register the standard web adapters and initialize lazily on first use, so you never have to call `initialize()` yourself.

### `defineStorage(config?)` — recommended

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage({
  defaultStorages: ['indexedDB', 'localStorage'],
});
```

Returns a ready-to-use `Strata` instance with memory, `localStorage`, `sessionStorage`, IndexedDB, cookies, and the Cache API pre-registered — the framework-agnostic, Zustand-style entry point. Create it once anywhere and import it everywhere; no Provider is required. It initializes lazily (every operation awaits readiness internally), so you can call `get`/`set`/`subscribe` immediately.

### Default `storage` singleton

```typescript
import { storage } from 'strata-storage';

await storage.set('key', 'value'); // works immediately
```

Built from the same factory as `defineStorage()`. Importing the package performs no I/O — initialization happens on first use. `ensureInitialized()` is exported if you want to force readiness before a burst of calls (it is optional and idempotent).

### `new Strata(config?)` — manual

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({ defaultStorages: ['indexedDB', 'localStorage'] });
// You register adapters yourself, then call initialize().
storage.registerAdapter(/* ... */);
await storage.initialize();
```

Use the constructor directly when you want full control over which adapters are registered. `registerWebAdapters(strata)` is exported to register the same default web set on a custom instance.

#### Parameters

- `config` (optional): Configuration object. See [StrataConfig](./types.md#strataconfig). New `2.5.0` recovery fields (`integrity`, `durableWrites`, `mirror`, `autoBackup`) are documented in [Recovery & Integrity](../features/recovery.md).

## Methods

### initialize()

```typescript
async initialize(): Promise<void>
```

Initializes the storage system. Must be called before any other operations.

```typescript
const storage = new Strata();
await storage.initialize();
```

### get()

```typescript
async get<T = unknown>(key: string, options?: StorageOptions): Promise<T | null>
```

Retrieves a value from storage.

#### Parameters
- `key`: The key to retrieve
- `options` (optional): Storage options

#### Returns
The stored value or `null` if not found

#### Example
```typescript
// Simple get
const value = await storage.get('username');

// With type
const user = await storage.get<User>('currentUser');

// With options
const data = await storage.get('data', { 
  storage: 'indexedDB',
  skipDecryption: false 
});
```

### set()

```typescript
async set<T = unknown>(
  key: string, 
  value: T, 
  options?: StorageOptions
): Promise<void>
```

Stores a value in storage.

#### Parameters
- `key`: The key to store under
- `value`: The value to store
- `options` (optional): Storage options

#### Example
```typescript
// Simple set
await storage.set('username', 'john_doe');

// With options
await storage.set('userData', data, {
  storage: 'secure',
  encrypt: true,
  compress: true,
  ttl: 3600000, // 1 hour
  tags: ['user', 'profile']
});
```

### remove()

```typescript
async remove(key: string, options?: StorageOptions): Promise<void>
```

Removes a value from storage.

#### Parameters
- `key`: The key to remove
- `options` (optional): Storage options

#### Example
```typescript
await storage.remove('tempData');
await storage.remove('userData', { storage: 'secure' });
```

### has()

```typescript
async has(key: string, options?: StorageOptions): Promise<boolean>
```

Checks if a key exists in storage.

#### Parameters
- `key`: The key to check
- `options` (optional): Storage options

#### Returns
`true` if the key exists, `false` otherwise

#### Example
```typescript
if (await storage.has('authToken')) {
  // User is authenticated
}
```

### clear()

```typescript
async clear(options?: ClearOptions & StorageOptions): Promise<void>
```

Clears storage data.

#### Parameters
- `options` (optional): Clear and storage options

#### Example
```typescript
// Clear all storage
await storage.clear();

// Clear specific storage
await storage.clear({ storage: 'localStorage' });

// Clear with filters (ClearOptions: storage, namespace, prefix, pattern, tags, olderThan, expiredOnly)
await storage.clear({
  prefix: 'temp_',                  // only keys starting with 'temp_'
  olderThan: Date.now() - 86400000  // and created over 24 hours ago
});
```

### keys()

```typescript
async keys(
  pattern?: string | RegExp, 
  options?: StorageOptions
): Promise<string[]>
```

Gets all keys, optionally filtered by pattern.

#### Parameters
- `pattern` (optional): String or RegExp pattern to filter keys
- `options` (optional): Storage options

#### Returns
Array of matching keys

#### Example
```typescript
// Get all keys
const allKeys = await storage.keys();

// Filter by prefix
const userKeys = await storage.keys('user_');

// Filter by regex
const tempKeys = await storage.keys(/^temp_.*$/);
```

## Synchronous API

For UI code that must read or write without `await`, Strata mirrors the core operations synchronously. Added in `2.5.0`.

```typescript
getSync<T = unknown>(key: string, options?: StorageOptions): T | null
setSync<T = unknown>(key: string, value: T, options?: StorageOptions): void
removeSync(key: string, options?: StorageOptions): void
hasSync(key: string, options?: StorageOptions): boolean
keysSync(pattern?: string | RegExp, options?: StorageOptions): string[]
clearSync(options?: ClearOptions & StorageOptions): void
```

These work only on synchronous adapters: **`memory`, `localStorage`, `sessionStorage`, `cookies`, and `url`**. With no explicit `storage`, `keysSync`/`clearSync` aggregate across the sync-capable adapters. The lookup falls back to the registry, so sync calls work even before async `initialize()` has completed.

```typescript
storage.setSync('lastTab', 'inbox');
const tab = storage.getSync<string>('lastTab'); // 'inbox'
storage.setSync('filters', { status: 'open' }, { storage: 'localStorage', ttl: 60_000 });
storage.keysSync();      // string[] across memory/localStorage/sessionStorage/cookies/url
storage.clearSync();
```

#### Constraints

- Targeting an async-only adapter (`indexedDB`, `cache`, `sqlite`, `filesystem`, `secure`, `preferences`) throws a `StorageError` — use the async API instead.
- `setSync` with `{ encrypt: true }` or `{ compress: true }` throws: encryption and compression are inherently asynchronous. Use `await storage.set(...)`.
- `getSync` on a value that was stored encrypted or compressed throws. Read it with `await storage.get(...)`.
- TTL, tags, and metadata are supported by the synchronous API.

### size()

```typescript
async size(detailed?: boolean): Promise<SizeInfo>
```

Gets storage size information.

#### Parameters
- `detailed` (optional): Include detailed breakdown

#### Returns
Size information object

#### Example
```typescript
const size = await storage.size();
console.log(`Total: ${size.total} bytes, Items: ${size.count}`);

const detailed = await storage.size(true);
console.log('By storage:', detailed.byStorage);
```

### query()

```typescript
async query<T = unknown>(
  condition: QueryCondition,
  options?: StorageOptions & QueryOptions
): Promise<Array<{ key: string; value: T }>>
```

Queries storage with advanced conditions. Conditions match the **decoded value** using **bare field names** (e.g. `{ age: { $gte: 18 } }`); wrapper fields like `key`, `tags`, `created`, and `expires` are **not** queryable. See the [Query API](../features/query.md) for the full model and operators (`$eq $ne $gt $gte $lt $lte $in $nin $regex $exists $type $and $or $not`).

#### Parameters
- `condition`: Query conditions matched against the stored value
- `options` (optional): Storage options plus query options (`sort`, `skip`, `limit`, `select`)

#### Returns
Array of matching key-value pairs

#### Example
```typescript
// Query by a value field
const admins = await storage.query({
  role: 'admin'
});

// Range query on a value field
const adults = await storage.query({
  age: { $gte: 18 }
});

// Complex query — bare value fields + logical operators
const results = await storage.query({
  $and: [
    { status: 'active' },
    { score: { $gte: 10 } }
  ]
});
```

### subscribe()

```typescript
subscribe(
  callback: SubscriptionCallback,
  options?: StorageOptions
): UnsubscribeFunction
```

Subscribes to storage changes.

#### Parameters
- `callback`: Function called on storage changes
- `options` (optional): Storage options

#### Returns
Function to unsubscribe

#### Example
```typescript
const unsubscribe = storage.subscribe((change) => {
  console.log(`Key ${change.key} changed`);
  console.log('Old value:', change.oldValue);
  console.log('New value:', change.newValue);
});

// Later...
unsubscribe();
```

### export()

```typescript
async export(options?: ExportOptions): Promise<string>
```

Exports storage data.

#### Parameters
- `options` (optional): Export options

#### Returns
Exported data as string

#### Example
```typescript
// Export all data
const backup = await storage.export();

// Export specific keys
const userData = await storage.export({
  keys: ['user', 'preferences', 'settings'],
  format: 'json',
  pretty: true
});
```

### import()

```typescript
async import(data: string, options?: ImportOptions): Promise<void>
```

Imports storage data.

#### Parameters
- `data`: Data to import
- `options` (optional): Import options

#### Example
```typescript
// Import with overwrite
await storage.import(backupData, {
  format: 'json',
  overwrite: true
});

// Import with merge
await storage.import(partialData, {
  merge: 'shallow'
});
```

### snapshot()

```typescript
async snapshot(options?: ExportOptions): Promise<string>
```

Creates a portable, integrity-verified backup of all stored data. Added in `2.5.0`. The returned string embeds a manifest (version, timestamp, FNV-1a checksum, and the full export including metadata) so [`restore()`](#restore) can detect a corrupted backup. Pair with `config.autoBackup` for scheduled snapshots.

#### Returns
A JSON string containing the checksum manifest and payload.

#### Example
```typescript
const backup = await storage.snapshot();
// Persist `backup` to a file, server, or another storage type.
```

### restore()

```typescript
async restore(snapshot: string, options?: ImportOptions): Promise<void>
```

Restores data from a [`snapshot()`](#snapshot) string. Added in `2.5.0`. Validates the manifest checksum and throws `IntegrityError` if the backup is corrupted. A plain export string (no manifest) is also accepted and imported directly. Snapshot payloads are written back with their full value wrappers intact, preserving TTL, tags, encryption flags, and checksums.

#### Parameters
- `snapshot`: A string produced by `snapshot()` (or a raw `export()` string)
- `options` (optional): Import options

#### Example
```typescript
try {
  await storage.restore(backup);
} catch (error) {
  if (error instanceof IntegrityError) {
    // The backup is corrupted — checksum mismatch.
  }
}
```

See [Recovery & Integrity](../features/recovery.md) for the full recovery toolkit (integrity, durable writes, mirroring, auto-backup).

### getTTL()

```typescript
async getTTL(key: string, options?: StorageOptions): Promise<number | null>
```

Gets time-to-live for a key.

#### Parameters
- `key`: The key to check
- `options` (optional): Storage options

#### Returns
Milliseconds until expiration or `null` if no TTL

#### Example
```typescript
const ttl = await storage.getTTL('sessionToken');
if (ttl && ttl < 60000) {
  // Token expires in less than 1 minute
  await refreshToken();
}
```

### extendTTL()

```typescript
async extendTTL(
  key: string,
  extension: number,
  options?: StorageOptions
): Promise<void>
```

Extends the TTL of a key.

#### Parameters
- `key`: The key to extend
- `extension`: Milliseconds to add to current TTL
- `options` (optional): Storage options

#### Example
```typescript
// Extend by 1 hour
await storage.extendTTL('session', 3600000);
```

### persist()

```typescript
async persist(key: string, options?: StorageOptions): Promise<void>
```

Makes a key persistent (removes TTL).

#### Parameters
- `key`: The key to persist
- `options` (optional): Storage options

#### Example
```typescript
await storage.persist('importantData');
```

### getExpiring()

```typescript
async getExpiring(
  timeWindow: number,
  options?: StorageOptions
): Promise<Array<{ key: string; expiresIn: number }>>
```

Gets items expiring within a time window.

#### Parameters
- `timeWindow`: Milliseconds to look ahead
- `options` (optional): Storage options

#### Returns
Array of expiring items

#### Example
```typescript
// Get items expiring in next hour
const expiring = await storage.getExpiring(3600000);
for (const item of expiring) {
  console.log(`${item.key} expires in ${item.expiresIn}ms`);
}
```

### cleanupExpired()

```typescript
async cleanupExpired(options?: StorageOptions): Promise<number>
```

Manually triggers cleanup of expired items.

#### Parameters
- `options` (optional): Storage options

#### Returns
Number of items removed

#### Example
```typescript
const removed = await storage.cleanupExpired();
console.log(`Cleaned up ${removed} expired items`);
```

### generatePassword()

```typescript
generatePassword(length?: number): string
```

Generates a secure random password.

#### Parameters
- `length` (optional): Password length (default: 32)

#### Returns
Generated password

#### Example
```typescript
const password = storage.generatePassword(16);
```

### hash()

```typescript
async hash(data: string): Promise<string>
```

Hashes data using SHA-256.

#### Parameters
- `data`: Data to hash

#### Returns
Hex-encoded hash

#### Example
```typescript
const hash = await storage.hash('sensitive-data');
```

### getAvailableStorageTypes()

```typescript
getAvailableStorageTypes(): StorageType[]
```

Gets list of available storage types.

#### Returns
Array of available storage type names

#### Example
```typescript
const types = storage.getAvailableStorageTypes();
// ['indexedDB', 'localStorage', 'sessionStorage', 'memory']
```

### getCapabilities()

```typescript
getCapabilities(storage?: StorageType): StorageCapabilities | Record<string, StorageCapabilities>
```

Gets capabilities of storage adapters.

#### Parameters
- `storage` (optional): Specific storage type

#### Returns
Capabilities object or map of all capabilities

#### Example
```typescript
// Get specific adapter capabilities
const indexedDBCaps = storage.getCapabilities('indexedDB');

// Get all capabilities
const allCaps = storage.getCapabilities();
```

### close()

```typescript
async close(): Promise<void>
```

Closes all storage connections and cleans up resources.

#### Example
```typescript
// Clean shutdown
await storage.close();
```

## Factory functions

These are module-level exports (not static methods on the class).

### defineStorage()

```typescript
function defineStorage(config?: StrataConfig): Strata
```

Creates a `Strata` instance with the standard web adapters pre-registered. The recommended entry point — see [Creating an instance](#creating-an-instance).

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage({ encryption: { enabled: true, password: '…' } });
```

### registerWebAdapters()

```typescript
function registerWebAdapters(strata: Strata): Strata
```

Registers memory, `localStorage`, `sessionStorage`, IndexedDB, cookies, and Cache API adapters on an existing instance and returns it for chaining. Used internally by `defineStorage()`; call it directly to add the default web set to a `new Strata(...)` you configured yourself.

### ensureInitialized()

```typescript
function ensureInitialized(): Promise<void>
```

Forces initialization of the default `storage` singleton and awaits readiness. Optional (every operation auto-awaits readiness) and idempotent.

## Events

The Strata class emits events through the subscription system:

- `set` - When a value is set
- `remove` - When a value is removed  
- `clear` - When storage is cleared
- `expire` - When an item expires

## Error Handling

All async methods can throw errors. See [Error Classes](./errors.md) for details.

```typescript
import { StorageError, QuotaExceededError } from 'strata-storage';

try {
  await storage.set('data', largeData);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Handle quota exceeded
  } else if (error instanceof StorageError) {
    // Handle other storage errors
  }
}
```

## Next Steps

- Learn about [Storage Options](./types.md#storageoptions)
- Explore [Storage Adapters](../adapters/README.md)
- Read about [Error Handling](./errors.md)