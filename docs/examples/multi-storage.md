# Multi-Storage Examples

Examples of using multiple storage types simultaneously in Strata Storage.

## Storage Fallback Chain

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  defaultStorages: ['indexedDB', 'localStorage', 'sessionStorage', 'memory'],
  fallbackOnError: true
});

// Automatically tries each storage in order until one succeeds
await storage.set('important-data', data);
```

## Storage-Specific Operations

```typescript
// Use specific storage for different data types
const storage = new Strata();

// Secure data in IndexedDB
await storage.set('user-profile', profile, {
  storage: 'indexedDB',
  encrypt: true
});

// Temporary data in sessionStorage
await storage.set('session-data', sessionData, {
  storage: 'sessionStorage'
});

// Cached data in localStorage with TTL
await storage.set('api-cache', apiData, {
  storage: 'localStorage',
  ttl: 300000 // 5 minutes
});

// In-memory for sensitive temporary data
await storage.set('temp-password', password, {
  storage: 'memory'
});
```

## Platform-Adaptive Storage

```typescript
import { Capacitor } from '@capacitor/core';

class AdaptiveStorage {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      defaultStorages: this.getStoragesForPlatform()
    });
  }
  
  private getStoragesForPlatform(): string[] {
    if (Capacitor.isNativePlatform()) {
      return ['secure', 'sqlite', 'preferences'];
    } else if (typeof window !== 'undefined') {
      return ['indexedDB', 'localStorage', 'memory'];
    } else {
      return ['memory']; // Node.js environment
    }
  }
}
```

## Storage Migration

```typescript
class StorageMigrator {
  private storage: Strata;
  
  async migrateToIndexedDB() {
    // Get all data from localStorage
    const localData = await this.storage.query({}, {
      storage: 'localStorage'
    });
    
    // Move to IndexedDB
    for (const item of localData) {
      await this.storage.set(item.key, item.value, {
        storage: 'indexedDB'
      });
      
      // Remove from localStorage
      await this.storage.remove(item.key, {
        storage: 'localStorage'
      });
    }
  }
  
  async consolidateStorage() {
    const storages = ['localStorage', 'sessionStorage', 'cookies'];
    const allData: any[] = [];
    
    // Collect from all storages
    for (const storage of storages) {
      const data = await this.storage.query({}, { storage });
      allData.push(...data);
    }
    
    // Consolidate in IndexedDB
    for (const item of allData) {
      await this.storage.set(item.key, item.value, {
        storage: 'indexedDB'
      });
    }
  }
}
```

## Storage Load Balancing

```typescript
class BalancedStorage {
  private storage: Strata;
  private usage = new Map<string, number>();
  
  async set(key: string, value: any, options?: any) {
    const storage = await this.selectOptimalStorage(value);
    
    return this.storage.set(key, value, {
      ...options,
      storage
    });
  }
  
  private async selectOptimalStorage(value: any): Promise<string> {
    const size = JSON.stringify(value).length;
    
    // Large data goes to IndexedDB
    if (size > 100000) {
      return 'indexedDB';
    }
    
    // Check storage usage
    const localUsage = await this.getStorageUsage('localStorage');
    const sessionUsage = await this.getStorageUsage('sessionStorage');
    
    // Use less utilized storage
    return localUsage < sessionUsage ? 'localStorage' : 'sessionStorage';
  }
  
  private async getStorageUsage(storage: string): Promise<number> {
    const items = await this.storage.query({}, { storage });
    return items.reduce((total, item) => 
      total + JSON.stringify(item.value).length, 0
    );
  }
}
```

## Storage Sync Strategy

```typescript
class SyncedMultiStorage {
  private primary: Strata;
  private secondary: Strata;
  
  constructor() {
    // Primary storage - fast access
    this.primary = new Strata({
      defaultStorages: ['memory', 'sessionStorage']
    });
    
    // Secondary storage - persistent
    this.secondary = new Strata({
      defaultStorages: ['indexedDB', 'localStorage']
    });
  }
  
  async set(key: string, value: any) {
    // Write to primary immediately
    await this.primary.set(key, value);
    
    // Async write to secondary
    this.secondary.set(key, value).catch(console.error);
  }
  
  async get(key: string) {
    // Try primary first
    let value = await this.primary.get(key);
    
    if (value === null) {
      // Fallback to secondary
      value = await this.secondary.get(key);
      
      // Restore to primary if found
      if (value !== null) {
        await this.primary.set(key, value);
      }
    }
    
    return value;
  }
}
```

## Storage Type Routing

```typescript
interface StorageRoute {
  pattern: RegExp;
  storage: string;
  options?: any;
}

class RoutedStorage {
  private storage: Strata;
  private routes: StorageRoute[] = [
    {
      pattern: /^auth:/,
      storage: 'secure',
      options: { encrypt: true }
    },
    {
      pattern: /^cache:/,
      storage: 'localStorage',
      options: { ttl: 300000 }
    },
    {
      pattern: /^temp:/,
      storage: 'memory'
    },
    {
      pattern: /^user:/,
      storage: 'indexedDB',
      options: { compress: true }
    }
  ];
  
  async set(key: string, value: any, options?: any) {
    const route = this.routes.find(r => r.pattern.test(key));
    
    if (route) {
      return this.storage.set(key, value, {
        ...route.options,
        ...options,
        storage: route.storage
      });
    }
    
    // Default storage
    return this.storage.set(key, value, options);
  }
}
```

## See Also

- [LocalStorage Adapter](../api/adapters/web/localstorage.md)
- [Configuration Guide](../getting-started/configuration.md)
- [Performance Optimization](./performance.md)