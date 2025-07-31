# IndexedDB Adapter

High-performance browser database for large-scale storage.

## Overview

The IndexedDB adapter provides a powerful, asynchronous, transactional database system in web browsers. Perfect for storing large amounts of structured data.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ✅ Yes |
| Searchable | ✅ Yes (with indexes) |
| Iterable | ✅ Yes |
| Capacity | 1GB+ |
| Performance | ⚡ Fast |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ✅ Yes |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// IndexedDB is often the default for large data
await storage.set('largeDataset', data, { storage: 'indexedDB' });
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    indexedDB: {
      name: 'MyAppDB',
      version: 1,
      stores: {
        data: {
          keyPath: 'id',
          indexes: [
            { name: 'created', keyPath: 'created' },
            { name: 'tags', keyPath: 'tags', multiEntry: true }
          ]
        }
      }
    }
  }
});
```

### Configuration Options

- `name` (string): Database name (default: 'StrataDB')
- `version` (number): Database version for migrations
- `stores` (object): Object store configurations
- `upgrade` (function): Custom upgrade handler

## Features

### Large Capacity

```typescript
// Store megabytes of data
const largeData = new ArrayBuffer(50 * 1024 * 1024); // 50MB
await storage.set('binaryData', largeData, { 
  storage: 'indexedDB' 
});

// Store thousands of objects
const dataset = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  data: generateData()
}));

await storage.set('dataset', dataset, { 
  storage: 'indexedDB' 
});
```

### Transactions

```typescript
// Full ACID transaction support
await storage.transaction(async (tx) => {
  const current = await tx.get('balance');
  const updated = current - 100;
  
  if (updated < 0) {
    throw new Error('Insufficient funds');
  }
  
  await tx.set('balance', updated);
  await tx.set('lastTransaction', {
    amount: 100,
    timestamp: Date.now()
  });
}, { storage: 'indexedDB' });
```

### Advanced Queries

```typescript
// Query with indexes
const results = await storage.query({
  created: { 
    between: [startDate, endDate] 
  },
  tags: { 
    contains: 'important' 
  }
}, { storage: 'indexedDB' });
```

### Binary Data Support

```typescript
// Store various data types
await storage.set('blob', new Blob(['Hello']), { 
  storage: 'indexedDB' 
});

await storage.set('arrayBuffer', buffer, { 
  storage: 'indexedDB' 
});

await storage.set('file', file, { 
  storage: 'indexedDB' 
});
```

## Use Cases

### 1. Offline Database

```typescript
class OfflineDB {
  async syncFromServer() {
    const lastSync = await storage.get('lastSync', {
      storage: 'indexedDB'
    }) || 0;
    
    const updates = await api.getUpdates(lastSync);
    
    // Store in transaction
    await storage.transaction(async (tx) => {
      for (const record of updates) {
        await tx.set(`record:${record.id}`, record);
      }
      await tx.set('lastSync', Date.now());
    }, { storage: 'indexedDB' });
  }
  
  async queryOffline(filter: QueryFilter) {
    return await storage.query({
      key: { startsWith: 'record:' },
      'value.status': filter.status,
      'value.created': { 
        between: [filter.startDate, filter.endDate] 
      }
    }, { storage: 'indexedDB' });
  }
}
```

### 2. Media Storage

```typescript
class MediaStore {
  async saveImage(id: string, blob: Blob, metadata: ImageMetadata) {
    await storage.transaction(async (tx) => {
      // Store image blob
      await tx.set(`image:${id}`, blob);
      
      // Store metadata separately for querying
      await tx.set(`meta:${id}`, {
        ...metadata,
        size: blob.size,
        type: blob.type,
        created: Date.now()
      });
    }, { storage: 'indexedDB' });
  }
  
  async getImage(id: string): Promise<Blob | null> {
    return await storage.get(`image:${id}`, {
      storage: 'indexedDB'
    });
  }
  
  async searchImages(query: string) {
    return await storage.query({
      key: { startsWith: 'meta:' },
      'value.tags': { contains: query }
    }, { storage: 'indexedDB' });
  }
}
```

### 3. Document Store

```typescript
class DocumentDB {
  async createCollection(name: string) {
    const collections = await this.getCollections();
    collections[name] = {
      created: Date.now(),
      count: 0,
      indexes: []
    };
    
    await storage.set('_collections', collections, {
      storage: 'indexedDB'
    });
  }
  
  async insert(collection: string, doc: Document) {
    const id = doc.id || generateId();
    
    await storage.transaction(async (tx) => {
      // Store document
      await tx.set(`${collection}:${id}`, {
        ...doc,
        _id: id,
        _created: Date.now(),
        _updated: Date.now()
      });
      
      // Update collection stats
      const collections = await tx.get('_collections');
      collections[collection].count++;
      await tx.set('_collections', collections);
    }, { storage: 'indexedDB' });
    
    return id;
  }
  
  async find(collection: string, query: QueryCondition) {
    const results = await storage.query({
      key: { startsWith: `${collection}:` },
      ...query
    }, { storage: 'indexedDB' });
    
    return results.map(r => r.value);
  }
}
```

### 4. Cache Manager

```typescript
class CacheManager {
  private maxAge = 86400000; // 24 hours
  
