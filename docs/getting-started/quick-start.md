# Quick Start

Get up and running with Strata Storage in just a few minutes.

## Basic Usage

### 1. Import and Initialize

```typescript
import { Strata } from 'strata-storage';

// Create instance with default configuration
const storage = new Strata();

// Initialize (required before first use)
await storage.initialize();
```

### 2. Store Data

```typescript
// Store simple values
await storage.set('username', 'john_doe');
await storage.set('theme', 'dark');
await storage.set('isLoggedIn', true);

// Store objects
await storage.set('user', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});

// Store arrays
await storage.set('favorites', ['item1', 'item2', 'item3']);
```

### 3. Retrieve Data

```typescript
// Get simple values
const username = await storage.get('username'); // 'john_doe'
const theme = await storage.get('theme'); // 'dark'

// Get objects
const user = await storage.get('user');
console.log(user.name); // 'John Doe'

// Get with default value
const language = await storage.get('language') || 'en';
```

### 4. Remove Data

```typescript
// Remove single item
await storage.remove('username');

// Clear all data
await storage.clear();
```

## Advanced Examples

### Using Different Storage Types

```typescript
// Explicitly use IndexedDB
await storage.set('largeData', bigObject, { 
  storage: 'indexedDB' 
});

// Use session storage for temporary data
await storage.set('sessionToken', token, { 
  storage: 'sessionStorage' 
});

// Use secure storage on mobile
await storage.set('apiKey', key, { 
  storage: 'secure' 
});
```

### Encryption

```typescript
// Enable encryption for sensitive data
const secureStorage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secure-password'
  }
});

await secureStorage.initialize();
await secureStorage.set('creditCard', {
  number: '****-****-****-1234',
  cvv: '***'
});
```

### Time-To-Live (TTL)

```typescript
// Data expires in 1 hour
await storage.set('sessionData', data, {
  ttl: 60 * 60 * 1000 // milliseconds
});

// Data expires at specific time
await storage.set('dailyCache', data, {
  expireAt: new Date('2024-12-31T23:59:59')
});
```

### Compression

```typescript
// Enable compression for large data
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Compress data larger than 1KB
  }
});

await storage.initialize();
await storage.set('largeJson', hugeDataObject);
```

### Cross-Tab Synchronization

```typescript
// Enable sync across browser tabs
const storage = new Strata({
  sync: {
    enabled: true
  }
});

await storage.initialize();

// Subscribe to changes from other tabs
storage.subscribe((change) => {
  console.log(`Key ${change.key} changed to:`, change.newValue);
});
```

### Querying Data

```typescript
// Store multiple items with tags
await storage.set('doc1', data1, { tags: ['important', 'work'] });
await storage.set('doc2', data2, { tags: ['personal'] });
await storage.set('doc3', data3, { tags: ['work'] });

// Query by tags
const workDocs = await storage.query({
  tags: { contains: 'work' }
});
```

## Common Patterns

### User Preferences

```typescript
class PreferenceManager {
  private storage = new Strata();
  
  async init() {
    await this.storage.initialize();
  }
  
  async setTheme(theme: 'light' | 'dark') {
    await this.storage.set('preferences.theme', theme);
  }
  
  async getTheme(): Promise<'light' | 'dark'> {
    return await this.storage.get('preferences.theme') || 'light';
  }
  
  async setLanguage(lang: string) {
    await this.storage.set('preferences.language', lang);
  }
}
```

### Cache with Expiration

```typescript
class CacheManager {
  private storage = new Strata();
  
  async init() {
    await this.storage.initialize();
  }
  
  async cacheApiResponse(endpoint: string, data: any) {
    await this.storage.set(`cache:${endpoint}`, data, {
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  }
  
  async getCached(endpoint: string) {
    return await this.storage.get(`cache:${endpoint}`);
  }
}
```

### Secure Token Storage

```typescript
class TokenManager {
  private storage = new Strata({
    encryption: { enabled: true }
  });
  
  async init() {
    await this.storage.initialize();
  }
  
  async saveTokens(tokens: { access: string; refresh: string }) {
    await this.storage.set('auth.tokens', tokens, {
      storage: 'secure', // Use secure storage on mobile
      encrypt: true
    });
  }
  
  async getTokens() {
    return await this.storage.get('auth.tokens');
  }
}
```

## Error Handling

```typescript
import { StorageError, QuotaExceededError } from 'strata-storage';

try {
  await storage.set('data', largeData);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded');
    // Clear old data or use different storage
  } else if (error instanceof StorageError) {
    console.error('Storage error:', error.message);
  }
}
```

## Next Steps

- Learn about [Configuration Options](./configuration.md)
- Explore [Storage Adapters](../api/adapters/README.md)
- Read about [Advanced Features](../guides/features/encryption.md)
- See [Platform-Specific Guides](../guides/platforms/web.md)