"use strict";
/**
 * Filesystem Adapter - Native file system storage
 * Direct file access on iOS and Android
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesystemAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const plugin_1 = require("@/plugin");
const errors_1 = require("@/utils/errors");
const utils_1 = require("@/utils");
/**
 * Native filesystem adapter using Capacitor plugin
 */
class FilesystemAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'filesystem';
    capabilities = {
        persistent: true,
        synchronous: false,
        observable: false,
        transactional: false,
        queryable: true,
        maxSize: -1, // Limited by device storage
        binary: true, // Supports binary files
        encrypted: false,
        crossTab: true,
    };
    /**
     * Check if filesystem is available
     */
    async isAvailable() {
        if (!(0, utils_1.isCapacitor)())
            return false;
        try {
            const result = await plugin_1.StrataStorage.isAvailable({ storage: 'filesystem' });
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
     * Get a value from filesystem
     */
    async get(key) {
        try {
            const result = await plugin_1.StrataStorage.get({
                key,
                storage: 'filesystem',
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
            console.error(`Failed to get key ${key} from filesystem:`, error);
            return null;
        }
    }
    /**
     * Set a value in filesystem
     */
    async set(key, value) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.set({
                key,
                value,
                storage: 'filesystem',
            });
            this.emitChange(key, oldValue?.value, value.value, 'local');
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to set key ${key} in filesystem: ${error}`);
        }
    }
    /**
     * Remove a value from filesystem
     */
    async remove(key) {
        const oldValue = await this.get(key);
        try {
            await plugin_1.StrataStorage.remove({
                key,
                storage: 'filesystem',
            });
            if (oldValue) {
                this.emitChange(key, oldValue.value, undefined, 'local');
            }
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to remove key ${key} from filesystem: ${error}`);
        }
    }
    /**
     * Clear filesystem storage
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            try {
                await plugin_1.StrataStorage.clear({
                    storage: 'filesystem',
                });
                this.emitChange('*', undefined, undefined, 'local');
                return;
            }
            catch (error) {
                throw new errors_1.StorageError(`Failed to clear filesystem: ${error}`);
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
                storage: 'filesystem',
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
            throw new errors_1.StorageError(`Failed to get keys from filesystem: ${error}`);
        }
    }
    /**
     * Get storage size
     */
    async size(detailed) {
        try {
            const result = await plugin_1.StrataStorage.size({
                storage: 'filesystem',
                detailed,
            });
            return result;
        }
        catch (error) {
            throw new errors_1.StorageError(`Failed to get size of filesystem: ${error}`);
        }
    }
}
exports.FilesystemAdapter = FilesystemAdapter;
//# sourceMappingURL=FilesystemAdapter.js.map