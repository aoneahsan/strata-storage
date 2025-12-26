# Advanced Encryption Examples

Learn how to securely encrypt and store sensitive data using Strata Storage's built-in encryption features.

## Table of Contents

- [Basic Encryption](#basic-encryption)
- [Configuration Options](#configuration-options)
- [Platform-Specific Encryption](#platform-specific-encryption)
- [Selective Encryption](#selective-encryption)
- [Key Management](#key-management)
- [Real-World Examples](#real-world-examples)
- [Best Practices](#best-practices)

## Basic Encryption

### Enable Global Encryption

Encrypt all data by default:

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'your-secure-password-here'
  }
});

await storage.initialize();

// All data is now automatically encrypted
await storage.set('secretData', { apiKey: 'abc123' });
await storage.set('userToken', 'sensitive-token');

// Data is decrypted automatically when retrieved
const data = await storage.get('secretData');
console.log(data); // { apiKey: 'abc123' }
```

### Per-Operation Encryption

Encrypt only specific values:

```typescript
const storage = new Strata(); // No global encryption
await storage.initialize();

// Normal storage
await storage.set('theme', 'dark'); // Not encrypted

// Encrypted storage
await storage.set('password', 'secret123', {
  encrypt: true
});

await storage.set('creditCard', {
  number: '1234-5678-9012-3456',
  cvv: '123'
}, {
  encrypt: true
});
```

## Configuration Options

### Specify Encryption Algorithm

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'secure-password',
    algorithm: 'AES-GCM', // Default
    keySize: 256 // 256-bit encryption
  }
});
```

### Custom Salt

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'secure-password',
    salt: 'custom-salt-value', // Use consistent salt
    iterations: 100000 // PBKDF2 iterations
  }
});
```

### Multiple Encryption Keys

Use different keys for different data:

```typescript
// Storage for user data
const userStorage = new Strata({
  encryption: {
    enabled: true,
    password: 'user-data-key'
  }
});

// Storage for app secrets
const secretStorage = new Strata({
  encryption: {
    enabled: true,
    password: 'app-secrets-key'
  }
});

await userStorage.set('profile', userData);
await secretStorage.set('apiKey', apiKey);
```

## Platform-Specific Encryption

### Web (Browser)

Uses Web Crypto API for encryption:

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'web-encryption-key',
    algorithm: 'AES-GCM' // Web Crypto API standard
  }
});

await storage.initialize();
await storage.set('sessionToken', token);
```

### iOS (Keychain)

Use native Keychain for secure storage:

```typescript
import { Capacitor } from '@capacitor/core';

const storage = new Strata();
await storage.initialize();

if (Capacitor.getPlatform() === 'ios') {
  // Use Keychain (automatically encrypted)
  await storage.set('authToken', token, {
    storage: 'secure' // Maps to Keychain on iOS
  });
}
```

### Android (EncryptedSharedPreferences)

Use EncryptedSharedPreferences:

```typescript
import { Capacitor } from '@capacitor/core';

const storage = new Strata();
await storage.initialize();

if (Capacitor.getPlatform() === 'android') {
  // Use EncryptedSharedPreferences
  await storage.set('credentials', creds, {
    storage: 'secure' // Maps to EncryptedSharedPreferences
  });
}
```

### Cross-Platform Secure Storage

Automatically use best secure storage for each platform:

```typescript
import { Capacitor } from '@capacitor/core';

async function secureStore(key: string, value: any) {
  const storage = new Strata();
  await storage.initialize();

  if (Capacitor.isNativePlatform()) {
    // Use native secure storage (Keychain/EncryptedSharedPreferences)
    await storage.set(key, value, { storage: 'secure' });
  } else {
    // Use Web Crypto API encryption
    await storage.set(key, value, { encrypt: true });
  }
}

await secureStore('apiKey', 'secret-key');
```

## Selective Encryption

### Encrypt Sensitive Fields Only

```typescript
interface User {
  id: number;
  username: string; // Public
  email: string; // Public
  password: string; // Sensitive
  creditCard: string; // Sensitive
}

const storage = new Strata();
await storage.initialize();

const user: User = {
  id: 1,
  username: 'john_doe',
  email: 'john@example.com',
  password: 'hashed-password',
  creditCard: '1234-5678-9012-3456'
};

// Store public data normally
await storage.set('user:public', {
  id: user.id,
  username: user.username,
  email: user.email
});

// Encrypt sensitive data
await storage.set('user:sensitive', {
  password: user.password,
  creditCard: user.creditCard
}, {
  encrypt: true
});
```

### Conditional Encryption

```typescript
async function smartStore(key: string, value: any, isSensitive: boolean) {
  const storage = new Strata();
  await storage.initialize();

  if (isSensitive) {
    await storage.set(key, value, { encrypt: true });
  } else {
    await storage.set(key, value);
  }
}

await smartStore('theme', 'dark', false); // Not encrypted
await smartStore('apiKey', 'secret', true); // Encrypted
```

## Key Management

### Environment-Based Keys

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: process.env.ENCRYPTION_KEY || 'fallback-key'
  }
});
```

### Generate Strong Keys

```typescript
// Generate cryptographically secure key
function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const encryptionKey = generateEncryptionKey();

