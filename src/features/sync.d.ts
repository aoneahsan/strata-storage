/**
 * Cross-tab Synchronization Feature
 * Zero-dependency implementation using BroadcastChannel and storage events
 */
import { EventEmitter } from '@/utils';
import type { StorageType, SubscriptionCallback, UnsubscribeFunction } from '@/types';
/**
 * Sync configuration
 */
export interface SyncConfig {
    enabled?: boolean;
    channelName?: string;
    storages?: StorageType[];
    conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
    debounceMs?: number;
}
/**
 * Sync message structure
 */
export interface SyncMessage {
    type: 'set' | 'remove' | 'clear';
    key?: string;
    value?: unknown;
    storage: StorageType;
    timestamp: number;
    origin: string;
}
/**
 * Cross-tab synchronization manager
 */
export declare class SyncManager extends EventEmitter {
    private config;
    private channel?;
    private origin;
    private listeners;
    private debounceTimers;
    constructor(config?: SyncConfig);
    /**
     * Initialize sync manager
     */
    initialize(): Promise<void>;
    /**
     * Broadcast a change to other tabs
     */
    broadcast(message: Omit<SyncMessage, 'origin'>): void;
    /**
     * Subscribe to sync events
     */
    subscribe(callback: SubscriptionCallback): UnsubscribeFunction;
    /**
     * Close sync manager
     */
    close(): void;
    /**
     * Check if BroadcastChannel is available
     */
    private isBroadcastChannelAvailable;
    /**
     * Set up BroadcastChannel for cross-tab communication
     */
    private setupBroadcastChannel;
    /**
     * Set up storage event listeners for fallback sync
     */
    private setupStorageEvents;
    /**
     * Send message through available channels
     */
    private sendMessage;
    /**
     * Emit a change event
     */
    private emitChange;
    /**
     * Generate unique origin ID
     */
    private generateOrigin;
    /**
     * Resolve conflicts between values
     */
    resolveConflict(values: unknown[]): unknown;
}
/**
 * Create a sync manager instance
 */
export declare function createSyncManager(config?: SyncConfig): SyncManager;
//# sourceMappingURL=sync.d.ts.map