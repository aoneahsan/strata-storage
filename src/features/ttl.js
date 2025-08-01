"use strict";
/**
 * TTL (Time To Live) Manager
 * Handles automatic expiration of storage items
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLManager = void 0;
exports.createTTLManager = createTTLManager;
const utils_1 = require("@/utils");
/**
 * TTL Manager for handling item expiration
 */
class TTLManager extends utils_1.EventEmitter {
    config;
    cleanupInterval;
    cleanupCallbacks = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            defaultTTL: config.defaultTTL || 0,
            cleanupInterval: config.cleanupInterval || 60000,
            autoCleanup: config.autoCleanup ?? true,
            batchSize: config.batchSize || 100,
            onExpire: config.onExpire || (() => { }),
        };
    }
    /**
     * Calculate expiration timestamp
     */
    calculateExpiration(options) {
        if (!options) {
            return this.config.defaultTTL ? Date.now() + this.config.defaultTTL : undefined;
        }
        // Specific expiration time takes precedence
        if (options.expireAt) {
            const time = options.expireAt instanceof Date ? options.expireAt.getTime() : options.expireAt;
            return time > Date.now() ? time : undefined;
        }
        // Expire after a certain date
        if (options.expireAfter) {
            const afterTime = options.expireAfter instanceof Date ? options.expireAfter.getTime() : options.expireAfter;
            return afterTime;
        }
        // TTL from now
        if (options.ttl) {
            return Date.now() + options.ttl;
        }
        // Use default TTL
        return this.config.defaultTTL ? Date.now() + this.config.defaultTTL : undefined;
    }
    /**
     * Check if a value is expired
     */
    isExpired(value) {
        if (!value.expires)
            return false;
        return Date.now() > value.expires;
    }
    /**
     * Update expiration for sliding TTL
     */
    updateExpiration(value, options) {
        if (!options?.sliding || !value.expires) {
            return value;
        }
        const ttl = options.ttl || this.config.defaultTTL;
        if (!ttl)
            return value;
        return {
            ...value,
            expires: Date.now() + ttl,
            updated: Date.now(),
        };
    }
    /**
     * Start automatic cleanup
     */
    startAutoCleanup(getKeys, getItem, removeItem) {
        if (!this.config.autoCleanup || this.cleanupInterval) {
            return;
        }
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.cleanup(getKeys, getItem, removeItem);
            }
            catch (error) {
                this.emit('error', error);
            }
        }, this.config.cleanupInterval);
    }
    /**
     * Stop automatic cleanup
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Perform cleanup of expired items
     */
    async cleanup(getKeys, getItem, removeItem) {
        const keys = await getKeys();
        const expired = [];
        const expiredKeys = [];
        const now = Date.now();
        let processed = 0;
        for (const key of keys) {
            if (processed >= this.config.batchSize) {
                // Process remaining in next cycle
                break;
            }
            const item = await getItem(key);
            if (item && item.expires && now > item.expires) {
                expired.push({
                    key,
                    value: item.value,
                    expiredAt: now,
                });
                expiredKeys.push(key);
                await removeItem(key);
                // Execute any registered cleanup callbacks
                const callback = this.cleanupCallbacks.get(key);
                if (callback) {
                    await callback();
                    this.cleanupCallbacks.delete(key);
                }
            }
            processed++;
        }
        if (expiredKeys.length > 0) {
            this.emit('expired', expiredKeys);
            this.config.onExpire(expiredKeys);
        }
        return expired;
    }
    /**
     * Register a cleanup callback for a specific key
     */
    onCleanup(key, callback) {
        this.cleanupCallbacks.set(key, callback);
    }
    /**
     * Remove cleanup callback
     */
    removeCleanupCallback(key) {
        this.cleanupCallbacks.delete(key);
    }
    /**
     * Get all items that will expire within a time window
     */
    async getExpiring(timeWindow, getKeys, getItem) {
        const keys = await getKeys();
        const expiring = [];
        const now = Date.now();
        const windowEnd = now + timeWindow;
        for (const key of keys) {
            const item = await getItem(key);
            if (item && item.expires && item.expires > now && item.expires <= windowEnd) {
                expiring.push({
                    key,
                    expiresIn: item.expires - now,
                });
            }
        }
        return expiring.sort((a, b) => a.expiresIn - b.expiresIn);
    }
    /**
     * Extend TTL for a key
     */
    extendTTL(value, extension) {
        if (!value.expires) {
            return {
                ...value,
                expires: Date.now() + extension,
                updated: Date.now(),
            };
        }
        return {
            ...value,
            expires: value.expires + extension,
            updated: Date.now(),
        };
    }
    /**
     * Set item to never expire
     */
    persist(value) {
        const { expires: _, ...persistedValue } = value;
        return {
            ...persistedValue,
            updated: Date.now(),
        };
    }
    /**
     * Get time until expiration
     */
    getTimeToLive(value) {
        if (!value.expires)
            return null;
        const ttl = value.expires - Date.now();
        return ttl > 0 ? ttl : 0;
    }
    /**
     * Format TTL for display
     */
    formatTTL(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
    /**
     * Clear all data
     */
    clear() {
        this.stopAutoCleanup();
        this.cleanupCallbacks.clear();
        this.removeAllListeners();
    }
}
exports.TTLManager = TTLManager;
/**
 * Create a TTL manager instance
 */
function createTTLManager(config) {
    return new TTLManager(config);
}
//# sourceMappingURL=ttl.js.map