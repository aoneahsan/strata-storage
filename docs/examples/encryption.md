# Encryption Examples

Examples of using encryption features in Strata Storage.

## Basic Encryption

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Encrypt a single value
await storage.set('api-key', 'secret-key-123', {
  encrypt: true,
  encryptionPassword: 'strong-password'
});

// Retrieve and decrypt
const apiKey = await storage.get('api-key', {
  encryptionPassword: 'strong-password'
});
```

## Global Encryption

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'global-encryption-key'
  }
});

// All operations are encrypted
await storage.set('user-data', { name: 'John', ssn: '123-45-6789' });
await storage.set('payment-info', { card: '****1234' });
```

## Selective Encryption

```typescript
const storage = new Strata();

// Encrypt sensitive data only
await storage.set('username', 'john_doe'); // Not encrypted
await storage.set('password', 'secret123', { encrypt: true });
await storage.set('session', 'abc123', { encrypt: true });
```

## Password Management

```typescript
class SecureStorage {
  private storage: Strata;
  private password: string;
  
  constructor() {
    this.storage = new Strata();
  }
  
  async unlock(masterPassword: string) {
    // Verify master password
    try {
      await this.storage.get('_verification', {
        encryptionPassword: masterPassword
      });
      this.password = masterPassword;
      return true;
    } catch {
      return false;
    }
  }
  
  async setSecure(key: string, value: any) {
    if (!this.password) throw new Error('Storage locked');
    
    await this.storage.set(key, value, {
      encrypt: true,
      encryptionPassword: this.password
    });
  }
  
  async getSecure(key: string) {
    if (!this.password) throw new Error('Storage locked');
    
    return await this.storage.get(key, {
      encryptionPassword: this.password
    });
  }
}
```

## Key Derivation

```typescript
import { Strata } from 'strata-storage';

class DerivedKeyStorage {
  private storage: Strata;
  
  async deriveKey(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
  
  async saveWithDerivedKey(key: string, value: any, userPassword: string) {
    const salt = await this.storage.get('user-salt') || 'default-salt';
    const derivedKey = await this.deriveKey(userPassword, salt);
    
    await this.storage.set(key, value, {
      encrypt: true,
      encryptionPassword: derivedKey
    });
  }
}
```

## Encrypted File Storage

```typescript
async function saveEncryptedFile(file: File, password: string) {
  // Read file as base64
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  
  // Store encrypted
  await storage.set(`file:${file.name}`, {
    name: file.name,
    type: file.type,
    size: file.size,
    data: base64,
    uploadedAt: new Date()
  }, {
    encrypt: true,
    encryptionPassword: password
  });
}

async function getEncryptedFile(filename: string, password: string): Promise<Blob> {
  const fileData = await storage.get(`file:${filename}`, {
    encryptionPassword: password
  });
  
  if (!fileData) throw new Error('File not found');
  
  // Convert base64 back to blob
  const response = await fetch(fileData.data);
  return await response.blob();
}
```

## Secure Form Data

```typescript
class SecureForm {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      encryption: {
        enabled: true,
        password: this.generateFormKey()
      }
    });
  }
  
  private generateFormKey(): string {
    // Generate unique key per session
    return `form-${Date.now()}-${Math.random()}`;
  }
  
  async saveField(fieldName: string, value: string, sensitive = false) {
    if (sensitive) {
      await this.storage.set(`form:${fieldName}`, value, {
        encrypt: true,
        ttl: 3600000 // Auto-expire after 1 hour
      });
    } else {
      await this.storage.set(`form:${fieldName}`, value);
    }
  }
}
```

## See Also

- [Encryption Guide](../guides/features/encryption.md)
- [Encryption API](../api/features/encryption.md)
- [User Authentication](./user-auth.md)