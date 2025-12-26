# Troubleshooting

Common issues and solutions when using Strata Storage.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Errors](#runtime-errors)
- [Platform-Specific Issues](#platform-specific-issues)
- [Performance Issues](#performance-issues)
- [Data Persistence Issues](#data-persistence-issues)
- [TypeScript Issues](#typescript-issues)

## Installation Issues

### Package Not Found

**Problem**: `npm install strata-storage` fails with package not found error.

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try installing again
npm install strata-storage

# Or use specific version
npm install strata-storage@latest
```

### Peer Dependency Warnings

**Problem**: Warnings about missing peer dependencies.

**Solution**: Peer dependencies are optional. Install only what you need:

```bash
# For React projects
npm install react

# For Vue projects
npm install vue

# For Angular projects
npm install @angular/core

# For Capacitor projects
npm install @capacitor/core
```

### Build Errors During Installation

**Problem**: Native module build errors on iOS/Android.

**Solution**:
```bash
# iOS: Update CocoaPods
cd ios && pod update && cd ..

# Android: Clean gradle cache
cd android && ./gradlew clean && cd ..

# Sync Capacitor
npx cap sync
```

## Runtime Errors

### "Storage not initialized"

**Problem**: Calling methods before initialization.

**Solution**: Always call `initialize()` before using storage:

```typescript
const storage = new Strata();
await storage.initialize(); // Must call this first

// Now you can use storage
await storage.set('key', 'value');
```

### QuotaExceededError

**Problem**: Browser storage quota exceeded.

**Solution**:

```typescript
import { QuotaExceededError } from 'strata-storage';

try {
  await storage.set('data', largeData);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Option 1: Clear old data
    await storage.clear();

    // Option 2: Use compression
    await storage.set('data', largeData, { compress: true });

    // Option 3: Switch to IndexedDB
    await storage.set('data', largeData, { storage: 'indexedDB' });
  }
}
```

### EncryptionError

**Problem**: Encryption/decryption fails.

**Solution**:

```typescript
// Ensure encryption is properly configured
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-password' // Use consistent password
  }
});

// Don't change password after storing encrypted data
// or you won't be able to decrypt it
```

### StorageNotAvailableError

**Problem**: Requested storage adapter not available.

**Solution**:

```typescript
// Check available storage types first
const storage = new Strata();
await storage.initialize();

const available = storage.getAvailableStorageTypes();
console.log('Available:', available);

// Use available storage type
if (available.includes('indexedDB')) {
  await storage.set('key', 'value', { storage: 'indexedDB' });
} else {
  // Fallback to default
  await storage.set('key', 'value');
}
```

## Platform-Specific Issues

### Web Browser Issues

#### Private/Incognito Mode

**Problem**: Storage not working in private browsing mode.

**Solution**: Use memory adapter as fallback:

```typescript
const storage = new Strata({
  defaultAdapter: 'memory' // Works in all modes
});
```

#### Safari localStorage Disabled

**Problem**: localStorage disabled in Safari privacy settings.

**Solution**: Automatic fallback is built-in, or configure manually:

```typescript
const storage = new Strata({
  adapters: ['indexedDB', 'memory'] // Skip localStorage
});
```

#### Cross-Origin Issues

**Problem**: Cannot access storage from different origin.

**Solution**: Storage is origin-specific by design. Use postMessage for cross-origin:

```typescript
// In iframe
window.parent.postMessage({ key: 'value' }, '*');

// In parent
window.addEventListener('message', (event) => {
  await storage.set(event.data.key, event.data.value);
});
```

### iOS Issues

#### Keychain Access Denied

**Problem**: Cannot access Keychain storage on iOS.

**Solution**: Add usage description to `Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses secure storage to protect your data</string>
```

#### Data Lost After App Update

**Problem**: Data disappears after updating app.

**Solution**: Don't use `.tmp` or `.cache` directories:

```typescript
// Use UserDefaults or Keychain for persistent data
await storage.set('key', 'value', { storage: 'preferences' });
```

#### SQLite Permission Denied

**Problem**: Cannot create/access SQLite database.

**Solution**: Ensure using correct directory:

```typescript
// Use documents directory, not tmp
await storage.set('key', 'value', { storage: 'sqlite' });
```

### Android Issues

#### SharedPreferences Encryption Fails

**Problem**: EncryptedSharedPreferences throws error.

**Solution**: Requires Android 6.0+ (API 23):

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'android') {
  // Check Android version
  const version = await Capacitor.getAndroidVersion();
  if (version >= 23) {
    await storage.set('key', 'value', { storage: 'secure' });
  } else {
    // Fallback for older Android
    await storage.set('key', 'value', { encrypt: true });
  }
}
```

#### SQLite Database Locked

**Problem**: Database is locked error.

**Solution**: Ensure proper connection management:

```typescript
// Don't open multiple connections
const storage = new Strata(); // Reuse instance
await storage.initialize(); // Only once

// Use throughout app
await storage.set('key', 'value');
```

## Performance Issues

### Slow Writes

**Problem**: Writing data is slow.

**Solution**:

```typescript
// Use batch operations
await storage.setBatch([
  { key: 'key1', value: 'value1' },
  { key: 'key2', value: 'value2' },
  { key: 'key3', value: 'value3' }
]);

// Disable compression for small data
await storage.set('small', 'value', { compress: false });

// Use faster storage adapter
await storage.set('key', 'value', { storage: 'memory' });
```

### Slow Reads

**Problem**: Reading data is slow.

**Solution**:

```typescript
// Use memory caching
const storage = new Strata({
  cache: {
    enabled: true,
    maxSize: 100 // Cache 100 items
  }
});

// Read multiple keys at once
const values = await storage.getBatch(['key1', 'key2', 'key3']);
```

### High Memory Usage

**Problem**: App uses too much memory.

**Solution**:

```typescript
// Limit cache size
const storage = new Strata({
  cache: {
    enabled: true,
    maxSize: 50 // Smaller cache
  }
});

// Don't store large objects in memory adapter
// Use IndexedDB or SQLite instead
await storage.set('large', bigData, { storage: 'indexedDB' });

// Clear memory periodically
storage.clearCache();
```

## Data Persistence Issues

### Data Not Persisting

**Problem**: Data disappears after page reload.

**Solution**:

```typescript
// Don't use sessionStorage or memory for persistent data
await storage.set('key', 'value', {
  storage: 'localStorage' // Persists across sessions
});

// Or use default (picks best persistent storage)
await storage.set('key', 'value');
```

### Data Lost After Browser Update

**Problem**: Browser update clears storage.

**Solution**: Use multiple storage locations:

```typescript
// Store in both localStorage and IndexedDB
await storage.set('important', value, { storage: 'localStorage' });
await storage.set('important', value, { storage: 'indexedDB' });

// Implement backup
async function backupData() {
  const data = await storage.getAll();
  // Send to server or store in multiple locations
}
```

### TTL Not Expiring Data

**Problem**: Data not automatically removed after TTL.

**Solution**: Ensure TTL cleanup is enabled:

```typescript
const storage = new Strata({
  ttl: {
    enabled: true,
    cleanupInterval: 60000 // Check every minute
  }
});

// Verify TTL is set correctly
await storage.set('temp', 'value', {
  ttl: 5000 // 5 seconds
});

// Wait and check
setTimeout(async () => {
  const value = await storage.get('temp'); // Should be null
  console.log(value);
}, 6000);
```

## TypeScript Issues

### Type Errors

**Problem**: TypeScript type errors.

**Solution**:

```typescript
// Use generic types
interface User {
  id: number;
  name: string;
}

const storage = new Strata();
await storage.initialize();

// Type-safe operations
await storage.set<User>('user', { id: 1, name: 'John' });
const user = await storage.get<User>('user');

// user is typed as User | null
if (user) {
  console.log(user.name); // Type-safe
}
```

### Missing Type Definitions

**Problem**: Import errors or missing types.

**Solution**:

```typescript
// Ensure types are imported correctly
import { Strata, type StrataConfig } from 'strata-storage';

// Or use namespace imports
import * as StrataStorage from 'strata-storage';
const storage = new StrataStorage.Strata();
```

### Framework Integration Types

**Problem**: Type errors in React/Vue/Angular.

**Solution**:

```typescript
// React
import { useStrata } from 'strata-storage/react';

function MyComponent() {
  const { data, loading, error } = useStrata<string>('key');
  // data is typed as string | null
}

// Vue
import { useStrata } from 'strata-storage/vue';

interface MyData {
  value: string;
}

const { data, loading } = useStrata<MyData>('key');
// data is Ref<MyData | null>
```

## Still Having Issues?

If you're still experiencing problems:

1. **Check the FAQ**: [FAQ](./faq.md)
2. **Search Issues**: [GitHub Issues](https://github.com/aoneahsan/strata-storage/issues)
3. **Enable Debug Mode**:
   ```typescript
   const storage = new Strata({
     debug: true // Logs all operations
   });
   ```
4. **Create an Issue**: [New Issue](https://github.com/aoneahsan/strata-storage/issues/new)

When creating an issue, please include:
- Strata Storage version
- Platform (web/iOS/Android)
- Browser/OS version
- Minimal reproduction code
- Error messages and stack traces
- What you've tried so far

## Getting Help

- **GitHub Issues**: [github.com/aoneahsan/strata-storage/issues](https://github.com/aoneahsan/strata-storage/issues)
- **Documentation**: [Full Documentation](../README.md)
- **Email**: aoneahsan@gmail.com
