# Quick Start

Get up and running with Strata Storage in 5 minutes.

## 1. Install

```bash
npm install strata-storage
```

## 2. Basic Usage

### Vanilla JavaScript/TypeScript

```typescript
import { Strata } from 'strata-storage';

// Create instance
const storage = new Strata();

// Initialize
await storage.initialize();

// Store data
await storage.set('user', { name: 'John', age: 30 });

// Retrieve data
const user = await storage.get('user');
console.log(user); // { name: 'John', age: 30 }

// Remove data
await storage.remove('user');

// Check existence
const exists = await storage.has('user');
console.log(exists); // false
```

### React

```jsx
import { StrataProvider, useStorage } from 'strata-storage/react';

// Wrap your app
function App() {
  return (
    <StrataProvider>
      <UserProfile />
    </StrataProvider>
  );
}

// Use in components
function UserProfile() {
  const [user, setUser, loading] = useStorage('user', { name: 'Guest' });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Hello, {user.name}!</h1>
      <button onClick={() => setUser({ name: 'John' })}>
        Change Name
      </button>
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <div>
    <h1>Hello, {{ user?.name || 'Guest' }}!</h1>
    <button @click="updateName">Change Name</button>
  </div>
</template>

<script setup>
import { useStorage } from 'strata-storage/vue';

const { value: user, update } = useStorage('user', { name: 'Guest' });

const updateName = () => {
  update({ name: 'John' });
};
</script>
```

### Angular

```typescript
import { Component } from '@angular/core';
import { StrataService } from 'strata-storage/angular';

@Component({
  selector: 'app-user',
  template: `
    <h1>Hello, {{ userName }}!</h1>
    <button (click)="updateName()">Change Name</button>
  `
})
export class UserComponent {
  userName = 'Guest';

  constructor(private strata: StrataService) {
    this.loadUser();
  }

  async loadUser() {
    const user = await this.strata.get('user').toPromise();
    this.userName = user?.name || 'Guest';
  }

  async updateName() {
    await this.strata.set('user', { name: 'John' }).toPromise();
    this.userName = 'John';
  }
}
```

## 3. Advanced Features

### Encryption

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secret-key'
  }
});

// Data is automatically encrypted
await storage.set('sensitive', { 
  creditCard: '1234-5678-9012-3456' 
});
```

### TTL (Time To Live)

```typescript
// Expires in 1 hour
await storage.set('session', userData, {
  ttl: 3600000 // milliseconds
});

// Check remaining time
const ttl = await storage.getTTL('session');
console.log(`Expires in ${ttl}ms`);

// Extend expiration
await storage.extendTTL('session', 1800000); // +30 min
```

### Querying

```typescript
// Store multiple items
await storage.set('user:1', { name: 'John', age: 30, role: 'admin' });
await storage.set('user:2', { name: 'Jane', age: 25, role: 'user' });
await storage.set('user:3', { name: 'Bob', age: 35, role: 'user' });

// Query with MongoDB-like syntax
const admins = await storage.query({
  'value.role': 'admin'
});

const youngUsers = await storage.query({
  'value.age': { $lt: 30 }
});

const users = await storage.query({
  'key': { $regex: '^user:' }
});
```

### Cross-Tab Sync

```typescript
// Enable sync
const storage = new Strata({
  sync: { enabled: true }
});

// Subscribe to changes from other tabs
storage.subscribe((change) => {
  console.log(`${change.key} changed in another tab`);
});
```

### Compression

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Only compress if > 1KB
  }
});

// Large data is automatically compressed
await storage.set('largeData', bigJsonObject);
```

## 4. Storage Adapters

### Choose Storage Type

```typescript
// Use specific storage
await storage.set('key', 'value', { 
  storage: 'indexedDB' 
});

// Priority fallback
const storage = new Strata({
  defaultStorages: ['indexedDB', 'localStorage', 'memory']
});
```

### Platform-Specific

```typescript
// iOS/Android with Capacitor
await storage.set('secure-token', token, {
  storage: 'secure' // Uses Keychain/Keystore
});

// Preferences (UserDefaults/SharedPreferences)
await storage.set('settings', preferences, {
  storage: 'preferences'
});
```

## 5. Error Handling

```typescript
try {
  await storage.set('key', value);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.error('Storage full');
  } else if (error.name === 'EncryptionError') {
    console.error('Encryption failed');
  }
}
```

## 6. Best Practices

### 1. Initialize Once

```typescript
// App initialization
const storage = new Strata(config);
await storage.initialize();

// Export for reuse
export default storage;
```

### 2. Use TypeScript

```typescript
interface User {
  name: string;
  email: string;
}

// Type-safe storage
const user = await storage.get<User>('user');
```

### 3. Handle Loading States

```typescript
const [data, setData, loading] = useStorage('key');

if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Clean Up

```typescript
// Remove expired items
await storage.cleanupExpired();

// Clear all data
await storage.clear();

// Close connections
await storage.close();
```

## Complete Example

```typescript
import { Strata } from 'strata-storage';

async function main() {
  // Initialize with full configuration
  const storage = new Strata({
    defaultStorages: ['indexedDB', 'localStorage'],
    encryption: { enabled: true, password: 'secret' },
    compression: { enabled: true },
    sync: { enabled: true },
    ttl: { defaultTTL: 3600000 }
  });

  await storage.initialize();

  // User session with TTL
  await storage.set('session', {
    userId: '123',
    token: 'abc-def-ghi',
    permissions: ['read', 'write']
  }, {
    ttl: 3600000, // 1 hour
    encrypt: true,
    tags: ['auth', 'session']
  });

  // Settings with persistence
  await storage.set('settings', {
    theme: 'dark',
    language: 'en',
    notifications: true
  }, {
    storage: 'preferences' // Native storage on mobile
  });

  // Subscribe to changes
  const unsubscribe = storage.subscribe((change) => {
    if (change.key === 'session' && !change.newValue) {
      console.log('Session expired, redirecting to login...');
    }
  });

  // Query tagged items
  const authItems = await storage.query({
    tags: { $in: ['auth'] }
  });

  // Cleanup
  window.addEventListener('beforeunload', () => {
    unsubscribe();
    storage.close();
  });
}

main().catch(console.error);
```

## Next Steps

- [Basic Usage Guide](./guides/basic-usage.md) - Detailed examples
- [Encryption Guide](./guides/encryption.md) - Secure your data
- [Framework Guides](./frameworks/react.md) - React, Vue, Angular
- [API Reference](./api/core.md) - Complete API documentation

Need help? Check our [FAQ](./faq.md) or [open an issue](https://github.com/aoneahsan/strata-storage/issues).