# Strata Class API

The main class for interacting with Strata Storage.

## Constructor

```typescript
new Strata(config?: StrataConfig)
```

Creates a new Strata instance with optional configuration.

### Parameters

- `config` (optional): Configuration object. See [StrataConfig](./types.md#strataconfig)

### Example

```typescript
import { Strata } from 'strata-storage';

// Default configuration
const storage = new Strata();

// Custom configuration
const storage = new Strata({
  defaultStorages: ['indexedDB', 'localStorage'],
  encryption: { enabled: true, password: 'secret' },
  compression: { enabled: true }
});
```

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

// Clear with filters
await storage.clear({
  filter: (key) => key.startsWith('temp_'),
  olderThan: Date.now() - 86400000 // 24 hours
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
  options?: StorageOptions
): Promise<Array<{ key: string; value: T }>>
```

Queries storage with advanced conditions.

#### Parameters
- `condition`: Query conditions
- `options` (optional): Storage options

#### Returns
Array of matching key-value pairs

#### Example
```typescript
// Query by tags
const important = await storage.query({
  tags: { contains: 'important' }
});

// Query by date range
const recent = await storage.query({
  created: { 
    after: new Date('2024-01-01'),
    before: new Date('2024-12-31')
  }
});

// Complex query
const results = await storage.query({
  $and: [
    { tags: { contains: 'work' } },
    { metadata: { status: 'active' } },
    { expires: { after: Date.now() } }
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

## Static Methods

### createStrata()

```typescript
function createStrata(config?: StrataConfig): Strata
```

Factory function to create a new Strata instance.

#### Example
```typescript
import { createStrata } from 'strata-storage';

const storage = createStrata({
  encryption: { enabled: true }
});
```

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