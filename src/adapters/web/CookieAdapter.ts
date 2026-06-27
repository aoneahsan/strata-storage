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
import { serialize, deserialize } from '@/utils';
import { StorageError, QuotaExceededError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Cookie options.
 *
 * NOTE: `HttpOnly` is intentionally absent. The `HttpOnly` attribute can only be
 * set by a server via the `Set-Cookie` response header — JavaScript writing to
 * `document.cookie` cannot mark a cookie HttpOnly (by design, since HttpOnly
 * cookies are invisible to `document.cookie`). Cookies written by this adapter
 * are therefore always readable by client-side script; do not store secrets in
 * the cookie adapter — use the secure adapter (Keychain/Keystore) instead.
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
    synchronous: true, // document.cookie backend is synchronous
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
    // Secure-by-default: SameSite=Lax mitigates CSRF/cross-site leakage unless
    // the caller explicitly opts into a different policy. `path` defaults to '/'.
    this.cookieOptions = {
      path: '/',
      sameSite: 'lax',
      ...options,
    };
  }

  /**
   * Whether the current page is served over a secure (https) context. Used to
   * auto-apply the `Secure` cookie attribute without breaking local http dev.
   */
  private isSecureContext(): boolean {
    if (typeof window !== 'undefined' && typeof window.isSecureContext === 'boolean') {
      return window.isSecureContext;
    }
    if (typeof location !== 'undefined') {
      return location.protocol === 'https:';
    }
    return false;
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
    return this.getSync<T>(key);
  }

  /**
   * Get a value from cookies (synchronous)
   */
  getSync<T = unknown>(key: string): StorageValue<T> | null {
    const cookieKey = this.prefix + key;
    const value = this.getCookie(cookieKey);

    if (!value) return null;

    try {
      const decoded = decodeURIComponent(value);
      const parsed = deserialize(decoded) as StorageValue<T>;

      // Check TTL
      if (this.isExpired(parsed)) {
        this.removeSync(key);
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error(`Failed to parse cookie ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cookies
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    this.setSync(key, value);
  }

  /**
   * Set a value in cookies (synchronous)
   */
  setSync<T = unknown>(key: string, value: StorageValue<T>): void {
    const cookieKey = this.prefix + key;
    const oldValue = this.getSync(key);

    try {
      const serialized = serialize(value);
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
    this.removeSync(key);
  }

  /**
   * Remove a value from cookies (synchronous)
   */
  removeSync(key: string): void {
    const cookieKey = this.prefix + key;

    // Read raw — NOT via getSync(), which deletes expired cookies by calling
    // removeSync() and would recurse here forever. Only read with a listener.
    let oldValue: StorageValue | null = null;
    if (this.hasChangeListeners()) {
      const raw = this.getCookie(cookieKey);
      if (raw) {
        try {
          oldValue = deserialize(decodeURIComponent(raw)) as StorageValue;
        } catch {
          oldValue = null;
        }
      }
    }

    this.deleteCookie(cookieKey);

    if (oldValue) {
      this.emitChange(key, oldValue.value, undefined, 'local');
    }
  }

  /**
   * Clear cookies
   */
  async clear(options?: ClearOptions): Promise<void> {
    this.clearSync(options);
  }

  /**
   * Clear cookies (synchronous)
   */
  clearSync(options?: ClearOptions): void {
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

    // Synchronous filtered clear (mirrors BaseAdapter.clear logic)
    for (const key of this.keysSync()) {
      let shouldDelete = true;

      const pattern = options.pattern || options.prefix;
      if (pattern) {
        shouldDelete = this.filterKeys([key], pattern).length > 0;
      }

      if (shouldDelete && options.tags) {
        const value = this.getSync(key);
        if (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
          shouldDelete = false;
        }
      }

      if (shouldDelete && options.expiredOnly) {
        const value = this.getSync(key);
        if (!value || !this.isExpired(value)) {
          shouldDelete = false;
        }
      }

      if (shouldDelete) {
        this.removeSync(key);
      }
    }
  }

  /**
   * Get all keys
   */
  async keys(pattern?: string | RegExp): Promise<string[]> {
    return this.keysSync(pattern);
  }

  /**
   * Get all keys (synchronous)
   */
  keysSync(pattern?: string | RegExp): string[] {
    const cookies = this.getAllCookies();
    const keys: string[] = [];

    for (const [cookieKey] of cookies) {
      if (cookieKey.startsWith(this.prefix)) {
        const key = cookieKey.substring(this.prefix.length);

        // Check if not expired
        const value = this.getSync(key);
        if (value) {
          keys.push(key);
        }
      }
    }

    return this.filterKeys(keys, pattern);
  }

  /**
   * Check if key exists (synchronous)
   */
  hasSync(key: string): boolean {
    const value = this.getSync(key);
    return value !== null && !this.isExpired(value);
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

    // The value is percent-encoded by the caller, but the NAME is written raw —
    // reject cookie-control characters in it so a crafted key cannot inject
    // extra attributes (`; Path=/`) or additional cookies (`; evil=1`).
    const hasControlChar = [...name].some((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    });
    if (/[;=,\s]/.test(name) || hasControlChar) {
      throw new StorageError(`Invalid cookie name "${name}": contains forbidden characters`);
    }

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

    // Determine the effective Secure flag:
    //  - honor an explicit `secure` option (never weaken `secure: false`),
    //  - otherwise auto-enable on a secure (https) context,
    //  - and always enable for SameSite=None, which browsers require to be Secure.
    const secure = options.secure ?? (this.isSecureContext() || options.sameSite === 'none');
    if (secure) {
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
