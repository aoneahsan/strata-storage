/**
 * Storage strategy implementation for automatic adapter selection
 */

import type { StorageAdapter, StorageType, StorageCapabilities } from '@/types';
import { StorageStrategy } from '@/types';
import { AdapterRegistry } from './AdapterRegistry';

/**
 * Strategy manager for selecting appropriate storage adapters
 */
export class StrategyManager {
  constructor(
    private registry: AdapterRegistry,
    private strategy: StorageStrategy = StorageStrategy.PERFORMANCE_FIRST,
  ) {}

  /**
   * Get the best adapter based on current strategy
   */
  async getBestAdapter(
    preferredTypes?: StorageType[],
    requirements?: Partial<StorageCapabilities>,
  ): Promise<StorageAdapter | null> {
    const available = await this.registry.getAvailable();

    // Filter by preferred types if specified
    let candidates = preferredTypes
      ? available.filter((adapter) => preferredTypes.includes(adapter.name))
      : available;

    // Filter by requirements
    if (requirements) {
      candidates = candidates.filter((adapter) =>
        this.meetsRequirements(adapter.capabilities, requirements),
      );
    }

    // Sort by strategy
    candidates.sort((a, b) => this.compareAdapters(a, b));

    return candidates[0] || null;
  }

  /**
   * Get multiple adapters sorted by preference
   */
  async getAdapterChain(
    count: number,
    preferredTypes?: StorageType[],
    requirements?: Partial<StorageCapabilities>,
  ): Promise<StorageAdapter[]> {
    const available = await this.registry.getAvailable();

    let candidates = preferredTypes
      ? available.filter((adapter) => preferredTypes.includes(adapter.name))
      : available;

    if (requirements) {
      candidates = candidates.filter((adapter) =>
        this.meetsRequirements(adapter.capabilities, requirements),
      );
    }

    candidates.sort((a, b) => this.compareAdapters(a, b));

    return candidates.slice(0, count);
  }

  /**
   * Check if capabilities meet requirements
   */
  private meetsRequirements(
    capabilities: StorageCapabilities,
    requirements: Partial<StorageCapabilities>,
  ): boolean {
    for (const [key, value] of Object.entries(requirements)) {
      const capKey = key as keyof StorageCapabilities;

      if (typeof value === 'boolean' && capabilities[capKey] !== value) {
        return false;
      }

      if (capKey === 'maxSize' && typeof value === 'number') {
        const capSize = capabilities.maxSize;
        if (capSize !== -1 && capSize < value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Compare two adapters based on current strategy
   */
  private compareAdapters(a: StorageAdapter, b: StorageAdapter): number {
    switch (this.strategy) {
      case StorageStrategy.PERFORMANCE_FIRST:
        return this.comparePerformance(a, b);

      case StorageStrategy.PERSISTENCE_FIRST:
        return this.comparePersistence(a, b);

      case StorageStrategy.SECURITY_FIRST:
        return this.compareSecurity(a, b);

      case StorageStrategy.CAPACITY_FIRST:
        return this.compareCapacity(a, b);

      default:
        return 0;
    }
  }

  /**
   * Compare adapters by performance
   */
  private comparePerformance(a: StorageAdapter, b: StorageAdapter): number {
    // Priority order for performance
    const performanceOrder: StorageType[] = [
      'memory',
      'sessionStorage',
      'localStorage',
      'cache',
      'indexedDB',
      'preferences',
      'sqlite',
      'filesystem',
      'cookies',
      'secure',
    ];

    const aIndex = performanceOrder.indexOf(a.name);
    const bIndex = performanceOrder.indexOf(b.name);

    // Prefer synchronous adapters for performance
    if (a.capabilities.synchronous !== b.capabilities.synchronous) {
      return a.capabilities.synchronous ? -1 : 1;
    }

    return aIndex - bIndex;
  }

  /**
   * Compare adapters by persistence
   */
  private comparePersistence(a: StorageAdapter, b: StorageAdapter): number {
    // Prefer persistent storage
    if (a.capabilities.persistent !== b.capabilities.persistent) {
      return a.capabilities.persistent ? -1 : 1;
    }

    // Priority order for persistence
    const persistenceOrder: StorageType[] = [
      'sqlite',
      'filesystem',
      'secure',
      'indexedDB',
      'preferences',
      'localStorage',
      'cache',
      'cookies',
      'sessionStorage',
      'memory',
    ];

    const aIndex = persistenceOrder.indexOf(a.name);
    const bIndex = persistenceOrder.indexOf(b.name);

    return aIndex - bIndex;
  }

  /**
   * Compare adapters by security
   */
  private compareSecurity(a: StorageAdapter, b: StorageAdapter): number {
    // Prefer encrypted storage
    if (a.capabilities.encrypted !== b.capabilities.encrypted) {
      return a.capabilities.encrypted ? -1 : 1;
    }

    // Priority order for security
    const securityOrder: StorageType[] = [
      'secure',
      'preferences',
      'sqlite',
      'indexedDB',
      'filesystem',
      'localStorage',
      'sessionStorage',
      'cache',
      'memory',
      'cookies',
    ];

    const aIndex = securityOrder.indexOf(a.name);
    const bIndex = securityOrder.indexOf(b.name);

    return aIndex - bIndex;
  }

  /**
   * Compare adapters by capacity
   */
  private compareCapacity(a: StorageAdapter, b: StorageAdapter): number {
    // Compare max sizes (-1 means unlimited)
    const aSize = a.capabilities.maxSize;
    const bSize = b.capabilities.maxSize;

    if (aSize === -1 && bSize !== -1) return -1;
    if (bSize === -1 && aSize !== -1) return 1;
    if (aSize !== -1 && bSize !== -1) {
      return bSize - aSize; // Higher capacity first
    }

    // Priority order for capacity
    const capacityOrder: StorageType[] = [
      'filesystem',
      'sqlite',
      'indexedDB',
      'cache',
      'preferences',
      'secure',
      'localStorage',
      'memory',
      'sessionStorage',
      'cookies',
    ];

    const aIndex = capacityOrder.indexOf(a.name);
    const bIndex = capacityOrder.indexOf(b.name);

    return aIndex - bIndex;
  }

  /**
   * Update strategy
   */
  setStrategy(strategy: StorageStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   */
  getStrategy(): StorageStrategy {
    return this.strategy;
  }
}
