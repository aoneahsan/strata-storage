# Android Platform Guide

Complete guide for using Strata Storage in Android applications with Capacitor.

## Overview

Strata Storage provides native Android storage capabilities through Capacitor, leveraging SharedPreferences, EncryptedSharedPreferences, SQLite, and the file system.

## Available Adapters

- **Preferences** - SharedPreferences for app settings
- **Secure** - EncryptedSharedPreferences for sensitive data
- **SQLite** - Database for structured data
- **Filesystem** - File and document storage

## Installation

```bash
npm install strata-storage
npx cap sync android
```

## Native Configuration

### AndroidManifest.xml

```xml
<!-- File access permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- For Android 11+ -->
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
```

### Gradle Configuration

```gradle
android {
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 33
    }
}

dependencies {
    implementation 'androidx.security:security-crypto:1.1.0-alpha04'
}
```

## Android-Specific Features

### SharedPreferences

```typescript
// Store app preferences
await storage.set('user_preference', value, {
  storage: 'preferences'
});

// Custom preferences file
const storage = new Strata({
  adapters: {
    preferences: {
      name: 'app_settings',
      mode: 'MODE_PRIVATE'
    }
  }
});
```

### Encrypted Storage

```typescript
// Store sensitive data with hardware encryption
await storage.set('secret_key', key, {
  storage: 'secure'
});

// Custom security settings
const storage = new Strata({
  adapters: {
    secure: {
      keyAlias: 'MyAppSecureKey',
      userAuthenticationRequired: true,
      userAuthenticationValidityDuration: 30 // seconds
    }
  }
});
```

### Scoped Storage (Android 10+)

```typescript
// Access app-specific directory
await storage.set('app-file.txt', data, {
  storage: 'filesystem',
  directory: 'FILES'
});

// Access shared storage with permissions
await storage.set('shared-doc.pdf', data, {
  storage: 'filesystem',
  directory: 'EXTERNAL_FILES'
});
```

## Storage Locations

### Internal Storage

```typescript
enum InternalDirectory {
  FILES = 'FILES',           // /data/data/com.app/files
  CACHE = 'CACHE',          // /data/data/com.app/cache
  DATA = 'DATA'             // /data/data/com.app/app_data
}
```

### External Storage

```typescript
enum ExternalDirectory {
  EXTERNAL = 'EXTERNAL',              // External root
  EXTERNAL_FILES = 'EXTERNAL_FILES',  // App external files
  EXTERNAL_CACHE = 'EXTERNAL_CACHE'   // App external cache
}
```

## Permissions Handling

```typescript
class StoragePermissions {
  async checkAndRequest() {
    const { storage } = await Permissions.query({
      name: 'storage'
    });
    
    if (storage.state !== 'granted') {
      const result = await Permissions.request({
        name: 'storage'
      });
      
      if (result.storage.state !== 'granted') {
        throw new Error('Storage permission denied');
      }
    }
  }
  
  // For Android 11+
  async requestAllFilesAccess() {
    if (Build.VERSION.SDK_INT >= 30) {
      const intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
      startActivity(intent);
    }
  }
}
```

## Backup Configuration

### Exclude from Backup

```xml
<!-- res/xml/backup_rules.xml -->
<full-backup-content>
    <exclude domain="sharedpref" path="secure_prefs.xml"/>
    <exclude domain="database" path="sensitive.db"/>
</full-backup-content>
```

### Auto Backup

```typescript
// Mark data for backup
await storage.set('backup_data', data, {
  storage: 'preferences',
  allowBackup: true
});

// Exclude from backup
await storage.set('no_backup', data, {
  storage: 'preferences',
  allowBackup: false
});
```

## Performance Optimization

### 1. Use Appropriate Storage

```typescript
// Fast access for small data
await storage.set('pref', value, { 
  storage: 'preferences' 
});

// Large or complex data
await storage.set('dataset', data, { 
  storage: 'sqlite' 
});

// Sensitive information
await storage.set('token', value, { 
  storage: 'secure' 
});
```

### 2. Batch SharedPreferences

```typescript
// Batch multiple preference updates
class PreferenceBatch {
  private editor: SharedPreferences.Editor;
  
  async batch(operations: () => Promise<void>) {
    this.editor = await this.getEditor();
    await operations();
    await this.editor.apply(); // or commit()
  }
}
```

## Common Patterns

### Migration from Legacy Storage

```typescript
class StorageMigration {
  async migrateFromSharedPreferences() {
    // Get all SharedPreferences
    const prefs = await this.getLegacyPreferences();
    
    // Migrate to Strata
    for (const [key, value] of Object.entries(prefs)) {
      await storage.set(key, value, {
        storage: 'preferences'
      });
    }
  }
}
```

### Work Manager Integration

```typescript
// Background storage sync
class StorageWorker extends Worker {
  async doWork() {
    const storage = new Strata();
    await storage.initialize();
    
    // Sync data in background
    const pendingData = await storage.query({
      'value.syncStatus': 'pending'
    }, { storage: 'sqlite' });
    
    for (const item of pendingData) {
      await this.syncItem(item);
    }
  }
}
```

## Security Best Practices

### 1. Use Encrypted Storage

```typescript
// Always encrypt sensitive data
await storage.set('api_key', key, {
  storage: 'secure'
});

// Never store in plain SharedPreferences
// await storage.set('password', pwd, {
//   storage: 'preferences' // DON'T DO THIS
// });
```

### 2. Implement Root Detection

```typescript
class SecurityCheck {
  async isDeviceRooted(): Promise<boolean> {
    // Check for root indicators
    const rootFiles = [
      '/system/app/Superuser.apk',
      '/sbin/su',
      '/system/bin/su'
    ];
    
    for (const file of rootFiles) {
      if (await this.fileExists(file)) {
        return true;
      }
    }
    
    return false;
  }
}
```

## Troubleshooting

### Storage Access Framework

```typescript
// For accessing external documents
async function openDocument() {
  const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
  intent.addCategory(Intent.CATEGORY_OPENABLE);
  intent.setType('*/*');
  
  const result = await startActivityForResult(intent);
  // Handle selected file
}
```

### Handling Storage Errors

```typescript
try {
  await storage.set('data', value, { storage: 'filesystem' });
} catch (error) {
  if (error.code === 'ENOSPC') {
    console.error('No space left on device');
  } else if (error.code === 'EACCES') {
    console.error('Permission denied');
  }
}
```

## See Also

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Security Guide](../security.md)
- [Android Examples](../../examples/android/README.md)