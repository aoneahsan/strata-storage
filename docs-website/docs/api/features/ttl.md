# TTL (Time-To-Live) Management

## Overview

The TTL feature in Strata Storage provides automatic expiration of stored items. This helps manage storage space and ensures data freshness by automatically removing expired items.

## Features

- **Automatic Expiration**: Items expire automatically after the specified time
- **Sliding Expiration**: Optional TTL reset on access
- **Batch Cleanup**: Efficient removal of multiple expired items
- **Flexible Configuration**: Per-item or global TTL settings
- **Cross-Platform Support**: Works on all platforms (web, iOS, Android)

## Basic Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  ttl: {
    defaultTTL: 3600000, // 1 hour default TTL
    cleanupInterval: 60000, // Check every minute
    autoCleanup: true // Enable automatic cleanup
  }
});

// Set with TTL
await storage.set('temporary-data', data, {
  ttl: 300000 // Expires in 5 minutes
});

// Set with sliding expiration
await storage.set('session-data', sessionInfo, {
  ttl: 1800000, // 30 minutes
  sliding: true // Reset TTL on each access
});

// Set to expire at specific time
await storage.set('daily-cache', cache, {
  expireAt: new Date('2024-12-31T23:59:59')
});
```

## Configuration Options

### Global TTL Configuration

```typescript
interface TTLConfig {
  // Default TTL for all items (milliseconds)
  defaultTTL?: number;
  
  // How often to check for expired items (milliseconds)
  cleanupInterval?: number;
  
  // Automatically remove expired items
  autoCleanup?: boolean;
  
  // Maximum items to check per cleanup cycle
  batchSize?: number;
  
  // Callback invoked with the keys that expired during a cleanup cycle
  onExpire?: (keys: string[]) => void;
}
```

### Per-Item TTL Options

```typescript
interface StorageOptions {
  // Time to live in milliseconds
  ttl?: number;
  
  // Reset TTL on access
  sliding?: boolean;
  
  // Expire at specific time
  expireAt?: Date | number;
  
  // Expire after a certain date
  expireAfter?: Date | number;
}
```

## Advanced Usage

### Conditional TTL

```typescript
// Set different TTL based on content type
const ttl = data.type === 'cache' ? 300000 : 3600000;
await storage.set(key, data, { ttl });
```

### Manual Cleanup

```typescript
// Manually trigger a sweep of expired items; resolves with the number removed
const removed = await storage.cleanupExpired();
console.log(`Removed ${removed} expired items`);
```

### TTL with Encryption

```typescript
// Combine TTL with encryption
await storage.set('secure-temp', sensitiveData, {
  ttl: 600000, // 10 minutes
  encrypt: true,
  encryptionPassword: 'secret'
});
```

## Platform-Specific Behavior

### Web
- Uses `setTimeout` for cleanup scheduling
- Respects browser background tab throttling
- Cleanup continues across page reloads

### iOS/Android
- Native background task scheduling
- Respects system power management
- Cleanup continues when app is backgrounded

## Performance Considerations

1. **Batch Size**: Adjust `batchSize` based on your data volume
2. **Check Interval**: Balance between timely cleanup and performance
3. **Storage Type**: Some adapters handle TTL more efficiently
4. **Memory Usage**: Expired items consume memory until cleaned

## Best Practices

1. **Use appropriate TTL values**:
   - Cache: 5-30 minutes
   - Session: 30 minutes - 2 hours
   - Temporary: 1-24 hours
   - Long-term: Days or weeks

2. **Enable sliding expiration for active data**:
   ```typescript
   await storage.set('active-session', data, {
     ttl: 1800000,
     sliding: true
   });
   ```

3. **Combine with tags for bulk operations**:
   ```typescript
   await storage.set('cache-item', data, {
     ttl: 300000,
     tags: ['cache', 'api']
   });
   
   // Clear all expired cache items
   await storage.clear({
     tags: ['cache'],
     olderThan: Date.now()
   });
   ```

4. **Monitor cleanup via the `onExpire` callback**:
   ```typescript
   const storage = new Strata({
     ttl: {
       autoCleanup: true,
       onExpire: (keys) => {
         console.log(`Cleaned ${keys.length} expired items`);
       }
     }
   });
   ```

## API Reference

### TTLManager Class

```typescript
class TTLManager {
  constructor(config?: TTLConfig);
  
  // Calculate expiration timestamp
  calculateExpiration(options?: StorageOptions): number | undefined;
  
  // Check if value is expired
  isExpired(value: StorageValue): boolean;
  
  // Start automatic cleanup
  startAutoCleanup(
    getKeys: () => Promise<string[]>,
    getItem: (key: string) => Promise<StorageValue | null>,
    removeItem: (key: string) => Promise<void>
  ): void;
  
  // Stop automatic cleanup
  stopAutoCleanup(): void;
  
  // Perform a cleanup sweep of expired items; resolves with the removed items
  cleanup(
    getKeys: () => Promise<string[]>,
    getItem: (key: string) => Promise<StorageValue | null>,
    removeItem: (key: string) => Promise<void>
  ): Promise<ExpiredItem[]>;
}
```

## Examples

### Shopping Cart with TTL

```typescript
// Cart expires after 1 hour of inactivity
await storage.set('shopping-cart', cartItems, {
  ttl: 3600000,
  sliding: true,
  tags: ['cart', 'user-123']
});
```

### API Response Caching

```typescript
// Cache API responses with different TTLs
await storage.set(`api-${endpoint}`, response, {
  ttl: endpoint.includes('/static') ? 86400000 : 300000
});
```

### Session Management

```typescript
// Session with absolute expiration
const sessionEnd = Date.now() + (8 * 3600000); // 8 hours
await storage.set('user-session', session, {
  expireAt: sessionEnd,
  encrypt: true
});
```

## Troubleshooting

### Items Not Expiring

1. Check if auto-cleanup is enabled
2. Verify TTL values are in milliseconds
3. Ensure cleanup interval is reasonable
4. Check if storage adapter supports TTL

### Performance Issues

1. Increase cleanup interval
2. Reduce batch size
3. Consider using different storage adapter

### Memory Usage

1. Lower the cleanup interval
2. Reduce TTL values
3. Manually trigger cleanup
4. Monitor storage size

## Related Features

- [Encryption](./encryption.md) - Secure storage with encryption
- [Compression](./compression.md) - Reduce storage size
- [Sync](./sync.md) - Cross-tab synchronization
- [Queries](./query.md) - Query stored data