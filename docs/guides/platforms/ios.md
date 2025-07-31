# iOS Platform Guide

Complete guide for using Strata Storage in iOS applications with Capacitor.

## Overview

Strata Storage provides native iOS storage capabilities through Capacitor, leveraging UserDefaults, Keychain, SQLite, and the file system.

## Available Adapters

- **Preferences** - UserDefaults for app settings
- **Secure** - Keychain for sensitive data
- **SQLite** - Database for structured data
- **Filesystem** - Document and file storage

## Installation

```bash
npm install strata-storage
npx cap sync ios
```

## Native Configuration

### Info.plist

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### App Groups (for sharing data)

```xml
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.yourcompany.yourapp</string>
</array>
```

## iOS-Specific Features

### UserDefaults Storage

```typescript
// Store user preferences
await storage.set('theme', 'dark', {
  storage: 'preferences'
});

// Share between app and extensions
const storage = new Strata({
  adapters: {
    preferences: {
      group: 'group.com.yourcompany.yourapp'
    }
  }
});
```

### Keychain Security

```typescript
// Store sensitive data
await storage.set('api_token', token, {
  storage: 'secure',
  accessibility: 'whenUnlockedThisDeviceOnly'
});

// Biometric protection
await storage.set('private_key', key, {
  storage: 'secure',
  biometricOnly: true,
  authenticationPrompt: 'Authenticate to access your data'
});
```

### iCloud Sync

```typescript
// Enable iCloud sync for preferences
const storage = new Strata({
  adapters: {
    preferences: {
      iCloudSync: true,
      iCloudContainer: 'iCloud.com.yourcompany.yourapp'
    }
  }
});
```

## Data Protection

### Accessibility Options

```typescript
enum Accessibility {
  // Available after first unlock until restart
  AfterFirstUnlock = 'afterFirstUnlock',
  
  // Available after first unlock, not backed up
  AfterFirstUnlockThisDeviceOnly = 'afterFirstUnlockThisDeviceOnly',
  
  // Available when device is unlocked
  WhenUnlocked = 'whenUnlocked',
  
  // Available when unlocked, not backed up
  WhenUnlockedThisDeviceOnly = 'whenUnlockedThisDeviceOnly',
  
  // Requires passcode, not backed up
  WhenPasscodeSetThisDeviceOnly = 'whenPasscodeSetThisDeviceOnly'
}
```

## File System Access

### Document Directory

```typescript
// Save to Documents directory
await storage.set('user-doc.pdf', pdfData, {
  storage: 'filesystem',
  directory: 'DOCUMENTS'
});
```

### Cache Directory

```typescript
// Save temporary files
await storage.set('temp-image.jpg', imageData, {
  storage: 'filesystem',
  directory: 'CACHE'
});
```

## Background Tasks

```typescript
// Continue storage operations in background
class BackgroundStorage {
  async performBackgroundTask() {
    const taskId = await BackgroundTask.beforeExit(async () => {
      // Complete storage operations
      await storage.set('sync-data', data, {
        storage: 'sqlite'
      });
    });
    
    // Finish task
    BackgroundTask.finish({ taskId });
  }
}
```

## App State Preservation

```typescript
// Save state before suspension
class StatePreservation {
  async saveState() {
    const state = this.getCurrentState();
    
    await storage.set('app_state', state, {
      storage: 'preferences',
      accessibility: 'afterFirstUnlock'
    });
  }
  
  async restoreState() {
    const state = await storage.get('app_state', {
      storage: 'preferences'
    });
    
    if (state) {
      this.restoreFromState(state);
    }
  }
}
```

## Performance Optimization

### 1. Use Appropriate Storage

```typescript
// Quick access settings
await storage.set('setting', value, { 
  storage: 'preferences' 
});

// Large datasets
await storage.set('database', data, { 
  storage: 'sqlite' 
});

// Sensitive data
await storage.set('secret', value, { 
  storage: 'secure' 
});
```

### 2. Batch Operations

```typescript
// Batch database operations
await storage.transaction(async (tx) => {
  for (const item of items) {
    await tx.set(`item:${item.id}`, item);
  }
}, { storage: 'sqlite' });
```

## Common Patterns

### App Launch Data

```typescript
class LaunchDataManager {
  async checkFirstLaunch() {
    const hasLaunched = await storage.get('has_launched', {
      storage: 'preferences'
    });
    
    if (!hasLaunched) {
      await this.onFirstLaunch();
      await storage.set('has_launched', true, {
        storage: 'preferences'
      });
    }
  }
}
```

### Secure Session Management

```typescript
class SessionManager {
  async createSession(token: string) {
    await storage.set('session_token', token, {
      storage: 'secure',
      accessibility: 'whenUnlockedThisDeviceOnly',
      ttl: 3600000 // 1 hour
    });
  }
}
```

## Troubleshooting

### Keychain Access Errors

```typescript
try {
  await storage.get('secure_data', { storage: 'secure' });
} catch (error) {
  if (error.code === -25308) {
    console.error('Keychain access denied');
  }
}
```

### Storage Permissions

```typescript
// Check and request permissions
async function checkPermissions() {
  const { storage } = await Permissions.query({ 
    name: 'storage' 
  });
  
  if (storage.state !== 'granted') {
    await Permissions.request({ name: 'storage' });
  }
}
```

## See Also

- [Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Security Guide](../security.md)
- [iOS Examples](../../examples/ios/README.md)