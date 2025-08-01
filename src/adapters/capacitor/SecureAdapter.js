"use strict";
/**
 * Secure Adapter - Native secure storage
 * iOS: Keychain, Android: EncryptedSharedPreferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const plugin_1 = require("@/plugin");
const errors_1 = require("@/utils/errors");
const utils_1 = require("@/utils");
/**
 * Native secure storage adapter using Capacitor plugin
 */
class SecureAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'secure';
    capabilities = {
        persistent: true,
        synchronous: false,
        observable: false,
        transactional: false,
        queryable: true,
        maxSize: -1, // Platform dependent
        binary: false, // String data only
        encrypted: true, // Native encryption
        crossTab: true,
    };
    /**
     * Check if secure storage is available
     */
    async isAvailable() {
        if (!(0, utils_1.isCapacitor)())
            return false;
        try {
            const result = await plugin_1.StrataStorage.isAvailable({ storage: 'secure' });
            return result.available;
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize the adapter
     */
    async initialize() {
        this.startTTLCleanup();
    }
    /**
     * Get a value from secure storage
     */
    async get(key) {
        try {
            const result = await plugin_1.StrataStorage.get({
                key,
                storage: 'secure',
            });
            if (!result.value)
                return null;
            const value = result.value;
            // Check TTL
            if (this.isExpired(value)) {
                await this.remove(key);
                return null;
            }
            return value;
        }
        catch (error) {
            console.error(`Failed to get key ${key} from secure storage:`, error);
            return null;
        }
    }
    /**
     * Set a value in secure storage
     */
    async set(key, value) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.set({
                key,
                value,
                storage: 'secure',
            });
            this.emitChange(key, oldValue?.value, value.value, 'local');
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to set key ${key} in secure storage: ${error}`);
        }
    }
    /**
     * Remove a value from secure storage
     */
    async remove(key) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.remove({
                key,
                storage: 'secure',
            });
            if (oldValue) {
                this.emitChange(key, oldValue.value, undefined, 'local');
            }
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to remove key ${key} from secure storage: ${error}`);
        }
    }
    /**
     * Clear secure storage
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            try {
                await plugin_1.StrataStorage.clear({
                    storage: 'secure',
                });
                this.emitChange('*', undefined, undefined, 'local');
                return;
            }
            catch (error) {
                throw new errors_1.StorageError(`Failed to clear secure storage: ${error}`);
            }
        }
        // Use base implementation for filtered clear
        await super.clear(options);
    }
    /**
     * Get all keys
     */
    async keys(pattern) {
        try {
            const result = await plugin_1.StrataStorage.keys({
                storage: 'secure',
                pattern: pattern instanceof RegExp ? pattern.source : pattern,
            });
            const keys = result.keys;
            // Check for expired keys
            const validKeys = [];
            for (const key of keys) {
                const value = await this.get(key);
                if (value) {
                    validKeys.push(key);
                }
            }
            return this.filterKeys(validKeys, pattern);
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get keys from secure storage: ${error}`);
        }
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        try {
            const result = await plugin_1.StrataStorage.size({
                storage: 'secure',
                detailed,
            });
            return result;
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get size of secure storage: ${error}`);
        }
    }
    /**
     * iOS-specific: Store in Keychain with options
     */
    async setKeychainItem(key, value, options) {
        if (!plugin_1.StrataStorage.setKeychain) {
            throw new errors_1.StorageError('Keychain not available on this platform');
        }
        await plugin_1.StrataStorage.setKeychain({
            key,
            value,
            ...options,
        });
    }
    /**
     * iOS-specific: Get from Keychain
     */
    async getKeychainItem(key, options) {
        if (!plugin_1.StrataStorage.getKeychain) {
            throw new errors_1.StorageError('Keychain not available on this platform');
        }
        const result = await plugin_1.StrataStorage.getKeychain({
            key,
            ...options,
        });
        return result.value;
    }
    /**
     * Android-specific: Store encrypted preference
     */
    async setEncryptedPreference(key, value, fileName) {
        if (!plugin_1.StrataStorage.setEncryptedPreference) {
            throw new errors_1.StorageError('Encrypted preferences not available on this platform');
        }
        await plugin_1.StrataStorage.setEncryptedPreference({
            key,
            value,
            fileName,
        });
    }
    /**
     * Android-specific: Get encrypted preference
     */
    async getEncryptedPreference(key, fileName) {
        if (!plugin_1.StrataStorage.getEncryptedPreference) {
            throw new errors_1.StorageError('Encrypted preferences not available on this platform');
        }
        const result = await plugin_1.StrataStorage.getEncryptedPreference({
            key,
            fileName,
        });
        return result.value;
    }
}
exports.SecureAdapter = SecureAdapter;
//# sourceMappingURL=SecureAdapter.js.map