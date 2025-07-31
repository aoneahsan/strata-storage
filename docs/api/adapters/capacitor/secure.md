# Secure Storage Adapter

Hardware-backed secure storage for sensitive data.

## Overview

The Secure adapter provides encrypted storage using platform-specific secure mechanisms - Keychain on iOS and EncryptedSharedPreferences on Android.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ❌ No |
| Searchable | ✅ Yes (limited) |
| Iterable | ✅ Yes |
| Capacity | ~5MB |
| Performance | 🔒 Secure |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Store sensitive data
await storage.set('api_key', secretKey, { 
  storage: 'secure' 
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    secure: {
      accessibility: 'whenUnlockedThisDeviceOnly', // iOS
      authenticationPrompt: 'Authenticate to access data',
      biometricOnly: false
    }
  }
});
```

## Platform Implementation

### iOS (Keychain)

```swift
// Keychain Services implementation
import Security

class KeychainStorage {
    func save(key: String, value: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: value,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        SecItemAdd(query as CFDictionary, nil)
    }
}
```

### Android (EncryptedSharedPreferences)

```java
// Android encrypted storage
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

MasterKey masterKey = new MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build();

SharedPreferences prefs = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
);
```

## Use Cases

### 1. Authentication Tokens

```typescript
class AuthTokenManager {
  async saveToken(token: string) {
    await storage.set('auth_token', token, {
      storage: 'secure',
      ttl: 3600000 // 1 hour
    });
  }
  
  async getToken(): Promise<string | null> {
    return await storage.get('auth_token', {
      storage: 'secure'
    });
  }
  
  async clearToken() {
    await storage.remove('auth_token', {
      storage: 'secure'
    });
  }
}
```

### 2. Biometric Protection

```typescript
class BiometricStorage {
  async saveSensitive(key: string, value: string) {
    await storage.set(key, value, {
      storage: 'secure',
      biometricOnly: true,
      authenticationPrompt: 'Authenticate to access your data'
    });
  }
  
  async getSensitive(key: string) {
    try {
      return await storage.get(key, {
        storage: 'secure',
        authenticationPrompt: 'Authenticate to retrieve data'
      });
    } catch (error) {
      if (error.code === 'UserCancel') {
        console.log('User cancelled authentication');
      }
      throw error;
    }
  }
}
```

### 3. Encryption Keys

```typescript
class EncryptionKeyManager {
  async generateAndStore() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    const keyString = btoa(String.fromCharCode(...new Uint8Array(exported)));
    
    await storage.set('encryption_key', keyString, {
      storage: 'secure',
      accessibility: 'whenUnlockedThisDeviceOnly'
    });
  }
}
```

## Security Features

### Accessibility Options (iOS)

```typescript
enum Accessibility {
  WhenUnlocked = 'whenUnlocked',
  WhenUnlockedThisDeviceOnly = 'whenUnlockedThisDeviceOnly',
  AfterFirstUnlock = 'afterFirstUnlock',
  AfterFirstUnlockThisDeviceOnly = 'afterFirstUnlockThisDeviceOnly',
  WhenPasscodeSetThisDeviceOnly = 'whenPasscodeSetThisDeviceOnly'
}
```

### Hardware Security

- **iOS**: Hardware-encrypted Keychain
- **Android**: Hardware-backed Android Keystore
- **Biometric**: Touch ID / Face ID / Fingerprint

## Best Practices

1. **Minimal Storage**: Store only essential sensitive data
2. **Short TTLs**: Use expiration for temporary secrets
3. **Biometric Protection**: Enable for highly sensitive data
4. **Error Handling**: Handle authentication failures gracefully
5. **Backup Exclusion**: Exclude from iCloud/Google backups

## Limitations

1. **Size Limits**: ~5MB total capacity
2. **Performance**: Slower due to encryption
3. **No Sync**: Cannot sync across devices
4. **Platform Specific**: Different behaviors per platform

## See Also

- [Storage Adapters Overview](../README.md)
- [Security Best Practices](../../../guides/security.md)
- [Encryption Guide](../../../guides/features/encryption.md)