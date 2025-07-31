# Data Synchronization Examples

Examples of synchronizing data between local storage and remote servers.

## Basic Sync Manager

```typescript
import { Strata } from 'strata-storage';

class SyncManager {
  private storage: Strata;
  private syncEndpoint: string;
  private syncInterval: number = 30000; // 30 seconds
  
  constructor(endpoint: string) {
    this.storage = new Strata();
    this.syncEndpoint = endpoint;
    this.startAutoSync();
  }
  
  async syncNow() {
    try {
      // Get local changes
      const changes = await this.getLocalChanges();
      
      if (changes.length === 0) {
        return { status: 'up-to-date' };
      }
      
      // Send to server
      const response = await fetch(this.syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes })
      });
      
      const result = await response.json();
      
      // Apply server changes
      await this.applyServerChanges(result.serverChanges);
      
      // Clear synced changes
      await this.clearSyncedChanges(changes);
      
      return { status: 'synced', count: changes.length };
    } catch (error) {
      console.error('Sync failed:', error);
      return { status: 'failed', error };
    }
  }
  
  private startAutoSync() {
    setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      }
    }, this.syncInterval);
  }
}
```

## Bidirectional Sync

```typescript
class BidirectionalSync {
  private storage: Strata;
  private lastSyncKey = 'last-sync-timestamp';
  
  async sync() {
    const lastSync = await this.storage.get(this.lastSyncKey) || 0;
    const now = Date.now();
    
    // Get local changes since last sync
    const localChanges = await this.storage.query({
      'value.modifiedAt': { $gte: lastSync }
    });
    
    // Get remote changes
    const remoteChanges = await this.fetchRemoteChanges(lastSync);
    
    // Resolve conflicts
    const resolved = await this.resolveConflicts(localChanges, remoteChanges);
    
    // Apply changes
    await this.applyChanges(resolved);
    
    // Update sync timestamp
    await this.storage.set(this.lastSyncKey, now);
  }
  
  private async resolveConflicts(local: any[], remote: any[]) {
    const conflicts = [];
    const toApply = [];
    
    for (const remoteItem of remote) {
      const localItem = local.find(l => l.key === remoteItem.key);
      
      if (localItem) {
        // Conflict detected
        const resolved = await this.resolveConflict(localItem, remoteItem);
        toApply.push(resolved);
      } else {
        // No conflict, apply remote
        toApply.push(remoteItem);
      }
    }
    
    return toApply;
  }
  
  private async resolveConflict(local: any, remote: any) {
    // Last-write-wins strategy
    if (local.value.modifiedAt > remote.modifiedAt) {
      return local;
    } else {
      return remote;
    }
  }
}
```

## Delta Sync

```typescript
class DeltaSync {
  private storage: Strata;
  private deltaKey = 'sync-deltas';
  
  async trackChange(key: string, operation: 'create' | 'update' | 'delete') {
    const deltas = await this.storage.get(this.deltaKey) || [];
    
    deltas.push({
      key,
      operation,
      timestamp: Date.now(),
      value: operation !== 'delete' ? await this.storage.get(key) : null
    });
    
    await this.storage.set(this.deltaKey, deltas);
  }
  
  async sync() {
    const deltas = await this.storage.get(this.deltaKey) || [];
    if (deltas.length === 0) return;
    
    // Group deltas by key to optimize
    const optimized = this.optimizeDeltas(deltas);
    
    // Send to server
    const response = await fetch('/api/sync/deltas', {
      method: 'POST',
      body: JSON.stringify(optimized)
    });
    
    if (response.ok) {
      // Clear processed deltas
      await this.storage.remove(this.deltaKey);
    }
  }
  
  private optimizeDeltas(deltas: any[]) {
    const byKey = new Map();
    
    for (const delta of deltas) {
      const existing = byKey.get(delta.key);
      
      if (!existing || delta.timestamp > existing.timestamp) {
        byKey.set(delta.key, delta);
      }
    }
    
    return Array.from(byKey.values());
  }
}
```

## Real-time Sync

