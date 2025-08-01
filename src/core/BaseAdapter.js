"use strict";
/**
 * Base adapter implementation with common functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const errors_1 = require("@/utils/errors");
const utils_1 = require("@/utils");
const query_1 = require("@/features/query");
/**
 * Abstract base adapter that implements common functionality
 */
class BaseAdapter {
    eventEmitter = new utils_1.EventEmitter();
    queryEngine = new query_1.QueryEngine();
    ttlCleanupInterval;
    ttlCheckInterval = 60000; // Check every minute
    /**
     * Initialize TTL cleanup if needed
     */
    startTTLCleanup() {
        if (this.ttlCleanupInterval)
            return;
        this.ttlCleanupInterval = setInterval(async () => {
            try {
                await this.cleanupExpired();
            }
            catch (error) {
                console.error(`TTL cleanup error in ${this.name}:`, error);
            }
        }, this.ttlCheckInterval);
    }
    /**
     * Stop TTL cleanup
     */
    stopTTLCleanup() {
        if (this.ttlCleanupInterval) {
            clearInterval(this.ttlCleanupInterval);
            this.ttlCleanupInterval = undefined;
        }
    }
    /**
     * Clean up expired items
     */
    async cleanupExpired() {
        const now = Date.now();
        const keys = await this.keys();
        for (const key of keys) {
            const item = await this.get(key);
            if (item?.expires && item.expires <= now) {
                await this.remove(key);
            }
        }
    }
    /**
     * Check if value is expired
     */
    isExpired(value) {
        if (!value.expires)
            return false;
        return Date.now() > value.expires;
    }
    /**
     * Filter keys by pattern
     */
    filterKeys(keys, pattern) {
        if (!pattern)
            return keys;
        if (pattern instanceof RegExp) {
            return keys.filter((key) => pattern.test(key));
        }
        return keys.filter((key) => (0, utils_1.matchGlob)(pattern, key));
    }
    /**
     * Calculate size of storage value
     */
    calculateSize(value) {
        return (0, utils_1.getObjectSize)(value);
    }
    /**
     * Default has implementation using get
     */
    async has(key) {
        const value = await this.get(key);
        return value !== null && !this.isExpired(value);
    }
    /**
     * Default clear implementation
     */
    async clear(options) {
        const keys = await this.keys();
        for (const key of keys) {
            let shouldDelete = true;
            if (options?.pattern) {
                shouldDelete = this.filterKeys([key], options.pattern).length > 0;
            }
            if (shouldDelete && options?.tags) {
                const value = await this.get(key);
                if (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
                    shouldDelete = false;
                }
            }
            if (shouldDelete && options?.expiredOnly) {
                const value = await this.get(key);
                if (!value || !this.isExpired(value)) {
                    shouldDelete = false;
                }
            }
            if (shouldDelete) {
                await this.remove(key);
            }
        }
    }
    /**
     * Default size implementation
     */
    async size(detailed) {
        const keys = await this.keys();
        let total = 0;
        let keySize = 0;
        let valueSize = 0;
        let metadataSize = 0;
        for (const key of keys) {
            keySize += key.length * 2; // UTF-16
            const item = await this.get(key);
            if (item) {
                const size = this.calculateSize(item);
                valueSize += (0, utils_1.getObjectSize)(item.value);
                metadataSize += size - (0, utils_1.getObjectSize)(item.value);
                total += size;
            }
        }
        const result = {
            total: total + keySize,
            count: keys.length,
        };
        if (detailed) {
            result.detailed = {
                keys: keySize,
                values: valueSize,
                metadata: metadataSize,
            };
        }
        return result;
    }
    /**
     * Subscribe to changes (if supported)
     */
    subscribe(callback) {
        if (!this.capabilities.observable) {
            throw new errors_1.NotSupportedError('subscribe', this.name);
        }
        const handler = (...args) => {
            const change = args[0];
            callback(change);
        };
        this.eventEmitter.on('change', handler);
        return () => {
            this.eventEmitter.off('change', handler);
        };
    }
    /**
     * Emit change event
     */
    emitChange(key, oldValue, newValue, source = 'local') {
        this.eventEmitter.emit('change', {
            key,
            oldValue,
            newValue,
            source,
            storage: this.name,
            timestamp: Date.now(),
        });
    }
    /**
     * Query implementation (override in adapters that support it)
     */
    async query(condition) {
        if (!this.capabilities.queryable) {
            throw new errors_1.NotSupportedError('query', this.name);
        }
        // Basic implementation for adapters that don't have native query support
        const results = [];
        const keys = await this.keys();
        for (const key of keys) {
            const item = await this.get(key);
            if (item && !this.isExpired(item) && this.queryEngine.matches(item.value, condition)) {
                results.push({ key, value: item.value });
            }
        }
        return results;
    }
    /**
     * Close adapter (cleanup)
     */
    async close() {
        this.stopTTLCleanup();
        this.eventEmitter.removeAllListeners();
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=BaseAdapter.js.map