const storage = new Strata({
  encryption: {
    enabled: true,
    password: encryptionKey
  }
});

// Store key securely (e.g., in environment variables or secure vault)
```

### Key Rotation

```typescript
async function rotateEncryptionKey(oldPassword: string, newPassword: string) {
  // Storage with old key
  const oldStorage = new Strata({
    encryption: { enabled: true, password: oldPassword }
  });
  await oldStorage.initialize();

  // Storage with new key
  const newStorage = new Strata({
    encryption: { enabled: true, password: newPassword }
  });
  await newStorage.initialize();

  // Migrate all data
  const allData = await oldStorage.getAll();

  for (const [key, value] of Object.entries(allData)) {
    await newStorage.set(key, value);
  }

  // Clear old storage
  await oldStorage.clear();

  return newStorage;
}

// Rotate keys
const storage = await rotateEncryptionKey('old-key', 'new-key');
```

## Real-World Examples

### Secure Authentication

```typescript
class AuthManager {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      encryption: {
        enabled: true,
        password: process.env.AUTH_ENCRYPTION_KEY!
      }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    await this.storage.set('auth:tokens', {
      access: accessToken,
      refresh: refreshToken,
      timestamp: Date.now()
    });
  }

  async getTokens() {
    return await this.storage.get('auth:tokens');
  }

  async clearTokens() {
    await this.storage.remove('auth:tokens');
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }
}

// Usage
const auth = new AuthManager();
await auth.init();
await auth.saveTokens('access-token', 'refresh-token');
```

### Encrypted User Preferences

```typescript
class SecurePreferences {
  private storage: Strata;

