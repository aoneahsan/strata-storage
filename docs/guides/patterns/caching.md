# Caching Patterns with Strata Storage

## Overview

Caching is a critical performance optimization technique that Strata Storage handles elegantly across all platforms. This guide covers best practices, patterns, and strategies for implementing efficient caching in your applications.

## Core Caching Concepts

### Cache Types

1. **Memory Cache** - Fastest, volatile, limited size
2. **Disk Cache** - Persistent, larger capacity, slower
3. **Hybrid Cache** - Combines memory and disk for optimal performance

## Basic Caching Pattern

```typescript
import { Strata } from 'strata-storage';

const cache = new Strata({
  defaultStorage: 'memory', // Fast access
  fallbackStorage: ['localStorage', 'indexedDB'], // Persistent fallback
  ttl: {
    default: 300000, // 5 minutes default
    autoCleanup: true
  }
});

// Basic cache implementation
async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const fresh = await fetcher();
  
  // Store in cache
  await cache.set(key, fresh, { ttl });
  
  return fresh;
}
```

## Advanced Caching Patterns

### 1. Cache-Aside Pattern

Most common pattern where the application manages the cache:

```typescript
class CacheAsideService {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'memory',
      compression: { enabled: true }
    });
  }
  
  async getData(id: string): Promise<any> {
    const cacheKey = `data:${id}`;
    
    // Check cache first
    const cached = await this.storage.get(cacheKey);
    if (cached) {
      console.log('Cache hit');
      return cached;
    }
    
    console.log('Cache miss');
    
    // Fetch from source
    const data = await this.fetchFromDatabase(id);
    
    // Update cache
    await this.storage.set(cacheKey, data, {
      ttl: 600000 // 10 minutes
    });
    
    return data;
  }
  
  async updateData(id: string, data: any): Promise<void> {
    // Update source
    await this.updateDatabase(id, data);
    
    // Invalidate cache
    await this.storage.remove(`data:${id}`);
  }
}
```

### 2. Write-Through Cache

Writes go through cache to the data source:

```typescript
class WriteThroughCache {
  private cache: Strata;
  
  async write(key: string, value: any): Promise<void> {
    // Write to cache first
    await this.cache.set(key, value);
    
    try {
      // Then write to backend
      await this.writeToBackend(key, value);
    } catch (error) {
      // Rollback cache on failure
      await this.cache.remove(key);
      throw error;
    }
  }
  
  async read(key: string): Promise<any> {
    // Always read from cache
    const cached = await this.cache.get(key);
    if (cached) return cached;
    
    // Load from backend if not cached
    const data = await this.readFromBackend(key);
    await this.cache.set(key, data);
    return data;
  }
}
```

### 3. Write-Behind Cache (Write-Back)

Writes are queued and written to backend asynchronously:

```typescript
class WriteBehindCache {
  private cache: Strata;
  private writeQueue: Map<string, any> = new Map();
  private flushInterval: number = 5000; // 5 seconds
  
  constructor() {
    this.cache = new Strata();
    this.startFlushTimer();
  }
  
  async write(key: string, value: any): Promise<void> {
    // Write to cache immediately
    await this.cache.set(key, value);
    
    // Queue for backend write
    this.writeQueue.set(key, value);
  }
  
  private startFlushTimer(): void {
    setInterval(() => {
      this.flushQueue();
    }, this.flushInterval);
  }
  
  private async flushQueue(): Promise<void> {
    if (this.writeQueue.size === 0) return;
    
    const batch = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();
    
    try {
      await this.writeBatchToBackend(batch);
    } catch (error) {
      // Re-queue failed writes
      batch.forEach(([key, value]) => {
        this.writeQueue.set(key, value);
      });
    }
  }
}
```

### 4. Refresh-Ahead Cache

Proactively refreshes cache before expiration:

