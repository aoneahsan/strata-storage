# Encryption API Reference

API documentation for the encryption feature in Strata Storage.

## Classes

### EncryptionManager

Manages encryption/decryption operations using Web Crypto API.

```typescript
class EncryptionManager {
  constructor(config?: EncryptionConfig)
  encrypt(data: string, password: string): Promise<EncryptedData>
  decrypt(encrypted: EncryptedData, password: string): Promise<string>
  generateKey(password: string, salt: Uint8Array): Promise<CryptoKey>
  generateSalt(): Uint8Array
  generateIV(): Uint8Array
}
```

## Interfaces

### EncryptionConfig

```typescript
interface EncryptionConfig {
  enabled?: boolean;              // Enable encryption by default
  password?: string;              // Default encryption password
  algorithm?: 'AES-GCM';          // Encryption algorithm
  keyDerivation?: 'PBKDF2';      // Key derivation function
  iterations?: number;            // PBKDF2 iterations (default: 100000)
  saltLength?: number;            // Salt length in bytes (default: 16)
  ivLength?: number;              // IV length in bytes (default: 12)
  tagLength?: number;             // Auth tag length in bits (default: 128)
}
```

### EncryptedData

```typescript
interface EncryptedData {
  data: string;        // Base64 encoded encrypted data
  salt: string;        // Base64 encoded salt
  iv: string;          // Base64 encoded initialization vector
  tag?: string;        // Base64 encoded auth tag (for AES-GCM)
  algorithm: string;   // Algorithm used
  iterations: number;  // PBKDF2 iterations
}
```

## Methods

### encrypt

Encrypts a string using AES-GCM with PBKDF2 key derivation.

```typescript
async encrypt(data: string, password: string): Promise<EncryptedData>
```

**Parameters:**
- `data`: The string to encrypt
- `password`: The password for encryption

**Returns:** Promise resolving to encrypted data structure

**Example:**
```typescript
const encrypted = await encryptionManager.encrypt(
  'sensitive data',
  'strong-password'
);
```

### decrypt

Decrypts data encrypted with the encrypt method.

```typescript
async decrypt(encrypted: EncryptedData, password: string): Promise<string>
```

**Parameters:**
- `encrypted`: The encrypted data structure
- `password`: The password for decryption

**Returns:** Promise resolving to decrypted string

**Throws:** `EncryptionError` if decryption fails

**Example:**
```typescript
try {
  const decrypted = await encryptionManager.decrypt(
    encrypted,
    'strong-password'
  );
} catch (error) {
  console.error('Wrong password or corrupted data');
}
```

### generateKey

Derives an encryption key from a password using PBKDF2.

```typescript
async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey>
```

**Parameters:**
- `password`: The password to derive from
- `salt`: Random salt for key derivation

**Returns:** Promise resolving to CryptoKey

## Usage with Strata

### Global Encryption

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'global-password',
    iterations: 100000
  }
});

// All operations are encrypted
await storage.set('key', 'value');
```

### Per-Operation Encryption

```typescript
await storage.set('key', 'value', {
  encrypt: true,
  encryptionPassword: 'specific-password'
});
```

## Security Considerations

1. **Password Strength**: Use strong, unique passwords
2. **Key Derivation**: Higher iterations = more secure but slower
3. **Salt**: Always use random salts (handled automatically)
4. **IV**: Always use random IVs (handled automatically)
5. **HTTPS**: Required for Web Crypto API in browsers

## Platform Support

| Platform | Support | Implementation |
|----------|---------|----------------|
| Web | ✅ | Web Crypto API |
| iOS | ✅ | CryptoKit |
| Android | ✅ | Android Keystore |
| Node.js | ✅ | Node crypto module |

## Error Handling

```typescript
import { EncryptionError } from 'strata-storage';

try {
  await storage.get('encrypted-key');
} catch (error) {
  if (error instanceof EncryptionError) {
    // Handle encryption/decryption errors
    console.error('Encryption error:', error.message);
  }
}
```

## See Also

- [Encryption Guide](../../guides/features/encryption.md)
- [Security Best Practices](../../guides/security.md)
- [Error Types](../errors.md)