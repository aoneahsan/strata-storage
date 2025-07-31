# Configuration

Strata Storage provides extensive configuration options to customize behavior for your specific needs.

## Configuration Overview

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  // Platform detection (auto-detected by default)
  platform: 'web', // 'web' | 'ios' | 'android' | 'node'
  
  // Default storage types in order of preference
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  
  // Storage adapter specific configurations
  adapters: {
    indexedDB: {
      name: 'MyAppDB',
      version: 1,
      stores: ['data', 'cache', 'settings']
    },
    localStorage: {
      prefix: 'myapp_'
    },
    cookies: {
      domain: '.example.com',
      secure: true,
      sameSite: 'strict'
    }
  },
  
  // Encryption settings
  encryption: {
    enabled: false,
    password: 'your-secure-password',
    algorithm: 'AES-GCM',
    keyDerivation: 'PBKDF2'
  },
  
  // Compression settings
  compression: {
    enabled: false,
    algorithm: 'lz',
    threshold: 1024, // bytes
    level: 6
  },
  
  // Synchronization settings
  sync: {
    enabled: false,
    channelName: 'strata-sync',
    storages: ['localStorage', 'sessionStorage'],
    conflictResolution: 'latest',
    debounceMs: 50
  },
  
  // Time-to-live settings
  ttl: {
    enabled: true,
    defaultTTL: null,
    checkInterval: 60000, // 1 minute
    autoCleanup: true
  }
});
```

## Configuration Options

### Platform

Strata automatically detects the platform, but you can override it:

```typescript
const storage = new Strata({
  platform: 'ios' // Force iOS behavior
});
```

**Options:**
- `'web'` - Browser environment
- `'ios'` - iOS native (Capacitor)
- `'android'` - Android native (Capacitor)
- `'node'` - Node.js environment

### Default Storages

Specify storage preference order. Strata will use the first available:

```typescript
const storage = new Strata({
  defaultStorages: ['sqlite', 'preferences', 'memory']
});
```

**Web Options:**
- `'memory'` - In-memory storage
- `'localStorage'` - Browser localStorage
- `'sessionStorage'` - Browser sessionStorage
- `'indexedDB'` - IndexedDB database
- `'cookies'` - HTTP cookies
- `'cache'` - Cache API

**Mobile Options:**
- `'preferences'` - Native preferences (UserDefaults/SharedPreferences)
- `'sqlite'` - SQLite database
- `'secure'` - Keychain (iOS) / EncryptedSharedPreferences (Android)
- `'filesystem'` - File system storage

### Adapter Configuration

#### IndexedDB

```typescript
adapters: {
  indexedDB: {
    name: 'MyDatabase',      // Database name
    version: 1,              // Database version
    stores: ['data'],        // Object store names
    upgrade: (db, oldVersion, newVersion) => {
      // Custom upgrade logic
      if (oldVersion < 1) {
        db.createObjectStore('data');
      }
    }
  }
}
```

#### LocalStorage/SessionStorage

```typescript
adapters: {
  localStorage: {
    prefix: 'app_',          // Key prefix
    serialize: JSON.stringify, // Custom serializer
    deserialize: JSON.parse   // Custom deserializer
  }
}
```

#### Cookies

```typescript
adapters: {
  cookies: {
    domain: '.example.com',   // Cookie domain
    path: '/',               // Cookie path
    secure: true,            // HTTPS only
    sameSite: 'lax',        // SameSite attribute
    httpOnly: false,         // Can't set httpOnly from JS
    maxAge: 86400           // Seconds (24 hours)
  }
}
```

#### SQLite (Mobile)

```typescript
adapters: {
  sqlite: {
    database: 'app.db',      // Database file name
    version: '1.0',          // Schema version
    location: 'default',     // Storage location
    androidDatabaseLocation: 'default'
  }
}
```

### Encryption Configuration

```typescript
encryption: {
  enabled: true,             // Enable/disable encryption
  password: 'secret',        // Encryption password
  algorithm: 'AES-GCM',      // Encryption algorithm
  keyDerivation: 'PBKDF2',   // Key derivation function
  iterations: 100000,        // PBKDF2 iterations
  saltLength: 16,           // Salt length in bytes
  ivLength: 12,             // IV length in bytes
  tagLength: 16             // Tag length in bytes
}
```

### Compression Configuration

```typescript
compression: {
  enabled: true,            // Enable/disable compression
  algorithm: 'lz',          // Compression algorithm
  threshold: 1024,          // Min size to compress (bytes)
  level: 6,                 // Compression level (1-9)
  excludeTypes: ['image/', 'video/'] // MIME types to exclude
}
```

### Sync Configuration

```typescript
sync: {
  enabled: true,            // Enable cross-tab sync
  channelName: 'myapp-sync', // BroadcastChannel name
  storages: ['localStorage'], // Storages to sync
  conflictResolution: 'latest', // or 'merge' or custom function
  debounceMs: 50,          // Debounce sync messages
  excludeKeys: ['temp_'],   // Key patterns to exclude
  syncInterval: 5000       // Periodic sync interval
}
```

### TTL Configuration

```typescript
ttl: {
  enabled: true,            // Enable TTL support
  defaultTTL: 3600000,      // Default TTL (1 hour)
  checkInterval: 60000,     // Cleanup check interval
  autoCleanup: true,        // Auto-remove expired items
  slidingExpiration: false, // Reset TTL on access
  maxTTL: 86400000         // Maximum allowed TTL (24 hours)
}
```

## Environment-Specific Configuration

### Development

```typescript
const devConfig = {
  encryption: { enabled: false }, // Disable for debugging
  compression: { enabled: false },
  sync: { 
    enabled: true,
    debounceMs: 0 // Immediate sync for testing
  }
};
```

### Production

```typescript
const prodConfig = {
  encryption: { 
    enabled: true,
    password: process.env.STORAGE_KEY 
  },
  compression: { 
    enabled: true,
    threshold: 512 // Aggressive compression
  },
  ttl: {
    autoCleanup: true,
    checkInterval: 300000 // 5 minutes
  }
};
```

## Storage Selection Strategies

```typescript
import { StorageStrategy } from 'strata-storage';

