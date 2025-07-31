# Strata Storage

## 📚 Documentation

- **[Full Documentation](https://strata-storage.dev)** *(coming soon)*
- **[API Reference](https://strata-storage.dev/api)**
- **[Platform Guides](https://strata-storage.dev/platforms)**
- **[Examples](https://strata-storage.dev/examples)**
- **[GitHub](https://github.com/aoneahsan/strata-storage)**

---

**One API. Every Storage. Everywhere.**

Zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms.

## 🚀 Quick Start

```bash
npm install strata-storage
```

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Works everywhere - web, iOS, Android
await storage.set('user', { name: 'John', age: 30 });
const user = await storage.get('user');
```

## ✨ Features

### Core Features
- ✅ **Zero Dependencies** - No external packages, pure implementation
- ✅ **Universal API** - Single interface for all storage types
- ✅ **Cross-Platform** - Web, iOS, Android support
- ✅ **TypeScript** - Full type safety and IntelliSense
- ✅ **Auto Fallback** - Intelligent storage selection

### Storage Adapters
- ✅ **Memory** - Fast in-memory storage
- ✅ **LocalStorage** - Persistent browser storage
- ✅ **SessionStorage** - Session-based browser storage
- ✅ **IndexedDB** - Large-scale browser database
- ✅ **Cookies** - HTTP cookie storage
- ✅ **Cache API** - Service worker cache storage
- ✅ **Capacitor Preferences** - Native mobile preferences
- ✅ **SQLite** - Mobile SQL database
- ✅ **Secure Storage** - Keychain (iOS) / Encrypted SharedPreferences (Android)
- ✅ **Filesystem** - File-based storage

### Advanced Features
- ✅ **Encryption** - AES-GCM encryption with Web Crypto API
- ✅ **Compression** - LZ-string compression algorithm
- ✅ **Cross-Tab Sync** - Real-time synchronization across tabs
- ✅ **Query Engine** - MongoDB-like queries for filtering data
- ✅ **TTL Support** - Automatic expiration with sliding TTL
- ✅ **Migration System** - Version-based data migrations
- 🚧 **Framework Integrations** - React, Vue, Angular (coming soon)

## 📖 Basic Usage

```typescript
// Initialize with configuration
const storage = new Strata({
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  encryption: { enabled: true },
  compression: { enabled: true },
  ttl: { defaultTTL: 3600000 } // 1 hour
});

await storage.initialize();

// Store with options
await storage.set('key', value, {
  ttl: 3600000,        // Expire in 1 hour
  encrypt: true,       // Encrypt this value
  compress: true,      // Compress if beneficial
  tags: ['user-data'] // Tag for grouping
});

// Query data
const results = await storage.query({
  tags: { $in: ['user-data'] },
  'value.age': { $gte: 18 }
});

// Subscribe to changes
storage.subscribe((change) => {
  console.log(`${change.key} changed from ${change.oldValue} to ${change.newValue}`);
});
```

## 🏗 Project Status

Currently in active development. Phase 1-5 completed:
- ✅ Project setup and core architecture
- ✅ Memory and web storage adapters
- ✅ Capacitor plugin structure
- ✅ Advanced features (encryption, compression, sync, query, TTL)
- 🚧 Native implementations (iOS/Android)
- 🚧 Testing and documentation

## 📄 License

MIT

---

Created by Ahsan Mahmood