```typescript
class RealtimeSync {
  private storage: Strata;
  private ws: WebSocket;
  private reconnectTimeout = 5000;
  
  connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Sync connected');
      this.sendPendingChanges();
    };
    
    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await this.handleSyncMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('Sync disconnected, reconnecting...');
      setTimeout(() => this.connect(wsUrl), this.reconnectTimeout);
    };
  }
  
  async handleSyncMessage(message: SyncMessage) {
    switch (message.type) {
      case 'update':
        await this.storage.set(message.key, message.value);
        break;
        
      case 'delete':
        await this.storage.remove(message.key);
        break;
        
      case 'bulk':
        await Promise.all(
          message.changes.map(change => 
            this.handleSyncMessage(change)
          )
        );
        break;
    }
  }
  
  async broadcastChange(key: string, value: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update',
        key,
        value,
        timestamp: Date.now()
      }));
    } else {
      // Queue for later
      await this.queueChange(key, value);
    }
  }
}
```

## Sync with Versioning

```typescript
class VersionedSync {
  private storage: Strata;
  
  async sync(key: string) {
    const local = await this.storage.get(key);
    const localVersion = local?.version || 0;
    
    // Get server version
    const response = await fetch(`/api/data/${key}?version=${localVersion}`);
    
    if (response.status === 304) {
      // Not modified
      return { status: 'up-to-date' };
    }
    
    const serverData = await response.json();
    
    if (serverData.version > localVersion) {
      // Server has newer version
      await this.storage.set(key, serverData);
      return { status: 'updated', version: serverData.version };
    } else if (serverData.version < localVersion) {
      // Local has newer version
      await this.pushToServer(key, local);
      return { status: 'pushed', version: local.version };
    }
    
    return { status: 'same-version' };
  }
  
  private async pushToServer(key: string, data: any) {
    await fetch(`/api/data/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}
```

## Batch Sync

```typescript
class BatchSync {
  private storage: Strata;
  private batchSize = 100;
  private syncQueue: string[] = [];
  
  async queueForSync(keys: string[]) {
    this.syncQueue.push(...keys);
    
    if (this.syncQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }
  
  async processBatch() {
    const batch = this.syncQueue.splice(0, this.batchSize);
    if (batch.length === 0) return;
    
    // Get all data for batch
    const data = await Promise.all(
      batch.map(async key => ({
        key,
        value: await this.storage.get(key)
      }))
    );
    
    // Send batch to server
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ batch: data })
    });
    
    const result = await response.json();
    
    // Apply server responses
    for (const update of result.updates) {
      await this.storage.set(update.key, update.value);
    }
  }
}
```

## Selective Sync

```typescript
class SelectiveSync {
  private storage: Strata;
  private syncRules: SyncRule[] = [];
  
  addRule(rule: SyncRule) {
    this.syncRules.push(rule);
  }
  
  async sync() {
    for (const rule of this.syncRules) {
      if (await this.shouldSync(rule)) {
        await this.syncByRule(rule);
      }
    }
  }
  
  private async shouldSync(rule: SyncRule): Promise<boolean> {
    if (rule.condition === 'wifi-only' && !this.isWifi()) {
      return false;
    }
    
    if (rule.condition === 'battery-ok' && this.getBatteryLevel() < 20) {
      return false;
    }
    
    return true;
  }
  
  private async syncByRule(rule: SyncRule) {
    const items = await this.storage.query(rule.filter);
    
    for (const item of items) {
      await this.syncItem(item, rule);
    }
  }
}

interface SyncRule {
  name: string;
  filter: any;
  condition?: 'always' | 'wifi-only' | 'battery-ok';
  priority: number;
}
```

## Sync Status Tracking

```typescript
class SyncStatusTracker {
  private storage: Strata;
  
  async trackSync(key: string, status: SyncStatus) {
    await this.storage.set(`sync-status:${key}`, {
      status,
      timestamp: Date.now(),
      attempts: (status.attempts || 0) + 1
    });
  }
  
  async getSyncStatus(): Promise<SyncSummary> {
    const statuses = await this.storage.query({
      key: { $startsWith: 'sync-status:' }
    });
    
    const summary = {
      total: statuses.length,
      synced: 0,
      pending: 0,
      failed: 0,
      lastSync: 0
    };
    
    for (const item of statuses) {
      const status = item.value;
      
      switch (status.status) {
        case 'synced':
          summary.synced++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'failed':
          summary.failed++;
          break;
      }
      
      if (status.timestamp > summary.lastSync) {
        summary.lastSync = status.timestamp;
      }
    }
    
    return summary;
  }
}
```

## See Also

- [Offline Support](./offline-support.md)
- [Cross-Tab Sync](./cross-tab-sync.md)
- [Sync Guide](../guides/features/sync.md)