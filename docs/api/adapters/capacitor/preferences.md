# Preferences Adapter

Native preferences storage for Capacitor applications.

## Overview

The Preferences adapter provides access to native preference storage APIs - UserDefaults on iOS and SharedPreferences on Android. Ideal for app settings and small persistent data.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async bridge) |
| Observable | ✅ Yes |
| Searchable | ✅ Yes |
| Iterable | ✅ Yes |
| Capacity | ~1MB |
| Performance | 🚀 Fast |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Store user preferences
await storage.set('theme', 'dark', { 
  storage: 'preferences' 
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    preferences: {
      group: 'com.myapp.storage', // iOS App Group
      prefix: 'strata_'
    }
  }
});
```

### Configuration Options

- `group` (string): iOS App Group identifier for sharing between apps
- `prefix` (string): Prefix for all keys (default: 'strata_')

## Platform Implementation

### iOS (UserDefaults)

```swift
// Native implementation
UserDefaults.standard.set(value, forKey: key)
UserDefaults.standard.synchronize()

// With App Groups
let defaults = UserDefaults(suiteName: "group.com.myapp")
defaults?.set(value, forKey: key)
```

### Android (SharedPreferences)

```java
// Native implementation
SharedPreferences prefs = context.getSharedPreferences(
    "strata_prefs", 
    Context.MODE_PRIVATE
);
prefs.edit()
    .putString(key, value)
    .apply();
```

## Features

### Cross-Platform Consistency

```typescript
// Same API works on iOS and Android
await storage.set('user_id', userId, { 
  storage: 'preferences' 
});

// Automatically handles platform differences
const userId = await storage.get('user_id', { 
  storage: 'preferences' 
});
```

### iCloud Sync (iOS)

```typescript
// Enable iCloud sync for preferences
const storage = new Strata({
  adapters: {
    preferences: {
      iCloudSync: true, // iOS only
      iCloudContainer: 'iCloud.com.myapp'
    }
  }
});
```

### Type Safety

```typescript
// Preferences maintain type information
interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  lastSync: number;
}

// Type-safe storage
await storage.set<AppSettings>('settings', {
  theme: 'dark',
  language: 'en',
  notifications: true,
  lastSync: Date.now()
}, { storage: 'preferences' });

const settings = await storage.get<AppSettings>('settings', {
  storage: 'preferences'
});
```

## Use Cases

### 1. App Settings

```typescript
class SettingsManager {
  private readonly storage = new Strata();
  
  async saveTheme(theme: 'light' | 'dark' | 'auto') {
    await this.storage.set('theme', theme, {
      storage: 'preferences'
    });
    
    // Apply theme
    document.body.className = theme;
  }
  
  async saveNotificationSettings(settings: NotificationSettings) {
    await this.storage.set('notifications', settings, {
      storage: 'preferences'
    });
    
    // Update push notification subscriptions
    await this.updatePushSubscriptions(settings);
  }
  
  async getSettings(): Promise<AppSettings> {
    const theme = await this.storage.get('theme', {
      storage: 'preferences'
    }) || 'auto';
    
    const notifications = await this.storage.get('notifications', {
      storage: 'preferences'
    }) || { enabled: true };
    
    return { theme, notifications };
  }
}
```

### 2. User Preferences

```typescript
class UserPreferences {
  async setLanguage(lang: string) {
    await storage.set('language', lang, {
      storage: 'preferences'
    });
    
    // Update app language
    await i18n.changeLanguage(lang);
  }
  
  async setCurrency(currency: string) {
    await storage.set('currency', currency, {
      storage: 'preferences'
    });
  }
  
  async setUnits(units: 'metric' | 'imperial') {
    await storage.set('units', units, {
      storage: 'preferences'
    });
  }
  
  async getPreferences() {
    const [language, currency, units] = await Promise.all([
      storage.get('language', { storage: 'preferences' }),
      storage.get('currency', { storage: 'preferences' }),
      storage.get('units', { storage: 'preferences' })
    ]);
    
    return {
      language: language || 'en',
      currency: currency || 'USD',
      units: units || 'metric'
    };
  }
}
```

### 3. First Launch & Onboarding

```typescript
class OnboardingManager {
  async checkFirstLaunch(): Promise<boolean> {
    const hasLaunched = await storage.get('has_launched', {
      storage: 'preferences'
    });
    
    if (!hasLaunched) {
      await storage.set('has_launched', true, {
        storage: 'preferences'
      });
      
      await storage.set('first_launch_date', Date.now(), {
        storage: 'preferences'
      });
      
      return true;
    }
    
    return false;
  }
  
  async setOnboardingComplete(step: string) {
    const completed = await this.getCompletedSteps();
    completed.push(step);
    
    await storage.set('onboarding_completed', completed, {
      storage: 'preferences'
    });
  }
  
  async getCompletedSteps(): Promise<string[]> {
    return await storage.get('onboarding_completed', {
      storage: 'preferences'
    }) || [];
  }
}
```

### 4. Feature Flags

```typescript
class FeatureFlags {
  private cache = new Map<string, boolean>();
  
  async isEnabled(feature: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(feature)) {
      return this.cache.get(feature)!;
    }
    
    // Check preferences
    const flags = await storage.get('feature_flags', {
      storage: 'preferences'
    }) || {};
    
