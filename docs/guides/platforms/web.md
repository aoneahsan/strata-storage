# Web Platform Guide

Complete guide for using Strata Storage in web applications.

## Overview

Strata Storage provides seamless storage capabilities for web browsers, automatically selecting the best available storage mechanism.

## Available Adapters

- **Memory** - Fast in-memory storage
- **LocalStorage** - Persistent domain storage
- **SessionStorage** - Session-scoped storage
- **IndexedDB** - Large-scale database storage
- **Cookies** - Server-accessible storage
- **Cache** - Service Worker cache storage

## Quick Start

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  platform: 'web',
  defaultStorages: ['indexedDB', 'localStorage', 'memory']
});

await storage.initialize();
```

## Browser Compatibility

| Browser | LocalStorage | IndexedDB | Cache API | Cookies |
|---------|--------------|-----------|-----------|---------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 85+ | ✅ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |

## Storage Selection

### Automatic Selection

```typescript
// Strata automatically selects the best storage
await storage.set('data', value); // Uses IndexedDB if available
```

### Manual Selection

```typescript
// Force specific storage
await storage.set('data', value, { storage: 'localStorage' });

// Fallback chain
await storage.set('data', value, { 
  storage: ['indexedDB', 'localStorage', 'memory'] 
});
```

## Web-Specific Features

### Cross-Tab Synchronization

```typescript
// Enable cross-tab sync
const storage = new Strata({
  sync: {
    enabled: true,
    channelName: 'strata-sync'
  }
});

// Listen for changes from other tabs
storage.subscribe((change) => {
  if (change.source === 'remote') {
    console.log('Data changed in another tab');
  }
});
```

### Service Worker Integration

```typescript
// In service worker
self.addEventListener('install', async (event) => {
  const storage = new Strata();
  await storage.initialize();
  
  // Pre-cache resources
  await storage.set('app-shell', appShellData, {
    storage: 'cache'
  });
});
```

### Progressive Web App

```typescript
// Check storage persistence
if ('storage' in navigator && 'persist' in navigator.storage) {
  const isPersisted = await navigator.storage.persist();
  console.log(`Persistent storage: ${isPersisted}`);
}

// Monitor storage quota
const estimate = await navigator.storage.estimate();
console.log(`Using ${estimate.usage} of ${estimate.quota} bytes`);
```

## Performance Optimization

### 1. Use Appropriate Storage

```typescript
// Small, frequently accessed data
await storage.set('preference', value, { 
  storage: 'localStorage' 
});

// Large datasets
await storage.set('dataset', largeData, { 
  storage: 'indexedDB' 
});

// Temporary data
await storage.set('cache', tempData, { 
  storage: 'memory' 
});
```

### 2. Enable Compression

```typescript
// Compress large data automatically
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Compress data > 1KB
  }
});
```

### 3. Implement Caching

```typescript
class CachedAPI {
  async fetchData(endpoint: string) {
    // Check cache first
    const cached = await storage.get(`api:${endpoint}`, {
      storage: 'memory'
    });
    
    if (cached) return cached;
    
    // Fetch and cache
    const data = await fetch(endpoint).then(r => r.json());
    await storage.set(`api:${endpoint}`, data, {
      storage: 'memory',
      ttl: 300000 // 5 minutes
    });
    
    return data;
  }
}
```

## Security Considerations

1. **HTTPS Required**: Some features require secure context
2. **Same-Origin Policy**: Storage is origin-bound
3. **XSS Prevention**: Sanitize user input before storing
4. **Sensitive Data**: Use encryption for sensitive information

## Common Patterns

### User Preferences

```typescript
class PreferenceManager {
  async save(prefs: UserPreferences) {
    await storage.set('preferences', prefs, {
      storage: 'localStorage'
    });
  }
  
  async load(): Promise<UserPreferences> {
    return await storage.get('preferences', {
      storage: 'localStorage'
    }) || defaultPreferences;
  }
}
```

### Offline Support

```typescript
class OfflineManager {
  async cacheForOffline() {
    const criticalData = await fetchCriticalData();
    
    await storage.set('offline-data', criticalData, {
      storage: ['indexedDB', 'localStorage']
    });
  }
  
  async getOfflineData() {
    return await storage.get('offline-data', {
      storage: ['indexedDB', 'localStorage', 'memory']
    });
  }
}
```

## Troubleshooting

### Storage Not Available

```typescript
// Check availability before use
const types = storage.getAvailableStorageTypes();
if (!types.includes('indexedDB')) {
  console.warn('IndexedDB not available');
}
```

### Quota Exceeded

```typescript
try {
  await storage.set('data', largeData);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Clear old data
    await storage.clear({
      olderThan: Date.now() - 86400000 // 24 hours
    });
  }
}
```

## See Also

- [Storage Adapters Overview](../../api/adapters/README.md)
- [Web Examples](../../examples/web/README.md)
- [Security Guide](../security.md)