/**
 * Utility functions for Strata Storage
 * Zero dependencies - all utilities implemented from scratch
 */

import { ValidationError } from './errors';

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Check if code is running in Node.js
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions !== undefined &&
    process.versions.node !== undefined
  );
}

/**
 * Check if code is running in a Web Worker
 */
export function isWebWorker(): boolean {
  return (
    typeof self !== 'undefined' &&
    typeof (self as typeof globalThis & { importScripts?: unknown }).importScripts === 'function'
  );
}

/**
 * Check if code is running in Capacitor
 */
export function isCapacitor(): boolean {
  return typeof (window as Window & { Capacitor?: unknown })?.Capacitor !== 'undefined';
}

/**
 * Deep clone an object (no dependencies!)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as unknown as T;
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as unknown as T;

  const clonedObj = {} as T;
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
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is a plain object
 */
export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && item.constructor === Object;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomPart}`;
}

/**
 * Simple glob pattern matching
 */
export function matchGlob(pattern: string, str: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${regexPattern}$`).test(str);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse size string to bytes
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;

  const units: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) {
    throw new ValidationError('Invalid size format', {
      provided: size,
      expected: 'Number with unit (e.g., 5MB, 1GB)',
    });
  }

  const [, num, unit = 'b'] = match;
  const multiplier = units[unit] || 1;

  return parseFloat(num) * multiplier;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
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
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
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
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelay = 100, maxDelay = 10000, factor = 2 } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries) break;

      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Serialize value to JSON with support for special types
 */
export function serialize(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (val instanceof Date) return { __type: 'Date', value: val.toISOString() };
    if (val instanceof RegExp) return { __type: 'RegExp', value: val.toString() };
    if (val instanceof Map) return { __type: 'Map', value: Array.from(val.entries()) };
    if (val instanceof Set) return { __type: 'Set', value: Array.from(val) };
    if (typeof val === 'bigint') return { __type: 'BigInt', value: val.toString() };
    return val;
  });
}

/**
 * Deserialize JSON with support for special types
 */
export function deserialize(json: string): unknown {
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
export function getObjectSize(obj: unknown): number {
  const seen = new WeakSet();

  function calculateSize(item: unknown): number {
    if (item === null || item === undefined) return 0;

    const type = typeof item;

    switch (type) {
      case 'boolean':
        return 4;
      case 'number':
        return 8;
      case 'string':
        return (item as string).length * 2; // UTF-16
      case 'bigint':
        return item.toString().length;
      case 'object':
        if (seen.has(item as object)) return 0;
        seen.add(item as object);

        if (item instanceof Date) return 8;
        if (item instanceof RegExp) return item.toString().length * 2;
        if (Array.isArray(item)) {
          return item.reduce((sum, val) => sum + calculateSize(val), 0);
        }

        return Object.entries(item as Record<string, unknown>).reduce(
          (sum, [key, val]) => sum + key.length * 2 + calculateSize(val),
          0,
        );
      default:
        return 0;
    }
  }

  return calculateSize(obj);
}

/**
 * Create a simple event emitter
 */
export class EventEmitter {
  private events: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  once(event: string, handler: (...args: unknown[]) => void): void {
    const onceHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

/**
 * Check if a value is a valid storage key
 */
export function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0;
}

/**
 * Check if a value can be stored
 */
export function isValidValue(value: unknown): boolean {
  // Allow all values except undefined
  return value !== undefined;
}

/**
 * Serialize a value for storage
 */
export function serializeValue(value: unknown): string {
  return serialize(value);
}

/**
 * Deserialize a value from storage
 */
export function deserializeValue(value: string): unknown {
  return deserialize(value);
}

/**
 * Create an error with additional context
 */
interface ExtendedError extends Error {
  code?: string;
  details?: unknown;
}

export function createError(message: string, code?: string, details?: unknown): Error {
  const error = new Error(message) as ExtendedError;
  error.code = code;
  error.details = details;
  return error;
}