```typescript
class RefreshAheadCache {
  private cache: Strata;
  private refreshThreshold: number = 0.8; // Refresh at 80% of TTL
  
  async get(key: string, fetcher: () => Promise<any>): Promise<any> {
    const cached = await this.cache.get(key, { 
      includeMetadata: true 
    });
    
    if (!cached) {
      return this.fetchAndCache(key, fetcher);
    }
    
    // Check if refresh needed
    const age = Date.now() - cached.updated;
    const ttl = cached.expires ? cached.expires - cached.updated : Infinity;
    
    if (age / ttl > this.refreshThreshold) {
      // Refresh in background
      this.fetchAndCache(key, fetcher).catch(console.error);
    }
    
    return cached.value;
  }
  
  private async fetchAndCache(
    key: string, 
    fetcher: () => Promise<any>
  ): Promise<any> {
    const data = await fetcher();
    await this.cache.set(key, data, { ttl: 600000 });
    return data;
  }
}
```

## API Response Caching

### Basic API Cache

```typescript
class APICache {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'indexedDB', // Persistent
      compression: { enabled: true }, // Save space
      encryption: { enabled: true } // Security
    });
  }
  
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check cache first
    const cached = await this.storage.get(cacheKey);
    if (cached && !this.isStale(cached)) {
      return new Response(cached.body, {
        status: cached.status,
        headers: cached.headers
      });
    }
    
    // Make actual request
    const response = await fetch(url, options);
    
    // Cache successful responses
    if (response.ok) {
      await this.cacheResponse(cacheKey, response.clone());
    }
    
    return response;
  }
  
  private generateCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `api:${method}:${url}:${body}`;
  }
  
  private async cacheResponse(key: string, response: Response): Promise<void> {
    const body = await response.text();
    const cacheControl = response.headers.get('cache-control');
    const maxAge = this.parseMaxAge(cacheControl);
    
    await this.storage.set(key, {
      body,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      cached: Date.now()
    }, {
      ttl: maxAge * 1000
    });
  }
  
  private parseMaxAge(cacheControl: string | null): number {
    if (!cacheControl) return 300; // Default 5 minutes
    
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1]) : 300;
  }
}
```

### GraphQL Query Caching

```typescript
class GraphQLCache {
  private storage: Strata;
  
  async query(
    query: string,
    variables?: Record<string, any>
  ): Promise<any> {
    const cacheKey = this.getCacheKey(query, variables);
    
    // Check if query is cacheable
    if (this.isMutation(query)) {
      return this.executeQuery(query, variables);
    }
    
    // Try cache for queries
    const cached = await this.storage.get(cacheKey);
    if (cached) return cached;
    
    // Execute and cache
    const result = await this.executeQuery(query, variables);
    
    await this.storage.set(cacheKey, result, {
      ttl: this.getTTLForQuery(query),
      tags: this.getTagsForQuery(query)
    });
    
    return result;
  }
  
  private getCacheKey(
    query: string, 
    variables?: Record<string, any>
  ): string {
    const hash = this.hashQuery(query);
    const varsHash = variables ? this.hashObject(variables) : '';
    return `gql:${hash}:${varsHash}`;
  }
  
  private getTTLForQuery(query: string): number {
    // Different TTL for different query types
    if (query.includes('user')) return 300000; // 5 min
    if (query.includes('posts')) return 60000; // 1 min
    if (query.includes('config')) return 3600000; // 1 hour
    return 180000; // Default 3 min
  }
  
  private getTagsForQuery(query: string): string[] {
    const tags: string[] = ['graphql'];
    
    // Extract entity types from query
    const entities = query.match(/\b(\w+)\s*\{/g);
    if (entities) {
      tags.push(...entities.map(e => e.replace('{', '').trim()));
    }
    
    return tags;
  }
  
  async invalidateEntity(entity: string): Promise<void> {
    // Clear all cached queries for this entity
    await this.storage.clear({
      tags: [entity]
    });
  }
}
```

## Cache Invalidation Strategies

### 1. TTL-Based Invalidation

