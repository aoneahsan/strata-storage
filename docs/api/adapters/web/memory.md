# Memory Adapter

Fast in-memory storage using JavaScript Map.

## Overview

The Memory adapter provides the fastest storage option with no persistence. Perfect for temporary data, caching, and session-specific information.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ❌ No |
| Synchronous | ✅ Yes |
| Observable | ✅ Yes |
| Searchable | ✅ Yes |
| Iterable | ✅ Yes |
| Capacity | ~50-100MB |
| Performance | ⚡ Fast |
| TTL Support | ✅ Yes |
| Batch Support | ✅ Yes |
| Transaction Support | ✅ Yes |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Explicitly use memory storage
await storage.set('tempData', data, { storage: 'memory' });
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    memory: {
      maxSize: 50 * 1024 * 1024, // 50MB limit
      evictionPolicy: 'lru' // 'lru' | 'lfu' | 'fifo'
    }
  }
});
```

### Configuration Options

- `maxSize` (number): Maximum storage size in bytes
- `evictionPolicy` (string): Policy when size limit reached
  - `'lru'`: Least Recently Used (default)
  - `'lfu'`: Least Frequently Used
  - `'fifo'`: First In First Out

## Features

### Fast Performance

```typescript
// Sub-millisecond operations
const start = performance.now();
await storage.set('key', largeObject, { storage: 'memory' });
const end = performance.now();
console.log(`Stored in ${end - start}ms`); // Usually < 1ms
```

### Transactions

```typescript
// Memory adapter supports full transactions
await storage.transaction(async (tx) => {
  const current = await tx.get('counter');
  await tx.set('counter', (current || 0) + 1);
  await tx.set('lastUpdate', Date.now());
}, { storage: 'memory' });
```

### Query Support

```typescript
// Full query engine support
const results = await storage.query({
  tags: { contains: 'important' },
  'value.score': { $gte: 80 }
}, { storage: 'memory' });
```

### Eviction Handling

```typescript
// Listen for evictions
storage.subscribe((change) => {
  if (change.type === 'evict') {
    console.log(`Evicted ${change.key} to free space`);
  }
});
```

## Use Cases

### 1. Application Cache

```typescript
class CacheManager {
  constructor(private storage: Strata) {}
  
  async cacheApiResponse(endpoint: string, data: unknown) {
    await this.storage.set(`cache:${endpoint}`, data, {
      storage: 'memory',
      ttl: 300000 // 5 minutes
    });
  }
  
  async getCached(endpoint: string) {
    return await this.storage.get(`cache:${endpoint}`, {
      storage: 'memory'
    });
  }
}
```

### 2. Session State

```typescript
// Store session data that doesn't need persistence
await storage.set('sessionId', generateId(), { 
  storage: 'memory' 
});

await storage.set('tempFormData', formData, { 
  storage: 'memory',
  ttl: 1800000 // 30 minutes
});
```

### 3. Real-time Data

```typescript
// Store rapidly changing data
setInterval(async () => {
  await storage.set('currentPrice', await fetchPrice(), {
    storage: 'memory'
  });
}, 1000);
```

### 4. Computation Results

```typescript
// Cache expensive computation results
async function computeWithCache(input: string) {
  const cacheKey = `compute:${input}`;
  
  // Check cache first
  const cached = await storage.get(cacheKey, { storage: 'memory' });
  if (cached) return cached;
  
  // Compute and cache
  const result = await expensiveComputation(input);
  await storage.set(cacheKey, result, {
    storage: 'memory',
    ttl: 3600000 // 1 hour
  });
  
  return result;
}
```

## Best Practices

### 1. Use for Temporary Data

```typescript
// Good: Temporary data that can be regenerated
await storage.set('apiCache', data, { storage: 'memory' });

// Bad: Important user data
// Use persistent storage instead
await storage.set('userProfile', profile, { 
  storage: ['secure', 'indexedDB'] 
});
```

### 2. Set Appropriate TTLs

```typescript
// Set TTL for cache data
await storage.set('cache:users', users, {
  storage: 'memory',
  ttl: 300000 // 5 minutes
});

// Use sliding TTL for active sessions
await storage.set('session', sessionData, {
  storage: 'memory',
  ttl: 1800000, // 30 minutes
  sliding: true // Reset on each access
});
```

### 3. Monitor Memory Usage

```typescript
// Check memory usage
const size = await storage.size(true);
const memoryUsage = size.byStorage?.memory || 0;

if (memoryUsage > 40 * 1024 * 1024) { // 40MB
  // Clear old cache entries
  await storage.clear({
    storage: 'memory',
    filter: (key) => key.startsWith('cache:'),
    olderThan: Date.now() - 600000 // 10 minutes
  });
}
```

### 4. Handle Data Loss

```typescript
// Always have a fallback for memory-only data
async function getData(key: string) {
  // Try memory first
  let data = await storage.get(key, { storage: 'memory' });
  
  if (!data) {
    // Regenerate if not in memory
    data = await fetchFromSource(key);
    await storage.set(key, data, { 
      storage: 'memory',
      ttl: 300000 
    });
  }
  
  return data;
}
```

## Limitations

1. **No Persistence**: Data is lost on page refresh or app restart
2. **Memory Limits**: Limited by available JavaScript heap memory
3. **Single Process**: Not shared between tabs/windows
4. **No Network Access**: Cannot be accessed by service workers

## Memory Management

### Automatic Cleanup

```typescript
const storage = new Strata({
  ttl: {
    enabled: true,
    checkInterval: 60000 // Check every minute
  }
});

// Manually trigger cleanup
const removed = await storage.cleanupExpired({ storage: 'memory' });
```

### Size Monitoring

```typescript
// Monitor and log memory usage
setInterval(async () => {
  const size = await storage.size(true);
  if (size.byStorage?.memory > 45 * 1024 * 1024) {
    console.warn('Memory storage approaching limit');
  }
}, 60000);
```

## Migration Strategy

When memory storage is not available (though this is rare):

```typescript
// Fallback chain for memory-preferred operations
await storage.set('data', value, {
  storage: ['memory', 'sessionStorage', 'localStorage']
});
```

## Performance Tips

1. **Batch Operations**: Group multiple operations for better performance
2. **Avoid Large Objects**: Keep individual items under 1MB
3. **Use TTL**: Always set TTL for cache data
4. **Monitor Size**: Implement size monitoring and cleanup
5. **Structured Keys**: Use prefixes for easy filtering

## See Also

- [Storage Adapters Overview](../README.md)
- [SessionStorage Adapter](./sessionstorage.md) - Session-scoped persistence
- [Cache Adapter](./cache.md) - Service Worker caching
- [TTL Guide](../../../guides/features/ttl.md)