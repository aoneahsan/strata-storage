"use strict";
/**
 * LocalStorage Adapter - Browser localStorage implementation
 * Provides persistent storage with 5-10MB limit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const utils_1 = require("@/utils");
const errors_1 = require("@/utils/errors");
/**
 * Browser localStorage adapter
 */
class LocalStorageAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'localStorage';
    capabilities = {
        persistent: true,
        synchronous: false, // We use async for consistency
        observable: true, // Via storage events
        transactional: false,
        queryable: true,
        maxSize: 10 * 1024 * 1024, // Typically 5-10MB
        binary: false, // Only strings
        encrypted: false,
        crossTab: true, // Storage events work across tabs
    };
    prefix;
    listeners = new Map();
    constructor(prefix = 'strata:') {
        super();
        this.prefix = prefix;
    }
    /**
     * Check if localStorage is available
     */
    async isAvailable() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            // Test if we can actually use it
            const testKey = `${this.prefix}__test__`;
            window.localStorage.setItem(testKey, 'test');
            window.localStorage.removeItem(testKey);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize the adapter
     */
    async initialize(config) {
        if (config?.prefix) {
            this.prefix = config.prefix;
        }
        this.startTTLCleanup();
    }
    /**
     * Get a value from localStorage
     */
    async get(key) {
        try {
            const item = window.localStorage.getItem(this.prefix + key);
            if (!item)
                return null;
            const value = (0, utils_1.deserialize)(item);
            // Check TTL
            if (this.isExpired(value)) {
                await this.remove(key);
                return null;
            }
            return value;
        }
        catch (error) {
            console.error(`Failed to get key ${key} from localStorage:`, error);
            return null;
        }
    }
    /**
     * Set a value in localStorage
     */
    async set(key, value) {
        const fullKey = this.prefix + key;
        const oldValue = await this.get(key);
        try {
            const serialized = (0, utils_1.serialize)(value);
            window.localStorage.setItem(fullKey, serialized);
        }
        catch (error) {
            if (this.isQuotaError(error)) {
                throw new errors_1.QuotaExceededError('LocalStorage quota exceeded', {
                    key,
                    size: (0, utils_1.getObjectSize)(value),
                });
            }
            throw new errors_1.SerializationError(`Failed to store key ${key} in localStorage`, error);
        }
        // Emit change event (storage events don't fire in same window)
        this.emitChange(key, oldValue?.value, value.value, 'local');
    }
    /**
     * Remove a value from localStorage
     */
    async remove(key) {
        const oldValue = await this.get(key);
        window.localStorage.removeItem(this.prefix + key);
        if (oldValue) {
            this.emitChange(key, oldValue.value, undefined, 'local');
        }
    }
    /**
     * Clear localStorage
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            // Clear all with our prefix
            const keysToRemove = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => window.localStorage.removeItem(key));
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
        for (let i = 0; i < window.localStorage.length; i++) {
            const fullKey = window.localStorage.key(i);
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
        for (let i = 0; i < window.localStorage.length; i++) {
            const fullKey = window.localStorage.key(i);
            if (fullKey?.startsWith(this.prefix)) {
                const item = window.localStorage.getItem(fullKey);
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
                metadata: 0, // Metadata is included in values for localStorage
            };
        }
        return result;
    }
    /**
     * Subscribe to storage changes
     */
    subscribe(callback) {
        const listener = (event) => {
            // Only process events from other windows/tabs
            if (event.storageArea !== window.localStorage)
                return;
            // Check if the key belongs to us
            if (!event.key || !event.key.startsWith(this.prefix))
                return;
            const key = event.key.substring(this.prefix.length);
            const oldValue = event.oldValue ? (0, utils_1.deserialize)(event.oldValue) : null;
            const newValue = event.newValue ? (0, utils_1.deserialize)(event.newValue) : null;
            callback({
                key,
                oldValue: oldValue?.value ?? undefined,
                newValue: newValue?.value ?? undefined,
                source: 'remote',
                storage: this.name,
                timestamp: Date.now(),
            });
        };
        window.addEventListener('storage', listener);
        this.listeners.set(callback, listener);
        return () => {
            const storedListener = this.listeners.get(callback);
            if (storedListener) {
                window.removeEventListener('storage', storedListener);
                this.listeners.delete(callback);
            }
        };
    }
    /**
     * Close the adapter
     */
    async close() {
        // Remove all storage event listeners
        this.listeners.forEach((listener) => {
            window.removeEventListener('storage', listener);
        });
        this.listeners.clear();
        if (super.close) {
            await super.close();
        }
    }
    /**
     * Check if error is quota exceeded
     */
    isQuotaError(error) {
        if (error instanceof Error) {
            return (error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                error.message.toLowerCase().includes('quota'));
        }
        return false;
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
//# sourceMappingURL=LocalStorageAdapter.js.map