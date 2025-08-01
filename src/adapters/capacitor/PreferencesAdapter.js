"use strict";
/**
 * Preferences Adapter - Native preferences storage
 * iOS: UserDefaults, Android: SharedPreferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const plugin_1 = require("@/plugin");
const errors_1 = require("@/utils/errors");
const utils_1 = require("@/utils");
/**
 * Native preferences adapter using Capacitor plugin
 */
class PreferencesAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'preferences';
    capabilities = {
        persistent: true,
        synchronous: false,
        observable: false, // No native change events
        transactional: false,
        queryable: true,
        maxSize: -1, // Platform dependent
        binary: false, // Only JSON-serializable data
        encrypted: false,
        crossTab: true, // Shared across app
    };
    /**
     * Check if preferences are available
     */
    async isAvailable() {
        if (!(0, utils_1.isCapacitor)())
            return false;
        try {
            const result = await plugin_1.StrataStorage.isAvailable({ storage: 'preferences' });
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
     * Get a value from preferences
     */
    async get(key) {
        try {
            const result = await plugin_1.StrataStorage.get({
                key,
                storage: 'preferences',
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
            console.error(`Failed to get key ${key} from preferences:`, error);
            return null;
        }
    }
    /**
     * Set a value in preferences
     */
    async set(key, value) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.set({
                key,
                value,
                storage: 'preferences',
            });
            this.emitChange(key, oldValue?.value, value.value, 'local');
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to set key ${key} in preferences: ${error}`);
        }
    }
    /**
     * Remove a value from preferences
     */
    async remove(key) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.remove({
                key,
                storage: 'preferences',
            });
            if (oldValue) {
                this.emitChange(key, oldValue.value, undefined, 'local');
            }
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to remove key ${key} from preferences: ${error}`);
        }
    }
    /**
     * Clear preferences
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            try {
                await plugin_1.StrataStorage.clear({
                    storage: 'preferences',
                });
                this.emitChange('*', undefined, undefined, 'local');
                return;
            }
            catch (error) {
                throw new errors_1.StorageError(`Failed to clear preferences: ${error}`);
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
                storage: 'preferences',
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
            throw new errors_1.StorageError(`Failed to get keys from preferences: ${error}`);
        }
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        try {
            const result = await plugin_1.StrataStorage.size({
                storage: 'preferences',
                detailed,
            });
            return result;
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get size of preferences: ${error}`);
        }
    }
}
exports.PreferencesAdapter = PreferencesAdapter;
//# sourceMappingURL=PreferencesAdapter.js.map