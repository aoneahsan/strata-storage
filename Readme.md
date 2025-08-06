# Strata Storage

## 📚 Documentation

- **[Getting Started](./docs/getting-started/installation.md)** - Installation and setup
- **[Quick Start Guide](./docs/getting-started/quick-start.md)** - Get running in minutes
- **[API Reference](./docs/api/README.md)** - Complete API documentation
- **[Configuration](./docs/getting-started/configuration.md)** - Configuration options
- **[Platform Guides](./docs/guides/platforms/web.md)** - Platform-specific guides
- **[Examples](./docs/examples/README.md)** - Code examples and recipes
- **[GitHub](https://github.com/aoneahsan/strata-storage)** - Source code
- **[NPM](https://www.npmjs.com/package/strata-storage)** - Package registry

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
- ✅ **Encryption** - AES-GCM encryption with Web Crypto API
- ✅ **Compression** - LZ-string compression algorithm
- ✅ **Cross-Tab Sync** - Real-time synchronization across tabs
- ✅ **Query Engine** - MongoDB-like queries for filtering data
- ✅ **TTL Support** - Automatic expiration with sliding TTL
- ✅ **Migration System** - Version-based data migrations
- 🚧 **Framework Integrations** - React, Vue, Angular (coming soon)

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
  tags: ['user-data']   // Tag for grouping
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

## 🎯 Provider-less Architecture

Strata Storage follows a provider-less architecture similar to Zustand. The core library works everywhere with zero dependencies, and platform-specific features (like Capacitor) are completely optional.

- **Minimal by default** - Only includes web storage adapters
- **Opt-in native features** - Explicitly add Capacitor support when needed
- **Better tree-shaking** - Unused adapters are eliminated by bundlers
- **Smaller bundle size** - Web-only projects don't include native code

## 🏗 Project Status

Currently in active development. Phase 1-5 completed:
- ✅ Project setup and core architecture
- ✅ Memory and web storage adapters
- ✅ Capacitor plugin structure (now optional)
- ✅ Advanced features (encryption, compression, sync, query, TTL)
- ✅ Provider-less architecture
- 🚧 Native implementations (iOS/Android)
- 🚧 Testing and documentation

## 📄 License

MIT

---

Created by Ahsan Mahmood