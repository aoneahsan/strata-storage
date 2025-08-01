"use strict";
/**
 * Registry for managing storage adapters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterRegistry = void 0;
const errors_1 = require("@/utils/errors");
/**
 * Adapter registry for managing storage adapters
 */
class AdapterRegistry {
    adapters = new Map();
    initialized = new Set();
    /**
     * Register a storage adapter
     */
    register(adapter) {
        this.adapters.set(adapter.name, adapter);
    }
    /**
     * Get a storage adapter by name
     */
    get(name) {
        return this.adapters.get(name);
    }
    /**
     * Get an adapter and ensure it's initialized
     */
    async getInitialized(name, config) {
        const adapter = this.get(name);
        if (!adapter) {
            throw new errors_1.AdapterNotAvailableError(name);
        }
        // Check if adapter is available on current platform
        const isAvailable = await adapter.isAvailable();
        if (!isAvailable) {
            throw new errors_1.AdapterNotAvailableError(name, {
                reason: 'Not available on current platform',
            });
        }
        // Initialize if not already done
        if (!this.initialized.has(name)) {
            await adapter.initialize(config);
            this.initialized.add(name);
        }
        return adapter;
    }
    /**
     * Check if an adapter is registered
     */
    has(name) {
        return this.adapters.has(name);
    }
    /**
     * Get all registered adapter names
     */
    getNames() {
        return Array.from(this.adapters.keys());
    }
    /**
     * Get all registered adapters
     */
    getAll() {
        return Array.from(this.adapters.values());
    }
    /**
     * Get available adapters for current platform
     */
    async getAvailable() {
        const available = [];
        for (const adapter of this.adapters.values()) {
            if (await adapter.isAvailable()) {
                available.push(adapter);
            }
        }
        return available;
    }
    /**
     * Unregister an adapter
     */
    unregister(name) {
        this.initialized.delete(name);
        return this.adapters.delete(name);
    }
    /**
     * Clear all adapters
     */
    clear() {
        this.adapters.clear();
        this.initialized.clear();
    }
    /**
     * Close all adapters
     */
    async closeAll() {
        const promises = [];
        for (const [name, adapter] of this.adapters) {
            if (this.initialized.has(name) && adapter.close) {
                promises.push(adapter.close());
            }
        }
        await Promise.all(promises);
        this.initialized.clear();
    }
}
exports.AdapterRegistry = AdapterRegistry;
//# sourceMappingURL=AdapterRegistry.js.map