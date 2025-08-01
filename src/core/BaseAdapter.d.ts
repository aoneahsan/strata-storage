/**
 * Base adapter implementation with common functionality
 */
import type { StorageAdapter, StorageValue, StorageType, StorageCapabilities, ClearOptions, SizeInfo, SubscriptionCallback, UnsubscribeFunction, QueryCondition } from '@/types';
import { EventEmitter } from '@/utils';
import { QueryEngine } from '@/features/query';
/**
 * Abstract base adapter that implements common functionality
 */
export declare abstract class BaseAdapter implements StorageAdapter {
    abstract readonly name: StorageType;
    abstract readonly capabilities: StorageCapabilities;
    protected eventEmitter: EventEmitter;
    protected queryEngine: QueryEngine;
    protected ttlCleanupInterval?: ReturnType<typeof setInterval>;
    protected ttlCheckInterval: number;
    /**
     * Initialize TTL cleanup if needed
     */
    protected startTTLCleanup(): void;
    /**
     * Stop TTL cleanup
     */
    protected stopTTLCleanup(): void;
    /**
     * Clean up expired items
     */
    protected cleanupExpired(): Promise<void>;
    /**
     * Check if value is expired
     */
    protected isExpired(value: StorageValue): boolean;
    /**
     * Filter keys by pattern
     */
    protected filterKeys(keys: string[], pattern?: string | RegExp): string[];
    /**
     * Calculate size of storage value
     */
    protected calculateSize(value: StorageValue): number;
    /**
     * Default has implementation using get
     */
    has(key: string): Promise<boolean>;
    /**
     * Default clear implementation
     */
    clear(options?: ClearOptions): Promise<void>;
    /**
     * Default size implementation
     */
    size(detailed?: boolean): Promise<SizeInfo>;
    /**
     * Subscribe to changes (if supported)
     */
    subscribe?(callback: SubscriptionCallback): UnsubscribeFunction;
    /**
     * Emit change event
     */
    protected emitChange(key: string, oldValue: unknown | undefined, newValue: unknown | undefined, source?: 'local' | 'remote'): void;
    /**
     * Query implementation (override in adapters that support it)
     */
    query?<T = unknown>(condition: QueryCondition): Promise<Array<{
        key: string;
        value: T;
    }>>;
    /**
     * Close adapter (cleanup)
     */
    close?(): Promise<void>;
    abstract isAvailable(): Promise<boolean>;
    abstract initialize(config?: unknown): Promise<void>;
    abstract get<T = unknown>(key: string): Promise<StorageValue<T> | null>;
    abstract set<T = unknown>(key: string, value: StorageValue<T>): Promise<void>;
    abstract remove(key: string): Promise<void>;
    abstract keys(pattern?: string | RegExp): Promise<string[]>;
}
//# sourceMappingURL=BaseAdapter.d.ts.map