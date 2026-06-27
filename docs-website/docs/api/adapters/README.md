# Storage Adapters

Strata Storage provides multiple storage adapters to work across different platforms and use cases.

## Adapter Overview

| Adapter | Platform | Persistence | Capacity | Performance | Best For |
|---------|----------|-------------|----------|-------------|----------|
| [Memory](./web/memory.md) | All | ❌ No | ~50MB | ⚡ Fast | Temporary data, caching |
| [LocalStorage](./web/localstorage.md) | Web | ✅ Yes | ~10MB | 🚀 Fast | Small persistent data |
| [SessionStorage](./web/sessionstorage.md) | Web | 🔄 Session | ~10MB | 🚀 Fast | Session data |
| [IndexedDB](./web/indexeddb.md) | Web | ✅ Yes | ~1GB+ | ⚡ Fast | Large datasets |
| [Cookies](./web/cookies.md) | Web | ✅ Yes | ~4KB | 🐌 Slow | Small server-shared data |
| [Cache](./web/cache.md) | Web | ✅ Yes | ~500MB+ | ⚡ Fast | Offline resources |
| [URL](./web/url.md) | Web | ❌ No | ~2KB | 🚀 Fast | Shareable, reload-surviving UI state |
| [Preferences](./capacitor/preferences.md) | Mobile | ✅ Yes | ~1MB | 🚀 Fast | App settings |
| [SQLite](./capacitor/sqlite.md) | iOS/Android | ✅ Yes | Unlimited | ⚡ Fast | Structured data, multi-store isolation (v2.6.0) |
| [Secure](./capacitor/secure.md) | Mobile | ✅ Yes | ~5MB | 🔒 Secure | Sensitive data |
| [Filesystem](./capacitor/filesystem.md) | iOS/Android | ✅ Yes | Device storage | 📁 Variable (file I/O) | Large or document-shaped values (v2.6.0: native backend added) |

### Remote / sync adapters (opt-in)

These are not auto-selected; you register them explicitly (via
[`enableFirebaseSync`](../../guides/platforms/firebase.md)) and target them with
`{ storage: '...' }`. `firebase` is an optional peer dependency.

| Adapter | Backend | Observable | Queryable | Best For |
|---------|---------|------------|-----------|----------|
| `firestore` | [Firebase](../../guides/platforms/firebase.md) Cloud Firestore | ✅ | ✅ | Cross-device/user document sync |
| `realtime` | [Firebase](../../guides/platforms/firebase.md) Realtime Database | ✅ | ❌ | Low-latency shared state |

## Adapter Selection

Strata automatically selects the best available adapter based on:

1. **Platform** - Web, iOS, Android, or Node.js
2. **Availability** - Whether the adapter is supported
3. **Configuration** - Your specified preferences
4. **Strategy** - Performance, reliability, or capacity first

### Automatic Selection

```typescript
// Strata will automatically choose the best adapter
const storage = new Strata();
await storage.initialize();

// Will use IndexedDB on web, SQLite on mobile
await storage.set('data', largeObject);
```

### Manual Selection

```typescript
// Force specific storage adapter
await storage.set('data', value, { 
  storage: 'localStorage' 
});

// Try multiple adapters in order
await storage.set('data', value, { 
  storage: ['secure', 'preferences', 'memory'] 
});
```

## Adapter Capabilities

Each adapter has different capabilities:

```typescript
interface StorageCapabilities {
  persistent: boolean;      // Survives across sessions
  synchronous: boolean;     // Supports synchronous operations
  observable: boolean;      // Supports subscriptions/watching
  transactional: boolean;   // Supports transactions
  queryable: boolean;       // Supports querying
  maxSize: number;          // Maximum storage size (bytes, -1 for unlimited)
  binary: boolean;          // Supports binary data
  encrypted: boolean;       // Supports encryption
  crossTab: boolean;        // Cross-tab/window support
}
```

### Checking Capabilities

```typescript
// Get capabilities for a specific adapter
const capabilities = storage.getCapabilities('indexedDB');
console.log('Supports transactions:', capabilities.transactional);

// Get all adapter capabilities
const allCapabilities = storage.getCapabilities();
```

## Web Adapters

### [Memory Adapter](./web/memory.md)
- In-memory storage using Map
- Fastest performance
- No persistence
- Perfect for temporary data

### [LocalStorage Adapter](./web/localstorage.md)
- Browser's localStorage API
- Synchronous operations
- ~10MB capacity
- Domain-specific persistence

### [SessionStorage Adapter](./web/sessionstorage.md)
- Browser's sessionStorage API
- Session-based persistence
- ~10MB capacity
- Tab-specific storage

### [IndexedDB Adapter](./web/indexeddb.md)
- Browser's IndexedDB API
- Asynchronous operations
- Large capacity (GB+)
- Supports transactions and indexes

### [Cookie Adapter](./web/cookies.md)
- HTTP cookies
- Server-accessible
- ~4KB per cookie
- Cross-subdomain support

### [Cache Adapter](./web/cache.md)
- Service Worker Cache API
- Network request caching
- Large capacity
- Offline support

### [URL Adapter](./web/url.md)
- Stores state in the page URL (query or hash)
- Synchronous; emits change events on navigation
- Shareable and reload-surviving
- For small UI state only (~2KB), browser-only, not durable

## Mobile Adapters (Capacitor)

### [Preferences Adapter](./capacitor/preferences.md)
- Native preferences APIs
- UserDefaults (iOS) / SharedPreferences (Android)
- Key-value storage
- App settings and small data

