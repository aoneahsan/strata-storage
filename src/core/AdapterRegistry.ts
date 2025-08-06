/**
 * Registry for managing storage adapters
 */

import type { StorageAdapter, StorageType } from '@/types';
import { AdapterNotAvailableError } from '@/utils/errors';

/**
 * Adapter registry for managing storage adapters
 */
export class AdapterRegistry {
  private adapters: Map<StorageType, StorageAdapter> = new Map();
  private initialized: Set<StorageType> = new Set();

  /**
   * Register a storage adapter
   */
  register(adapter: StorageAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get a storage adapter by name
   */
  get(name: StorageType): StorageAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get an adapter and ensure it's initialized
   */
  async getInitialized(name: StorageType, config?: unknown): Promise<StorageAdapter> {
    const adapter = this.get(name);

    if (!adapter) {
      throw new AdapterNotAvailableError(name);
    }

    // Check if adapter is available on current platform
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      throw new AdapterNotAvailableError(name, {
        reason: 'Not available on current platform',
      });
    }

    // Initialize if not already done
    if (!this.initialized.has(name)) {
      try {
        await adapter.initialize(config);
        this.initialized.add(name);
      } catch (error) {
        throw new AdapterNotAvailableError(name, {
          reason: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return adapter;
  }

  /**
   * Check if an adapter is registered
   */
  has(name: StorageType): boolean {
    return this.adapters.has(name);
  }

  /**
   * Get all registered adapter names
   */
  getNames(): StorageType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all registered adapters
   */
  getAll(): Map<StorageType, StorageAdapter> {
    return this.adapters;
  }

  /**
   * Get available adapters for current platform
   */
  async getAvailable(): Promise<StorageAdapter[]> {
    const available: StorageAdapter[] = [];

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
  unregister(name: StorageType): boolean {
    this.initialized.delete(name);
    return this.adapters.delete(name);
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
    this.initialized.clear();
  }

  /**
   * Close all adapters
   */
  async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [name, adapter] of this.adapters) {
      if (this.initialized.has(name) && adapter.close) {
        promises.push(adapter.close());
      }
    }

    await Promise.all(promises);
    this.initialized.clear();
  }
}
