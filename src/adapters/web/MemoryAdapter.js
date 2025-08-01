"use strict";
/**
 * Memory Adapter - In-memory storage implementation
 * Provides fast, non-persistent storage using Map
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAdapter = void 0;
const BaseAdapter_1 = require("@/core/BaseAdapter");
const utils_1 = require("@/utils");
/**
 * In-memory storage adapter using Map
 */
class MemoryAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'memory';
    capabilities = {
        persistent: false,
        synchronous: false, // We use async for consistency
        observable: true,
        transactional: false,
        queryable: true,
        maxSize: -1, // No hard limit, but configurable
        binary: true,
        encrypted: false, // Encryption handled by feature layer
        crossTab: false, // Memory is per-instance
    };
    storage = new Map();
    maxSize;
    currentSize = 0;
    /**
     * Check if adapter is available (always true for memory)
     */
    async isAvailable() {
        return true;
    }
    /**
     * Initialize the adapter
     */
    async initialize(config) {
        this.maxSize = config?.maxSize;
        this.startTTLCleanup();
    }
    /**
     * Get a value from memory
     */
    async get(key) {
        const value = this.storage.get(key);
        if (!value)
            return null;
        // Check TTL
        if (this.isExpired(value)) {
            await this.remove(key);
            return null;
        }
        // Return a deep clone to prevent external modifications
        return (0, utils_1.deepClone)(value);
    }
    /**
     * Set a value in memory
     */
    async set(key, value) {
        const oldValue = this.storage.get(key);
        const newSize = this.calculateSize(value);
        // Check size limit if configured
        if (this.maxSize && this.maxSize > 0) {
            const oldSize = oldValue ? this.calculateSize(oldValue) : 0;
            const projectedSize = this.currentSize - oldSize + newSize;
            if (projectedSize > this.maxSize) {
                throw new Error(`Memory storage size limit exceeded. Limit: ${this.maxSize}, Projected: ${projectedSize}`);
            }
        }
        // Store a deep clone to prevent external modifications
        const clonedValue = (0, utils_1.deepClone)(value);
        this.storage.set(key, clonedValue);
        // Update size tracking
        if (oldValue) {
            this.currentSize -= this.calculateSize(oldValue);
        }
        this.currentSize += newSize;
        // Emit change event
        this.emitChange(key, oldValue?.value, value.value, 'local');
    }
    /**
     * Remove a value from memory
     */
    async remove(key) {
        const value = this.storage.get(key);
        if (!value)
            return;
        this.storage.delete(key);
        this.currentSize -= this.calculateSize(value);
        // Emit change event
        this.emitChange(key, value.value, undefined, 'local');
    }
    /**
     * Clear memory storage
     */
    async clear(options) {
        if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
            // Clear everything
            this.storage.clear();
            this.currentSize = 0;
            this.emitChange('*', undefined, undefined, 'local');
            return;
        }
        // Use base implementation for filtered clear
        await super.clear(options);
    }
    /**
     * Check if key exists
     */
    async has(key) {
        const value = this.storage.get(key);
        return value !== undefined && !this.isExpired(value);
    }
    /**
     * Get all keys
     */
    async keys(pattern) {
        const allKeys = Array.from(this.storage.keys());
        // Remove expired entries
        const validKeys = [];
        for (const key of allKeys) {
            const value = this.storage.get(key);
            if (value && !this.isExpired(value)) {
                validKeys.push(key);
            }
            else if (value) {
                // Clean up expired entry
                await this.remove(key);
            }
        }
        return this.filterKeys(validKeys, pattern);
    }
    /**
     * Query implementation for memory adapter
     */
    async query(condition) {
        const results = [];
        for (const [key, item] of this.storage.entries()) {
            if (!this.isExpired(item) && this.queryEngine.matches(item.value, condition)) {
                results.push({
                    key,
                    value: (0, utils_1.deepClone)(item.value),
                });
            }
        }
        return results;
    }
    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        return {
            used: this.currentSize,
            limit: this.maxSize,
        };
    }
    /**
     * Close the adapter
     */
    async close() {
        if (super.close) {
            await super.close();
        }
        this.storage.clear();
        this.currentSize = 0;
    }
}
exports.MemoryAdapter = MemoryAdapter;
//# sourceMappingURL=MemoryAdapter.js.map