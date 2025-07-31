# Encryption Guide

Complete guide for using encryption features in Strata Storage.

## Overview

Strata Storage provides built-in AES-GCM encryption using the Web Crypto API on web and native crypto libraries on mobile platforms.

## Quick Start

```typescript
import { Strata } from 'strata-storage';

// Enable encryption globally
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secure-password'
  }
});

// Or per operation
await storage.set('sensitive', data, {
  encrypt: true,
  encryptionPassword: 'specific-password'
});
```

## Encryption Configuration

```typescript
interface EncryptionConfig {
  enabled?: boolean;              // Enable by default
  password?: string;              // Default password
  algorithm?: 'AES-GCM';          // Encryption algorithm
  keyDerivation?: 'PBKDF2';      // Key derivation function
  iterations?: number;            // PBKDF2 iterations (100000)
  saltLength?: number;            // Salt length in bytes (16)
  ivLength?: number;              // IV length in bytes (12)
  tagLength?: number;             // Auth tag length in bits (128)
}
```

## Usage Examples

### Basic Encryption

```typescript
// Encrypt specific data
await storage.set('api_key', secretKey, {
  encrypt: true
});

// Retrieve and auto-decrypt
const key = await storage.get('api_key');
```

### Custom Password

```typescript
// Use different passwords for different data
await storage.set('user_data', userData, {
  encrypt: true,
  encryptionPassword: userPassword
});

await storage.set('admin_data', adminData, {
  encrypt: true,
  encryptionPassword: adminPassword
});
```

### Handling Decryption

```typescript
// Skip decryption
const encrypted = await storage.get('secret', {
  skipDecryption: true
});
console.log(encrypted); // Raw encrypted data

// Ignore decryption errors
const data = await storage.get('secret', {
  ignoreDecryptionErrors: true
});
// Returns null if decryption fails
```

## Security Best Practices

### 1. Password Management

```typescript
class SecurePasswordManager {
  // Generate strong passwords
  generatePassword(): string {
    return storage.generatePassword(32);
  }
  
  // Derive from user input
  async derivePassword(userInput: string, salt: string) {
    const hash = await storage.hash(userInput + salt);
    return hash;
  }
}
```

### 2. Key Rotation

```typescript
class KeyRotation {
  async rotateEncryptionKey(oldPassword: string, newPassword: string) {
    // Get all encrypted items
    const keys = await storage.keys();
    
    for (const key of keys) {
      // Decrypt with old password
      const value = await storage.get(key, {
        encryptionPassword: oldPassword
      });
      
      if (value !== null) {
        // Re-encrypt with new password
        await storage.set(key, value, {
          encrypt: true,
          encryptionPassword: newPassword
        });
      }
    }
  }
}
```

### 3. Secure Storage Combination

```typescript
// Combine encryption with secure storage on mobile
await storage.set('highly_sensitive', data, {
  storage: 'secure',  // Use Keychain/Keystore
  encrypt: true       // Additional encryption layer
});
```

## Platform Considerations

### Web Platform

- Uses Web Crypto API
- Requires HTTPS in production
- SubtleCrypto not available in insecure contexts

### iOS Platform

- Can combine with Keychain for key storage
- Hardware encryption available
- Biometric protection possible

### Android Platform

- Android Keystore integration
- Hardware-backed keys on supported devices
- Fingerprint/PIN protection

## Error Handling

```typescript
import { EncryptionError } from 'strata-storage';

try {
  await storage.get('encrypted_data');
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Decryption failed:', error.message);
    // Handle wrong password, corrupted data, etc.
  }
}
```

## Performance Impact

- Encryption adds ~5-10ms for small data
- Scales linearly with data size
- Consider compression before encryption
- Use selective encryption for optimal performance

## Advanced Usage

### Custom Encryption

```typescript
// Implement custom encryption adapter
class CustomEncryption {
  async encrypt(data: string, password: string): Promise<EncryptedData> {
    // Custom implementation
  }
  
  async decrypt(encrypted: EncryptedData, password: string): Promise<string> {
    // Custom implementation
  }
}
```

### Encrypted Queries

```typescript
// Query encrypted data (requires decryption)
const results = await storage.query({
  'value.type': 'user'
}, {
  encryptionPassword: password
});
```

## See Also

- [Security Guide](../security.md)
- [API Reference - Encryption](../../api/features/encryption.md)
- [Secure Storage Adapter](../../api/adapters/capacitor/secure.md)