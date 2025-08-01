/**
 * Cookie Adapter - Browser cookie implementation
 * Provides limited storage with 4KB per cookie limit
 */
import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions, SizeInfo } from '@/types';
/**
 * Cookie options
 */
interface CookieOptions {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
}
/**
 * Browser cookie adapter
 */
export declare class CookieAdapter extends BaseAdapter {
    readonly name: StorageType;
    readonly capabilities: StorageCapabilities;
    private prefix;
    private cookieOptions;
    private maxCookieSize;
    constructor(prefix?: string, options?: CookieOptions);
    /**
     * Check if cookies are available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the adapter
     */
    initialize(config?: CookieOptions): Promise<void>;
    /**
     * Get a value from cookies
     */
    get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    /**
     * Set a value in cookies
     */
    set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    /**
     * Remove a value from cookies
     */
    remove(key: string): Promise<void>;
    /**
     * Clear cookies
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Get all keys
     */
    keys(pattern?: string | RegExp): Promise<string[]>;
    /**
     * Get storage size
     */
    size(detailed?: boolean): Promise<SizeInfo>;
    /**
     * Get a cookie value
     */
    private getCookie;
    /**
     * Set a cookie
     */
    private setCookie;
    /**
     * Delete a cookie
     */
    private deleteCookie;
    /**
     * Get all cookies as key-value pairs
     */
    private getAllCookies;
}
export {};
//# sourceMappingURL=CookieAdapter.d.ts.map