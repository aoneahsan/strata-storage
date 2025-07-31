# TTL & Expiration Examples

Examples of using Time-To-Live (TTL) features in Strata Storage.

## Basic TTL

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Expire after 5 minutes
await storage.set('temp-data', data, {
  ttl: 300000 // 5 minutes in milliseconds
});

// Expire after 1 hour
await storage.set('session-token', token, {
  ttl: 3600000 // 1 hour
});
```

## Sliding TTL (Session Management)

```typescript
// Create session with sliding expiration
await storage.set('user-session', sessionData, {
  ttl: 1800000,    // 30 minutes
  sliding: true    // Reset TTL on each access
});

// Each get() resets the TTL
const session = await storage.get('user-session');
// Session now expires 30 minutes from now
```

## Absolute Expiration

```typescript
// Expire at midnight
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);

await storage.set('daily-cache', data, {
  expireAt: midnight
});

// Expire at specific timestamp
await storage.set('event-data', data, {
  expireAt: 1735689599000 // Dec 31, 2024
});
```

## Cache Implementation

```typescript
class CacheManager {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      ttl: {
        enabled: true,
        defaultTTL: 300000, // 5 minutes default
        checkInterval: 60000 // Clean every minute
      }
    });
  }
  
  async cache(key: string, factory: () => Promise<any>, ttl?: number) {
    // Try to get from cache
    const cached = await this.storage.get(key);
    if (cached !== null) {
      console.log('Cache hit:', key);
      return cached;
    }
    
    // Generate new value
    console.log('Cache miss:', key);
    const value = await factory();
    
    // Cache with TTL
    await this.storage.set(key, value, { ttl });
    
    return value;
  }
  
  async warmCache(keys: string[], factory: (key: string) => Promise<any>) {
    await Promise.all(
      keys.map(key => this.cache(key, () => factory(key)))
    );
  }
}
```

## API Response Caching

```typescript
class APICache {
  private storage: Strata;
  
  async fetchWithCache(url: string, options?: RequestInit) {
    const cacheKey = `api:${url}`;
    const cached = await this.storage.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Cache based on endpoint
    const ttl = this.getTTLForEndpoint(url);
    await this.storage.set(cacheKey, data, { ttl });
    
    return data;
  }
  
  getTTLForEndpoint(url: string): number {
    if (url.includes('/user/')) return 3600000; // 1 hour
    if (url.includes('/feed/')) return 60000;   // 1 minute
    if (url.includes('/static/')) return 86400000; // 24 hours
    return 300000; // Default 5 minutes
  }
}
```

## TTL Management

```typescript
// Check remaining TTL
const ttl = await storage.getTTL('session');
if (ttl && ttl < 300000) { // Less than 5 minutes
  console.log('Session expiring soon');
  showWarning('Your session will expire soon');
}

// Extend TTL
await storage.extendTTL('session', 1800000); // Add 30 minutes

// Make persistent (remove TTL)
await storage.persist('important-data');
```

## Cleanup Strategies

```typescript
// Manual cleanup
async function cleanupExpired() {
  const removed = await storage.cleanupExpired();
  console.log(`Removed ${removed} expired items`);
}

// Scheduled cleanup
setInterval(cleanupExpired, 300000); // Every 5 minutes

// Get items expiring soon
const expiringSoon = await storage.getExpiring(600000); // Within 10 minutes
for (const item of expiringSoon) {
  console.log(`${item.key} expires in ${item.ttl}ms`);
}
```

## Common TTL Patterns

```typescript
const TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

// Different TTLs for different data types
await storage.set('user-preferences', prefs, {
  ttl: TTL.WEEK // Rarely changes
});

await storage.set('api-token', token, {
  ttl: TTL.HOUR // Security
});

await storage.set('live-feed', feed, {
  ttl: TTL.MINUTE // Fresh data
});
```

## See Also

- [TTL Guide](../guides/features/ttl.md)
- [Cache Management](./cache-management.md)
- [Offline Support](./offline-support.md)