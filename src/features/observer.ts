/**
 * Storage Observer - Watch for storage changes
 */

import type { ObserverCallback, StorageEvent } from '@/types';

export class StorageObserver {
  private observers: Set<ObserverCallback> = new Set();

  /**
   * Subscribe to storage events
   */
  subscribe(callback: ObserverCallback): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Emit a storage event
   */
  emit(event: StorageEvent): void {
    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in storage observer:', error);
      }
    });
  }

  /**
   * Clear all observers
   */
  clear(): void {
    this.observers.clear();
  }
}