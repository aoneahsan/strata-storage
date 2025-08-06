/**
 * Cache Adapter - Service Worker Cache API implementation
 * Provides network-aware storage for offline support
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type {
  StorageType,
  StorageCapabilities,
  StorageValue,
  ClearOptions,
  SizeInfo,
  QueryCondition,
} from '@/types';
import { getObjectSize } from '@/utils';
import { StorageError, QuotaExceededError, NotSupportedError } from '@/utils/errors';

/**
 * Cache API adapter for Service Worker environments
 */
export class CacheAdapter extends BaseAdapter {
  readonly name: StorageType = 'cache';
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    synchronous: false,
    observable: false, // No native change events
    transactional: false,
    queryable: true,
    maxSize: -1, // Browser dependent, typically GBs
    binary: true, // Supports binary data via Response
    encrypted: false,
    crossTab: true, // Shared across tabs via Service Worker
  };

  private cacheName: string;
  private baseUrl: string;
  private cache?: Cache;

  constructor(cacheName = 'strata-storage-v1', baseUrl = 'https://strata.local/') {
    super();
    this.cacheName = cacheName;
    this.baseUrl = baseUrl;
  }

  /**
   * Check if Cache API is available
   */
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'caches' in window && typeof caches.open === 'function';
  }

  /**
   * Initialize the adapter
   */
  async initialize(config?: { cacheName?: string; baseUrl?: string }): Promise<void> {
    if (config?.cacheName) this.cacheName = config.cacheName;
    if (config?.baseUrl) this.baseUrl = config.baseUrl;

    await this.openCache();
    this.startTTLCleanup();
  }

  /**
   * Open cache
   */
  private async openCache(): Promise<Cache> {
    if (this.cache) return this.cache;

    if (!('caches' in window)) {
      throw new NotSupportedError('Cache API not available');
    }

    this.cache = await caches.open(this.cacheName);
    return this.cache;
  }

  /**
   * Create URL for key
   */
  private keyToUrl(key: string): string {
    return new URL(encodeURIComponent(key), this.baseUrl).href;
  }

  /**
   * Extract key from URL
   */
  private urlToKey(url: string): string {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop() || '';
    return decodeURIComponent(lastSegment);
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    const cache = await this.openCache();
    const url = this.keyToUrl(key);

    try {
      const response = await cache.match(url);
      if (!response) return null;

      const data = (await response.json()) as StorageValue<T>;

      // Check TTL
      if (this.isExpired(data)) {
        await this.remove(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Failed to get key ${key} from cache:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    const cache = await this.openCache();
    const url = this.keyToUrl(key);
    const oldValue = await this.get(key);

    try {
      // Create Response with the data
      const response = new Response(JSON.stringify(value), {
        headers: {
          'Content-Type': 'application/json',
          'X-Strata-Created': value.created.toString(),
          'X-Strata-Updated': value.updated.toString(),
          'X-Strata-Expires': value.expires?.toString() || '',
        },
      });

      await cache.put(url, response);
      this.emitChange(key, oldValue?.value, value.value, 'local');
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw new QuotaExceededError('Cache quota exceeded', { key, size: getObjectSize(value) });
      }
      throw new StorageError(`Failed to set key ${key} in cache: ${error}`);
    }
  }

  /**
   * Remove a value from cache
   */
  async remove(key: string): Promise<void> {
    const cache = await this.openCache();
    const url = this.keyToUrl(key);
    const oldValue = await this.get(key);

    const deleted = await cache.delete(url);

    if (deleted && oldValue) {
      this.emitChange(key, oldValue.value, undefined, 'local');
    }
  }

  /**
   * Clear cache
   */
  async clear(options?: ClearOptions): Promise<void> {
    if (!options || (!options.pattern && !options.tags && !options.expiredOnly)) {
      // Delete and recreate cache
      await caches.delete(this.cacheName);
      this.cache = await caches.open(this.cacheName);
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
    const cache = await this.openCache();
    const requests = await cache.keys();
    const keys: string[] = [];

    for (const request of requests) {
      const key = this.urlToKey(request.url);

      // Check if not expired
      const value = await this.get(key);
      if (value) {
        keys.push(key);
      }
    }

    return this.filterKeys(keys, pattern);
  }

  /**
   * Query cache with conditions
   */
  async query<T = unknown>(condition: QueryCondition): Promise<Array<{ key: string; value: T }>> {
    const cache = await this.openCache();
    const requests = await cache.keys();
    const results: Array<{ key: string; value: T }> = [];

    for (const request of requests) {
      const key = this.urlToKey(request.url);
      const value = await this.get<T>(key);

      if (value && this.queryEngine.matches(value.value, condition)) {
        results.push({ key, value: value.value });
      }
    }

    return results;
  }

  /**
   * Get storage size
   */
  async size(detailed?: boolean): Promise<SizeInfo> {
    const cache = await this.openCache();
    const requests = await cache.keys();
    let total = 0;
    let count = 0;
    let keySize = 0;
    let valueSize = 0;
    let metadataSize = 0;

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        count++;
        const key = this.urlToKey(request.url);
        const blob = await response.blob();
        const contentSize = blob.size;

        total += key.length * 2 + contentSize;

        if (detailed) {
          keySize += key.length * 2;
          valueSize += contentSize;

          // Headers contribute to metadata
          const headers = response.headers;
          headers.forEach((value, key) => {
            metadataSize += (key.length + value.length) * 2;
          });
        }
      }
    }

    const result: SizeInfo = { total, count };

    if (detailed) {
      result.detailed = {
        keys: keySize,
        values: valueSize,
        metadata: metadataSize,
      };
    }

    return result;
  }

  /**
   * Store binary data
   */
  async setBinary(
    key: string,
    data: ArrayBuffer | Blob,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const cache = await this.openCache();
    const url = this.keyToUrl(key);
    const now = Date.now();

    // Create storage value for metadata
    const storageMetadata: StorageValue = {
      value: metadata || {},
      created: now,
      updated: now,
      metadata: { binary: true, size: data instanceof ArrayBuffer ? data.byteLength : data.size },
    };

    // Create Response with binary data
    const response = new Response(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Strata-Metadata': JSON.stringify(storageMetadata),
      },
    });

    await cache.put(url, response);
    this.emitChange(key, undefined, metadata || {}, 'local');
  }

  /**
   * Get binary data
   */
  async getBinary(
    key: string,
  ): Promise<{ data: ArrayBuffer; metadata?: Record<string, unknown> } | null> {
    const cache = await this.openCache();
    const url = this.keyToUrl(key);

    try {
      const response = await cache.match(url);
      if (!response) return null;

      const metadataHeader = response.headers.get('X-Strata-Metadata');
      const metadata = metadataHeader ? JSON.parse(metadataHeader) : null;

      // Check if it's binary data
      if (response.headers.get('Content-Type') !== 'application/octet-stream') {
        return null;
      }

      const data = await response.arrayBuffer();
      return { data, metadata: metadata?.value };
    } catch (error) {
      console.error(`Failed to get binary data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    this.cache = undefined;

    await super.close();
  }

  /**
   * Check if error is quota exceeded
   */
  private isQuotaError(error: unknown): boolean {
    if (error instanceof Error || error instanceof DOMException) {
      return error.name === 'QuotaExceededError' || error.message.toLowerCase().includes('quota');
    }
    return false;
  }
}
