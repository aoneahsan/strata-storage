# Performance Optimization Examples

Examples of optimizing Strata Storage for maximum performance.

## Batch Operations

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Inefficient: Multiple awaits
async function slowSave(items: any[]) {
  for (const item of items) {
    await storage.set(item.key, item.value);
  }
}

// Efficient: Parallel operations
async function fastSave(items: any[]) {
  await Promise.all(
    items.map(item => storage.set(item.key, item.value))
  );
}

// Most efficient: Batch API
async function batchSave(items: any[]) {
  await storage.setMany(items);
}
```

## Memory Caching

```typescript
class CachedStorage {
  private storage: Strata;
  private cache = new Map<string, any>();
  private cacheSize = 0;
  private maxCacheSize = 10 * 1024 * 1024; // 10MB
  
  async get(key: string) {
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Load from storage
    const value = await this.storage.get(key);
    
    if (value !== null) {
      this.addToCache(key, value);
    }
    
    return value;
  }
  
  private addToCache(key: string, value: any) {
    const size = JSON.stringify(value).length;
    
    // Evict if needed
    while (this.cacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      this.evictFromCache(firstKey);
    }
    
    this.cache.set(key, value);
    this.cacheSize += size;
  }
  
  private evictFromCache(key: string) {
    const value = this.cache.get(key);
    if (value) {
      this.cacheSize -= JSON.stringify(value).length;
      this.cache.delete(key);
    }
  }
}
```

## Lazy Loading

```typescript
class LazyStorage {
  private storage: Strata;
  private loaded = new Set<string>();
  private loading = new Map<string, Promise<any>>();
  
  async get(key: string) {
    // Return loading promise if already in progress
    if (this.loading.has(key)) {
      return this.loading.get(key);
    }
    
    // Return cached if already loaded
    if (this.loaded.has(key)) {
      return this.storage.get(key);
    }
    
    // Start loading
    const loadPromise = this.loadValue(key);
    this.loading.set(key, loadPromise);
    
    try {
      const value = await loadPromise;
      this.loaded.add(key);
      return value;
    } finally {
      this.loading.delete(key);
    }
  }
  
  private async loadValue(key: string) {
    // Simulate expensive load operation
    const value = await this.storage.get(key);
    
    // Post-process if needed
    if (value && value.compressed) {
      return this.decompress(value.data);
    }
    
    return value;
  }
}
```

## Indexed Queries

```typescript
// Configure with indexes for better query performance
const storage = new Strata({
  adapters: {
    indexedDB: {
      indexes: [
        { name: 'byType', keyPath: 'value.type' },
        { name: 'byStatus', keyPath: 'value.status' },
        { name: 'byCreated', keyPath: 'value.created' },
        { name: 'byUserId', keyPath: 'value.userId' }
      ]
    }
  }
});

// Fast queries using indexes
const activeUsers = await storage.query({
  'value.status': 'active'
});

// Compound queries
const recentActiveUsers = await storage.query({
  'value.status': 'active',
  'value.created': { $after: Date.now() - 86400000 }
});
```

## Compression Strategy

```typescript
class SmartCompression {
  private storage: Strata;
  
  async set(key: string, value: any, options?: any) {
    const size = JSON.stringify(value).length;
    
    // Only compress large data
    const shouldCompress = size > 1024; // 1KB threshold
    
    return this.storage.set(key, value, {
      ...options,
      compress: shouldCompress
    });
  }
  
  async bulkCompress(pattern: string) {
    const items = await this.storage.query({
      key: { $matches: pattern }
    });
    
    const updates = items
      .filter(item => JSON.stringify(item.value).length > 1024)
      .filter(item => !item.compressed)
      .map(item => 
        this.storage.set(item.key, item.value, { compress: true })
      );
    
    await Promise.all(updates);
  }
}
```

## Read-Through Cache

```typescript
class ReadThroughCache {
  private storage: Strata;
  private fetchers = new Map<string, () => Promise<any>>();
  
  register(pattern: RegExp, fetcher: () => Promise<any>) {
    this.fetchers.set(pattern.source, fetcher);
  }
  
  async get(key: string) {
    // Check cache first
    const cached = await this.storage.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Find matching fetcher
    for (const [pattern, fetcher] of this.fetchers) {
      if (new RegExp(pattern).test(key)) {
        const value = await fetcher();
        
        // Cache the result
        await this.storage.set(key, value, {
          ttl: 300000 // 5 minutes
        });
        
        return value;
      }
    }
    
    return null;
  }
}
```

## Debounced Writes

```typescript
class DebouncedStorage {
  private storage: Strata;
  private pendingWrites = new Map<string, any>();
  private writeTimer: NodeJS.Timeout | null = null;
  
  async set(key: string, value: any, options?: any) {
    this.pendingWrites.set(key, { value, options });
    
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    
    this.writeTimer = setTimeout(() => {
      this.flushWrites();
    }, 100); // 100ms debounce
  }
  
  private async flushWrites() {
    const writes = Array.from(this.pendingWrites.entries());
    this.pendingWrites.clear();
    
    await Promise.all(
      writes.map(([key, { value, options }]) =>
        this.storage.set(key, value, options)
      )
    );
  }
}
```

## Storage Metrics

```typescript
class MetricStorage {
  private storage: Strata;
  private metrics = {
    reads: 0,
    writes: 0,
    hits: 0,
    misses: 0,
    errors: 0
  };
  
  async get(key: string) {
    this.metrics.reads++;
    
    try {
      const value = await this.storage.get(key);
      
      if (value !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      return value;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  getMetrics() {
    const hitRate = this.metrics.reads > 0
      ? (this.metrics.hits / this.metrics.reads) * 100
      : 0;
    
    return {
      ...this.metrics,
      hitRate: `${hitRate.toFixed(2)}%`
    };
  }
}
```

## See Also

- [Cache Management](./cache-management.md)
- [Multi-Storage](./multi-storage.md)
- [Configuration](./configuration.md)