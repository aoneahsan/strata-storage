/**
 * Encryption Feature - Web Crypto API implementation
 * Zero-dependency encryption/decryption for storage values
 */

import { EncryptionError } from '@/utils/errors';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm?: 'AES-GCM' | 'AES-CBC';
  keyLength?: 128 | 192 | 256;
  iterations?: number;
  saltLength?: number;
  keyDerivation?: 'PBKDF2';
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  salt: string; // Base64 encoded salt
  iv: string; // Base64 encoded initialization vector
  algorithm: string;
  iterations: number;
  /**
   * Base64 HMAC-SHA256 tag over (iv || ciphertext), present only for AES-CBC.
   *
   * AES-CBC provides confidentiality but NOT authentication, so without a MAC a
   * CBC ciphertext is malleable and vulnerable to padding-oracle / bit-flip
   * attacks. We therefore use Encrypt-then-MAC: a separate HMAC key is derived
   * from the same password (domain-separated salt) and the tag is verified
   * before decryption. AES-GCM is authenticated by construction and does not
   * carry this field.
   */
  mac?: string;
}

/**
 * Default PBKDF2 iteration count. Raised to 600,000 to match current OWASP
 * guidance for PBKDF2-HMAC-SHA256. The per-record `iterations` value is stored
 * in {@link EncryptedData} and used on decrypt, so raising this default never
 * breaks data written with an older, lower count.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 600000;

/**
 * Encryption manager using Web Crypto API
 */
export class EncryptionManager {
  private config: Required<EncryptionConfig>;
  private keyCache: Map<string, CryptoKey> = new Map();
  private macKeyCache: Map<string, CryptoKey> = new Map();

  constructor(config: EncryptionConfig = {}) {
    if (config.keyDerivation && config.keyDerivation !== 'PBKDF2') {
      throw new EncryptionError('Unsupported key derivation function: only PBKDF2 is available');
    }

    this.config = {
      algorithm: config.algorithm || 'AES-GCM',
      keyLength: config.keyLength || 256,
      iterations: config.iterations || DEFAULT_PBKDF2_ITERATIONS,
      saltLength: config.saltLength || 16,
      keyDerivation: 'PBKDF2',
    };
  }

  /**
   * Check if encryption is available. Uses the Web Crypto API via `globalThis`
   * so it works in browsers, Web Workers, and modern Node.js / SSR runtimes
   * (Node 20+ exposes `globalThis.crypto.subtle`) — not just the browser.
   */
  isAvailable(): boolean {
    const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
    return !!cryptoObj && typeof cryptoObj.subtle !== 'undefined';
  }