  async cacheResponse(url: string, response: Response) {
    const blob = await response.blob();
    const headers = Object.fromEntries(response.headers);
    
    await storage.set(`cache:${url}`, {
      status: response.status,
      statusText: response.statusText,
      headers,
      blob,
      cached: Date.now()
    }, {
      storage: 'indexedDB',
      ttl: this.maxAge
    });
  }
  
  async getCached(url: string): Promise<Response | null> {
    const cached = await storage.get(`cache:${url}`, {
      storage: 'indexedDB'
    });
    
    if (!cached) return null;
    
    return new Response(cached.blob, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers
    });
  }
  
  async clearExpired() {
    const expired = await storage.getExpiring(0, {
      storage: 'indexedDB'
    });
    
    for (const { key } of expired) {
      await storage.remove(key, { storage: 'indexedDB' });
    }
  }
}
```

## Database Management

### Schema Versioning

```typescript
const storage = new Strata({
  adapters: {
    indexedDB: {
      name: 'MyApp',
      version: 2,
      upgrade: async (db, oldVersion, newVersion) => {
        if (oldVersion < 1) {
          // Create initial schema
          db.createObjectStore('data', { keyPath: 'id' });
        }
        
        if (oldVersion < 2) {
          // Add new indexes
          const store = db.transaction.objectStore('data');
          store.createIndex('status', 'status');
        }
      }
    }
  }
});
```

### Storage Estimation

```typescript
// Check available storage
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  console.log(`Using ${estimate.usage} of ${estimate.quota} bytes`);
  
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  if (percentUsed > 90) {
    console.warn('Storage nearly full');
  }
}
```

### Performance Optimization

```typescript
// 1. Use transactions for multiple operations
await storage.transaction(async (tx) => {
  for (let i = 0; i < 1000; i++) {
    await tx.set(`item${i}`, data[i]);
  }
}, { storage: 'indexedDB' });

// 2. Create appropriate indexes
const storage = new Strata({
  adapters: {
    indexedDB: {
      stores: {
        data: {
          indexes: [
            { name: 'userId', keyPath: 'userId' },
            { name: 'status_created', keyPath: ['status', 'created'] }
          ]
        }
      }
    }
  }
});

// 3. Use cursor for large datasets
const processLargeDataset = async () => {
  const db = await getDB();
  const tx = db.transaction('data', 'readonly');
  const store = tx.objectStore('data');
  const cursor = store.openCursor();
  
  cursor.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      processRecord(cursor.value);
      cursor.continue();
    }
  };
};
```

## Browser Compatibility

### Storage Limits

| Browser | Default Limit | Can Request More |
|---------|--------------|------------------|
| Chrome | 60% of disk | Yes (persistent) |
| Firefox | 50% of disk | Yes (persistent) |
| Safari | 1GB initially | Yes (user prompt) |
| Edge | 60% of disk | Yes (persistent) |

### Requesting Persistent Storage

```typescript
// Request persistent storage
if ('storage' in navigator && 'persist' in navigator.storage) {
  const isPersisted = await navigator.storage.persist();
  console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
}
```

## Error Handling

```typescript
try {
  await storage.set('data', value, { storage: 'indexedDB' });
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Handle quota exceeded
    await cleanupOldData();
  } else if (error.name === 'InvalidStateError') {
    // Database connection issue
    await storage.initialize();
  } else if (error.name === 'VersionError') {
    // Version conflict
    location.reload(); // Reload to update
  }
}
```

## Best Practices

### 1. Structure Keys Logically

```typescript
// Use prefixes for different data types
await storage.set('user:123', userData, { storage: 'indexedDB' });
await storage.set('post:456', postData, { storage: 'indexedDB' });
await storage.set('cache:api:/users', cached, { storage: 'indexedDB' });
```

### 2. Handle Database Blocks

```typescript
// Handle when database is blocked by other tabs
const storage = new Strata({
  adapters: {
    indexedDB: {
      onBlocked: () => {
        alert('Please close other tabs to update the app');
      }
    }
  }
});
```

### 3. Implement Cleanup

```typescript
// Regular cleanup of old data
setInterval(async () => {
  await storage.clear({
    storage: 'indexedDB',
    filter: (key) => key.startsWith('temp:'),
    olderThan: Date.now() - 3600000 // 1 hour
  });
}, 3600000);
```

## Migration from Other Storage

```typescript
// Migrate from localStorage to IndexedDB
async function migrateToIndexedDB() {
  const keys = await storage.keys(null, { 
    storage: 'localStorage' 
  });
  
  for (const key of keys) {
    const value = await storage.get(key, { 
      storage: 'localStorage' 
    });
    
    await storage.set(key, value, { 
      storage: 'indexedDB' 
    });
    
    await storage.remove(key, { 
      storage: 'localStorage' 
    });
  }
}
```

## See Also

- [Storage Adapters Overview](../README.md)
- [Transaction Guide](../../../guides/features/transactions.md)
- [Query Guide](../../../guides/features/queries.md)
- [Performance Guide](../../../guides/performance.md)