```typescript
// Simple TTL
await storage.set('cache-key', data, {
  ttl: 300000 // 5 minutes
});

// Sliding expiration
await storage.set('session-cache', data, {
  ttl: 1800000, // 30 minutes
  sliding: true // Reset on access
});

// Absolute expiration
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);
await storage.set('daily-cache', data, {
  expireAt: midnight
});
```

### 2. Event-Based Invalidation

```typescript
class EventDrivenCache {
  private cache: Strata;
  private eventEmitter: EventEmitter;
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Invalidate on data changes
    this.eventEmitter.on('data:updated', async (id: string) => {
      await this.cache.remove(`data:${id}`);
    });
    
    // Invalidate related caches
    this.eventEmitter.on('user:updated', async (userId: string) => {
      await this.cache.clear({
        tags: [`user:${userId}`]
      });
    });
    
    // Bulk invalidation
    this.eventEmitter.on('cache:clear', async (pattern: string) => {
      const keys = await this.cache.keys(pattern);
      await Promise.all(keys.map(key => this.cache.remove(key)));
    });
  }
}
```

### 3. Tag-Based Invalidation

```typescript
class TagBasedCache {
  async cacheUserData(userId: string, data: any): Promise<void> {
    await this.storage.set(`user:${userId}`, data, {
      tags: ['user', `user:${userId}`, 'profile'],
      ttl: 600000
    });
  }
  
  async cachePostData(postId: string, userId: string, data: any): Promise<void> {
    await this.storage.set(`post:${postId}`, data, {
      tags: ['post', `user:${userId}`, `post:${postId}`],
      ttl: 300000
    });
  }
  
  // Invalidate all user-related cache
  async invalidateUserCache(userId: string): Promise<void> {
    await this.storage.clear({
      tags: [`user:${userId}`]
    });
  }
  
  // Invalidate all posts
  async invalidateAllPosts(): Promise<void> {
    await this.storage.clear({
      tags: ['post']
    });
  }
}
```

### 4. Version-Based Invalidation

```typescript
class VersionedCache {
  private version: string = 'v1';
  
  async get(key: string): Promise<any> {
    const versionedKey = `${this.version}:${key}`;
    return this.storage.get(versionedKey);
  }
  
  async set(key: string, value: any, options?: StorageOptions): Promise<void> {
    const versionedKey = `${this.version}:${key}`;
    await this.storage.set(versionedKey, value, options);
  }
  
  async invalidateVersion(): Promise<void> {
    // Increment version to invalidate all old cache
    this.version = `v${Date.now()}`;
    
    // Optionally clean old versions
    await this.cleanOldVersions();
  }
  
  private async cleanOldVersions(): Promise<void> {
    const pattern = /^v\d+:/;
    const keys = await this.storage.keys(pattern);
    
    const oldKeys = keys.filter(key => !key.startsWith(this.version));
    await Promise.all(oldKeys.map(key => this.storage.remove(key)));
  }
}
```

## Performance Optimization

### 1. Cache Warming

```typescript
class CacheWarmer {
  async warmCache(): Promise<void> {
    const criticalData = [
      { key: 'config', fetcher: this.fetchConfig },
      { key: 'user-profile', fetcher: this.fetchUserProfile },
      { key: 'permissions', fetcher: this.fetchPermissions }
    ];
    
    // Parallel cache warming
    await Promise.all(
      criticalData.map(async ({ key, fetcher }) => {
        try {
          const data = await fetcher();
          await this.cache.set(key, data, { ttl: 3600000 });
        } catch (error) {
          console.error(`Failed to warm cache for ${key}:`, error);
        }
      })
    );
  }
}
```

### 2. Multi-Tier Caching