  /**
   * Encrypt data
   */
  async encrypt(data: unknown, password: string): Promise<EncryptedData> {
    if (!this.isAvailable()) {
      throw new EncryptionError('Web Crypto API not available');
    }

    try {
      // Convert data to string
      const dataStr = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataStr);

      // Generate salt and IV. GCM uses a 12-byte nonce; CBC requires a 16-byte IV.
      const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
      const ivLength = this.config.algorithm === 'AES-CBC' ? 16 : 12;
      const iv = crypto.getRandomValues(new Uint8Array(ivLength));

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv: iv,
        },
        key,
        dataBuffer,
      );

      const result: EncryptedData = {
        data: this.bufferToBase64(encryptedBuffer),
        salt: this.bufferToBase64(this.toArrayBuffer(salt)),
        iv: this.bufferToBase64(this.toArrayBuffer(iv)),
        algorithm: this.config.algorithm,
        iterations: this.config.iterations,
      };

      // Encrypt-then-MAC for the unauthenticated CBC mode.
      if (this.config.algorithm === 'AES-CBC') {
        const macKey = await this.deriveMacKey(password, salt, this.config.iterations);
        const mac = await crypto.subtle.sign(
          'HMAC',
          macKey,
          this.concatBuffers(this.toArrayBuffer(iv), encryptedBuffer),
        );
        result.mac = this.bufferToBase64(mac);
      }

      return result;
    } catch (error) {
      throw new EncryptionError(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt data
   */
  async decrypt<T = unknown>(encryptedData: EncryptedData, password: string): Promise<T> {
    if (!this.isAvailable()) {
      throw new EncryptionError('Web Crypto API not available');
    }

    try {
      // Convert from base64
      const dataBuffer = this.base64ToBuffer(encryptedData.data);
      const salt = this.base64ToBuffer(encryptedData.salt);
      const iv = this.base64ToBuffer(encryptedData.iv);

      // For AES-CBC, verify the HMAC tag BEFORE attempting decryption
      // (Encrypt-then-MAC). This authenticates the ciphertext and prevents
      // padding-oracle / tampering attacks against the unauthenticated mode.
      if (encryptedData.algorithm === 'AES-CBC') {
        if (!encryptedData.mac) {
          throw new EncryptionError(
            'AES-CBC value is missing its authentication tag. It was written by a version ' +
              'that did not authenticate CBC and cannot be safely decrypted — re-encrypt the ' +
              'data (preferably with the default AES-GCM).',
          );
        }
        const macKey = await this.deriveMacKey(
          password,
          new Uint8Array(salt),
          encryptedData.iterations,
        );
        const valid = await crypto.subtle.verify(
          'HMAC',
          macKey,
          this.base64ToBuffer(encryptedData.mac),
          this.concatBuffers(iv, dataBuffer),
        );
        if (!valid) {
          throw new EncryptionError('Authentication failed: data has been tampered with');
        }
      }

      // Derive key from password
      const key = await this.deriveKey(password, new Uint8Array(salt), encryptedData.iterations);

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: iv,
        },
        key,
        dataBuffer,
      );

      // Convert back to original data
      const decoder = new TextDecoder();
      const decryptedStr = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedStr) as T;
    } catch (error) {
      if (error instanceof EncryptionError) throw error;
      throw new EncryptionError(`Decryption failed: ${error}`);
    }
  }

  /**
   * Derive encryption key from password
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = this.config.iterations,
  ): Promise<CryptoKey> {
    const saltBuffer = this.toArrayBuffer(salt);

    // Cache key is a hash of the composite, never the raw password — so the
    // plaintext secret is not retained as a Map key for the process lifetime.
    const cacheKey = await this.hashCacheKey(
      `aes:${this.bufferToBase64(saltBuffer)}:${iterations}`,
      password,
    );
    const cached = this.keyCache.get(cacheKey);
    if (cached) return cached;

    const keyMaterial = await this.importPasswordKeyMaterial(password);

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.config.algorithm,
        length: this.config.keyLength,
      },
      false,
      ['encrypt', 'decrypt'],
    );

    this.keyCache.set(cacheKey, key);
    return key;
  }

  /**
   * Derive a separate HMAC-SHA256 key for Encrypt-then-MAC on AES-CBC.
   *
   * The HMAC key must be cryptographically independent of the AES key, so the
   * PBKDF2 salt is domain-separated with a trailing marker byte. The MAC key is
   * non-extractable and limited to sign/verify.
   */
  private async deriveMacKey(
    password: string,
    salt: Uint8Array,
    iterations: number = this.config.iterations,
  ): Promise<CryptoKey> {
    // Domain separation: a distinct salt yields a key unrelated to the AES key.
    const macSalt = new Uint8Array(salt.length + 1);
    macSalt.set(salt, 0);
    macSalt[salt.length] = 0x01; // marker distinguishing the MAC key derivation
    const macSaltBuffer = this.toArrayBuffer(macSalt);

    const cacheKey = await this.hashCacheKey(
      `hmac:${this.bufferToBase64(macSaltBuffer)}:${iterations}`,
      password,
    );
    const cached = this.macKeyCache.get(cacheKey);
    if (cached) return cached;

    const keyMaterial = await this.importPasswordKeyMaterial(password);

    const macKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: macSaltBuffer,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'HMAC',
        hash: 'SHA-256',
        length: 256,
      },
      false,
      ['sign', 'verify'],
    );

    this.macKeyCache.set(cacheKey, macKey);
    return macKey;
  }

  /**
   * Import a password string as PBKDF2 key material.
   */
  private async importPasswordKeyMaterial(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    return crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
      'deriveBits',
      'deriveKey',
    ]);
  }

  /**
   * Build an opaque cache key by hashing the password together with the public
   * derivation parameters. Returns a base64 SHA-256 digest so the raw password
   * is never used as (or recoverable from) the Map key.
   */
  private async hashCacheKey(scope: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${scope}:${password}`));
    return this.bufferToBase64(digest);
  }

  /**
   * Copy a (possibly offset) typed array into a standalone ArrayBuffer.
   */
  private toArrayBuffer(view: Uint8Array): ArrayBuffer {
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }

  /**
   * Concatenate two buffers into one ArrayBuffer.
   */
  private concatBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
    const out = new Uint8Array(a.byteLength + b.byteLength);
    out.set(new Uint8Array(a), 0);
    out.set(new Uint8Array(b), a.byteLength);
    return out.buffer;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    this.keyCache.clear();
    this.macKeyCache.clear();
  }

  /**
   * Generate a secure random password.
   *
   * Uses rejection sampling so every character in the alphabet is equally
   * likely. Naive `randomByte % alphabetLength` is biased whenever 256 is not a
   * multiple of the alphabet length (here 89), making some characters more
   * probable and slightly reducing entropy.
   */
  generatePassword(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    // Largest multiple of chars.length that fits in a byte; bytes at or above
    // this threshold are rejected to remove modulo bias.
    const limit = Math.floor(256 / chars.length) * chars.length;

    let password = '';
    const buffer = new Uint8Array(length);
    while (password.length < length) {
      crypto.getRandomValues(buffer);
      for (let i = 0; i < buffer.length && password.length < length; i++) {
        const byte = buffer[i];
        if (byte < limit) {
          password += chars[byte % chars.length];
        }
      }
    }

    return password;
  }

  /**
   * Hash data using SHA-256
   */
  async hash(data: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new EncryptionError('Web Crypto API not available');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.bufferToBase64(hashBuffer);
  }
}
