# Cross-Tab Synchronization Guide

Guide for implementing real-time storage synchronization across browser tabs and windows.

## Overview

Strata Storage provides automatic synchronization of storage changes across multiple tabs/windows using the BroadcastChannel API and storage events.

## Quick Start

```typescript
import { Strata } from 'strata-storage';

// Enable sync
const storage = new Strata({
  sync: {
    enabled: true,
    channelName: 'strata-sync'
  }
});

// Listen for changes from other tabs
storage.subscribe((change) => {
  if (change.source === 'remote') {
    console.log('Another tab updated:', change.key);
  }
});
```

## Configuration

```typescript
interface SyncConfig {
  enabled?: boolean;          // Enable sync
  channelName?: string;       // BroadcastChannel name
  storages?: StorageType[];   // Which storages to sync
  conflictResolution?: 'latest' | 'merge' | Function;
  debounceMs?: number;        // Debounce sync messages
}
```

## Sync Mechanisms

### BroadcastChannel (Primary)

```typescript
// Modern browsers support BroadcastChannel
const storage = new Strata({
  sync: {
    enabled: true,
    channelName: 'my-app-sync'
  }
});

// Changes are broadcast to all tabs
await storage.set('shared_data', value);
// All tabs receive update notification
```

### Storage Events (Fallback)

```typescript
// Fallback for older browsers
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('strata_')) {
    // Handle storage change
  }
});
```

## Usage Examples

### Real-Time Updates

```typescript
class RealtimeSync {
  constructor() {
    this.storage = new Strata({ 
      sync: { enabled: true } 
    });
    
    // Subscribe to all changes
    this.storage.subscribe(this.handleChange.bind(this));
  }
  
  handleChange(change: StorageChange) {
    if (change.source === 'remote') {
      // Update UI based on change
      this.updateUI(change.key, change.newValue);
    }
  }
  
  async updateData(key: string, value: unknown) {
    // This will sync to all tabs
    await this.storage.set(key, value);
  }
}
```

### User Authentication Sync

```typescript
class AuthSync {
  constructor() {
    this.storage = new Strata({
      sync: { 
        enabled: true,
        storages: ['localStorage', 'sessionStorage']
      }
    });
    
    // Listen for auth changes
    this.storage.subscribe((change) => {
      if (change.key === 'auth_token' && change.source === 'remote') {
        if (change.newValue) {
          this.onLogin(change.newValue);
        } else {
          this.onLogout();
        }
      }
    });
  }
  
  async login(token: string) {
    await this.storage.set('auth_token', token);
    // All tabs are now logged in
  }
  
  async logout() {
    await this.storage.remove('auth_token');
    // All tabs are now logged out
  }
}
```

### Shopping Cart Sync

```typescript
class CartSync {
  async addItem(item: CartItem) {
    const cart = await this.getCart();
    cart.items.push(item);
    
    // Update syncs to all tabs
    await storage.set('shopping_cart', cart, {
      storage: 'localStorage'
    });
  }
  
  setupSync() {
    storage.subscribe((change) => {
      if (change.key === 'shopping_cart' && change.source === 'remote') {
        this.renderCart(change.newValue);
      }
    });
  }
}
```

## Conflict Resolution

### Latest Wins (Default)

```typescript
const storage = new Strata({
  sync: {
    conflictResolution: 'latest'
  }
});
```

### Custom Merge

```typescript
const storage = new Strata({
  sync: {
    conflictResolution: (conflicts) => {
      // Custom merge logic
      return conflicts.reduce((merged, change) => {
        // Merge changes
        return { ...merged, ...change.value };
      }, {});
    }
  }
});
```

### Version-Based

```typescript
class VersionedSync {
  async set(key: string, value: unknown) {
    const versioned = {
      value,
      version: Date.now(),
      tabId: this.tabId
    };
    
    await storage.set(key, versioned);
  }
  
  handleConflict(local: any, remote: any) {
    // Use highest version
    return local.version > remote.version ? local : remote;
  }
}
```

## Performance Optimization

### Debouncing

```typescript
const storage = new Strata({
  sync: {
    enabled: true,
    debounceMs: 100 // Batch rapid changes
  }
});

// Rapid updates are batched
for (let i = 0; i < 100; i++) {
  await storage.set(`item_${i}`, i);
}
// Single sync message sent
```

### Selective Sync

```typescript
// Only sync specific storages
const storage = new Strata({
  sync: {
    enabled: true,
    storages: ['localStorage'] // Don't sync memory/session
  }
});

// Control per operation
await storage.set('local_only', value, {
  syncEnabled: false // Don't sync this change
});
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| BroadcastChannel | ✅ 54+ | ✅ 38+ | ❌ | ✅ 79+ |
| Storage Events | ✅ All | ✅ All | ✅ All | ✅ All |

### Safari Workaround

```typescript
// Safari doesn't support BroadcastChannel
// Falls back to localStorage events
const storage = new Strata({
  sync: {
    enabled: true,
    // Automatically uses storage events on Safari
  }
});
```

## Common Patterns

### Leader Election

```typescript
class TabLeader {
  private isLeader = false;
  
  async electLeader() {
    const leaderId = await storage.get('leader_id');
    
    if (!leaderId || !(await this.isLeaderAlive(leaderId))) {
      // Become leader
      this.isLeader = true;
      await storage.set('leader_id', this.tabId, {
        ttl: 5000 // 5 second lease
      });
      
      // Renew lease
      this.renewInterval = setInterval(() => {
        storage.extendTTL('leader_id', 5000);
      }, 4000);
    }
  }
}
```

### State Synchronization

```typescript
class AppStateSync {
  private state: AppState = {};
  
  constructor() {
    // Load initial state
    this.loadState();
    
    // Sync state changes
    storage.subscribe((change) => {
      if (change.key === 'app_state' && change.source === 'remote') {
        this.state = change.newValue;
        this.render();
      }
    });
  }
  
  async updateState(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates };
    await storage.set('app_state', this.state);
  }
}
```

## Debugging

### Enable Sync Logging

```typescript
const storage = new Strata({
  sync: { enabled: true },
  debug: true,
  onLog: (level, message, data) => {
    if (message.includes('sync')) {
      console.log('[Sync]', message, data);
    }
  }
});
```

### Monitor Sync Events

```typescript
// Log all sync activity
storage.subscribe((change) => {
  console.table({
    key: change.key,
    source: change.source,
    storage: change.storage,
    timestamp: new Date(change.timestamp)
  });
});
```

## Best Practices

1. **Use Debouncing**: Prevent sync storms with rapid updates
2. **Selective Sync**: Only sync necessary data
3. **Handle Offline**: Gracefully handle when sync is unavailable
4. **Version Control**: Implement versioning for complex data
5. **Clean Up**: Remove sync listeners when done

## See Also

- [API Reference - Sync](../../api/features/sync.md)
- [Web Platform Guide](../platforms/web.md)
- [Examples - Multi-Tab Apps](../../examples/multi-tab/)