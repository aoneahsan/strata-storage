---
slug: /
sidebar_position: 1
description: Strata Storage is a zero-dependency universal storage library with one unified async/sync API across web, Android, and iOS — localStorage, IndexedDB, cookies, Cache API, SQLite, Preferences, and Keychain/Keystore, plus encryption, compression, TTL, querying, and cross-tab sync.
keywords: [strata storage, universal storage, capacitor storage, indexeddb, sqlite, keychain, encryption, ttl, cross-platform storage]
---

# Introduction

Welcome to **Strata Storage** - a zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms.

## Why Strata Storage?

Managing storage across different platforms is challenging:
- Different APIs for web (localStorage, IndexedDB) vs native (UserDefaults, SharedPreferences)
- No built-in encryption or compression
- Complex synchronization between tabs/windows
- Manual TTL (time-to-live) management
- Limited querying capabilities

Strata Storage solves these problems with:
- **Unified API** - Same interface across all platforms
- **Zero Dependencies** - No external packages, pure implementation
- **Built-in Features** - Encryption, compression, sync, TTL, queries
- **Type Safety** - Full TypeScript support
- **Framework Integration** - React, Vue, Angular support

## Key Features

### 🔌 Multiple Storage Adapters
- **Web**: LocalStorage, SessionStorage, IndexedDB, Cookies, Cache API
- **iOS**: UserDefaults, Keychain, SQLite, FileManager
- **Android**: SharedPreferences, EncryptedSharedPreferences, SQLite
- **Universal**: Memory storage, Filesystem

### 🔐 Security & Performance
- **Encryption**: AES-GCM (default) or authenticated AES-CBC (Encrypt-then-MAC), PBKDF2 (600k iterations)
- **Compression**: LZ-string algorithm
- **Secure Storage**: Native secure storage on mobile platforms
- **Automatic Cleanup**: TTL support with expiration callbacks

### 🔄 Synchronization
- **Cross-tab Sync**: Real-time synchronization across browser tabs
- **Change Events**: Subscribe to storage changes
- **Cross-device Sync**: Optional [Firebase](./guides/platforms/firebase.md) (Firestore / Realtime Database) backend
- **Debounced Updates**: Optimized performance

### 🔍 Advanced Querying
- **MongoDB-like Operators**: `$eq`, `$gt`, `$in`, `$regex`, etc.
- **Nested Queries**: Support for complex object queries
- **Sorting & Projection**: Transform and filter results

### 🎯 Developer Experience
- **TypeScript First**: Complete type definitions
- **Framework Support**: React hooks, Vue composables, Angular services
- **Easy Setup**: `npx strata-storage configure`
- **Comprehensive Docs**: Detailed guides and examples

## Quick Example

```typescript
import { Strata } from 'strata-storage';

// Initialize with configuration
const storage = new Strata({
  encryption: { enabled: true },
  compression: { enabled: true },
  sync: { enabled: true },
  ttl: { defaultTTL: 3600000 } // 1 hour
});

await storage.initialize();

// Store encrypted & compressed data with TTL
await storage.set('user', { 
  name: 'John', 
  email: 'john@example.com' 
}, {
  ttl: 3600000, // 1 hour
  tags: ['profile', 'important']
});

// Retrieve data (automatically decrypted & decompressed)
const user = await storage.get('user');

// Query stored values with MongoDB-like syntax. Conditions match the value's
// own fields by bare name (wrapper metadata like the key or tags is not queryable).
const matches = await storage.query({
  email: { $regex: '@example.com$' }
});

// Subscribe to changes
storage.subscribe((change) => {
  console.log(`${change.key} changed from`, change.oldValue, 'to', change.newValue);
});
```

## Platform Support

| Platform | Storage Types | Encryption | Sync | TTL | Queries |
|----------|--------------|------------|------|-----|---------|
| Web | ✅ All | ✅ Web Crypto | ✅ BroadcastChannel | ✅ | ✅ |
| iOS | ✅ Native | ✅ Keychain | ✅ Via Plugin | ✅ | ✅ |
| Android | ✅ Native | ✅ EncryptedSharedPrefs | ✅ Via Plugin | ✅ | ✅ |
| Node.js | ✅ Filesystem | ✅ Crypto | ✅ Events | ✅ | ✅ |

## Architecture

Strata Storage follows a modular architecture:

```
┌─────────────────────────────────────────┐
│            Strata Core API              │
├─────────────────────────────────────────┤
│   Features Layer                        │
│   ├── Encryption    ├── Compression    │
│   ├── Sync          ├── TTL            │
│   └── Query Engine  └── Migration      │
├─────────────────────────────────────────┤
│   Storage Adapters                      │
│   ├── Web Adapters  ├── iOS Adapters   │
│   └── Android       └── Universal      │
└─────────────────────────────────────────┘
```

## Next Steps

1. [Install Strata Storage](./installation.md)
2. [Follow the Quick Start guide](./quick-start.md)
3. [Explore the examples](https://stratastorage-docs.aoneahsan.com/examples)
4. [Read the API documentation](/api/core/strata)

Join us in making cross-platform storage simple and powerful! 🚀