# Cache Adapter

Service Worker Cache API for offline resource storage.

## Overview

The Cache adapter leverages the Service Worker Cache API to store network requests and responses. Perfect for offline functionality and performance optimization.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ❌ No |
| Searchable | ✅ Yes (limited) |
| Iterable | ✅ Yes |
| Capacity | 500MB+ |
| Performance | ⚡ Fast |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Store in cache
await storage.set('apiResponse', data, { 
  storage: 'cache',
  ttl: 300000 // 5 minutes
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    cache: {
      cacheName: 'strata-cache-v1',
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin'
      }
    }
  }
});
```

### Configuration Options

- `cacheName` (string): Name of the cache (default: 'strata-cache')
- `requestOptions` (object): Default options for Request objects
- `responseOptions` (object): Default options for Response objects

## Features

### Service Worker Integration

```typescript
// In service worker
self.addEventListener('fetch', (event) => {
  event.respondWith(
    storage.get(event.request.url, { storage: 'cache' })
      .then(cached => cached || fetch(event.request))
      .then(response => {
        // Cache the response
        storage.set(event.request.url, response.clone(), {
          storage: 'cache',
          ttl: 3600000 // 1 hour
        });
        return response;
      })
  );
});
```

### Response Storage

```typescript
// Store Response objects directly
const response = await fetch('/api/data');
await storage.set('api-data', response.clone(), {
  storage: 'cache'
});

// Retrieve as Response
const cached = await storage.get('api-data', {
  storage: 'cache'
});
if (cached) {
  const data = await cached.json();
}
```

### Request Matching

```typescript
// Store with Request object as key
const request = new Request('/api/users', {
  headers: { 'Accept': 'application/json' }
});

await storage.set(request, response, {
  storage: 'cache'
});

// Match requests
const cached = await storage.get(request, {
  storage: 'cache',
  ignoreSearch: true,
  ignoreMethod: false,
  ignoreVary: false
});
```

## Use Cases

### 1. Offline-First Application

```typescript
class OfflineFirst {
  async fetchWithCache(url: string, options?: RequestInit) {
    // Try cache first
    const cached = await storage.get(url, {
      storage: 'cache'
    });
    
    if (cached && this.isFresh(cached)) {
      return cached;
    }
    
    // Fetch from network
    try {
      const response = await fetch(url, options);
      
      // Cache successful responses
      if (response.ok) {
        await storage.set(url, response.clone(), {
          storage: 'cache',
          ttl: this.getTTL(response)
        });
      }
      
      return response;
    } catch (error) {
      // Return stale cache if offline
      if (cached) {
        console.warn('Using stale cache:', url);
        return cached;
      }
      throw error;
    }
  }
  
  private isFresh(response: Response): boolean {
    const cacheControl = response.headers.get('Cache-Control');
    const date = response.headers.get('Date');
    // Implementation of freshness check
    return true;
  }
  
  private getTTL(response: Response): number {
    const cacheControl = response.headers.get('Cache-Control');
    if (cacheControl?.includes('max-age=')) {
      const maxAge = parseInt(cacheControl.split('max-age=')[1]);
      return maxAge * 1000;
    }
    return 3600000; // Default 1 hour
  }
}
```

### 2. API Response Caching

```typescript
class APICache {
  private defaultTTL = 300000; // 5 minutes
  
  async get(endpoint: string, options?: RequestInit) {
    const cacheKey = this.getCacheKey(endpoint, options);
    
    // Check cache
    const cached = await storage.get(cacheKey, {
      storage: 'cache'
    });
    
    if (cached) {
      const data = await cached.json();
      return { data, fromCache: true };
    }
    
    // Fetch from API
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    // Cache the response
    await storage.set(cacheKey, new Response(
      JSON.stringify(data),
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }
    ), {
      storage: 'cache',
      ttl: this.defaultTTL
    });
    
    return { data, fromCache: false };
  }
  
  async invalidate(pattern: string | RegExp) {
    const keys = await storage.keys(pattern, {
      storage: 'cache'
    });
    
    for (const key of keys) {
      await storage.remove(key, { storage: 'cache' });
    }
  }
  
  private getCacheKey(endpoint: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }
}
```

### 3. Asset Caching

```typescript
class AssetCache {
  private assetPatterns = [
    /\.js$/,
    /\.css$/,
    /\.woff2?$/,
    /\.(png|jpg|jpeg|gif|svg)$/
  ];
  
  async cacheAssets(urls: string[]) {
    const responses = await Promise.all(
      urls.map(url => fetch(url))
    );
    
    for (let i = 0; i < urls.length; i++) {
      if (responses[i].ok) {
        await storage.set(urls[i], responses[i], {
          storage: 'cache',
          ttl: 604800000 // 7 days for static assets
        });
      }
    }
  }
  
