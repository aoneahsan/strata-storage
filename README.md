# Strata Storage

> Zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms.

[![npm version](https://img.shields.io/npm/v/strata-storage.svg)](https://www.npmjs.com/package/strata-storage)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20iOS%20%7C%20Android-lightgrey.svg)](https://github.com/aoneahsan/strata-storage)

## Features

- **🚀 Zero Dependencies** - No external runtime dependencies, pure TypeScript implementation
- **🌐 Universal API** - Single consistent API across web, iOS, and Android
- **🔒 Built-in Encryption** - Secure data storage using native crypto APIs
- **📦 Compression** - Automatic data compression for large objects
- **⏱️ TTL Support** - Automatic expiration with time-to-live
- **🔄 Cross-Tab Sync** - Real-time synchronization across browser tabs
- **🎯 Advanced Queries** - Tag-based querying and filtering
- **📱 Mobile Ready** - Native iOS and Android storage with Capacitor
- **💾 Multiple Adapters** - localStorage, IndexedDB, SQLite, Keychain, and more
- **🎨 Framework Integrations** - React hooks, Vue composables, Angular services

## Installation

```bash
npm install strata-storage
```

Or using yarn:

```bash
yarn add strata-storage
```

Or using pnpm:

```bash
pnpm add strata-storage
```

## Quick Start

### Basic Usage

```typescript
import { Strata } from 'strata-storage';

// Create and initialize storage
const storage = new Strata();
await storage.initialize();

// Store data
await storage.set('username', 'john_doe');
await storage.set('user', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com'
});

// Retrieve data
const username = await storage.get('username');
const user = await storage.get('user');

// Remove data
await storage.remove('username');

// Clear all data
await storage.clear();
```

### Advanced Features

#### Encryption

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secure-password'
  }
});

await storage.initialize();
await storage.set('sensitiveData', { token: 'secret' });
```

#### Time-To-Live (TTL)

```typescript
// Data expires in 1 hour
await storage.set('sessionData', data, {
  ttl: 60 * 60 * 1000
});
```

#### Compression

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Compress data larger than 1KB
  }
});

await storage.initialize();
await storage.set('largeData', bigObject);
```

#### Cross-Tab Sync

```typescript
const storage = new Strata({
  sync: { enabled: true }
});

await storage.initialize();

// Subscribe to changes from other tabs
storage.subscribe((change) => {
  console.log(`Key ${change.key} changed to:`, change.newValue);
});
```

## Platform Support

### Web Browsers
- **localStorage** - Simple key-value storage
- **sessionStorage** - Session-scoped storage
- **IndexedDB** - Large structured data
- **Cookies** - Cookie-based storage
- **Cache API** - HTTP cache storage
- **Memory** - In-memory storage

### iOS (via Capacitor)
- **UserDefaults** - User preferences
- **Keychain** - Secure credential storage
- **SQLite** - Database storage
- **FileManager** - File-based storage

### Android (via Capacitor)
- **SharedPreferences** - Simple key-value storage
- **EncryptedSharedPreferences** - Secure storage
- **SQLite** - Database storage
- **File Storage** - File-based storage

## Framework Integrations

### React

```typescript
import { useStrata } from 'strata-storage/react';

function MyComponent() {
  const { data, loading, set, remove } = useStrata('myKey');

  return (
    <div>
      <p>{data}</p>
      <button onClick={() => set('newValue')}>Update</button>
    </div>
  );
}
```

### Vue

```typescript
import { useStrata } from 'strata-storage/vue';

export default {
  setup() {
    const { data, loading, set, remove } = useStrata('myKey');

    return { data, loading, set, remove };
  }
};
```

### Angular

```typescript
import { StrataService } from 'strata-storage/angular';

@Component({ /* ... */ })
export class MyComponent {
  constructor(private storage: StrataService) {}

  async saveData() {
    await this.storage.set('key', 'value');
  }
}
```

## Documentation

- **[Getting Started](docs/getting-started/installation.md)** - Installation and setup guide
- **[Quick Start](docs/getting-started/quick-start.md)** - Get up and running in minutes
- **[API Reference](docs/api/README.md)** - Complete API documentation
- **[Platform Guides](docs/guides/platforms/web.md)** - Platform-specific information
- **[Examples](docs/examples/README.md)** - Real-world usage examples
- **[Migration Guide](docs/MIGRATION.md)** - Migrating from other storage solutions

## Storage Adapters

| Adapter | Platform | Use Case |
|---------|----------|----------|
| `localStorage` | Web | Simple key-value, persistent |
| `sessionStorage` | Web | Session-scoped data |
| `indexedDB` | Web | Large structured data |
| `cookies` | Web | Cookie-based storage |
| `cache` | Web | HTTP cache |
| `memory` | All | Temporary in-memory |
| `preferences` | Mobile | User preferences (UserDefaults/SharedPreferences) |
| `secure` | Mobile | Encrypted storage (Keychain/EncryptedSharedPreferences) |
| `sqlite` | Mobile | Database storage |
| `filesystem` | Mobile | File-based storage |

## Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.0+ (optional, but recommended)
- **Capacitor**: 5.x or 6.x (for mobile platforms)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- iOS Safari: iOS 13+
- Android WebView: Android 8+

## Why Strata Storage?

### Zero Dependencies
Unlike other storage solutions that depend on multiple packages, Strata Storage has **zero runtime dependencies**. Everything is built from scratch, ensuring:
- Smaller bundle size
- No dependency conflicts
- Better security
- Full control over implementation

### Universal API
One API works everywhere. No need to learn different APIs for web and mobile, or switch between libraries:

```typescript
// Same code works on web, iOS, and Android
await storage.set('key', 'value');
const value = await storage.get('key');
```

### Built-in Features
Advanced features included out of the box:
- Encryption (Web Crypto API / Native Crypto)
- Compression (LZ-string algorithm)
- TTL/Expiration
- Cross-tab sync
- Advanced queries
- Data migrations

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details.

## License

Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Author

**Ahsan Mahmood**
- Email: aoneahsan@gmail.com
- LinkedIn: [linkedin.com/in/aoneahsan](https://linkedin.com/in/aoneahsan)
- Portfolio: [aoneahsan.com](https://aoneahsan.com)
- GitHub: [@aoneahsan](https://github.com/aoneahsan)
- NPM: [npmjs.com/~aoneahsan](https://www.npmjs.com/~aoneahsan)
- Phone/WhatsApp: +923046619706

## Links

- **NPM Package**: [npmjs.com/package/strata-storage](https://www.npmjs.com/package/strata-storage)
- **GitHub Repository**: [github.com/aoneahsan/strata-storage](https://github.com/aoneahsan/strata-storage)
- **Issue Tracker**: [github.com/aoneahsan/strata-storage/issues](https://github.com/aoneahsan/strata-storage/issues)
- **Documentation**: [github.com/aoneahsan/strata-storage/tree/main/docs](https://github.com/aoneahsan/strata-storage/tree/main/docs)

## Support

If you encounter any issues or have questions:

1. Check the [FAQ](docs/reference/faq.md)
2. Search [existing issues](https://github.com/aoneahsan/strata-storage/issues)
3. Create a [new issue](https://github.com/aoneahsan/strata-storage/issues/new)

---

Made with ❤️ by [Ahsan Mahmood](https://aoneahsan.com)
