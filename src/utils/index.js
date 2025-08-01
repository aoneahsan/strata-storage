"use strict";
/**
 * Utility functions for Strata Storage
 * Zero dependencies - all utilities implemented from scratch
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
exports.isBrowser = isBrowser;
exports.isNode = isNode;
exports.isWebWorker = isWebWorker;
exports.isCapacitor = isCapacitor;
exports.deepClone = deepClone;
exports.deepMerge = deepMerge;
exports.isObject = isObject;
exports.generateId = generateId;
exports.matchGlob = matchGlob;
exports.formatBytes = formatBytes;
exports.parseSize = parseSize;
exports.debounce = debounce;
exports.throttle = throttle;
exports.withTimeout = withTimeout;
exports.retry = retry;
exports.sleep = sleep;
exports.createDeferred = createDeferred;
exports.serialize = serialize;
exports.deserialize = deserialize;
exports.getObjectSize = getObjectSize;
/**
 * Check if code is running in a browser environment
 */
function isBrowser() {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
/**
 * Check if code is running in Node.js
 */
function isNode() {
    return (typeof process !== 'undefined' &&
        process.versions !== undefined &&
        process.versions.node !== undefined);
}
/**
 * Check if code is running in a Web Worker
 */
function isWebWorker() {
    return (typeof self !== 'undefined' &&
        typeof self.importScripts === 'function');
}
/**
 * Check if code is running in Capacitor
 */
function isCapacitor() {
    return typeof window?.Capacitor !== 'undefined';
}
/**
 * Deep clone an object (no dependencies!)
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map((item) => deepClone(item));
    if (obj instanceof RegExp)
        return new RegExp(obj.source, obj.flags);
    const clonedObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}
/**
 * Deep merge objects
 */
function deepMerge(target, ...sources) {
    if (!sources.length)
        return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key])
                    Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return deepMerge(target, ...sources);
}
/**
 * Check if value is a plain object
 */
function isObject(item) {
    return item !== null && typeof item === 'object' && item.constructor === Object;
}
/**
 * Generate a unique ID
 */
function generateId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${randomPart}`;
}
/**
 * Simple glob pattern matching
 */
function matchGlob(pattern, str) {
    const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(str);
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
/**
 * Parse size string to bytes
 */
function parseSize(size) {
    if (typeof size === 'number')
        return size;
    const units = {
        b: 1,
        byte: 1,
        bytes: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024,
        tb: 1024 * 1024 * 1024 * 1024,
    };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match)
        throw new Error(`Invalid size format: ${size}`);
    const [, num, unit = 'b'] = match;
    const multiplier = units[unit] || 1;
    return parseFloat(num) * multiplier;
}
/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout = null;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle = false;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
/**
 * Promise with timeout
 */
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(errorMessage));
        }, timeoutMs);
        promise
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(timer));
    });
}
/**
 * Retry with exponential backoff
 */
async function retry(fn, options = {}) {
    const { maxRetries = 3, initialDelay = 100, maxDelay = 10000, factor = 2 } = options;
    let lastError;
    let delay = initialDelay;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i === maxRetries)
                break;
            await sleep(delay);
            delay = Math.min(delay * factor, maxDelay);
        }
    }
    throw lastError;
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Create a deferred promise
 */
function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
/**
 * Serialize value to JSON with support for special types
 */
function serialize(value) {
    return JSON.stringify(value, (_, val) => {
        if (val instanceof Date)
            return { __type: 'Date', value: val.toISOString() };
        if (val instanceof RegExp)
            return { __type: 'RegExp', value: val.toString() };
        if (val instanceof Map)
            return { __type: 'Map', value: Array.from(val.entries()) };
        if (val instanceof Set)
            return { __type: 'Set', value: Array.from(val) };
        if (typeof val === 'bigint')
            return { __type: 'BigInt', value: val.toString() };
        return val;
    });
}
/**
 * Deserialize JSON with support for special types
 */
function deserialize(json) {
    return JSON.parse(json, (_, val) => {
        if (val && typeof val === 'object' && '__type' in val) {
            switch (val.__type) {
                case 'Date':
                    return new Date(val.value);
                case 'RegExp': {
                    const match = val.value.match(/^\/(.*)\/([gimuy]*)$/);
                    return match ? new RegExp(match[1], match[2]) : new RegExp(val.value);
                }
                case 'Map':
                    return new Map(val.value);
                case 'Set':
                    return new Set(val.value);
                case 'BigInt':
                    return BigInt(val.value);
            }
        }
        return val;
    });
}
/**
 * Calculate object size in bytes (rough estimate)
 */
function getObjectSize(obj) {
    const seen = new WeakSet();
    function calculateSize(item) {
        if (item === null || item === undefined)
            return 0;
        const type = typeof item;
        switch (type) {
            case 'boolean':
                return 4;
            case 'number':
                return 8;
            case 'string':
                return item.length * 2; // UTF-16
            case 'bigint':
                return item.toString().length;
            case 'object':
                if (seen.has(item))
                    return 0;
                seen.add(item);
                if (item instanceof Date)
                    return 8;
                if (item instanceof RegExp)
                    return item.toString().length * 2;
                if (Array.isArray(item)) {
                    return item.reduce((sum, val) => sum + calculateSize(val), 0);
                }
                return Object.entries(item).reduce((sum, [key, val]) => sum + key.length * 2 + calculateSize(val), 0);
            default:
                return 0;
        }
    }
    return calculateSize(obj);
}
/**
 * Create a simple event emitter
 */
class EventEmitter {
    events = new Map();
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(handler);
    }
    off(event, handler) {
        this.events.get(event)?.delete(handler);
    }
    emit(event, ...args) {
        this.events.get(event)?.forEach((handler) => {
            try {
                handler(...args);
            }
            catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    once(event, handler) {
        const onceHandler = (...args) => {
            handler(...args);
            this.off(event, onceHandler);
        };
        this.on(event, onceHandler);
    }
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        }
        else {
            this.events.clear();
        }
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=index.js.map