const storage = new Strata({
  strategy: StorageStrategy.PERFORMANCE_FIRST,
  // or
  strategy: StorageStrategy.RELIABILITY_FIRST,
  // or
  strategy: StorageStrategy.CAPACITY_FIRST
});
```

## Custom Configuration Patterns

### Multi-Instance Configuration

```typescript
// User data storage
const userStorage = new Strata({
  defaultStorages: ['secure', 'preferences'],
  encryption: { enabled: true }
});

// Cache storage
const cacheStorage = new Strata({
  defaultStorages: ['cache', 'indexedDB'],
  ttl: { defaultTTL: 300000 } // 5 minutes
});

// Temporary storage
const tempStorage = new Strata({
  defaultStorages: ['memory', 'sessionStorage'],
  ttl: { defaultTTL: 60000 } // 1 minute
});
```

### Feature Flags

```typescript
const storage = new Strata({
  // Enable features based on environment
  encryption: {
    enabled: process.env.NODE_ENV === 'production'
  },
  compression: {
    enabled: !navigator.connection?.saveData
  },
  sync: {
    enabled: 'BroadcastChannel' in window
  }
});
```

## Validation

Strata validates configuration at initialization:

```typescript
try {
  const storage = new Strata({
    encryption: {
      enabled: true
      // Missing required 'password'
    }
  });
  await storage.initialize();
} catch (error) {
  console.error('Invalid configuration:', error);
}
```

## Next Steps

- Explore [Storage Adapters](../api/adapters/README.md)
- Learn about [Encryption](../guides/features/encryption.md)
- Read about [Performance Optimization](../guides/features/performance.md)