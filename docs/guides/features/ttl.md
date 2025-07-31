# Time-To-Live (TTL) Guide

Guide for implementing automatic data expiration with TTL in Strata Storage.

## Overview

TTL (Time-To-Live) allows you to automatically expire data after a specified duration, perfect for caching, sessions, and temporary data.

## Quick Start

```typescript
import { Strata } from 'strata-storage';

// Store with TTL
await storage.set('session', sessionData, {
  ttl: 3600000 // Expires in 1 hour
});

// Enable automatic cleanup
const storage = new Strata({
  ttl: {
    enabled: true,
    checkInterval: 60000 // Check every minute
  }
});
```

## Configuration

```typescript
interface TTLConfig {
  enabled?: boolean;       // Enable TTL support
  defaultTTL?: number;     // Default TTL in milliseconds
  checkInterval?: number;  // Cleanup interval (ms)
  autoCleanup?: boolean;   // Auto-remove expired items
}
```

## TTL Options

### Basic TTL

```typescript
// Expire after fixed duration
await storage.set('cache', data, {
  ttl: 300000 // 5 minutes
});
```

### Sliding TTL

```typescript
// Reset TTL on each access
await storage.set('session', data, {
  ttl: 1800000,    // 30 minutes
  sliding: true    // Resets on get()
});
```

### Absolute Expiration

```typescript
// Expire at specific time
await storage.set('daily_cache', data, {
  expireAt: new Date('2024-12-31T23:59:59Z')
});

// Or timestamp
await storage.set('event_data', data, {
  expireAt: 1735689599000
});
```

### Relative Expiration

```typescript
// Expire after a specific date/time
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

await storage.set('daily_data', data, {
  expireAfter: tomorrow
});
```

## Usage Patterns

### Cache Management

```typescript
class CacheManager {
  private defaultTTL = 300000; // 5 minutes
  
  async cache(key: string, factory: () => Promise<any>, ttl?: number) {
    // Check cache first
    const cached = await storage.get(key);
    if (cached !== null) return cached;
    
    // Generate and cache
    const value = await factory();
    await storage.set(key, value, {
      ttl: ttl || this.defaultTTL
    });
    
    return value;
  }
  
  async invalidate(pattern: string | RegExp) {
    const keys = await storage.keys(pattern);
    for (const key of keys) {
      await storage.remove(key);
    }
  }
}
```

### Session Management

```typescript
class SessionManager {
  private sessionTTL = 1800000; // 30 minutes
  
  async createSession(userId: string, data: any) {
    const sessionId = this.generateId();
    
    await storage.set(`session:${sessionId}`, {
      userId,
      data,
      created: Date.now()
    }, {
      ttl: this.sessionTTL,
      sliding: true // Keep alive on activity
    });
    
    return sessionId;
  }
  
  async getSession(sessionId: string) {
    return await storage.get(`session:${sessionId}`);
    // TTL automatically extended if sliding=true
  }
  
  async extendSession(sessionId: string) {
    await storage.extendTTL(`session:${sessionId}`, this.sessionTTL);
  }
}
```

### API Response Caching

```typescript
class APICache {
  getCacheTTL(endpoint: string): number {
    // Different TTLs for different endpoints
    if (endpoint.includes('/user/profile')) {
      return 3600000; // 1 hour
    } else if (endpoint.includes('/feed')) {
      return 60000; // 1 minute
    } else if (endpoint.includes('/static')) {
      return 86400000; // 24 hours
    }
    return 300000; // Default 5 minutes
  }
  
  async fetchWithCache(endpoint: string) {
    const cacheKey = `api:${endpoint}`;
    const cached = await storage.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit:', endpoint);
      return cached;
    }
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    await storage.set(cacheKey, data, {
      ttl: this.getCacheTTL(endpoint)
    });
    
    return data;
  }
}
```

## TTL Management

### Check TTL

```typescript
// Get remaining TTL
const ttl = await storage.getTTL('session');
if (ttl && ttl < 300000) { // Less than 5 minutes
  console.log('Session expiring soon');
}
```

### Extend TTL

```typescript
// Add more time
await storage.extendTTL('session', 1800000); // Add 30 minutes

// Or set new TTL
await storage.setTTL('cache', 3600000); // 1 hour from now
```

### Make Persistent

```typescript
// Remove TTL
await storage.persist('important_data');
// Data no longer expires
```

### Get Expiring Items

```typescript
// Find items expiring soon
const expiringSoon = await storage.getExpiring(
  300000 // Within 5 minutes
);

for (const item of expiringSoon) {
  console.log(`${item.key} expires in ${item.expiresIn}ms`);
}
```

## Cleanup Strategies

### Automatic Cleanup

```typescript
const storage = new Strata({
  ttl: {
    enabled: true,
    autoCleanup: true,
    checkInterval: 60000 // Every minute
  }
});
```

### Manual Cleanup

```typescript
// Manually trigger cleanup
const removed = await storage.cleanupExpired();
console.log(`Removed ${removed} expired items`);

// Schedule cleanup
setInterval(async () => {
  await storage.cleanupExpired();
}, 300000); // Every 5 minutes
```

### Lazy Cleanup

```typescript
// Check on access (default behavior)
const value = await storage.get('key');
// Returns null if expired, removes item
```

## Platform Considerations

### Web Browser

```typescript
// Use shorter intervals for web
const storage = new Strata({
  ttl: {
    checkInterval: 30000 // 30 seconds
  }
});
```

### Mobile

```typescript
// Longer intervals to save battery
const storage = new Strata({
  ttl: {
    checkInterval: 300000 // 5 minutes
  }
});
```

### Background Cleanup

```typescript
// Handle page visibility
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) {
    // Cleanup when page becomes visible
    await storage.cleanupExpired();
  }
});
```

## Best Practices

1. **Set Appropriate TTLs**: Don't set too short or too long
2. **Use Sliding for Sessions**: Keep active sessions alive
3. **Batch Cleanup**: Don't cleanup too frequently
4. **Monitor Expired Items**: Log cleanup statistics
5. **Consider Time Zones**: Use UTC for absolute times

## Common TTL Values

```typescript
const TTL = {
  MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

// Usage
await storage.set('hourly_cache', data, {
  ttl: TTL.HOUR
});
```

## Debugging

### Monitor TTL

```typescript
// Log TTL operations
const storage = new Strata({
  debug: true,
  onLog: (level, msg, data) => {
    if (msg.includes('ttl') || msg.includes('expire')) {
      console.log('[TTL]', msg, data);
    }
  }
});
```

### TTL Statistics

```typescript
async function getTTLStats() {
  const keys = await storage.keys();
  let expiring = 0;
  let persistent = 0;
  
  for (const key of keys) {
    const ttl = await storage.getTTL(key);
    if (ttl) expiring++;
    else persistent++;
  }
  
  return { total: keys.length, expiring, persistent };
}
```

## See Also

- [API Reference - TTL](../../api/features/ttl.md)
- [Cache Management](../patterns/caching.md)
- [Session Management](../patterns/sessions.md)