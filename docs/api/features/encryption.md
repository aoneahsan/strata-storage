# Encryption API Reference

API documentation for the encryption feature in Strata Storage.

> **Runtime support:** Encryption uses the Web Crypto API (`crypto.subtle`). It works in browsers **and** in modern Node.js / SSR runtimes — Node 20+ exposes `globalThis.crypto.subtle`, so encryption works server-side without any polyfill.

## Classes

### EncryptionManager

Manages encryption/decryption operations using Web Crypto API.

```typescript
class EncryptionManager {
  constructor(config?: EncryptionConfig)
  isAvailable(): boolean
  encrypt(data: unknown, password: string): Promise<EncryptedData>
  decrypt<T = unknown>(encrypted: EncryptedData, password: string): Promise<T>
  generatePassword(length?: number): string
  hash(data: string): Promise<string>
  clearCache(): void
}
```

> `encrypt` accepts any JSON-serializable value (it `JSON.stringify`s the input),
> and `decrypt` returns the original deserialized value (`Promise<T>`), not a raw
> string. Key/salt/IV derivation is internal — there is no public
> `generateKey`/`generateSalt`/`generateIV`.

## Interfaces

### EncryptionConfig

The options accepted by `EncryptionManager` (the algorithm/KDF parameters):

```typescript
interface EncryptionConfig {
  algorithm?: 'AES-GCM' | 'AES-CBC'; // default: 'AES-GCM'
  keyLength?: 128 | 192 | 256;       // AES key length in bits (default: 256)
  iterations?: number;               // PBKDF2 iterations (default: 600000)
  saltLength?: number;               // Salt length in bytes (default: 16)
  keyDerivation?: 'PBKDF2';          // Only PBKDF2 is supported
}
```

> `enabled` and `password` are **storage-level** options — you set them on the
> `Strata` constructor's `encryption` block (see [Usage with Strata](#usage-with-strata)),
> not inside `EncryptionManager`'s `EncryptionConfig`.

**Algorithms:**
- **`AES-GCM`** (default) — authenticated encryption (AEAD); the GCM auth tag is
  appended to the ciphertext.
- **`AES-CBC`** — CBC mode is **authenticated via Encrypt-then-MAC**: a separate
  HMAC-SHA256 key is derived (domain-separated) from the same password and an
  HMAC tag over `iv ‖ ciphertext` is stored in `mac` and **verified before
  decryption**. This closes CBC's malleability / padding-oracle gap.

### EncryptedData

```typescript
interface EncryptedData {
  data: string;        // Base64 encoded ciphertext
  salt: string;        // Base64 encoded salt
  iv: string;          // Base64 encoded initialization vector
  algorithm: string;   // Algorithm used ('AES-GCM' | 'AES-CBC')
  iterations: number;  // PBKDF2 iterations actually used (used on decrypt)
  mac?: string;        // Base64 HMAC-SHA256 over (iv || ciphertext) — AES-CBC only
}
```

> **Breaking for legacy AES-CBC data:** AES-CBC ciphertexts written before
> authentication was added have no `mac` and now fail closed with a clear
> "re-encrypt" error on read. Re-encrypt those values (read with an older build,
> write with this one) or switch them to `AES-GCM`. **`AES-GCM` data — the
> default — is unaffected.**

## Methods

### encrypt

Encrypts any JSON-serializable value using the configured algorithm (AES-GCM by
default, or authenticated AES-CBC) with PBKDF2 key derivation. The value is
`JSON.stringify`d internally; the salt and IV are generated per call.

```typescript
async encrypt(data: unknown, password: string): Promise<EncryptedData>
```

**Parameters:**
- `data`: The value to encrypt (any JSON-serializable value)
- `password`: The password for encryption

**Returns:** Promise resolving to the encrypted data structure

**Example:**
```typescript
const encrypted = await encryptionManager.encrypt(
  { token: 'sensitive data' },
  'strong-password'
);
```

### decrypt

Decrypts data produced by `encrypt`, returning the original deserialized value.

```typescript
async decrypt<T = unknown>(encrypted: EncryptedData, password: string): Promise<T>
```

**Parameters:**
- `encrypted`: The encrypted data structure
- `password`: The password for decryption

**Returns:** Promise resolving to the original (JSON-deserialized) value

**Throws:** `EncryptionError` if the MAC/auth check fails or the password is wrong

**Example:**
```typescript
try {
  const decrypted = await encryptionManager.decrypt<{ token: string }>(
    encrypted,
    'strong-password'
  );
} catch (error) {
  console.error('Wrong password or corrupted/tampered data');
}
```

### generatePassword

Generates a cryptographically-random password (unbiased rejection sampling).

```typescript
generatePassword(length?: number): string
```

### hash

Returns a hex SHA-256 hash of the input string.

```typescript
async hash(data: string): Promise<string>
```

## Usage with Strata

### Global Encryption

```typescript
const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'global-password',
    algorithm: 'AES-GCM', // or 'AES-CBC' (authenticated via Encrypt-then-MAC)
    iterations: 600000
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

The encryption feature uses the **Web Crypto API** (`globalThis.crypto.subtle`)
on every platform — there is no native CryptoKit/Keystore code path here. (Native
Keychain/Keystore is the separate [Secure adapter](../adapters/capacitor/secure.md),
which is about *where* keys live, not this content-encryption feature.)

| Platform | Support | Implementation |
|----------|---------|----------------|
| Web (browser / Web Worker) | ✅ | `crypto.subtle` |
| Capacitor (iOS/Android webview) | ✅ | `crypto.subtle` |
| Node.js / SSR (Node 20+) | ✅ | `globalThis.crypto.subtle` |

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
- [Error Types](../core/errors.md)