# Cross-Tab Sync Examples

Examples of synchronizing storage across browser tabs and windows.

## Basic Sync Setup

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  sync: {
    enabled: true,
    channelName: 'my-app-sync'
  }
});

// Changes are automatically synced to all tabs
await storage.set('shared-data', { count: 1 });
```

## Listening for Changes

```typescript
// Subscribe to all changes
storage.subscribe((change) => {
  console.log('Storage changed:', {
    key: change.key,
    newValue: change.newValue,
    oldValue: change.oldValue,
    source: change.source // 'local' or 'remote'
  });
  
  if (change.source === 'remote') {
    console.log('Another tab made this change');
    updateUI(change);
  }
});

// Subscribe to specific key
storage.subscribe((change) => {
  if (change.key === 'user-status') {
    updateUserStatus(change.newValue);
  }
});
```

## Auth Sync Example

```typescript
class AuthSync {
  constructor() {
    this.storage = new Strata({ sync: { enabled: true } });
    this.setupSync();
  }
  
  setupSync() {
    this.storage.subscribe((change) => {
      if (change.source === 'remote') {
        switch (change.key) {
          case 'auth-token':
            if (change.newValue) {
              this.handleLogin(change.newValue);
            } else {
              this.handleLogout();
            }
            break;
          
          case 'user-profile':
            this.updateUserProfile(change.newValue);
            break;
        }
      }
    });
  }
  
  async login(token: string, profile: any) {
    await this.storage.set('auth-token', token);
    await this.storage.set('user-profile', profile);
    // All tabs are now logged in
  }
  
  async logout() {
    await this.storage.remove('auth-token');
    await this.storage.remove('user-profile');
    // All tabs are now logged out
  }
}
```

## Shopping Cart Sync

```typescript
class CartSync {
  private storage: Strata;
  private listeners: Set<(cart: Cart) => void> = new Set();
  
  constructor() {
    this.storage = new Strata({ sync: { enabled: true } });
    this.initSync();
  }
  
  private initSync() {
    this.storage.subscribe((change) => {
      if (change.key === 'shopping-cart' && change.source === 'remote') {
        this.notifyListeners(change.newValue);
      }
    });
  }
  
  async addItem(item: CartItem) {
    const cart = await this.getCart();
    cart.items.push(item);
    cart.total += item.price * item.quantity;
    cart.updatedAt = Date.now();
    
    await this.storage.set('shopping-cart', cart);
    // All tabs see the new item
  }
  
  onCartChange(callback: (cart: Cart) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(cart: Cart) {
    this.listeners.forEach(callback => callback(cart));
  }
}
```

## Live Collaboration

```typescript
class CollaborativeEditor {
  private storage: Strata;
  private documentId: string;
  
  constructor(documentId: string) {
    this.documentId = documentId;
    this.storage = new Strata({
      sync: {
        enabled: true,
        debounceMs: 100 // Batch rapid changes
      }
    });
  }
  
  async updateContent(content: string, cursorPosition: number) {
    await this.storage.set(`doc:${this.documentId}`, {
      content,
      lastEditBy: this.userId,
      lastEditAt: Date.now(),
      cursors: {
        [this.userId]: cursorPosition
      }
    });
  }
  
  onDocumentChange(callback: (doc: Document) => void) {
    return this.storage.subscribe((change) => {
      if (change.key === `doc:${this.documentId}` && 
          change.source === 'remote') {
        callback(change.newValue);
      }
    });
  }
}
```

## Notification Broadcasting

```typescript
class NotificationBroadcast {
  async showNotification(notification: Notification) {
    // Store notification with short TTL
    await storage.set('notification', notification, {
      ttl: 5000 // Auto-cleanup after 5 seconds
    });
  }
  
  listenForNotifications() {
    storage.subscribe((change) => {
      if (change.key === 'notification' && 
          change.source === 'remote' && 
          change.newValue) {
        this.displayNotification(change.newValue);
      }
    });
  }
}
```

## Selective Sync

```typescript
const storage = new Strata({
  sync: {
    enabled: true,
    storages: ['localStorage'] // Only sync localStorage
  }
});

// This will sync across tabs
await storage.set('shared', 'data', { storage: 'localStorage' });

// This won't sync (memory storage)
await storage.set('local', 'data', { storage: 'memory' });

// Disable sync for specific operation
await storage.set('private', 'data', { syncEnabled: false });
```

## See Also

- [Sync Guide](../guides/features/sync.md)
- [Multi-Tab Apps](../guides/patterns/multi-tab.md)
- [Real-time Features](../guides/advanced/realtime.md)