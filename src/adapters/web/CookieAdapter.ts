/**
 * Cookie Adapter - Browser cookie implementation
 * Provides limited storage with 4KB per cookie limit
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  SizeInfo,
} from '@/types';
import { StorageError, QuotaExceededError } from '@/utils/errors';

/**
 * Cookie options
 */
interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number; // Seconds
}

/**
 * Browser cookie adapter
 */
export class CookieAdapter extends BaseAdapter {
  readonly name: StorageType = 'cookies';
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: false,
    observable: false, // No native change events
    transactional: false,
    queryable: true,
    maxSize: 4096, // 4KB per cookie
    binary: false,
    encrypted: false,
    crossTab: true, // Cookies are shared across tabs
  };

  private prefix: string;
  private cookieOptions: CookieOptions;
  private maxCookieSize = 4096; // 4KB limit per cookie

  constructor(prefix = 'strata_', options: CookieOptions = {}) {
    super();
    this.prefix = prefix;
    this.cookieOptions = {
      path: '/',
      ...options,
    };
  }

  /**
   * Check if cookies are available
   */
  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.cookieEnabled) {
      return false;
    }

    // Test if we can actually set cookies
    try {
      const testKey = `${this.prefix}test`;
      this.setCookie(testKey, 'test', { maxAge: 1 });
      const result = this.getCookie(testKey) === 'test';
      this.deleteCookie(testKey);
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: CookieOptions): Promise<void> {
    if (config) {
      this.cookieOptions = { ...this.cookieOptions, ...config };
    }
    this.startTTLCleanup();
  }

  /**
   * Get a value from cookies
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    const cookieKey = this.prefix + key;
    const value = this.getCookie(cookieKey);

    if (!value) return null;

    try {
      const decoded = decodeURIComponent(value);
      const parsed = JSON.parse(decoded) as StorageValue<T>;

      // Check TTL
      if (this.isExpired(parsed)) {
        await this.remove(key);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error(`Failed to parse cookie ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cookies
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const cookieKey = this.prefix + key;
    const oldValue = await this.get(key);

    try {
      const serialized = JSON.stringify(value);
      const encoded = encodeURIComponent(serialized);

      // Check size limit
      if (encoded.length > this.maxCookieSize) {
        throw new QuotaExceededError(
          `Cookie size ${encoded.length} exceeds limit ${this.maxCookieSize}`,
          { key, size: encoded.length },
        );
      }

      // Set cookie with options
      const options: CookieOptions = { ...this.cookieOptions };

      // Handle TTL
      if (value.expires) {
        const maxAge = Math.floor((value.expires - Date.now()) / 1000);
        if (maxAge > 0) {
          options.maxAge = maxAge;
        }
      }

      this.setCookie(cookieKey, encoded, options);
      this.emitChange(key, oldValue?.value, value.value, 'local');
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw error;
      }
      throw new StorageError(`Failed to set cookie ${key}: ${error}`);
    }
  }

  /**
   * Remove a value from cookies
   */
  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);
    const cookieKey = this.prefix + key;

    this.deleteCookie(cookieKey);

    if (oldValue) {
      this.emitChange(key, oldValue.value, undefined, 'local');
    }
  }

  /**
   * Clear cookies
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      // Clear all cookies with our prefix
      const cookies = this.getAllCookies();

      for (const [cookieKey] of cookies) {
        if (cookieKey.startsWith(this.prefix)) {
          this.deleteCookie(cookieKey);
        }
      }

      this.emitChange('*', undefined, undefined, 'local');
      return;
    }

    // Use base implementation for filtered clear
    await super.clear(options);
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    const cookies = this.getAllCookies();
    const keys: string[] = [];

    for (const [cookieKey] of cookies) {
      if (cookieKey.startsWith(this.prefix)) {
        const key = cookieKey.substring(this.prefix.length);

        // Check if not expired
        const value = await this.get(key);
        if (value) {
          keys.push(key);
        }
      }
    }

    return this.filterKeys(keys, pattern);
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    const cookies = this.getAllCookies();
    let total = 0;
    let count = 0;
    let keySize = 0;
    let valueSize = 0;

    for (const [cookieKey, cookieValue] of cookies) {
      if (cookieKey.startsWith(this.prefix)) {
        count++;
        const itemSize = (cookieKey.length + cookieValue.length) * 2; // UTF-16
        total += itemSize;

        if (detailed) {
          keySize += cookieKey.length * 2;
          valueSize += cookieValue.length * 2;
        }
      }
    }

    const result: SizeInfo = { total, count };

    if (detailed) {
      result.detailed = {
        keys: keySize,
        values: valueSize,
        metadata: 0,
      };
    }

    return result;
  }

  // Cookie manipulation helpers

  /**
   * Get a cookie value
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.indexOf(nameEQ) === 0) {
        return trimmed.substring(nameEQ.length);
      }
    }

    return null;
  }

  /**
   * Set a cookie
   */
  private setCookie(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;

    let cookie = `${name}=${value}`;

    if (options.maxAge !== undefined) {
      cookie += `; max-age=${options.maxAge}`;
    }

    if (options.domain) {
      cookie += `; domain=${options.domain}`;
    }

    if (options.path) {
      cookie += `; path=${options.path}`;
    }

    if (options.secure) {
      cookie += '; secure';
    }

    if (options.sameSite) {
      cookie += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookie;
  }

  /**
   * Delete a cookie
   */
  private deleteCookie(name: string): void {
    this.setCookie(name, '', { ...this.cookieOptions, maxAge: 0 });
  }

  /**
   * Get all cookies as key-value pairs
   */
  private getAllCookies(): Array<[string, string]> {
    if (typeof document === 'undefined') return [];

    const cookies: Array<[string, string]> = [];
    const cookieStrings = document.cookie.split(';');

    for (const cookie of cookieStrings) {
      const trimmed = cookie.trim();
      const eqIndex = trimmed.indexOf('=');

      if (eqIndex > 0) {
        const name = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        cookies.push([name, value]);
      }
    }

    return cookies;
  }
}
