# Capacitor App Examples

Complete examples of using Strata Storage in Capacitor applications.

## Basic Capacitor Setup

```typescript
import { Strata } from 'strata-storage';
import { Capacitor } from '@capacitor/core';

const storage = new Strata({
  namespace: 'capacitor-app',
  defaultStorages: Capacitor.isNativePlatform() 
    ? ['secure', 'sqlite', 'preferences']
    : ['indexedDB', 'localStorage']
});
```

## Platform-Specific Storage

```typescript
import { Device } from '@capacitor/device';

async function setupPlatformStorage() {
  const info = await Device.getInfo();
  
  const storage = new Strata({
    namespace: 'my-app',
    defaultStorages: info.platform === 'ios'
      ? ['secure', 'preferences'] // iOS Keychain + UserDefaults
      : info.platform === 'android'
      ? ['secure', 'sqlite'] // Android EncryptedSharedPreferences + SQLite
      : ['indexedDB', 'localStorage'] // Web fallback
  });
  
  return storage;
}
```

## Biometric Authentication

```typescript
import { BiometricAuth } from '@capacitor-community/biometric-auth';

class SecureStorage {
  private storage: Strata;
  
  async saveWithBiometric(key: string, value: any) {
    // Check biometric availability
    const available = await BiometricAuth.isAvailable();
    
    if (available.biometryType) {
      // Verify biometric
      await BiometricAuth.verify({
        reason: 'Access secure storage',
        title: 'Authentication Required'
      });
      
      // Store securely
      await this.storage.set(key, value, {
        storage: 'secure',
        encrypt: true
      });
    }
  }
}
```

## App State Persistence

```typescript
import { App } from '@capacitor/app';

class AppStateManager {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata();
    this.setupListeners();
  }
  
  private setupListeners() {
    // Save state on pause
    App.addListener('pause', async () => {
      await this.storage.set('app-state', {
        timestamp: Date.now(),
        screen: getCurrentScreen(),
        data: getAppData()
      });
    });
    
    // Restore on resume
    App.addListener('resume', async () => {
      const state = await this.storage.get('app-state');
      if (state && Date.now() - state.timestamp < 300000) { // 5 minutes
        restoreAppState(state);
      }
    });
  }
}
```

## Photo Storage

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

class PhotoManager {
  private storage: Strata;
  
  async savePhoto() {
    // Take photo
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      quality: 90
    });
    
    // Save to filesystem
    const fileName = `photo_${Date.now()}.jpg`;
    await Filesystem.writeFile({
      path: fileName,
      data: photo.base64String!,
      directory: Directory.Data
    });
    
    // Store metadata in Strata
    await this.storage.set(`photo:${fileName}`, {
      path: fileName,
      timestamp: Date.now(),
      size: photo.base64String!.length,
      format: photo.format
    });
  }
  
  async getPhotos() {
    const photos = await this.storage.query({
      key: { $startsWith: 'photo:' }
    });
    
    return photos.map(p => p.value);
  }
}
```

## Network Status Handling

```typescript
import { Network } from '@capacitor/network';

class NetworkAwareStorage {
  private storage: Strata;
  private isOnline = true;
  
  constructor() {
    this.storage = new Strata();
    this.setupNetworkListener();
  }
  
  private setupNetworkListener() {
    Network.addListener('networkStatusChange', status => {
      this.isOnline = status.connected;
      
      if (status.connected) {
        this.syncPendingData();
      }
    });
  }
  
  async save(key: string, value: any) {
    // Always save locally
    await this.storage.set(key, value);
    
    if (this.isOnline) {
      await this.syncToServer(key, value);
    } else {
      await this.queueForSync(key);
    }
  }
}
```

## Push Notification Data

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

class NotificationStorage {
  private storage: Strata;
  
  async setup() {
    // Store registration token
    PushNotifications.addListener('registration', async (token) => {
      await this.storage.set('push-token', token.value, {
        encrypt: true
      });
    });
    
    // Store notification history
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const history = await this.storage.get('notification-history') || [];
      history.unshift({
        ...notification,
        receivedAt: Date.now()
      });
      
      // Keep last 50 notifications
      await this.storage.set('notification-history', history.slice(0, 50));
    });
  }
}
```

## Geolocation Tracking

```typescript
import { Geolocation } from '@capacitor/geolocation';

class LocationTracker {
  private storage: Strata;
  
  async trackLocation() {
    const position = await Geolocation.getCurrentPosition();
    
    // Store with TTL for privacy
    await this.storage.set('last-location', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    }, {
      ttl: 3600000, // 1 hour
      encrypt: true
    });
  }
  
  async getLocationHistory() {
    return await this.storage.query({
      key: { $startsWith: 'location:' },
      'value.timestamp': { $after: Date.now() - 86400000 } // Last 24h
    });
  }
}
```

## See Also

- [Capacitor Platform Guide](../guides/platforms/capacitor.md)
- [React Native Example](./react-native.md)
- [Ionic App Example](./ionic-app.md)