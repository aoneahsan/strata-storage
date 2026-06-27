# Basic CRUD Operations

Learn how to perform Create, Read, Update, and Delete operations with Strata Storage.

## Table of Contents

- [Setup](#setup)
- [Create (Set)](#create-set)
- [Read (Get)](#read-get)
- [Update](#update)
- [Delete (Remove)](#delete-remove)
- [List Operations](#list-operations)
- [Batch Operations](#batch-operations)
- [Error Handling](#error-handling)

## Setup

First, initialize Strata Storage:

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();
```

## Create (Set)

### Store Simple Values

```typescript
// String
await storage.set('username', 'john_doe');

// Number
await storage.set('age', 25);

// Boolean
await storage.set('isActive', true);

// Null
await storage.set('optionalValue', null);
```

### Store Objects

```typescript
await storage.set('user', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
});
```

### Store Arrays

```typescript
await storage.set('favoriteColors', ['red', 'blue', 'green']);

await storage.set('users', [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
]);
```

### Store with Options

```typescript
// Specify storage adapter
await storage.set('largeData', bigObject, {
  storage: 'indexedDB'
});

// With TTL (expires in 1 hour)
await storage.set('sessionData', data, {
  ttl: 60 * 60 * 1000
});

// With encryption
await storage.set('sensitiveData', secret, {
  encrypt: true
});

// With compression
await storage.set('hugeData', massiveObject, {
  compress: true
});

// With tags for querying
await storage.set('document', content, {
  tags: ['work', 'important', '2024']
});
```

## Read (Get)

### Retrieve Simple Values

```typescript
const username = await storage.get('username');
console.log(username); // 'john_doe'

const age = await storage.get('age');
console.log(age); // 25

const isActive = await storage.get('isActive');
console.log(isActive); // true
```

### Retrieve Objects

```typescript
const user = await storage.get('user');
console.log(user);
// { id: 123, name: 'John Doe', email: 'john@example.com', age: 25 }

// Access properties
console.log(user.name); // 'John Doe'
console.log(user.email); // 'john@example.com'
```

### Retrieve Arrays

```typescript
const colors = await storage.get('favoriteColors');
console.log(colors); // ['red', 'blue', 'green']

const users = await storage.get('users');
console.log(users);
// [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

### Get with Default Value

```typescript
// If key doesn't exist, returns null
const theme = await storage.get('theme');
console.log(theme); // null

// Use || for default value
const themeWithDefault = await storage.get('theme') || 'light';
console.log(themeWithDefault); // 'light'

// Use ?? for null coalescing
const language = await storage.get('language') ?? 'en';
console.log(language); // 'en'
```

### Type-Safe Retrieval (TypeScript)

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await storage.get<User>('user');

if (user) {
  // TypeScript knows user is User
  console.log(user.name); // Type-safe
}
```

### Get from Specific Adapter

```typescript
// Get from specific storage
const data = await storage.get('key', { storage: 'indexedDB' });
```

## Update

### Update Entire Value

```typescript
// Original
await storage.set('user', { id: 1, name: 'John', age: 25 });

// Update (replaces entire object)
await storage.set('user', { id: 1, name: 'John Doe', age: 26 });
```

### Update Object Property

```typescript
// Get current value
const user = await storage.get('user');

// Modify
user.age = 27;
user.email = 'newemail@example.com';

// Save back
await storage.set('user', user);
```

### Update with Spread Operator

```typescript
const user = await storage.get('user');

// Update specific properties
await storage.set('user', {
  ...user,
  age: 28,
  lastUpdated: new Date()
});
```

### Update Array

```typescript
// Add item to array
const colors = await storage.get('favoriteColors') || [];
colors.push('yellow');
await storage.set('favoriteColors', colors);

// Remove item from array
const users = await storage.get('users') || [];
const filteredUsers = users.filter(u => u.id !== 2);
await storage.set('users', filteredUsers);

// Update array item
const items = await storage.get('items') || [];
const updatedItems = items.map(item =>
  item.id === 3 ? { ...item, status: 'completed' } : item
);
await storage.set('items', updatedItems);
```

### Increment/Decrement

```typescript
// Increment counter
const count = await storage.get('counter') || 0;
await storage.set('counter', count + 1);

// Decrement
const score = await storage.get('score') || 100;
await storage.set('score', score - 10);
```

## Delete (Remove)

### Remove Single Item

```typescript
await storage.remove('username');

// Verify deletion
const username = await storage.get('username');
console.log(username); // null
```

### Remove Multiple Items

```typescript
await storage.remove('username');
await storage.remove('age');
await storage.remove('isActive');

// Or use removeBatch
await storage.removeBatch(['username', 'age', 'isActive']);
```

### Clear All Data

```typescript
// Remove everything
await storage.clear();

// Verify
const keys = await storage.keys();
console.log(keys); // []
```

### Clear Specific Adapter

```typescript
// Clear only localStorage
await storage.clear({ storage: 'localStorage' });

// Clear only indexedDB
await storage.clear({ storage: 'indexedDB' });
```

### Conditional Removal

```typescript
// Remove items matching condition
const allKeys = await storage.keys();

for (const key of allKeys) {
  if (key.startsWith('temp_')) {
    await storage.remove(key);
  }
}
```

## List Operations

### Get All Keys

```typescript
const keys = await storage.keys();
console.log(keys); // ['username', 'user', 'settings', ...]
```

### Get All Data

```typescript
const allData = await storage.getAll();
console.log(allData);
// {
//   username: 'john_doe',
//   user: { id: 123, name: 'John' },
//   settings: { theme: 'dark' }
// }
```

### Check if Key Exists

```typescript
const hasUsername = await storage.has('username');
console.log(hasUsername); // true

const hasUnknown = await storage.has('nonexistent');
console.log(hasUnknown); // false
```

### Get Storage Size

```typescript
// Get number of items
const count = await storage.size();
console.log(`Storage contains ${count} items`);

// Get approximate size in bytes (if supported)
const bytes = await storage.sizeInBytes();
console.log(`Storage uses ~${bytes} bytes`);
```

## Batch Operations

### Set Multiple Items

```typescript
await storage.setBatch([
  { key: 'username', value: 'john_doe' },
  { key: 'email', value: 'john@example.com' },
  { key: 'age', value: 25 }
]);
```

### Get Multiple Items

```typescript
const values = await storage.getBatch(['username', 'email', 'age']);
console.log(values);
// {
//   username: 'john_doe',
//   email: 'john@example.com',
//   age: 25
// }
```

### Remove Multiple Items

```typescript
await storage.removeBatch(['username', 'email', 'age']);
```

### Batch with Options

```typescript
await storage.setBatch([
  { key: 'user1', value: data1, options: { storage: 'indexedDB' } },
  { key: 'user2', value: data2, options: { encrypt: true } },
  { key: 'user3', value: data3, options: { ttl: 3600000 } }
]);
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  await storage.set('key', 'value');
} catch (error) {
  console.error('Failed to set value:', error);
}
```

### Handle Specific Errors

```typescript
import {
  StorageError,
  QuotaExceededError,
  StorageNotAvailableError
} from 'strata-storage';

try {
  await storage.set('largeData', hugeObject);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded');
    // Clear old data or use different adapter
    await storage.clear();
  } else if (error instanceof StorageNotAvailableError) {
    console.error('Storage not available');
    // Use fallback
    await storage.set('largeData', hugeObject, { storage: 'memory' });
  } else if (error instanceof StorageError) {
    console.error('Storage error:', error.message);
  }
}
```

### Safe Operations

```typescript
// Safely get with default
async function safeGet(key: string, defaultValue: any) {
  try {
    const value = await storage.get(key);
    return value ?? defaultValue;
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return defaultValue;
  }
}

// Safely set
async function safeSet(key: string, value: any) {
  try {
    await storage.set(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to set ${key}:`, error);
    return false;
  }
}

// Usage
const theme = await safeGet('theme', 'light');
const success = await safeSet('theme', 'dark');
```

## Complete Example

Here's a complete example demonstrating all CRUD operations:

```typescript
import { Strata } from 'strata-storage';

async function crudExample() {
  // Setup
  const storage = new Strata();
  await storage.initialize();

  // CREATE
  await storage.set('user', {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      language: 'en'
    }
  });

  console.log('User created');

  // READ
  const user = await storage.get('user');
  console.log('User data:', user);

  // UPDATE
  const updatedUser = {
    ...user,
    name: 'John Smith',
    preferences: {
      ...user.preferences,
      theme: 'light'
    }
  };
  await storage.set('user', updatedUser);
  console.log('User updated');

  // READ AGAIN
  const currentUser = await storage.get('user');
  console.log('Updated user:', currentUser);

  // LIST
  const allKeys = await storage.keys();
  console.log('All keys:', allKeys);

  const allData = await storage.getAll();
  console.log('All data:', allData);

  // DELETE
  await storage.remove('user');
  console.log('User deleted');

  // VERIFY
  const deletedUser = await storage.get('user');
  console.log('User after deletion:', deletedUser); // null
}

// Run the example
crudExample();
```

## Next Steps

- Learn about [Advanced Features](../../guides/features/encryption.md)
- See [Real-World Examples](../README.md)
- Explore [Storage Adapters](../../api/adapters/README.md)