  constructor(userId: string) {
    // User-specific encryption key
    this.storage = new Strata({
      encryption: {
        enabled: true,
        password: `${userId}-${process.env.MASTER_KEY}`
      }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async setPreference(key: string, value: any) {
    await this.storage.set(`pref:${key}`, value);
  }

  async getPreference(key: string) {
    return await this.storage.get(`pref:${key}`);
  }

  async getAllPreferences() {
    const keys = await this.storage.keys();
    const prefKeys = keys.filter(k => k.startsWith('pref:'));

    const preferences: Record<string, any> = {};
    for (const key of prefKeys) {
      const prefName = key.replace('pref:', '');
      preferences[prefName] = await this.storage.get(key);
    }

    return preferences;
  }
}

// Usage
const prefs = new SecurePreferences('user-123');
await prefs.init();
await prefs.setPreference('paymentMethod', 'card-ending-1234');
```

### Payment Information Storage

```typescript
interface PaymentInfo {
  cardLast4: string;
  expiryMonth: number;
  expiryYear: number;
  billingAddress: string;
}

class SecurePaymentStorage {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      encryption: {
        enabled: true,
        password: process.env.PAYMENT_ENCRYPTION_KEY!,
        algorithm: 'AES-GCM',
        keySize: 256
      }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async savePaymentInfo(info: PaymentInfo) {
    await this.storage.set('payment:info', info, {
      encrypt: true,
      storage: 'secure' // Use Keychain/EncryptedSharedPreferences on mobile
    });
  }

  async getPaymentInfo(): Promise<PaymentInfo | null> {
    return await this.storage.get('payment:info');
  }

  async deletePaymentInfo() {
    await this.storage.remove('payment:info');
  }
}

// Usage
const payments = new SecurePaymentStorage();
await payments.init();
await payments.savePaymentInfo({
  cardLast4: '1234',
  expiryMonth: 12,
  expiryYear: 2025,
  billingAddress: '123 Main St'
});
```

### API Key Management

```typescript
class APIKeyManager {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      encryption: {
        enabled: true,
        password: process.env.MASTER_ENCRYPTION_KEY!
      }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async saveAPIKey(service: string, apiKey: string) {
    await this.storage.set(`api:${service}`, {
      key: apiKey,
      createdAt: Date.now()
    });
  }

  async getAPIKey(service: string): Promise<string | null> {
    const data = await this.storage.get(`api:${service}`);
    return data?.key || null;
  }

  async rotateAPIKey(service: string, newKey: string) {
    const oldData = await this.storage.get(`api:${service}`);

    await this.storage.set(`api:${service}`, {
      key: newKey,
      createdAt: Date.now(),
      rotatedAt: Date.now(),
      previousKey: oldData?.key
    });
  }

  async deleteAPIKey(service: string) {
    await this.storage.remove(`api:${service}`);
  }
}

// Usage
const apiKeys = new APIKeyManager();
await apiKeys.init();
await apiKeys.saveAPIKey('stripe', 'sk_test_...');
const stripeKey = await apiKeys.getAPIKey('stripe');
```

## Best Practices

### 1. Use Strong Passwords

```typescript
// ❌ BAD
const storage = new Strata({
  encryption: {
    enabled: true,
    password: '123456'
  }
});

// ✅ GOOD
const storage = new Strata({
  encryption: {
    enabled: true,
    password: generateSecureKey() // Use cryptographically secure key
  }
});
```

### 2. Don't Hardcode Keys

```typescript
// ❌ BAD
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'my-hardcoded-key'
  }
});

// ✅ GOOD
const storage = new Strata({
  encryption: {
    enabled: true,
    password: process.env.ENCRYPTION_KEY!
  }
});
```

### 3. Use Native Secure Storage on Mobile

```typescript
// ✅ GOOD - Use platform-specific secure storage
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await storage.set('secret', value, { storage: 'secure' });
} else {
  await storage.set('secret', value, { encrypt: true });
}
```

### 4. Encrypt Only What's Necessary

```typescript
// ❌ BAD - Encrypting everything has performance cost
await storage.set('theme', 'dark', { encrypt: true }); // Unnecessary

// ✅ GOOD - Encrypt only sensitive data
await storage.set('theme', 'dark'); // No encryption needed
await storage.set('apiKey', key, { encrypt: true }); // Encrypt sensitive data
```

### 5. Handle Encryption Errors

```typescript
import { EncryptionError } from 'strata-storage';

try {
  await storage.set('data', value, { encrypt: true });
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Encryption failed:', error.message);
    // Fallback or notify user
  }
}
```

### 6. Verify Encryption

```typescript
// Check if data is encrypted in storage
const storage = new Strata({
  encryption: { enabled: true, password: 'key' }
});

await storage.set('test', 'value');

// Raw storage access (for testing only)
const raw = localStorage.getItem('test');
console.log(raw); // Should be encrypted gibberish, not "value"
```

## Security Considerations

1. **Password Strength**: Use strong, randomly generated passwords
2. **Key Storage**: Never store encryption keys in the same location as encrypted data
3. **Key Rotation**: Regularly rotate encryption keys
4. **Platform Security**: Use native secure storage (Keychain/EncryptedSharedPreferences) when available
5. **HTTPS**: Always use HTTPS when transmitting encrypted data
6. **Audit**: Regularly audit what data is encrypted and where keys are stored

## Next Steps

- Learn about [Compression](../../guides/features/compression.md)
- See [TTL Management](../../guides/features/ttl.md)
- Explore [Platform Guides](../../guides/platforms/web.md)
