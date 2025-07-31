/**
 * Cross-tab Synchronization Feature
 * Zero-dependency implementation using BroadcastChannel and storage events
 */

import { EventEmitter } from '@/utils';
import type {
  StorageChange,
  StorageType,
  SubscriptionCallback,
  UnsubscribeFunction,
} from '@/types';

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
export class SyncManager extends EventEmitter {
  private config: Required<SyncConfig>;
  private channel?: BroadcastChannel;
  private origin: string;
  private listeners: Map<SubscriptionCallback, (event: StorageEvent) => void> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: SyncConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      channelName: config.channelName || 'strata-sync',
      storages: config.storages || ['localStorage', 'sessionStorage'],
      conflictResolution: config.conflictResolution || 'latest',
      debounceMs: config.debounceMs || 50,
    };
    this.origin = this.generateOrigin();
  }

  /**
   * Initialize sync manager
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Set up BroadcastChannel if available
    if (this.isBroadcastChannelAvailable()) {
      this.setupBroadcastChannel();
    }

    // Set up storage event listeners
    this.setupStorageEvents();
  }

  /**
   * Broadcast a change to other tabs
   */
  broadcast(message: Omit<SyncMessage, 'origin'>): void {
    if (!this.config.enabled) return;

    const fullMessage: SyncMessage = {
      ...message,
      origin: this.origin,
    };

    // Debounce broadcasts
    const debounceKey = `${message.type}:${message.key || '*'}`;
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }

    this.debounceTimers.set(
      debounceKey,
      setTimeout(() => {
        this.sendMessage(fullMessage);
        this.debounceTimers.delete(debounceKey);
      }, this.config.debounceMs),
    );
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SubscriptionCallback): UnsubscribeFunction {
    const handler = (change: unknown) => {
      callback(change as StorageChange);
    };

    this.on('change', handler);

    return () => {
      this.off('change', handler);
    };
  }

  /**
   * Close sync manager
   */
  close(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close BroadcastChannel
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }

    // Remove storage event listeners
    this.listeners.forEach((listener) => {
      window.removeEventListener('storage', listener);
    });
    this.listeners.clear();

    // Remove all event listeners
    this.removeAllListeners();
  }

  /**
   * Check if BroadcastChannel is available
   */
  private isBroadcastChannelAvailable(): boolean {
    return typeof window !== 'undefined' && 'BroadcastChannel' in window;
  }

  /**
   * Set up BroadcastChannel for cross-tab communication
   */
  private setupBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(this.config.channelName);

      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const message = event.data;

        // Ignore messages from self
        if (message.origin === this.origin) return;

        // Emit change event
        this.emitChange({
          key: message.key || '*',
          oldValue: undefined,
          newValue: message.value,
          source: 'remote',
          storage: message.storage,
          timestamp: message.timestamp,
        });
      };

      this.channel.onmessageerror = (event) => {
        console.error('Sync message error:', event);
      };
    } catch (error) {
      console.warn('Failed to set up BroadcastChannel:', error);
    }
  }

  /**
   * Set up storage event listeners for fallback sync
   */
  private setupStorageEvents(): void {
    if (typeof window === 'undefined') return;

    const listener = (event: StorageEvent) => {
      // Only process events from other windows
      if (event.storageArea !== window.localStorage) return;

      // Parse the storage type from key prefix
      let storageType: StorageType = 'localStorage';
      if (event.key?.startsWith('strata:session:')) {
        storageType = 'sessionStorage';
      }

      // Check if this storage type is enabled for sync
      if (!this.config.storages.includes(storageType)) return;

      let oldValue: unknown;
      let newValue: unknown;

      try {
        oldValue = event.oldValue ? JSON.parse(event.oldValue) : undefined;
        newValue = event.newValue ? JSON.parse(event.newValue) : undefined;
      } catch {
        // If parsing fails, use raw values
        oldValue = event.oldValue;
        newValue = event.newValue;
      }

      this.emitChange({
        key: event.key || '*',
        oldValue,
        newValue,
        source: 'remote',
        storage: storageType,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('storage', listener);

    // Create a SubscriptionCallback wrapper for the storage event listener
    const subscriptionCallback: SubscriptionCallback = (_change) => {
      // This is handled by the listener itself
    };
    this.listeners.set(subscriptionCallback, listener);
  }

  /**
   * Send message through available channels
   */
  private sendMessage(message: SyncMessage): void {
    // Send through BroadcastChannel if available
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('Failed to send sync message:', error);
      }
    }

    // Storage events are automatic when using localStorage
    // No need to manually trigger them
  }

  /**
   * Emit a change event
   */
  private emitChange(change: StorageChange): void {
    this.emit('change', change);
  }

  /**
   * Generate unique origin ID
   */
  private generateOrigin(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolve conflicts between values
   */
  resolveConflict(values: unknown[]): unknown {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];

    if (typeof this.config.conflictResolution === 'function') {
      return this.config.conflictResolution(values);
    }

    switch (this.config.conflictResolution) {
      case 'latest':
        // Return the last value (most recent)
        return values[values.length - 1];

      case 'merge':
        // Simple merge for objects
        if (values.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))) {
          return Object.assign({}, ...values);
        }
        // For non-objects, use latest
        return values[values.length - 1];

      default:
        return values[values.length - 1];
    }
  }
}

/**
 * Create a sync manager instance
 */
export function createSyncManager(config?: SyncConfig): SyncManager {
  return new SyncManager(config);
}
