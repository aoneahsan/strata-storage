# API Reference

Complete API documentation for Strata Storage.

## Core API

### [Strata Class](./core/strata.md)
The main class for interacting with storage. Provides methods for all storage operations.

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata(config);
await storage.initialize();
```

### [Type Definitions](./core/types.md)
TypeScript interfaces and type definitions used throughout the library.

### [Error Classes](./core/errors.md)
Custom error classes for better error handling and debugging.

## Storage Adapters

### [Adapter Overview](./adapters/README.md)
Learn about the different storage adapters available and their capabilities.

### Web Adapters
- [Memory Adapter](./adapters/web/memory.md) - In-memory storage
- [LocalStorage Adapter](./adapters/web/localstorage.md) - Persistent browser storage
- [SessionStorage Adapter](./adapters/web/sessionstorage.md) - Session-based storage
- [IndexedDB Adapter](./adapters/web/indexeddb.md) - Large-scale database storage
- [Cookie Adapter](./adapters/web/cookies.md) - HTTP cookie storage
- [Cache Adapter](./adapters/web/cache.md) - Service Worker cache storage

### Capacitor Adapters
- [Preferences Adapter](./adapters/capacitor/preferences.md) - Native preferences
- [SQLite Adapter](./adapters/capacitor/sqlite.md) - SQL database storage
- [Secure Adapter](./adapters/capacitor/secure.md) - Encrypted secure storage
- [Filesystem Adapter](./adapters/capacitor/filesystem.md) - File-based storage

## Features

### [Encryption](./features/encryption.md)
AES-GCM encryption for secure data storage.

```typescript
const encrypted = await encryptionManager.encrypt(data, password);
const decrypted = await encryptionManager.decrypt(encrypted, password);
```

### [Compression](./features/compression.md)
LZ-based compression for efficient storage.

```typescript
const compressed = await compressionManager.compress(data);
const decompressed = await compressionManager.decompress(compressed);
```

### [Synchronization](./features/sync.md)
Cross-tab and cross-window synchronization.

```typescript
storage.subscribe((change) => {
  console.log('Storage changed:', change);
});
```

### [TTL Management](./features/ttl.md)
Time-to-live support with automatic expiration.

```typescript
await storage.set('temp', data, { ttl: 60000 }); // Expires in 1 minute
```

### [Query Engine](./features/query.md)
Advanced querying capabilities for stored data.

```typescript
const results = await storage.query({
  tags: { contains: 'important' },
  created: { after: new Date('2024-01-01') }
});
```

### [Migration Utilities](./features/migration.md)
Tools for migrating data between storage types.

```typescript
const migrator = new MigrationManager(storage);
await migrator.migrate(migrations);
```

## Quick Reference

### Basic Operations

```typescript
// Initialize
const storage = new Strata();
await storage.initialize();

// Set data
await storage.set(key, value, options?);

// Get data
const value = await storage.get(key, options?);

// Remove data
await storage.remove(key, options?);

// Check existence
const exists = await storage.has(key, options?);

// Clear storage
await storage.clear(options?);

// Get all keys
const keys = await storage.keys(pattern?, options?);

// Get size info
const size = await storage.size(detailed?);
```

### Advanced Operations

```typescript
// Query data
const results = await storage.query(condition, options?);

// Subscribe to changes
const unsubscribe = storage.subscribe(callback, options?);

// Export data
const exported = await storage.export(options?);

// Import data
await storage.import(data, options?);

// Get TTL
const ttl = await storage.getTTL(key, options?);

// Extend TTL
await storage.extendTTL(key, extension, options?);

// Make persistent
await storage.persist(key, options?);
```

### Utility Functions

```typescript
// Generate secure password
const password = storage.generatePassword(length?);

// Hash data
const hash = await storage.hash(data);

// Get available storage types
const types = storage.getAvailableStorageTypes();

// Get adapter capabilities
const capabilities = storage.getCapabilities(storage?);
```

## Framework Integration

- [React Hooks](../examples/frameworks/react.md)
- [Vue Composables](../examples/frameworks/vue.md)
- [Angular Services](../examples/frameworks/angular.md)

## Next Steps

- Read the [Strata Class API](./core/strata.md) documentation
- Explore [Storage Adapters](./adapters/README.md)
- Learn about [Advanced Features](./features/encryption.md)