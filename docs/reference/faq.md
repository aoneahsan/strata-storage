# Frequently Asked Questions (FAQ)

Common questions and answers about Strata Storage.

## General Questions

### What is Strata Storage?

Strata Storage is a zero-dependency universal storage plugin that provides a unified API for all storage operations across web, Android, and iOS platforms. It allows you to use the same code for storage regardless of the platform your app runs on.

### Why "zero dependencies"?

Zero dependencies means the package doesn't rely on any external runtime packages. This provides:
- **Smaller bundle size** - No unnecessary dependencies
- **Better security** - Fewer attack vectors
- **No dependency conflicts** - Works with any other packages
- **Better performance** - Optimized from the ground up
- **Full control** - We implement everything ourselves

### Which platforms are supported?

- **Web browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **iOS**: Via Capacitor (iOS 13+)
- **Android**: Via Capacitor (Android 8+)
- **React Native**: Planned for future release

### Is TypeScript required?

No, but it's highly recommended. Strata Storage is written in TypeScript and provides excellent type definitions, but you can use it with plain JavaScript.

## Installation & Setup

### How do I install Strata Storage?

```bash
npm install strata-storage
# or
yarn add strata-storage
# or
pnpm add strata-storage
```

### Do I need to install anything else?

Only if you're using specific features:
- **Capacitor mobile**: Install `@capacitor/core`
- **React integration**: Install `react`
- **Vue integration**: Install `vue`
- **Angular integration**: Install `@angular/core`

All of these are optional peer dependencies.

### How do I migrate from other storage solutions?

See our [Migration Guide](../MIGRATION.md) for detailed instructions on migrating from:
- `@capacitor/preferences`
- `localForage`
- Native `localStorage`
- Other storage libraries

## Usage Questions

### Do I need to call initialize()?

Yes, always call `initialize()` before using storage:

```typescript
const storage = new Strata();
await storage.initialize();
```

### Can I use multiple Strata instances?

Yes, but it's usually better to use a single instance throughout your app:

```typescript
// storage.ts
export const storage = new Strata();
await storage.initialize();

// Use in other files
import { storage } from './storage';
await storage.set('key', 'value');
```

### What data types can I store?

All JSON-serializable types:
- Strings, numbers, booleans
- Objects and arrays
- Dates (automatically serialized)
- null and undefined

Cannot store:
- Functions
- Symbols
- Circular references (unless using custom serialization)

### How much data can I store?

It depends on the storage adapter:
- **localStorage**: ~5-10MB (browser dependent)
- **sessionStorage**: ~5-10MB (browser dependent)
- **IndexedDB**: ~50MB to unlimited (quota-based)
- **Cookies**: ~4KB per cookie
- **Mobile (Keychain/Preferences)**: Practically unlimited
- **SQLite**: Unlimited (storage dependent)

### Is the data encrypted by default?

No, but encryption is easy to enable:

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secure-password'
  }
});
```

On mobile, use the `secure` adapter for native encryption:

```typescript
await storage.set('key', 'value', { storage: 'secure' });
```

## Storage Adapters

### What storage adapters are available?

**Web:**
- `localStorage` - Persistent key-value storage
- `sessionStorage` - Session-scoped storage
- `indexedDB` - Large structured data
- `cookies` - Cookie-based storage
- `cache` - HTTP cache API
- `memory` - In-memory storage

**Mobile (Capacitor):**
- `preferences` - UserDefaults/SharedPreferences
- `secure` - Keychain/EncryptedSharedPreferences
- `sqlite` - SQLite database
- `filesystem` - File-based storage

### How do I choose a storage adapter?

Use the decision tree:

1. **Need it on mobile?** → Use `preferences` or `secure`
2. **Sensitive data?** → Use `secure` or enable encryption
3. **Large data (>5MB)?** → Use `indexedDB` or `sqlite`
4. **Temporary data?** → Use `sessionStorage` or `memory`
5. **Simple key-value?** → Use `localStorage` (default)

### Can I use multiple adapters at once?

Yes, specify the adapter per operation:

```typescript
await storage.set('user', userData, { storage: 'indexedDB' });
await storage.set('token', token, { storage: 'secure' });
await storage.set('temp', data, { storage: 'memory' });
```

### What happens if an adapter isn't available?

Strata automatically falls back to the next available adapter. You can configure the fallback chain:

```typescript
const storage = new Strata({
  adapters: ['indexedDB', 'localStorage', 'memory']
});
```

## Features

### Does it support encryption?

Yes, using Web Crypto API (web) and native encryption (mobile):

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-password',
    algorithm: 'AES-GCM' // default
  }
});
```

### Does it support compression?

Yes, using a pure JavaScript LZ-string implementation:

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Only compress data > 1KB
  }
});
```

### Does it support TTL (expiration)?

Yes, data can automatically expire:

```typescript
// Expire in 1 hour
await storage.set('session', data, {
  ttl: 60 * 60 * 1000
});

// Expire at specific time
await storage.set('cache', data, {
  expireAt: new Date('2024-12-31')
});
```

### Does it support cross-tab synchronization?

Yes, changes are automatically synchronized across browser tabs:

```typescript
const storage = new Strata({
  sync: { enabled: true }
});

