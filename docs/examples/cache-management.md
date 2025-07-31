# Cache Management Examples

Examples of implementing efficient caching strategies with Strata Storage.

## Basic Cache Manager

```typescript
import { Strata } from 'strata-storage';

class CacheManager {
  private storage: Strata;
  private defaultTTL = 300000; // 5 minutes
  
  constructor() {
    this.storage = new Strata({
      namespace: 'cache',
      compression: { enabled: true }
    });
  }
  
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Check cache first
    const cached = await this.storage.get(key);
    
    if (cached !== null) {
      console.log(`Cache hit: ${key}`);
      return cached;
    }
    
    // Cache miss - fetch new data
    console.log(`Cache miss: ${key}`);
    const data = await fetcher();
    
    // Store in cache
    await this.storage.set(key, data, {
      ttl: ttl || this.defaultTTL
    });
    
    return data;
  }
  
  async invalidate(pattern: string | RegExp) {
    const items = await this.storage.query({
      key: { $matches: pattern }
    });
    
    await Promise.all(
      items.map(item => this.storage.remove(item.key))
    );
    
    console.log(`Invalidated ${items.length} cache entries`);
  }
}
```

## API Response Cache

```typescript
class APICache {
  private storage: Strata;
  private cacheConfig = new Map<string, CacheConfig>();
  
  constructor() {
    this.storage = new Strata();
    this.configureCaching();
  }
  
  private configureCaching() {
    // Configure cache TTL by endpoint
    this.cacheConfig.set('/api/users', { ttl: 3600000 }); // 1 hour
    this.cacheConfig.set('/api/posts', { ttl: 300000 });  // 5 minutes
    this.cacheConfig.set('/api/config', { ttl: 86400000 }); // 24 hours
  }
  
  async fetch(url: string, options?: RequestInit): Promise<any> {
    const cacheKey = this.generateCacheKey(url, options);
    const config = this.getCacheConfig(url);
    
    // Skip cache for non-GET requests
    if (options?.method && options.method !== 'GET') {
      return this.fetchAndCache(url, options, cacheKey, 0);
    }
    
    // Check cache
    const cached = await this.storage.get(cacheKey);
    if (cached) {
      // Check if stale
      if (this.isStale(cached, config)) {
        this.refreshInBackground(url, options, cacheKey, config);
      }
      return cached.data;
    }
    
    // Fetch and cache
    return this.fetchAndCache(url, options, cacheKey, config.ttl);
  }
  
  private async fetchAndCache(
    url: string,
    options: RequestInit | undefined,
    cacheKey: string,
    ttl: number
  ) {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (ttl > 0) {
      await this.storage.set(cacheKey, {
        data,
        cachedAt: Date.now(),
        headers: Object.fromEntries(response.headers.entries())
      }, { ttl });
    }
    
    return data;
  }
  
  private generateCacheKey(url: string, options?: RequestInit): string {
    const params = options ? JSON.stringify(options) : '';
    return `api:${url}:${params}`;
  }
}
```

## Layered Cache

```typescript
class LayeredCache {
  private memory = new Map<string, any>();
  private storage: Strata;
  private maxMemoryItems = 100;
  
  async get(key: string): Promise<any> {
    // L1: Memory cache
    if (this.memory.has(key)) {
      console.log(`L1 hit: ${key}`);
      return this.memory.get(key);
    }
    
    // L2: Storage cache
    const stored = await this.storage.get(key);
    if (stored !== null) {
      console.log(`L2 hit: ${key}`);
      this.addToMemory(key, stored);
      return stored;
    }
    
    console.log(`Cache miss: ${key}`);
    return null;
  }
  
  async set(key: string, value: any, options?: CacheOptions) {
    // Add to both layers
    this.addToMemory(key, value);
    await this.storage.set(key, value, options);
  }
  
  private addToMemory(key: string, value: any) {
    // LRU eviction
    if (this.memory.size >= this.maxMemoryItems) {
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
    }
    
    this.memory.set(key, value);
  }
}
```

## Cache Warming

```typescript
class CacheWarmer {
  private storage: Strata;
  private warmupQueue: WarmupTask[] = [];
  
  async warmup(tasks: WarmupTask[]) {
    console.log(`Starting cache warmup for ${tasks.length} items`);
    
    const results = await Promise.allSettled(
      tasks.map(task => this.warmupTask(task))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Cache warmup complete: ${successful}/${tasks.length} successful`);
  }
  
  private async warmupTask(task: WarmupTask) {
    try {
      const data = await task.fetcher();
      await this.storage.set(task.key, data, {
        ttl: task.ttl || 3600000
      });
    } catch (error) {
      console.error(`Failed to warm cache for ${task.key}:`, error);
      throw error;
    }
  }
  
  scheduleWarmup(cronExpression: string) {
    // Schedule periodic cache warming
    setInterval(() => {
      this.warmup(this.warmupQueue);
    }, parseCron(cronExpression));
  }
}

