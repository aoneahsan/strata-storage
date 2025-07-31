# Basic Usage Examples

Simple examples to get started with Strata Storage.

## Installation

```bash
npm install strata-storage
# or
yarn add strata-storage
```

## Basic Operations

### Store and Retrieve Data

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Store data
await storage.set('user_name', 'John Doe');
await storage.set('user_age', 30);
await storage.set('user_preferences', {
  theme: 'dark',
  language: 'en',
  notifications: true
});

// Retrieve data
const name = await storage.get('user_name');
console.log(name); // 'John Doe'

const preferences = await storage.get('user_preferences');
console.log(preferences); // { theme: 'dark', ... }
```

### Remove Data

```typescript
// Remove single item
await storage.remove('user_age');

// Clear all data
await storage.clear();
```

### Check Existence

```typescript
// Check if key exists
const exists = await storage.has('user_name');
console.log(exists); // true or false

// Get all keys
const keys = await storage.keys();
console.log(keys); // ['user_name', 'user_preferences', ...]
```

## Storage Options

### Specify Storage Type

```typescript
// Use specific storage
await storage.set('session_data', data, {
  storage: 'sessionStorage'
});

await storage.set('persistent_data', data, {
  storage: 'localStorage'
});

await storage.set('large_data', data, {
  storage: 'indexedDB'
});
```

### Set Expiration

```typescript
// Data expires in 1 hour
await storage.set('temp_token', token, {
  ttl: 3600000 // milliseconds
});

// Data expires at specific time
await storage.set('daily_cache', data, {
  expireAt: new Date('2024-12-31T23:59:59')
});
```

## Working with Complex Data

### Objects and Arrays

```typescript
// Store complex objects
const user = {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  roles: ['user', 'admin'],
  metadata: {
    lastLogin: new Date(),
    loginCount: 42
  }
};

await storage.set('current_user', user);

// Retrieve and use
const savedUser = await storage.get('current_user');
console.log(savedUser.roles); // ['user', 'admin']
```

### Binary Data

```typescript
// Store ArrayBuffer
const buffer = new ArrayBuffer(256);
await storage.set('binary_data', buffer);

// Store Blob
const blob = new Blob(['Hello World'], { type: 'text/plain' });
await storage.set('file_blob', blob);

// Store Uint8Array
const bytes = new Uint8Array([1, 2, 3, 4, 5]);
await storage.set('byte_array', bytes);
```

## Error Handling

```typescript
try {
  await storage.set('key', 'value');
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    console.error('Storage quota exceeded');
  } else {
    console.error('Storage error:', error);
  }
}

// Safe get with default value
const value = await storage.get('maybe_missing') || 'default';
```

## Batch Operations

```typescript
// Set multiple values
const items = {
  'user:1': { name: 'Alice' },
  'user:2': { name: 'Bob' },
  'user:3': { name: 'Charlie' }
};

for (const [key, value] of Object.entries(items)) {
  await storage.set(key, value);
}

// Get multiple values
const userIds = ['user:1', 'user:2', 'user:3'];
const users = [];

for (const id of userIds) {
  const user = await storage.get(id);
  if (user) users.push(user);
}
```

## Namespace Support

```typescript
// Create namespaced storage
const userStorage = new Strata({ namespace: 'users' });
const appStorage = new Strata({ namespace: 'app' });

// Data is isolated
await userStorage.set('data', 'user data');
await appStorage.set('data', 'app data');

const userData = await userStorage.get('data'); // 'user data'
const appData = await appStorage.get('data'); // 'app data'
```

## Platform Detection

```typescript
// Automatic platform-optimized storage
const storage = new Strata();

// On web: Uses localStorage/IndexedDB
// On iOS: Uses UserDefaults/SQLite
// On Android: Uses SharedPreferences/SQLite

await storage.set('cross_platform', 'Works everywhere!');
```

## Next Steps

- [Configuration Options](./configuration.md)
- [Error Handling](./error-handling.md)
- [Advanced Features](../guides/)