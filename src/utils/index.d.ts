/**
 * Utility functions for Strata Storage
 * Zero dependencies - all utilities implemented from scratch
 */
/**
 * Check if code is running in a browser environment
 */
export declare function isBrowser(): boolean;
/**
 * Check if code is running in Node.js
 */
export declare function isNode(): boolean;
/**
 * Check if code is running in a Web Worker
 */
export declare function isWebWorker(): boolean;
/**
 * Check if code is running in Capacitor
 */
export declare function isCapacitor(): boolean;
/**
 * Deep clone an object (no dependencies!)
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Deep merge objects
 */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T;
/**
 * Check if value is a plain object
 */
export declare function isObject(item: unknown): item is Record<string, unknown>;
/**
 * Generate a unique ID
 */
export declare function generateId(): string;
/**
 * Simple glob pattern matching
 */
export declare function matchGlob(pattern: string, str: string): boolean;
/**
 * Format bytes to human readable
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Parse size string to bytes
 */
export declare function parseSize(size: string | number): number;
/**
 * Debounce function
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Throttle function
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Promise with timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage?: string): Promise<T>;
/**
 * Retry with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
}): Promise<T>;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Create a deferred promise
 */
export declare function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};
/**
 * Serialize value to JSON with support for special types
 */
export declare function serialize(value: unknown): string;
/**
 * Deserialize JSON with support for special types
 */
export declare function deserialize(json: string): unknown;
/**
 * Calculate object size in bytes (rough estimate)
 */
export declare function getObjectSize(obj: unknown): number;
/**
 * Create a simple event emitter
 */
export declare class EventEmitter {
    private events;
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    once(event: string, handler: (...args: unknown[]) => void): void;
    removeAllListeners(event?: string): void;
}
//# sourceMappingURL=index.d.ts.map