// Listen for changes from other tabs
storage.subscribe((change) => {
  console.log(`${change.key} changed to:`, change.newValue);
});
```

### Can I query stored data?

Yes, using tag-based queries:

```typescript
// Store with tags
await storage.set('doc1', data, { tags: ['work', 'important'] });

// Query by tags
const workDocs = await storage.query({
  tags: { contains: 'work' }
});
```

## Framework Integration

### How do I use it with React?

Use the React hooks:

```typescript
import { useStrata } from 'strata-storage/react';

function MyComponent() {
  const { data, loading, set, remove } = useStrata('myKey');

  return <div>{data}</div>;
}
```

### How do I use it with Vue?

Use the Vue composables:

```typescript
import { useStrata } from 'strata-storage/vue';

export default {
  setup() {
    const { data, loading, set } = useStrata('myKey');
    return { data, loading, set };
  }
};
```

### How do I use it with Angular?

Use the Angular service:

```typescript
import { StrataService } from 'strata-storage/angular';

@Component({ /* ... */ })
export class MyComponent {
  constructor(private storage: StrataService) {}

  async loadData() {
    const data = await this.storage.get('key');
  }
}
```

### Can I use it with Svelte?

Not yet, but planned for future release. For now, use the core API:

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();
```

## Performance

### Is it fast?

Yes, performance is a priority:
- Memory adapter: <1ms operations
- localStorage: 1-5ms operations
- IndexedDB: 5-20ms operations
- Mobile native: 1-10ms operations

### Does it cache data?

Yes, optional in-memory caching:

```typescript
const storage = new Strata({
  cache: {
    enabled: true,
    maxSize: 100 // Cache 100 most recent items
  }
});
```

### How do I optimize for large data?

Use these strategies:
1. Enable compression for large objects
2. Use IndexedDB or SQLite for >5MB data
3. Enable caching for frequently accessed data
4. Use batch operations when possible

```typescript
// Batch operations are faster
await storage.setBatch([
  { key: 'key1', value: 'value1' },
  { key: 'key2', value: 'value2' }
]);
```

## Security

### Is my data secure?

Security depends on your configuration:
- **Encrypted storage**: Data encrypted before storing
- **Secure adapter (mobile)**: Uses Keychain/EncryptedSharedPreferences
- **Non-encrypted storage**: Data stored in plain text (use for non-sensitive data only)

### Should I encrypt all data?

No, only encrypt sensitive data:
- Passwords, tokens, API keys → **Yes, encrypt**
- User preferences, UI state → **No, don't encrypt**
- Personal data (emails, names) → **Yes, encrypt if required by privacy laws**

### What encryption algorithm is used?

- **Web**: AES-GCM (Web Crypto API)
- **iOS**: AES-256 (Keychain)
- **Android**: AES-256 (EncryptedSharedPreferences)

### Can I use my own encryption?

Yes, provide custom serialization:

```typescript
const storage = new Strata({
  serialization: {
    serialize: (data) => customEncrypt(JSON.stringify(data)),
    deserialize: (data) => JSON.parse(customDecrypt(data))
  }
});
```

## Debugging

### How do I debug issues?

Enable debug mode:

```typescript
const storage = new Strata({
  debug: true
});

// All operations will be logged to console
await storage.set('key', 'value');
// Output: [Strata] SET key=key adapter=localStorage
```

### How do I check what's stored?

```typescript
// Get all keys
const keys = await storage.keys();

// Get all data
const allData = await storage.getAll();

// Check storage size
const size = await storage.size();
```

### How do I clear all data?

```typescript
// Clear everything
await storage.clear();

// Or clear specific adapter
await storage.clear({ storage: 'localStorage' });
```

## Compatibility

### What browsers are supported?

Modern browsers with ES2020+ support:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+
- iOS Safari 13+
- Android WebView 8+

### Does it work in older browsers?

Not officially supported, but you can add polyfills for:
- Promise
- Async/await
- IndexedDB
- Web Crypto API

### Does it work with Server-Side Rendering (SSR)?

Yes, but storage operations should only run on the client:

```typescript
// Next.js example
useEffect(() => {
  const loadData = async () => {
    const storage = new Strata();
    await storage.initialize();
    const data = await storage.get('key');
  };
  loadData();
}, []);
```

### Does it work with Electron?

Yes, the web adapters work in Electron's renderer process.

## Contributing

### How can I contribute?

See our [Contributing Guide](../../CONTRIBUTING.md) for:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Writing documentation

### Where do I report bugs?

Create an issue on [GitHub Issues](https://github.com/aoneahsan/strata-storage/issues).

### Can I add a new storage adapter?

Yes! See the [Custom Adapters Guide](../guides/advanced/custom-adapters.md).

## Pricing & License

### Is it free?

Yes, completely free and open source.

### What's the license?

Apache License 2.0 - see [LICENSE](../../LICENSE).

### Can I use it in commercial projects?

Yes, the Apache 2.0 license allows commercial use.

## Still Have Questions?

- **Documentation**: [Full Documentation](../README.md)
- **Troubleshooting**: [Troubleshooting Guide](./troubleshooting.md)
- **GitHub Issues**: [github.com/aoneahsan/strata-storage/issues](https://github.com/aoneahsan/strata-storage/issues)
- **Email**: aoneahsan@gmail.com