```typescript
class MultiTierCache {
  private l1Cache: Strata; // Memory
  private l2Cache: Strata; // Disk
  
  constructor() {
    this.l1Cache = new Strata({
      defaultStorage: 'memory',
      maxSize: 50 * 1024 * 1024 // 50MB
    });
    
    this.l2Cache = new Strata({
      defaultStorage: 'indexedDB',
      compression: { enabled: true }
    });
  }
  
  async get(key: string): Promise<any> {
    // Check L1 first
    let value = await this.l1Cache.get(key);
    if (value) return value;
    
    // Check L2
    value = await this.l2Cache.get(key);
    if (value) {
      // Promote to L1
      await this.l1Cache.set(key, value, { ttl: 60000 });
      return value;
    }
    
    return null;
  }
  
  async set(key: string, value: any, options?: StorageOptions): Promise<void> {
    // Write to both tiers
    await Promise.all([
      this.l1Cache.set(key, value, { ...options, ttl: 60000 }),
      this.l2Cache.set(key, value, options)
    ]);
  }
}
```

### 3. Compression for Large Data

```typescript
class CompressedCache {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      compression: {
        enabled: true,
        threshold: 1024, // Compress if > 1KB
        compressionLevel: 6
      }
    });
  }
  
  async cacheLargeData(key: string, data: any): Promise<void> {
    // Automatically compressed if over threshold
    await this.storage.set(key, data, {
      ttl: 1800000 // 30 minutes
    });
  }
}
```

## Cache Metrics and Monitoring

```typescript
class CacheMetrics {
  private hits: number = 0;
  private misses: number = 0;
  private storage: Strata;
  
  async get(key: string): Promise<any> {
    const value = await this.storage.get(key);
    
    if (value) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    this.logMetrics();
    return value;
  }
  
  private logMetrics(): void {
    const total = this.hits + this.misses;
    if (total % 100 === 0) { // Log every 100 requests
      const hitRate = (this.hits / total * 100).toFixed(2);
      console.log(`Cache hit rate: ${hitRate}%`);
    }
  }
  
  async getStats(): Promise<{
    hitRate: number;
    size: number;
    itemCount: number;
  }> {
    const size = await this.storage.size();
    const keys = await this.storage.keys();
    
    return {
      hitRate: this.hits / (this.hits + this.misses),
      size: size.total,
      itemCount: keys.length
    };
  }
}
```

## Platform-Specific Considerations

### Web Browser
```typescript
// Use appropriate storage based on data size
const webCache = new Strata({
  strategy: StorageStrategy.CAPACITY_FIRST,
  adapters: {
    small: 'localStorage',  // < 1KB
    medium: 'indexedDB',    // < 10MB
    large: 'cache'          // > 10MB
  }
});
```

### Mobile (iOS/Android)
```typescript
// Optimize for battery and storage
const mobileCache = new Strata({
  defaultStorage: 'preferences', // Native storage
  ttl: {
    cleanupStrategy: 'lazy', // Battery-friendly
    checkInterval: 300000    // 5 minutes
  }
});
```

### Node.js
```typescript
// Server-side caching
const serverCache = new Strata({
  defaultStorage: 'memory',
  maxMemory: 100 * 1024 * 1024, // 100MB limit
  overflow: 'sqlite' // Overflow to disk
});
```

## Best Practices

1. **Choose the right storage type** based on data size and access patterns
2. **Set appropriate TTL values** based on data freshness requirements
3. **Use compression** for large data sets
4. **Implement proper cache invalidation** strategies
5. **Monitor cache performance** and adjust strategies
6. **Use tags** for efficient bulk operations
7. **Handle cache misses gracefully** with fallback mechanisms
8. **Warm critical caches** on application start
9. **Consider security** when caching sensitive data
10. **Test cache behavior** under various conditions

## Common Pitfalls to Avoid

1. **Cache stampede** - Multiple requests for same expired data
2. **Memory leaks** - Not cleaning up expired items
3. **Stale data** - Serving outdated information
4. **Over-caching** - Caching data that changes frequently
5. **Under-caching** - Missing optimization opportunities
6. **Security issues** - Caching sensitive data inappropriately

## Related Documentation

- [TTL Management](../../api/features/ttl.md)
- [Compression](../../api/features/compression.md)
- [Performance Guide](../platforms/web.md#performance)
- [Storage Strategies](../../api/core/strata.md#storage-strategies)