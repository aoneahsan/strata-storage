# Offline Support Examples

Examples of building offline-first applications with Strata Storage.

## Basic Offline Detection

```typescript
import { Strata } from 'strata-storage';

class OfflineManager {
  private storage: Strata;
  private isOnline = navigator.onLine;
  
  constructor() {
    this.storage = new Strata();
    this.setupListeners();
  }
  
  private setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onOnline();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onOffline();
    });
  }
  
  private async onOnline() {
    console.log('Back online - syncing data...');
    await this.syncPendingChanges();
  }
  
  private async onOffline() {
    console.log('Gone offline - using local storage');
    await this.storage.set('offline-since', Date.now());
  }
}
```

## Offline Queue

```typescript
class OfflineQueue {
  private storage: Strata;
  private queueKey = 'offline-queue';
  
  async add(action: QueueAction) {
    const queue = await this.getQueue();
    queue.push({
      ...action,
      id: generateId(),
      timestamp: Date.now()
    });
    
    await this.storage.set(this.queueKey, queue);
  }
  
  async process() {
    const queue = await this.getQueue();
    const pending = [...queue];
    const failed: QueueAction[] = [];
    
    for (const action of pending) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Failed to process:', action, error);
        failed.push(action);
      }
    }
    
    // Keep only failed actions in queue
    await this.storage.set(this.queueKey, failed);
    
    return {
      processed: pending.length - failed.length,
      failed: failed.length
    };
  }
  
  private async executeAction(action: QueueAction) {
    switch (action.type) {
      case 'api-call':
        return fetch(action.url, action.options);
      case 'sync-data':
        return this.syncData(action.data);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
}
```

## Service Worker Integration

```typescript
// service-worker.js
const storage = new Strata({
  namespace: 'sw-cache',
  defaultStorages: ['cache', 'indexedDB']
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(async (response) => {
      if (response) {
        return response;
      }
      
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open('v1');
          cache.put(event.request, networkResponse.clone());
          
          // Store metadata
          await storage.set(`cache:${event.request.url}`, {
            cached: Date.now(),
            size: networkResponse.headers.get('content-length')
          });
        }
        
        return networkResponse;
      } catch (error) {
        // Offline - try to serve from cache
        const cached = await storage.get(`fallback:${event.request.url}`);
        if (cached) {
          return new Response(cached.data, cached.options);
        }
        
        throw error;
      }
    })
  );
});
```

## Conflict Resolution

```typescript
class ConflictResolver {
  private storage: Strata;
  
  async sync(localData: any, remoteData: any) {
    const conflicts: Conflict[] = [];
    
    // Compare timestamps
    if (localData.updatedAt > remoteData.updatedAt) {
      // Local is newer
      return this.resolveLocalWins(localData, remoteData);
    } else if (remoteData.updatedAt > localData.updatedAt) {
      // Remote is newer
      return this.resolveRemoteWins(localData, remoteData);
    } else {
      // Same timestamp - need manual resolution
      conflicts.push({
        key: localData.id,
        local: localData,
        remote: remoteData
      });
    }
    
    if (conflicts.length > 0) {
      await this.storage.set('conflicts', conflicts);
      return this.mergeData(localData, remoteData);
    }
    
    return localData;
  }
  
  private mergeData(local: any, remote: any) {
    // Custom merge strategy
    return {
      ...remote,
      ...local,
      merged: true,
      mergedAt: Date.now()
    };
  }
}
```

## Progressive Data Loading

```typescript
class ProgressiveLoader {
  private storage: Strata;
  
  async loadData(key: string) {
    // 1. Check memory cache
    const cached = await this.storage.get(key, { storage: 'memory' });
    if (cached) return { data: cached, source: 'memory' };
    
    // 2. Check local storage
    const local = await this.storage.get(key, { storage: 'indexedDB' });
    if (local) {
      // Background refresh if stale
      if (this.isStale(local)) {
        this.refreshInBackground(key);
      }
      return { data: local, source: 'local' };
    }
    
    // 3. Fetch from network
    try {
      const fresh = await this.fetchFromNetwork(key);
      await this.storage.set(key, fresh);
      return { data: fresh, source: 'network' };
    } catch (error) {
      // 4. Use stale data if available
      const stale = await this.storage.get(`stale:${key}`);
      if (stale) {
        return { data: stale, source: 'stale', warning: 'Using stale data' };
      }
      
      throw error;
    }
  }
}
```

## Background Sync

```typescript
class BackgroundSync {
  private storage: Strata;
  
  async register(tag: string, data: any) {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      
      // Store data for sync
      await this.storage.set(`sync:${tag}`, data);
      
      // Register background sync
      await reg.sync.register(tag);
    } else {
      // Fallback to periodic sync
      this.fallbackSync(tag, data);
    }
  }
  
  private fallbackSync(tag: string, data: any) {
    const attemptSync = async () => {
      if (navigator.onLine) {
        try {
          await this.performSync(tag, data);
          await this.storage.remove(`sync:${tag}`);
        } catch (error) {
          // Retry later
          setTimeout(attemptSync, 30000);
        }
      } else {
        // Check again in 10 seconds
        setTimeout(attemptSync, 10000);
      }
    };
    
    attemptSync();
  }
}
```

## Offline Analytics

```typescript
class OfflineAnalytics {
  private storage: Strata;
  private batchSize = 50;
  
  async track(event: AnalyticsEvent) {
    const events = await this.storage.get('analytics-queue') || [];
    events.push({
      ...event,
      timestamp: Date.now(),
      offline: !navigator.onLine
    });
    
    await this.storage.set('analytics-queue', events);
    
    // Try to flush if online
    if (navigator.onLine && events.length >= this.batchSize) {
      this.flush();
    }
  }
  
  async flush() {
    const events = await this.storage.get('analytics-queue') || [];
    if (events.length === 0) return;
    
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(events)
      });
      
      // Clear queue on success
      await this.storage.remove('analytics-queue');
    } catch (error) {
      console.error('Failed to flush analytics:', error);
    }
  }
}
```

## Data Prefetching

```typescript
class DataPrefetcher {
  private storage: Strata;
  private prefetchQueue = new Set<string>();
  
  async prefetch(urls: string[]) {
    for (const url of urls) {
      if (!this.prefetchQueue.has(url)) {
        this.prefetchQueue.add(url);
        this.prefetchUrl(url);
      }
    }
  }
  
  private async prefetchUrl(url: string) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      await this.storage.set(`prefetch:${url}`, data, {
        ttl: 3600000 // 1 hour
      });
    } catch (error) {
      console.error(`Failed to prefetch ${url}:`, error);
    } finally {
      this.prefetchQueue.delete(url);
    }
  }
  
  async get(url: string) {
    // Check prefetched data first
    const prefetched = await this.storage.get(`prefetch:${url}`);
    if (prefetched) return prefetched;
    
    // Fetch normally
    const response = await fetch(url);
    return response.json();
  }
}
```

## See Also

- [Custom Adapters Guide](../guides/advanced/custom-adapters.md)
- [Sync Examples](./cross-tab-sync.md)
- [Data Synchronization](./data-sync.md)