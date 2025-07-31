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
| [Preferences](./capacitor/preferences.md) | Mobile | ✅ Yes | ~1MB | 🚀 Fast | App settings |
| [SQLite](./capacitor/sqlite.md) | Mobile | ✅ Yes | Unlimited | ⚡ Fast | Structured data |
| [Secure](./capacitor/secure.md) | Mobile | ✅ Yes | ~5MB | 🔒 Secure | Sensitive data |
| [Filesystem](./capacitor/filesystem.md) | Mobile | ✅ Yes | Unlimited | 📁 Variable | Large files |

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
  persistent: boolean;      // Survives browser/app restart
  synchronous: boolean;     // Supports sync operations
  observable: boolean;      // Supports change subscriptions
  searchable: boolean;      // Supports queries
  iterable: boolean;        // Can iterate all items
  capacity: 'small' | 'medium' | 'large' | 'unlimited';
  performance: 'slow' | 'medium' | 'fast';
  ttlSupport: boolean;      // Native TTL support
  batchSupport: boolean;    // Batch operations
  transactionSupport: boolean; // ACID transactions
}
```

### Checking Capabilities

```typescript
// Get capabilities for a specific adapter
const capabilities = storage.getCapabilities('indexedDB');
console.log('Supports transactions:', capabilities.transactionSupport);

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

## Mobile Adapters (Capacitor)

### [Preferences Adapter](./capacitor/preferences.md)
- Native preferences APIs
- UserDefaults (iOS) / SharedPreferences (Android)
- Key-value storage
- App settings and small data

### [SQLite Adapter](./capacitor/sqlite.md)
- SQLite database
- Full SQL support
- Unlimited capacity
- Complex queries and relationships

### [Secure Adapter](./capacitor/secure.md)
- Keychain (iOS) / EncryptedSharedPreferences (Android)
- Hardware-backed encryption
- Biometric protection support
- Sensitive data storage

### [Filesystem Adapter](./capacitor/filesystem.md)
- Native file system
- Large file support
- Directory structure
- Binary data support

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
    searchable: false,
    iterable: true,
    capacity: 'medium',
    performance: 'fast',
    ttlSupport: false,
    batchSupport: false,
    transactionSupport: false
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