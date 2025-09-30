# Strata Storage

## 📚 Documentation

### Getting Started
- **[Installation](./docs/getting-started/installation.md)** - Installation and setup
- **[Quick Start Guide](./docs/getting-started/quick-start.md)** - Get running in minutes
- **[Configuration](./docs/getting-started/configuration.md)** - Configuration options

### Core Documentation
- **[API Reference](./docs/api/README.md)** - Complete API documentation
- **[Core API](./docs/api/core/strata.md)** - Main Strata class
- **[Type Definitions](./docs/api/core/types.md)** - TypeScript types
- **[Error Handling](./docs/api/core/errors.md)** - Error types and handling

### Storage Adapters
- **[Web Adapters](./docs/api/adapters/README.md#web-adapters)** - Browser storage
  - [localStorage](./docs/api/adapters/web/localstorage.md)
  - [sessionStorage](./docs/api/adapters/web/sessionstorage.md)
  - [IndexedDB](./docs/api/adapters/web/indexeddb.md)
  - [Cookies](./docs/api/adapters/web/cookies.md)
  - [Cache API](./docs/api/adapters/web/cache.md)
  - [Memory](./docs/api/adapters/web/memory.md)
- **[Capacitor Adapters](./docs/api/adapters/README.md#capacitor-adapters)** - Native storage
  - [Preferences](./docs/api/adapters/capacitor/preferences.md)
  - [Secure Storage](./docs/api/adapters/capacitor/secure.md)
  - [SQLite](./docs/api/adapters/capacitor/sqlite.md)
  - [Filesystem](./docs/api/adapters/capacitor/filesystem.md)

### Advanced Features
- **[Encryption](./docs/guides/features/encryption.md)** - Data encryption guide
- **[Compression](./docs/guides/features/compression.md)** - Data compression
- **[TTL Management](./docs/api/features/ttl.md)** - Auto-expiration
- **[Cross-Tab Sync](./docs/guides/features/sync.md)** - Real-time synchronization
- **[Query Engine](./docs/guides/features/queries.md)** - MongoDB-like queries
- **[Migrations](./docs/guides/features/migrations.md)** - Data migration system

### Platform Guides
- **[Web Platform](./docs/guides/platforms/web.md)** - Browser-specific features
- **[iOS Platform](./docs/guides/platforms/ios.md)** - iOS implementation
- **[Android Platform](./docs/guides/platforms/android.md)** - Android implementation
- **[Capacitor](./docs/guides/platforms/capacitor.md)** - Capacitor integration

### Common Patterns
- **[Caching Strategies](./docs/guides/patterns/caching.md)** - Caching best practices
- **[Session Management](./docs/guides/patterns/sessions.md)** - User session handling

### Examples
- **[Basic Usage](./docs/examples/basic-usage.md)** - Simple examples
- **[React Integration](./docs/examples/frameworks/react.md)** - React hooks and providers
- **[Vue Integration](./docs/examples/frameworks/vue.md)** - Vue composables
- **[Angular Integration](./docs/examples/frameworks/angular.md)** - Angular services
- **[Authentication](./docs/examples/user-auth.md)** - User authentication
- **[Shopping Cart](./docs/examples/shopping-cart.md)** - E-commerce example
- **[Form Persistence](./docs/examples/form-persistence.md)** - Form data saving
- **[Offline Support](./docs/examples/offline-support.md)** - Offline-first apps
- **[All Examples](./docs/examples/README.md)** - Complete examples list

### Resources
- **[GitHub](https://github.com/aoneahsan/strata-storage)** - Source code
- **[NPM](https://www.npmjs.com/package/strata-storage)** - Package registry
- **[Example App](./examples/react-capacitor-app)** - Full demo application
- **[Contributing](./.github/CONTRIBUTING.md)** - How to contribute
- **[Support](./.github/SUPPORT.md)** - Get help
- **[Security](./.github/SECURITY.md)** - Report vulnerabilities

---

**One API. Every Storage. Everywhere.**

Zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms.

## 🚀 Quick Start

```bash
npm install strata-storage
```

### Provider-less Usage (Zero Setup)
```typescript
import { storage } from 'strata-storage';

// Works immediately - no setup, no providers, no initialization!
await storage.set('user', { name: 'John', age: 30 });
const user = await storage.get('user');
```

### Complete Example App

Check out our [React + Capacitor example app](./examples/react-capacitor-app) that demonstrates all features:
- All storage adapters working correctly
- Web, Android, and iOS platform support
- Real-time testing interface
- Complete error handling

Run the example:
```bash
cd examples/react-capacitor-app
yarn install
yarn start  # For web
npx cap run android  # For Android
npx cap run ios  # For iOS
```

### With Capacitor (Optional)
```typescript
import { storage } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

// Only if you need native features
if (window.Capacitor) {
  await registerCapacitorAdapters(storage);
}

// Use native storage when available
await storage.set('secure-data', 'secret', { storage: 'secure' });
```

### With Firebase (Optional)
```typescript
import { storage } from 'strata-storage';
import { enableFirebaseSync } from 'strata-storage/firebase';

// Only if you need cloud sync
if (needCloudSync) {
  await enableFirebaseSync(storage, {
    apiKey: 'your-api-key',
    projectId: 'your-project-id',
    firestore: true
  });
}

// Works offline-first, syncs when online
await storage.set('data', value, { storage: 'firestore' });
```

## ✨ Features

### Core Features
- ✅ **Zero Dependencies** - No runtime dependencies, pure implementation
- ✅ **Provider-less Architecture** - No providers, contexts, or wrappers needed (like zustand)
- ✅ **Works Everywhere** - React, Vue, Angular, Vanilla JS, Node.js - same API
- ✅ **Zero Configuration** - Import and use immediately, no setup required
- ✅ **Opt-in Complexity** - Start simple, add features only when needed
- ✅ **Dynamic Provider Loading** - Providers load only when used, keeping bundle small
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
- ✅ **[Encryption](./docs/guides/features/encryption.md)** - AES-GCM encryption with Web Crypto API
- ✅ **[Compression](./docs/guides/features/compression.md)** - LZ-string compression algorithm
- ✅ **[Cross-Tab Sync](./docs/guides/features/sync.md)** - Real-time synchronization across tabs
- ✅ **[Query Engine](./docs/guides/features/queries.md)** - MongoDB-like queries for filtering data
- ✅ **[TTL Support](./docs/api/features/ttl.md)** - Automatic expiration with sliding TTL
- ✅ **[Migration System](./docs/guides/features/migrations.md)** - Version-based data migrations
- ✅ **Framework Integrations** - [React](./docs/examples/frameworks/react.md), [Vue](./docs/examples/frameworks/vue.md), [Angular](./docs/examples/frameworks/angular.md)

## 📖 Basic Usage

```typescript
import { storage } from 'strata-storage';

// No initialization needed - works immediately!

// Simple usage
await storage.set('key', 'value');
const value = await storage.get('key');
await storage.remove('key');
await storage.clear();

// Advanced options
await storage.set('key', value, {
  storage: 'indexedDB',  // Choose specific storage
  ttl: 3600000,         // Expire in 1 hour
  encrypt: true,        // Encrypt this value
  compress: true,       // Compress if beneficial
  tags: ['user-data'],  // Tag for grouping
  metadata: {           // Attach metadata
    version: 1,
    source: 'api'
  }
});

// Query data with MongoDB-like syntax
const results = await storage.query({
  tags: { $in: ['user-data'] },
  'value.age': { $gte: 18 },
  'metadata.version': 1
});

// Subscribe to changes
storage.subscribe((change) => {
  console.log(`${change.key} changed from ${change.oldValue} to ${change.newValue}`);
});

// Check storage size
const size = await storage.size();
console.log(`Using ${size.total} bytes for ${size.count} items`);
```

## 🎯 Why Strata Storage?

### Provider-less Architecture
Like Zustand, Strata Storage works without providers, contexts, or wrappers. Just import and use - no setup required.

### Zero Dependencies
Truly zero runtime dependencies. Everything is implemented from scratch for maximum control and minimal bundle size.

### Universal Compatibility
- **One API** - Same code works on Web, iOS, and Android
- **Any Framework** - Works with React, Vue, Angular, or vanilla JavaScript
- **TypeScript First** - Full type safety and excellent IntelliSense
- **Tree-Shakeable** - Only bundle what you use

### Intelligent Storage Selection
Automatically selects the best available storage based on:
- Platform capabilities
- Data size and type
- Performance requirements
- Persistence needs

### Enterprise Ready
- **Encryption** - Built-in AES-GCM encryption
- **Compression** - Automatic data compression
- **TTL/Expiration** - Auto-cleanup of expired data
- **Sync** - Real-time cross-tab/device synchronization
- **Migrations** - Version-based data migrations
- **Querying** - MongoDB-like query engine

## 🏗 Project Status

**Production Ready** - All major features implemented:
- ✅ Zero-dependency architecture
- ✅ Provider-less design (like Zustand)
- ✅ All web storage adapters (localStorage, IndexedDB, etc.)
- ✅ Complete Capacitor integration (iOS/Android)
- ✅ Native implementations (iOS Swift, Android Java)
- ✅ Advanced features (encryption, compression, sync, query, TTL)
- ✅ Framework integrations (React, Vue, Angular)
- ✅ Comprehensive documentation
- ✅ Full TypeScript support
- ✅ Example application with all features

## 📄 License

**Apache 2.0** - See [LICENSE](./LICENSE) and [License Details](./docs/LICENSE.md)

### Quick Summary:
- ✅ **Free for commercial use**
- ✅ **Modify and distribute**
- ✅ **Patent protection included**
- ⚠️ **Must keep attribution**
- ❌ **No warranty provided**

---

Created by Ahsan Mahmood