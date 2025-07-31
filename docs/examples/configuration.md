# Configuration Examples

Examples of various configuration options for Strata Storage.

## Basic Configuration

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  namespace: 'my-app',
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  debug: true
});
```

## Full Configuration

```typescript
const storage = new Strata({
  // Namespace for all keys
  namespace: 'my-app',
  
  // Storage precedence
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  
  // Encryption settings
  encryption: {
    enabled: false,
    password: process.env.STORAGE_KEY,
    iterations: 100000
  },
  
  // Compression settings
  compression: {
    enabled: true,
    threshold: 1024, // Compress if > 1KB
    algorithm: 'lz'
  },
  
  // TTL settings
  ttl: {
    enabled: true,
    checkInterval: 60000, // Check every minute
    defaultTTL: 3600000  // 1 hour default
  },
  
  // Sync settings
  sync: {
    enabled: true,
    channelName: 'my-app-sync',
    debounceMs: 100
  },
  
  // Debug settings
  debug: process.env.NODE_ENV === 'development',
  onLog: (level, message, data) => {
    console.log(`[${level}] ${message}`, data);
  }
});
```

## Environment-Based Configuration

```typescript
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

const storage = new Strata({
  namespace: isProd ? 'app' : 'app-dev',
  
  defaultStorages: isProd 
    ? ['indexedDB', 'localStorage']
    : ['memory', 'localStorage'],
  
  encryption: {
    enabled: isProd,
    password: process.env.ENCRYPTION_KEY
  },
  
  debug: isDev,
  
  ttl: {
    enabled: true,
    defaultTTL: isProd ? 86400000 : 3600000 // 24h vs 1h
  }
});
```

## Platform-Specific Configuration

```typescript
import { Platform } from '@capacitor/core';

const storage = new Strata({
  namespace: 'cross-platform-app',
  
  defaultStorages: Platform.isNativePlatform()
    ? ['sqlite', 'preferences', 'filesystem']
    : ['indexedDB', 'localStorage', 'memory'],
  
  encryption: {
    enabled: Platform.isNativePlatform(),
    password: 'native-secure-key'
  },
  
  adapters: Platform.isNativePlatform() ? {
    sqlite: {
      databaseName: 'app.db',
      version: 1
    },
    secure: {
      accessibility: 'afterFirstUnlock'
    }
  } : undefined
});
```

## Feature Flags Configuration

```typescript
const features = {
  encryption: true,
  compression: true,
  sync: true,
  ttl: true
};

const storage = new Strata({
  namespace: 'feature-app',
  
  encryption: features.encryption ? {
    enabled: true,
    password: 'secure-password'
  } : undefined,
  
  compression: features.compression ? {
    enabled: true,
    threshold: 500
  } : undefined,
  
  sync: features.sync ? {
    enabled: true
  } : undefined,
  
  ttl: features.ttl ? {
    enabled: true,
    checkInterval: 300000 // 5 minutes
  } : undefined
});
```

## Multi-Instance Configuration

```typescript
// User data storage
const userStorage = new Strata({
  namespace: 'user-data',
  defaultStorages: ['secure', 'sqlite'],
  encryption: { enabled: true }
});

// Cache storage
const cacheStorage = new Strata({
  namespace: 'cache',
  defaultStorages: ['memory', 'localStorage'],
  ttl: {
    enabled: true,
    defaultTTL: 300000 // 5 minutes
  }
});

// Settings storage
const settingsStorage = new Strata({
  namespace: 'settings',
  defaultStorages: ['preferences'],
  sync: { enabled: true }
});
```

## See Also

- [Configuration Guide](../getting-started/configuration.md)
- [API Reference](../api/)
- [Platform Guides](../guides/platforms/)