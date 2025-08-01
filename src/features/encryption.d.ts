/**
 * Encryption Feature - Web Crypto API implementation
 * Zero-dependency encryption/decryption for storage values
 */
/**
 * Encryption configuration
 */
export interface EncryptionConfig {
    algorithm?: 'AES-GCM' | 'AES-CBC';
    keyLength?: 128 | 192 | 256;
    iterations?: number;
    saltLength?: number;
}
/**
 * Encrypted data structure
 */
export interface EncryptedData {
    data: string;
    salt: string;
    iv: string;
    algorithm: string;
    iterations: number;
}
/**
 * Encryption manager using Web Crypto API
 */
export declare class EncryptionManager {
    private config;
    private keyCache;
    constructor(config?: EncryptionConfig);
    /**
     * Check if encryption is available
     */
    isAvailable(): boolean;
    /**
     * Encrypt data
     */
    encrypt(data: unknown, password: string): Promise<EncryptedData>;
    /**
     * Decrypt data
     */
    decrypt<T = unknown>(encryptedData: EncryptedData, password: string): Promise<T>;
    /**
     * Derive encryption key from password
     */
    private deriveKey;
    /**
     * Convert ArrayBuffer to base64
     */
    private bufferToBase64;
    /**
     * Convert base64 to ArrayBuffer
     */
    private base64ToBuffer;
    /**
     * Clear key cache
     */
    clearCache(): void;
    /**
     * Generate a secure random password
     */
    generatePassword(length?: number): string;
    /**
     * Hash data using SHA-256
     */
    hash(data: string): Promise<string>;
}
//# sourceMappingURL=encryption.d.ts.map