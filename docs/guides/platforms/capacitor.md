# Capacitor Platform Guide

Complete guide for using Strata Storage with Capacitor across all platforms.

## Overview

Strata Storage is built as a Capacitor plugin, providing seamless integration with Capacitor applications for iOS, Android, and Web platforms.

## Installation

```bash
# Install the package
npm install strata-storage

# Install Capacitor iOS/Android platforms
npm install @capacitor/ios @capacitor/android

# Sync with native projects
npx cap sync
```

## Basic Setup

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  platform: Capacitor.getPlatform(), // Auto-detect platform
  defaultStorages: ['sqlite', 'preferences', 'secure', 'filesystem']
});

await storage.initialize();
```

## Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
const isNative = Capacitor.isNativePlatform();
const isPluginAvailable = Capacitor.isPluginAvailable('StrataStorage');

// Configure based on platform
const storage = new Strata({
  defaultStorages: isNative 
    ? ['sqlite', 'preferences'] 
    : ['indexedDB', 'localStorage']
});
```

## Capacitor Configuration

### capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  plugins: {
    StrataStorage: {
      iosGroup: 'group.com.example.app',
      androidSharedPreferences: 'app_preferences'
    }
  }
};

export default config;
```

## Cross-Platform Storage

### Unified API

```typescript
// Same code works on all platforms
async function saveUserData(user: User) {
  await storage.set('current_user', user, {
    storage: 'preferences' // Uses native preferences on mobile, localStorage on web
  });
}

async function getUserData(): Promise<User | null> {
  return await storage.get('current_user', {
    storage: 'preferences'
  });
}
```

### Platform-Specific Fallbacks

```typescript
// Automatic fallback chain
await storage.set('data', value, {
  storage: ['secure', 'preferences', 'localStorage', 'memory']
});
// Uses: Keychain (iOS), EncryptedSharedPreferences (Android), localStorage (Web)
```

## Plugin Communication

### Native to JavaScript

```typescript
// Listen for native events
StrataStorage.addListener('storageChange', (change) => {
  console.log('Native storage changed:', change);
});

// Remove listeners
const handle = await StrataStorage.addListener('storageChange', handler);
handle.remove();
```

### JavaScript to Native

```typescript
// Call native methods directly
import { StrataStorage } from 'strata-storage/plugin';

// Direct native calls
await StrataStorage.set({
  key: 'native_key',
  value: 'native_value',
  options: { storage: 'secure' }
});
```

## Migration Guide

### From @capacitor/preferences

```typescript
// Before (Capacitor Preferences)
import { Preferences } from '@capacitor/preferences';
await Preferences.set({ key: 'name', value: 'Max' });
const { value } = await Preferences.get({ key: 'name' });

// After (Strata Storage)
import { Strata } from 'strata-storage';
const storage = new Strata();
await storage.set('name', 'Max', { storage: 'preferences' });
const value = await storage.get('name', { storage: 'preferences' });
```

### From @capacitor/storage (deprecated)

```typescript
// Before (deprecated Capacitor Storage)
import { Storage } from '@capacitor/storage';
await Storage.set({ key: 'name', value: 'Max' });

// After (Strata Storage)
const storage = new Strata();
await storage.set('name', 'Max');
```

## Advanced Features

### Live Reload Development

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  server: {
    url: 'http://localhost:3000',
    cleartext: true // Android only
  }
};
```

### Custom Plugins Integration

```typescript
// Extend Strata with custom native functionality
class CustomStorage extends Strata {
  async customNativeMethod(data: any) {
    if (Capacitor.isNativePlatform()) {
      return await StrataStorage.customMethod({ data });
    }
    // Web fallback
    return this.webImplementation(data);
  }
}
```

### Electron Support

```typescript
// Configure for Electron
const storage = new Strata({
  platform: Capacitor.getPlatform() === 'electron' ? 'node' : undefined,
  adapters: {
    filesystem: {
      baseDir: app.getPath('userData')
    }
  }
});
```

## Performance Tips

### 1. Platform-Optimized Defaults

```typescript
const storage = new Strata({
  defaultStorages: Capacitor.isNativePlatform()
    ? ['sqlite', 'preferences', 'secure']
    : ['indexedDB', 'localStorage', 'memory']
});
```

### 2. Native Bridge Optimization

```typescript
// Batch operations to reduce bridge calls
const batch = [];
for (let i = 0; i < 100; i++) {
  batch.push({ key: `item_${i}`, value: data[i] });
}

// Single bridge call
await StrataStorage.batchSet({ items: batch });
```

### 3. Web Workers (Web only)

```typescript
if (!Capacitor.isNativePlatform()) {
  // Use Web Workers for heavy operations
  const worker = new Worker('storage-worker.js');
  worker.postMessage({ cmd: 'store', data: largeDataset });
}
```

## Testing

### Unit Tests

```typescript
// Mock Capacitor for testing
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false
  }
}));

describe('Storage Tests', () => {
  it('should store data', async () => {
    const storage = new Strata();
    await storage.set('test', 'value');
    expect(await storage.get('test')).toBe('value');
  });
});
```

### E2E Tests

```typescript
// Test across platforms
describe('Cross-Platform Storage', () => {
  it('should work on all platforms', async () => {
    const storage = new Strata();
    await storage.initialize();
    
    // Test will run on iOS, Android, and Web
    await storage.set('cross_platform', 'test');
    const result = await storage.get('cross_platform');
    expect(result).toBe('test');
  });
});
```

## Debugging

### Enable Debug Logging

```typescript
const storage = new Strata({
  debug: true,
  onLog: (level, message, data) => {
    console.log(`[${level}] ${message}`, data);
  }
});
```

### Native Debugging

```bash
# iOS
npx cap open ios
# Use Xcode debugger

# Android  
npx cap open android
# Use Android Studio debugger

# Web
npx cap serve
# Use browser DevTools
```

## Common Issues

### Plugin Not Loaded

```typescript
// Check if plugin is available
if (!Capacitor.isPluginAvailable('StrataStorage')) {
  console.error('StrataStorage plugin not available');
  // Fall back to web implementation
}
```

### Bridge Communication Errors

```typescript
try {
  await storage.set('key', 'value');
} catch (error) {
  if (error.code === 'UNAVAILABLE') {
    // Plugin not available, use web fallback
  }
}
```

## See Also

- [Capacitor Documentation](https://capacitorjs.com)
- [Platform Guides](../platforms/)
- [API Reference](../../api/)
- [Examples](../../examples/)