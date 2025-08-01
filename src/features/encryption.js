"use strict";
/**
 * Encryption Feature - Web Crypto API implementation
 * Zero-dependency encryption/decryption for storage values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionManager = void 0;
const errors_1 = require("@/utils/errors");
/**
 * Encryption manager using Web Crypto API
 */
class EncryptionManager {
    config;
    keyCache = new Map();
    constructor(config = {}) {
        this.config = {
            algorithm: config.algorithm || 'AES-GCM',
            keyLength: config.keyLength || 256,
            iterations: config.iterations || 100000,
            saltLength: config.saltLength || 16,
        };
    }
    /**
     * Check if encryption is available
     */
    isAvailable() {
        return typeof window !== 'undefined' && window.crypto && window.crypto.subtle !== undefined;
    }
    /**
     * Encrypt data
     */
    async encrypt(data, password) {
        if (!this.isAvailable()) {
            throw new errors_1.EncryptionError('Web Crypto API not available');
        }
        try {
            // Convert data to string
            const dataStr = JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataStr);
            // Generate salt and IV
            const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
            const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
            // Derive key from password
            const key = await this.deriveKey(password, salt);
            // Encrypt data
            const encryptedBuffer = await crypto.subtle.encrypt({
                name: this.config.algorithm,
                iv: iv,
            }, key, dataBuffer);
            // Convert to base64 for storage
            return {
                data: this.bufferToBase64(encryptedBuffer),
                salt: this.bufferToBase64(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength)),
                iv: this.bufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength)),
                algorithm: this.config.algorithm,
                iterations: this.config.iterations,
            };
        }
        catch (error) {
            throw new errors_1.EncryptionError(`Encryption failed: ${error}`);
        }
    }
    /**
     * Decrypt data
     */
    async decrypt(encryptedData, password) {
        if (!this.isAvailable()) {
            throw new errors_1.EncryptionError('Web Crypto API not available');
        }
        try {
            // Convert from base64
            const dataBuffer = this.base64ToBuffer(encryptedData.data);
            const salt = this.base64ToBuffer(encryptedData.salt);
            const iv = this.base64ToBuffer(encryptedData.iv);
            // Derive key from password
            const key = await this.deriveKey(password, new Uint8Array(salt), encryptedData.iterations);
            // Decrypt data
            const decryptedBuffer = await crypto.subtle.decrypt({
                name: encryptedData.algorithm,
                iv: iv,
            }, key, dataBuffer);
            // Convert back to original data
            const decoder = new TextDecoder();
            const decryptedStr = decoder.decode(decryptedBuffer);
            return JSON.parse(decryptedStr);
        }
        catch (error) {
            throw new errors_1.EncryptionError(`Decryption failed: ${error}`);
        }
    }
    /**
     * Derive encryption key from password
     */
    async deriveKey(password, salt, iterations = this.config.iterations) {
        // Check cache
        const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength);
        const cacheKey = `${password}-${this.bufferToBase64(saltBuffer)}-${iterations}`;
        if (this.keyCache.has(cacheKey)) {
            return this.keyCache.get(cacheKey);
        }
        // Import password as key material
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
            'deriveBits',
            'deriveKey',
        ]);
        // Derive key using PBKDF2
        const key = await crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: iterations,
            hash: 'SHA-256',
        }, keyMaterial, {
            name: this.config.algorithm,
            length: this.config.keyLength,
        }, false, ['encrypt', 'decrypt']);
        // Cache the key
        this.keyCache.set(cacheKey, key);
        return key;
    }
    /**
     * Convert ArrayBuffer to base64
     */
    bufferToBase64(buffer) {
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
    base64ToBuffer(base64) {
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
    clearCache() {
        this.keyCache.clear();
    }
    /**
     * Generate a secure random password
     */
    generatePassword(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars[array[i] % chars.length];
        }
        return password;
    }
    /**
     * Hash data using SHA-256
     */
    async hash(data) {
        if (!this.isAvailable()) {
            throw new errors_1.EncryptionError('Web Crypto API not available');
        }
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return this.bufferToBase64(hashBuffer);
    }
}
exports.EncryptionManager = EncryptionManager;
//# sourceMappingURL=encryption.js.map