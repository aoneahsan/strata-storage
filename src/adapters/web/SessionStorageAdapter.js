"use strict";
/**
 * SessionStorage Adapter - Browser sessionStorage implementation
 * Provides session-scoped storage with 5-10MB limit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStorageAdapter = void 0;
const LocalStorageAdapter_1 = require("./LocalStorageAdapter");
/**
 * Browser sessionStorage adapter
 * Extends LocalStorageAdapter as the API is identical
 */
class SessionStorageAdapter extends LocalStorageAdapter_1.LocalStorageAdapter {
    name = 'sessionStorage';
    capabilities = {
        persistent: false, // Only for session
        synchronous: false,
        observable: true,
        transactional: false,
        queryable: true,
        maxSize: 10 * 1024 * 1024, // Typically 5-10MB
        binary: false,
        encrypted: false,
        crossTab: false, // Session storage is per-tab
    };
    constructor(prefix = 'strata:session:') {
        super(prefix);
    }
    /**
     * Check if sessionStorage is available
     */
    async isAvailable() {
        try {
            if (typeof window === 'undefined' || !window.sessionStorage) {
                return false;
            }
            // Test if we can actually use it
            const testKey = `${this.prefix}__test__`;
            window.sessionStorage.setItem(testKey, 'test');
            window.sessionStorage.removeItem(testKey);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Override all methods to use sessionStorage instead of localStorage
     */
    getStorage() {
        return window.sessionStorage;
    }
    /**
     * Get a value from sessionStorage
     */
    async get(key) {
        try {
            const item = window.sessionStorage.getItem(this.prefix + key);
            if (!item)
                return null;
            const value = JSON.parse(item);
            // Check TTL
            if (this.isExpired(value)) {
                await this.remove(key);
                return null;
            }
            return value;
        }
        catch (error) {
            console.error(`Failed to get key ${key} from sessionStorage:`, error);
            return null;
        }
    }
    /**
     * Set a value in sessionStorage
     */
    async set(key, value) {
        const fullKey = this.prefix + key;
        const oldValue = await this.get(key);
        try {
            const serialized = JSON.stringify(value);
            window.sessionStorage.setItem(fullKey, serialized);
        }
        catch (error) {
            if (this.isQuotaError(error)) {
                throw new Error(`SessionStorage quota exceeded for key ${key}`);
            }
            throw new Error(`Failed to store key ${key} in sessionStorage: ${error}`);
        }
        // Emit change event
        this.emitChange(key, oldValue?.value, value.value, 'local');
    }
    /**
     * Remove a value from sessionStorage
     */
    async remove(key) {
        const oldValue = await this.get(key);
        window.sessionStorage.removeItem(this.prefix + key);
        if (oldValue) {
            this.emitChange(key, oldValue.value, undefined, 'local');
        }
    }
    /**
     * Clear sessionStorage
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            // Clear all with our prefix
            const keysToRemove = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
            this.emitChange('*', undefined, undefined, 'local');
            return;
        }
        // Use base implementation for filtered clear
        await super.clear(options);
    }
    /**
     * Get all keys
     */
    async keys(pattern) {
        const keys = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
            const fullKey = window.sessionStorage.key(i);
            if (fullKey?.startsWith(this.prefix)) {
                const key = fullKey.substring(this.prefix.length);
                // Check if not expired
                const value = await this.get(key);
                if (value) {
                    keys.push(key);
                }
            }
        }
        return this.filterKeys(keys, pattern);
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        let total = 0;
        let count = 0;
        let keySize = 0;
        let valueSize = 0;
        for (let i = 0; i < window.sessionStorage.length; i++) {
            const fullKey = window.sessionStorage.key(i);
            if (fullKey?.startsWith(this.prefix)) {
                const item = window.sessionStorage.getItem(fullKey);
                if (item) {
                    count++;
                    const itemSize = (fullKey.length + item.length) * 2; // UTF-16
                    total += itemSize;
                    if (detailed) {
                        keySize += fullKey.length * 2;
                        valueSize += item.length * 2;
                    }
                }
            }
        }
        const result = { total, count };
        if (detailed) {
            result.detailed = {
                keys: keySize,
                values: valueSize,
                metadata: 0,
            };
        }
        return result;
    }
    /**
     * Subscribe to storage changes
     * Note: sessionStorage doesn't fire storage events in the same tab
     */
    subscribe(_callback) {
        // For sessionStorage, we only get local changes, not cross-tab
        // So we'll just return a no-op unsubscribe function
        return () => { };
    }
}
exports.SessionStorageAdapter = SessionStorageAdapter;
//# sourceMappingURL=SessionStorageAdapter.js.map