interface WarmupTask {
  key: string;
  fetcher: () => Promise<any>;
  ttl?: number;
}
```

## Smart Cache Invalidation

```typescript
class SmartCacheInvalidation {
  private storage: Strata;
  private dependencies = new Map<string, Set<string>>();
  
  async set(key: string, value: any, deps?: string[]) {
    await this.storage.set(key, value);
    
    // Track dependencies
    if (deps) {
      deps.forEach(dep => {
        if (!this.dependencies.has(dep)) {
          this.dependencies.set(dep, new Set());
        }
        this.dependencies.get(dep)!.add(key);
      });
    }
  }
  
  async invalidate(key: string) {
    // Invalidate the key
    await this.storage.remove(key);
    
    // Invalidate dependent keys
    const dependents = this.dependencies.get(key);
    if (dependents) {
      await Promise.all(
        Array.from(dependents).map(dep => this.storage.remove(dep))
      );
      this.dependencies.delete(key);
    }
  }
  
  async invalidateTag(tag: string) {
    // Find all keys with this tag
    const tagged = await this.storage.query({
      'value.tags': { $contains: tag }
    });
    
    // Invalidate all tagged entries
    await Promise.all(
      tagged.map(item => this.invalidate(item.key))
    );
  }
}
```

## Cache Statistics

```typescript
class CacheStats {
  private storage: Strata;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };
  
  async get(key: string): Promise<any> {
    try {
      const value = await this.storage.get(key);
      
      if (value !== null) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
      
      return value;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }
  
  async getStats(): Promise<CacheStatistics> {
    const items = await this.storage.query({});
    const now = Date.now();
    
    let totalSize = 0;
    let expiredCount = 0;
    
    for (const item of items) {
      const size = JSON.stringify(item.value).length;
      totalSize += size;
      
      if (item.ttl && item.ttl < now) {
        expiredCount++;
      }
    }
    
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
      totalItems: items.length,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      expiredItems: expiredCount
    };
  }
}
```

## Conditional Caching

```typescript
class ConditionalCache {
  private storage: Strata;
  
  async fetch(url: string, options?: FetchOptions): Promise<any> {
    const cacheKey = `fetch:${url}`;
    
    // Check cache conditions
    if (options?.noCache) {
      return this.fetchFresh(url);
    }
    
    // Check if cacheable
    if (!this.isCacheable(url, options)) {
      return this.fetchFresh(url);
    }
    
    // Try cache first
    const cached = await this.storage.get(cacheKey);
    
    if (cached && !this.shouldRevalidate(cached, options)) {
      return cached.data;
    }
    
    // Fetch with conditional request
    const headers: any = {};
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.status === 304 && cached) {
      // Not modified - update timestamp
      cached.lastValidated = Date.now();
      await this.storage.set(cacheKey, cached);
      return cached.data;
    }
    
    // Cache new response
    const data = await response.json();
    await this.storage.set(cacheKey, {
      data,
      etag: response.headers.get('etag'),
      cachedAt: Date.now(),
      maxAge: this.parseMaxAge(response.headers)
    });
    
    return data;
  }
  
  private isCacheable(url: string, options?: FetchOptions): boolean {
    // Don't cache user-specific endpoints
    if (url.includes('/user/') || url.includes('/private/')) {
      return false;
    }
    
    // Don't cache if explicitly disabled
    if (options?.cache === false) {
      return false;
    }
    
    return true;
  }
}
```

## Cache Compression

```typescript
class CompressedCache {
  private storage: Strata;
  private compressionThreshold = 1024; // 1KB
  
  async set(key: string, value: any, options?: CacheOptions) {
    const size = JSON.stringify(value).length;
    
    // Only compress large values
    const shouldCompress = size > this.compressionThreshold;
    
    await this.storage.set(key, value, {
      ...options,
      compress: shouldCompress
    });
    
    if (shouldCompress) {
      console.log(`Compressed ${key}: ${size} bytes -> ~${size * 0.3} bytes`);
    }
  }
  
  async analyzeCompression(): Promise<CompressionStats> {
    const items = await this.storage.query({});
    
    let totalUncompressed = 0;
    let totalCompressed = 0;
    let compressedCount = 0;
    
    for (const item of items) {
      const size = JSON.stringify(item.value).length;
      totalUncompressed += size;
      
      if (item.compressed) {
        compressedCount++;
        totalCompressed += size * 0.3; // Estimate
      } else {
        totalCompressed += size;
      }
    }
    
    return {
      totalItems: items.length,
      compressedItems: compressedCount,
      uncompressedSize: totalUncompressed,
      compressedSize: totalCompressed,
      savedBytes: totalUncompressed - totalCompressed,
      compressionRatio: (1 - totalCompressed / totalUncompressed) * 100
    };
  }
}
```

## See Also

- [Performance Optimization](./performance.md)
- [Data Sync](./data-sync.md)
- [TTL Examples](./ttl-expiration.md)