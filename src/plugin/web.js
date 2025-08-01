"use strict";
/**
 * Strata Storage Web Implementation
 * Web platform implementation of the Capacitor plugin
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrataStorageWeb = void 0;
class StrataStorageWeb {
    async isAvailable(_options) {
        // Web platform doesn't support native storage types
        // This is handled by the web adapters instead
        return { available: false };
    }
    async get(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
    async set(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
    async remove(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
    async clear(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
    async keys(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
    async size(_options) {
        // Not implemented for web - use web adapters instead
        throw new Error('Native storage not available on web platform');
    }
}
exports.StrataStorageWeb = StrataStorageWeb;
//# sourceMappingURL=web.js.map