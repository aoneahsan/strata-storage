"use strict";
/**
 * Core type definitions for Strata Storage
 * Zero dependencies - all types defined from scratch
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageStrategy = void 0;
/**
 * Storage strategies for automatic adapter selection
 */
var StorageStrategy;
(function (StorageStrategy) {
    StorageStrategy["PERFORMANCE_FIRST"] = "performance_first";
    StorageStrategy["PERSISTENCE_FIRST"] = "persistence_first";
    StorageStrategy["SECURITY_FIRST"] = "security_first";
    StorageStrategy["CAPACITY_FIRST"] = "capacity_first";
})(StorageStrategy || (exports.StorageStrategy = StorageStrategy = {}));
//# sourceMappingURL=index.js.map