---
sidebar_position: 8
description: Configure Strata Storage adapters, default storage type, encryption, compression, TTL, and namespacing.
---

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
      dbName: 'MyAppDB',
      version: 1
    },
    localStorage: {
      prefix: 'myapp_'
    },
    cookies: {
      secure: true,
      sameSite: 'strict'
    }
  },
  
  // Encryption settings
  encryption: {
    enabled: false,
    password: 'your-secure-password',
    algorithm: 'AES-GCM',
    keyLength: 256,
    keyDerivation: 'PBKDF2'
  },
  
  // Compression settings
  compression: {
    enabled: false,
    algorithm: 'lz', // the only supported algorithm
    threshold: 1024  // bytes
  },
  
  // Synchronization settings
  sync: {
    enabled: false,
    storages: ['localStorage'],
    conflictResolution: 'latest'
  },
  
  // Time-to-live settings
  ttl: {
    defaultTTL: 3600000, // 1 hour (ms)
    cleanupInterval: 60000, // 1 minute
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
    dbName: 'MyDatabase',    // Database name
    version: 1               // Database version
  }
}
```

#### LocalStorage/SessionStorage

```typescript
adapters: {
  localStorage: {
    prefix: 'app_'           // Key prefix
  }
}
```

#### Cookies

```typescript
adapters: {
  cookies: {
    secure: true,            // HTTPS only
    sameSite: 'lax'          // 'strict' | 'lax' | 'none'
  }
}
```

#### SQLite (Mobile)

```typescript
adapters: {
  sqlite: {
    filename: 'app.db'       // Database file name
  }
}
```

> The native SQLite backend also accepts per-call `database` / `table` options
> (passed to `get`/`set`/etc.) to address multiple physical stores — see the
> SQLite adapter reference.

### Encryption Configuration

```typescript
encryption: {
  enabled: true,             // Enable/disable encryption
  password: 'secret',        // Encryption password
  algorithm: 'AES-GCM',      // 'AES-GCM' | 'AES-CBC'
  keyLength: 256,            // 128 | 192 | 256
  keyDerivation: 'PBKDF2',   // PBKDF2
  iterations: 600000,        // PBKDF2 iterations (default: 600000, OWASP)
  saltLength: 16             // Salt length in bytes
}
```

### Compression Configuration

```typescript
compression: {
  enabled: true,            // Enable/disable compression
  algorithm: 'lz',          // only the bundled zero-dependency LZ codec is supported
  threshold: 1024           // Min size to compress (bytes)
}
```

### Sync Configuration

```typescript
sync: {
  enabled: true,                // Enable cross-tab sync
  storages: ['localStorage'],   // Storages to sync (cross-tab fallback is localStorage-only)
  interval: 5000,               // Optional periodic sync interval (ms)
  conflictResolution: 'latest'  // 'latest' | 'merge' | custom function
}
```

> Cross-tab sync uses `BroadcastChannel` when available and falls back to
> `storage` events. Browsers only fire cross-tab `storage` events for
> `localStorage`; `sessionStorage` is tab-scoped and never propagates cross-tab.

### TTL Configuration

```typescript
ttl: {
  defaultTTL: 3600000,      // Default TTL in ms (1 hour)
  cleanupInterval: 60000,   // Cleanup sweep interval (ms)
  autoCleanup: true,        // Auto-remove expired items
  batchSize: 100,           // Max items removed per cleanup cycle
  slidingTTL: false,        // Reset TTL on access (instance default)
  onExpire: (keys) => {}    // Callback invoked with expired keys
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
    interval: 0 // 0 = event-driven (no polling)
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
    cleanupInterval: 300000 // 5 minutes
  }
};
```

## Storage Selection

Strata does not use named "strategies." Instead, list the storage backends you
want in `defaultStorages`, in order of preference — Strata uses the first one
available on the current platform:

```typescript
const storage = new Strata({
  // Try persistent stores first, fall back to memory as a last resort
  defaultStorages: ['indexedDB', 'localStorage', 'memory']
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

- Explore [Storage Adapters](./api/adapters/README.md)
- Learn about [Encryption](./guides/features/encryption.md)
- Read about [Caching Patterns](./guides/patterns/caching.md)