  async precache() {
    const manifest = await fetch('/asset-manifest.json');
    const assets = await manifest.json();
    
    await this.cacheAssets(Object.values(assets));
  }
  
  isAsset(url: string): boolean {
    return this.assetPatterns.some(pattern => pattern.test(url));
  }
}
```

### 4. Background Sync Queue

```typescript
class SyncQueue {
  async addToQueue(request: Request) {
    const id = Date.now().toString();
    
    await storage.set(`sync:${id}`, {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: await request.text()
    }, {
      storage: 'cache'
    });
  }
  
  async processQueue() {
    const keys = await storage.keys(/^sync:/, {
      storage: 'cache'
    });
    
    for (const key of keys) {
      const data = await storage.get(key, {
        storage: 'cache'
      });
      
      try {
        const response = await fetch(data.url, {
          method: data.method,
          headers: data.headers,
          body: data.body
        });
        
        if (response.ok) {
          await storage.remove(key, { storage: 'cache' });
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

## Service Worker Patterns

### Cache-First Strategy

```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          storage.set(event.request.url, responseClone, {
            storage: 'cache'
          });
        }
        return response;
      })
  );
});
```

### Network-First Strategy

```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          storage.set(event.request.url, response.clone(), {
            storage: 'cache'
          });
        }
        return response;
      })
      .catch(() => {
        return storage.get(event.request.url, {
          storage: 'cache'
        });
      })
  );
});
```

### Stale-While-Revalidate

```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    storage.get(event.request.url, { storage: 'cache' })
      .then(cached => {
        const fetchPromise = fetch(event.request)
          .then(response => {
            storage.set(event.request.url, response.clone(), {
              storage: 'cache'
            });
            return response;
          });
        
        return cached || fetchPromise;
      })
  );
});
```

## Cache Management

### Version Management

```typescript
class CacheVersionManager {
  private currentVersion = 'v2';
  private oldVersions = ['v1'];
  
  async upgrade() {
    // Delete old cache versions
    for (const version of this.oldVersions) {
      await caches.delete(`strata-cache-${version}`);
    }
    
    // Initialize new version
    const storage = new Strata({
      adapters: {
        cache: {
          cacheName: `strata-cache-${this.currentVersion}`
        }
      }
    });
    
    await storage.initialize();
  }
}
```

### Storage Quota

```typescript
// Check cache storage usage
async function checkCacheUsage() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const cacheNames = await caches.keys();
    
    let cacheSize = 0;
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          cacheSize += blob.size;
        }
      }
    }
    
    console.log(`Cache using ${cacheSize} of ${estimate.quota} bytes`);
  }
}
```

## Best Practices

### 1. Response Cloning

```typescript
// Always clone responses before caching
const response = await fetch(url);
if (response.ok) {
  // Clone for cache
  await storage.set(url, response.clone(), {
    storage: 'cache'
  });
  
  // Use original
  return response;
}
```

### 2. Cache Invalidation

```typescript
class CacheInvalidator {
  async invalidatePattern(pattern: RegExp) {
    const keys = await storage.keys(pattern, {
      storage: 'cache'
    });
    
    await Promise.all(
      keys.map(key => storage.remove(key, { storage: 'cache' }))
    );
  }
  
  async invalidateOld(maxAge: number) {
    await storage.clear({
      storage: 'cache',
      olderThan: Date.now() - maxAge
    });
  }
}
```

### 3. Error Handling

```typescript
// Handle cache errors gracefully
try {
  await storage.set(url, response, { storage: 'cache' });
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Clear old entries
    await storage.clear({
      storage: 'cache',
      olderThan: Date.now() - 86400000 // 24 hours
    });
    
    // Retry
    await storage.set(url, response, { storage: 'cache' });
  }
}
```

## Limitations

1. **Service Worker Required**: Only available in Service Worker context
2. **HTTPS Required**: Requires secure context (HTTPS)
3. **Browser Support**: Not available in all browsers
4. **Storage Limits**: Subject to browser storage quotas
5. **No Direct Access**: Cannot be accessed from main thread

## Browser Support

| Browser | Support | Notes |
|---------|---------|--------|
| Chrome | ✅ Yes | Full support |
| Firefox | ✅ Yes | Full support |
| Safari | ✅ Yes | Since 11.1 |
| Edge | ✅ Yes | Full support |

## See Also

- [Storage Adapters Overview](../README.md)
- [Service Worker Guide](../../../guides/platforms/service-worker.md)
- [Offline Strategy Guide](../../../guides/features/offline.md)
- [IndexedDB Adapter](./indexeddb.md) - Alternative for main thread