### [SQLite Adapter](./capacitor/sqlite.md)
- SQLite database on iOS (SQLite3) and Android (SQLiteDatabase)
- Full SQL support; complex queries and indexed fields
- **Multi-store (v2.6.0):** `database` and `table` options now route to distinct physical database files/tables on iOS and Android; separate `defineStorage` instances with different `database`/`table` values are fully isolated
- `size(true)` returns `{ keys, values, metadata }` byte breakdown (v2.6.0)
- Full `StorageValue` wrapper (TTL, tags, metadata) round-trips correctly through native `get`/`set` (fixed in v2.6.0)
- Pending on-device verification for v2.6.0 changes; see [device-verification guide](../../guides/platforms/device-verification.md)

### [Secure Adapter](./capacitor/secure.md)
- Keychain (iOS) / EncryptedSharedPreferences (Android)
- Hardware-backed encryption
- Biometric protection support
- Sensitive data storage

### [Filesystem Adapter](./capacitor/filesystem.md)
- Native file system (iOS `NSDocumentsDirectory`, Android `getFilesDir()`)
- One JSON file per key under `strata_storage/`, atomic writes via staging rename
- `isAvailable()` returns `true` on iOS/Android; `false` in browser
- `size(true)` returns `{ keys, values, metadata }` byte breakdown
- **v2.6.0:** native backend added — previously unavailable on all platforms
- Pending on-device verification; see [device-verification guide](../../guides/platforms/device-verification.md)

## Custom Adapters

You can create custom adapters by extending the BaseAdapter:

```typescript
import { BaseAdapter, StorageValue, StorageCapabilities } from 'strata-storage';

export class CustomAdapter extends BaseAdapter {
  readonly name = 'custom' as const;
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: false,
    observable: true,
    transactional: false,
    queryable: false,
    maxSize: -1,
    binary: false,
    encrypted: false,
    crossTab: false
  };

  async initialize(config?: unknown): Promise<void> {
    // Initialize your adapter
  }

  async isAvailable(): Promise<boolean> {
    // Check if adapter can be used
    return true;
  }

  async get<T>(key: string): Promise<StorageValue<T> | null> {
    // Implement get logic
  }

  async set<T>(key: string, value: StorageValue<T>): Promise<void> {
    // Implement set logic
  }

  // ... implement other required methods
}
```

### Registering Custom Adapter

```typescript
import { AdapterRegistry } from 'strata-storage';

const registry = new AdapterRegistry();
registry.register(new CustomAdapter());
```

## Adapter-Specific Configuration

Each adapter can have specific configuration:

```typescript
const storage = new Strata({
  adapters: {
    indexedDB: {
      name: 'MyAppDB',
      version: 1,
      stores: ['data', 'cache']
    },
    localStorage: {
      prefix: 'myapp_'
    },
    cookies: {
      domain: '.example.com',
      secure: true
    },
    sqlite: {
      database: 'app.db',
      version: '1.0'
    }
  }
});
```

## Performance Comparison

| Operation | Memory | LocalStorage | IndexedDB | SQLite |
|-----------|--------|--------------|-----------|---------|
| Write 1KB | <1ms | 2-5ms | 5-10ms | 5-15ms |
| Read 1KB | <1ms | 1-2ms | 5-10ms | 5-15ms |
| Write 1MB | 1ms | 20-50ms | 10-20ms | 20-30ms |
| Read 1MB | <1ms | 10-20ms | 10-20ms | 15-25ms |
| Query 1000 items | 1-2ms | N/A | 10-20ms | 5-10ms |

## Storage Limits

| Adapter | Limit per Item | Total Limit | Notes |
|---------|----------------|-------------|--------|
| Memory | No limit | ~50-100MB | Limited by available RAM |
| LocalStorage | No limit | ~10MB | Varies by browser |
| SessionStorage | No limit | ~10MB | Per tab/window |
| IndexedDB | No limit | 50%+ disk | Browser specific |
| Cookies | 4KB | 50 cookies | Per domain |
| Cache | No limit | Varies | Based on available space |
| Preferences | 1MB | ~5MB | Platform specific |
| SQLite | No limit | Unlimited | Limited by device storage |
| Secure | 5KB | ~5MB | Platform specific |
| Filesystem | No limit | Unlimited | Limited by device storage |

## Best Practices

### 1. Choose the Right Adapter

```typescript
// User preferences - use secure storage
await storage.set('apiKey', key, { storage: 'secure' });

// Large datasets - use IndexedDB or SQLite
await storage.set('dataset', data, { storage: ['sqlite', 'indexedDB'] });

// Temporary data - use memory
await storage.set('cache', data, { storage: 'memory' });

// Session data - use sessionStorage
await storage.set('session', data, { storage: 'sessionStorage' });
```

### 2. Handle Adapter Failures

```typescript
// Fallback chain
const fallbackStorages: StorageType[] = ['indexedDB', 'localStorage', 'memory'];

try {
  await storage.set('data', value, { storage: fallbackStorages });
} catch (error) {
  console.error('All storage adapters failed');
}
```

### 3. Optimize for Platform

```typescript
// Platform-specific optimization
const storage = new Strata({
  defaultStorages: isWeb() 
    ? ['indexedDB', 'localStorage'] 
    : ['sqlite', 'preferences']
});
```

## Next Steps

- Learn about specific [Web Adapters](./web/memory.md)
- Explore [Mobile Adapters](./capacitor/preferences.md)
- Read about [Creating Custom Adapters](../../guides/advanced/custom-adapters.md)