    const enabled = flags[feature] || false;
    this.cache.set(feature, enabled);
    
    return enabled;
  }
  
  async updateFlags(flags: Record<string, boolean>) {
    await storage.set('feature_flags', flags, {
      storage: 'preferences'
    });
    
    // Clear cache
    this.cache.clear();
  }
  
  async enableFeature(feature: string) {
    const flags = await storage.get('feature_flags', {
      storage: 'preferences'
    }) || {};
    
    flags[feature] = true;
    await this.updateFlags(flags);
  }
}
```

## App Group Sharing (iOS)

```typescript
// Share data between main app and extensions
const storage = new Strata({
  adapters: {
    preferences: {
      group: 'group.com.mycompany.myapp'
    }
  }
});

// In main app
await storage.set('shared_token', token, {
  storage: 'preferences'
});

// In widget extension
const token = await storage.get('shared_token', {
  storage: 'preferences'
});
```

## Migration from Native

### From Native iOS

```typescript
class iOSMigration {
  async migrateFromUserDefaults() {
    // Access native UserDefaults
    const oldPrefs = await Capacitor.Plugins.NativePreferences.getAll();
    
    // Migrate to Strata
    for (const [key, value] of Object.entries(oldPrefs)) {
      await storage.set(key, value, {
        storage: 'preferences'
      });
    }
    
    // Mark migration complete
    await storage.set('migration_complete', true, {
      storage: 'preferences'
    });
  }
}
```

### From Native Android

```typescript
class AndroidMigration {
  async migrateFromSharedPreferences() {
    // Access native SharedPreferences
    const oldPrefs = await Capacitor.Plugins.NativePreferences.getAll();
    
    // Migrate to Strata
    for (const [key, value] of Object.entries(oldPrefs)) {
      await storage.set(key, value, {
        storage: 'preferences'
      });
    }
  }
}
```

## Performance Optimization

### 1. Batch Operations

```typescript
// Batch multiple preference updates
class PreferenceBatch {
  private updates: Record<string, unknown> = {};
  
  set(key: string, value: unknown) {
    this.updates[key] = value;
  }
  
  async commit() {
    // Apply all updates at once
    await Promise.all(
      Object.entries(this.updates).map(([key, value]) =>
        storage.set(key, value, { storage: 'preferences' })
      )
    );
    
    this.updates = {};
  }
}
```

### 2. Caching

```typescript
class CachedPreferences {
  private cache = new Map<string, unknown>();
  private cacheTimeout = 60000; // 1 minute
  
  async get(key: string): Promise<unknown> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.timestamp > Date.now() - this.cacheTimeout) {
      return cached.value;
    }
    
    // Fetch from preferences
    const value = await storage.get(key, {
      storage: 'preferences'
    });
    
    // Update cache
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    
    return value;
  }
  
  async set(key: string, value: unknown) {
    // Update storage
    await storage.set(key, value, {
      storage: 'preferences'
    });
    
    // Update cache
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}
```

## Size Limitations

### Platform Limits

| Platform | Limit | Notes |
|----------|-------|--------|
| iOS | ~1MB | Per key-value pair |
| Android | ~1MB | Total SharedPreferences |

### Handling Large Data

```typescript
// For large data, use filesystem or SQLite
class HybridStorage {
  async saveLargeData(key: string, data: unknown) {
    const serialized = JSON.stringify(data);
    
    if (serialized.length < 100000) { // 100KB
      // Small enough for preferences
      await storage.set(key, data, {
        storage: 'preferences'
      });
    } else {
      // Too large, use filesystem
      const fileRef = await this.saveToFile(data);
      await storage.set(key, { type: 'file', ref: fileRef }, {
        storage: 'preferences'
      });
    }
  }
}
```

## Security Considerations

### 1. Sensitive Data

```typescript
// Don't store sensitive data in preferences
// BAD
await storage.set('password', userPassword, {
  storage: 'preferences'
});

// GOOD - Use secure storage
await storage.set('password', userPassword, {
  storage: 'secure',
  encrypt: true
});
```

### 2. Data Validation

```typescript
class SecurePreferences {
  async setSetting(key: string, value: unknown) {
    // Validate input
    if (!this.isValidKey(key)) {
      throw new Error('Invalid preference key');
    }
    
    if (!this.isValidValue(value)) {
      throw new Error('Invalid preference value');
    }
    
    await storage.set(key, value, {
      storage: 'preferences'
    });
  }
  
  private isValidKey(key: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(key);
  }
  
  private isValidValue(value: unknown): boolean {
    // Implement validation logic
    return true;
  }
}
```

## Best Practices

1. **Use for Small Data**: Keep individual values under 1MB
2. **Avoid Sensitive Data**: Use secure storage for passwords/tokens
3. **Implement Versioning**: Version your preference schema
4. **Cache Frequently Used**: Cache preferences accessed often
5. **Batch Updates**: Group multiple updates together
6. **Use Type Safety**: Define interfaces for your preferences
7. **Handle Migration**: Plan for preference schema changes

## See Also

- [Storage Adapters Overview](../README.md)
- [Secure Storage Adapter](./secure.md) - For sensitive data
- [SQLite Adapter](./sqlite.md) - For structured data
- [Platform Guide - Capacitor](../../guides/platforms/capacitor.md)