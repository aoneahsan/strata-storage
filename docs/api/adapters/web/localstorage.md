# LocalStorage Adapter

Persistent browser storage using the localStorage API.

## Overview

The LocalStorage adapter provides simple, synchronous, persistent storage in web browsers. Data persists across browser sessions and page reloads.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ✅ Yes |
| Observable | ✅ Yes (same origin) |
| Searchable | ✅ Yes |
| Iterable | ✅ Yes |
| Capacity | ~10MB |
| Performance | 🚀 Fast |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Explicitly use localStorage
await storage.set('preference', value, { storage: 'localStorage' });
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    localStorage: {
      prefix: 'myapp_',
      serialize: JSON.stringify,
      deserialize: JSON.parse
    }
  }
});
```

### Configuration Options

- `prefix` (string): Prefix for all keys (default: 'strata_')
- `serialize` (function): Custom serialization function
- `deserialize` (function): Custom deserialization function

## Features

### Cross-Tab Synchronization

```typescript
// Changes are synchronized across tabs
storage.subscribe((change) => {
  if (change.source === 'remote') {
    console.log(`Tab updated ${change.key}`);
  }
}, { storage: 'localStorage' });
```

### Domain Persistence

```typescript
// Data persists for the domain
await storage.set('userData', user, { storage: 'localStorage' });
// Available after browser restart
```

### Synchronous Operations

```typescript
// LocalStorage operations are synchronous under the hood
// But Strata wraps them in promises for consistency
const value = await storage.get('key', { storage: 'localStorage' });
```

## Use Cases

### 1. User Preferences

```typescript
class PreferenceManager {
  async saveTheme(theme: 'light' | 'dark') {
    await storage.set('theme', theme, { 
      storage: 'localStorage' 
    });
  }
  
  async getTheme() {
    return await storage.get<'light' | 'dark'>('theme', { 
      storage: 'localStorage' 
    }) || 'light';
  }
  
  async saveLanguage(lang: string) {
    await storage.set('language', lang, { 
      storage: 'localStorage' 
    });
  }
}
```

### 2. Form Draft Saving

```typescript
// Auto-save form drafts
function setupFormAutosave(formId: string) {
  const form = document.getElementById(formId);
  
  form?.addEventListener('input', async (e) => {
    const formData = new FormData(form as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    await storage.set(`draft:${formId}`, data, {
      storage: 'localStorage',
      ttl: 604800000 // 7 days
    });
  });
  
  // Restore draft on load
  const draft = await storage.get(`draft:${formId}`, {
    storage: 'localStorage'
  });
  
  if (draft) {
    // Restore form fields
  }
}
```

### 3. Shopping Cart

```typescript
class CartManager {
  private cartKey = 'shopping_cart';
  
  async addItem(item: CartItem) {
    const cart = await this.getCart();
    cart.items.push(item);
    cart.updatedAt = Date.now();
    
    await storage.set(this.cartKey, cart, {
      storage: 'localStorage'
    });
  }
  
  async getCart(): Promise<Cart> {
    const cart = await storage.get<Cart>(this.cartKey, {
      storage: 'localStorage'
    });
    
    return cart || { items: [], updatedAt: Date.now() };
  }
  
  async clearCart() {
    await storage.remove(this.cartKey, {
      storage: 'localStorage'
    });
  }
}
```

### 4. Offline Queue

```typescript
// Queue actions for offline processing
class OfflineQueue {
  async addAction(action: Action) {
    const queue = await this.getQueue();
    queue.push({
      ...action,
      timestamp: Date.now()
    });
    
    await storage.set('offline_queue', queue, {
      storage: 'localStorage'
    });
  }
  
  async processQueue() {
    const queue = await this.getQueue();
    
    for (const action of queue) {
      try {
        await this.processAction(action);
        // Remove processed action
      } catch (error) {
        // Keep in queue for retry
      }
    }
  }
  
  private async getQueue() {
    return await storage.get('offline_queue', {
      storage: 'localStorage'
    }) || [];
  }
}
```

## Storage Limits

### Size Limits by Browser

| Browser | Limit |
|---------|-------|
| Chrome | 10MB |
| Firefox | 10MB |
| Safari | 5MB |
| Edge | 10MB |

### Handling Quota Errors

```typescript
try {
  await storage.set('data', largeData, { storage: 'localStorage' });
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Clear old data
    await storage.clear({
      storage: 'localStorage',
      filter: (key) => key.startsWith('cache:'),
      olderThan: Date.now() - 86400000 // 24 hours
    });
    
    // Retry
    await storage.set('data', largeData, { storage: 'localStorage' });
  }
}
```

## Cross-Origin Limitations

```typescript
// LocalStorage is bound to origin (protocol + domain + port)
// https://example.com cannot access http://example.com localStorage
// example.com:3000 cannot access example.com:3001 localStorage

// Use a consistent origin or implement cross-origin communication
if (window.location.origin === 'https://app.example.com') {
  await storage.set('data', value, { storage: 'localStorage' });
}
```

## Best Practices

### 1. Use Prefixes

```typescript
// Namespace your keys to avoid conflicts
const storage = new Strata({
  adapters: {
    localStorage: {
      prefix: 'myapp_v1_'
    }
  }
});
```

### 2. Implement Versioning

```typescript
// Version your storage schema
const STORAGE_VERSION = 2;

async function migrateStorage() {
  const version = await storage.get('_version', { 
    storage: 'localStorage' 
  });
  
  if (!version || version < STORAGE_VERSION) {
    // Run migrations
    if (version === 1) {
      await migrateV1ToV2();
    }
    
    await storage.set('_version', STORAGE_VERSION, { 
      storage: 'localStorage' 
    });
  }
}
```

### 3. Handle Storage Events

```typescript
// Listen for changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('myapp_')) {
    console.log('Storage changed:', e.key, e.newValue);
  }
});

// Or use Strata's subscription
const unsubscribe = storage.subscribe((change) => {
  console.log('Change detected:', change);
}, { storage: 'localStorage' });
```

### 4. Compress Large Data

```typescript
// Enable compression for large objects
await storage.set('largeData', data, {
  storage: 'localStorage',
  compress: true // Automatically compress if beneficial
});
```

## Performance Considerations

### 1. Blocking Operations

```typescript
// localStorage is synchronous and can block the main thread
// For large operations, consider batching

const batch = [];
for (let i = 0; i < 1000; i++) {
  batch.push({ key: `item_${i}`, value: data[i] });
}

// Batch write
for (const { key, value } of batch) {
  await storage.set(key, value, { storage: 'localStorage' });
}
```

### 2. JSON Serialization

```typescript
// Avoid storing non-serializable values
const good = {
  name: 'John',
  age: 30,
  tags: ['user', 'active']
};

const bad = {
  date: new Date(), // Loses type
  func: () => {}, // Cannot serialize
  regex: /pattern/ // Loses type
};

// Use custom serialization if needed
const storage = new Strata({
  adapters: {
    localStorage: {
      serialize: (value) => JSON.stringify(value, replacer),
      deserialize: (text) => JSON.parse(text, reviver)
    }
  }
});
```

## Security Considerations

### 1. No Sensitive Data

```typescript
// Never store sensitive data in localStorage
// BAD
await storage.set('password', userPassword, { 
  storage: 'localStorage' 
});

// GOOD - Use secure storage for sensitive data
await storage.set('password', userPassword, { 
  storage: 'secure',
  encrypt: true 
});
```

### 2. XSS Vulnerabilities

```typescript
// Validate data before storing
function sanitizeUserInput(input: string): string {
  // Remove potential XSS vectors
  return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
}

await storage.set('userContent', sanitizeUserInput(content), {
  storage: 'localStorage'
});
```

## Migration and Fallbacks

```typescript
// Fallback chain when localStorage is not available
await storage.set('data', value, {
  storage: ['localStorage', 'sessionStorage', 'memory']
});

// Check availability
if (storage.getAvailableStorageTypes().includes('localStorage')) {
  // Use localStorage
} else {
  // Use alternative
}
```

## Debugging

```typescript
// Debug localStorage contents
const allKeys = await storage.keys(null, { storage: 'localStorage' });
for (const key of allKeys) {
  const value = await storage.get(key, { storage: 'localStorage' });
  console.log(key, value);
}

// Get size information
const size = await storage.size(true);
console.log('LocalStorage usage:', size.byStorage?.localStorage);
```

## See Also

- [Storage Adapters Overview](../README.md)
- [SessionStorage Adapter](./sessionstorage.md) - Session-scoped storage
- [IndexedDB Adapter](./indexeddb.md) - Large-scale storage
- [Cross-Tab Sync Guide](../../../guides/features/sync.md)