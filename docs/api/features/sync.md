# Synchronization API

Real-time cross-tab synchronization for browser-based applications.

## Overview

Strata Storage provides automatic synchronization of data changes across multiple browser tabs and windows. When data is modified in one tab, other tabs are immediately notified and can react to the changes.

This feature uses BroadcastChannel API (modern browsers) with a fallback to storage events for broader compatibility.

> **Hardened (v2.7.0):** origin IDs are generated with `crypto.randomUUID()`, and
> inbound BroadcastChannel messages are validated before they are applied. The
> storage-event fallback is localStorage-only (cross-tab).

## Configuration

### Enable Synchronization

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  sync: {
    enabled: true,
    storages: ['localStorage', 'indexedDB'], // Storages to keep in sync (optional)
    interval: 0 // Polling interval in ms; 0 = event-driven only (optional)
  }
});

await storage.initialize();
```

### Configuration Options

```typescript
interface SyncConfig {
  enabled?: boolean; // Enable/disable sync
  storages?: StorageType[]; // Which storages participate in sync
  interval?: number; // Polling interval in ms (default: 0 = event-driven)
  conflictResolution?: 'latest' | 'merge' | ((conflicts: unknown[]) => unknown);
  // How to resolve concurrent writes (default: 'latest')
}
```

## Subscribing to Changes

### Basic Subscription

Subscribe to all storage changes:

```typescript
const storage = new Strata({
  sync: { enabled: true }
});

await storage.initialize();

// Subscribe to changes
const unsubscribe = storage.subscribe((change) => {
  console.log('Change detected:', change);
  // {
  //   key: 'username',
  //   newValue: 'john_doe',
  //   oldValue: undefined,
  //   source: 'remote',
  //   storage: 'localStorage',
  //   timestamp: 1640000000000
  // }
});

// Unsubscribe when done
unsubscribe();
```

### Subscribe to Specific Keys

The subscribe callback fires for every change, so filter inside the callback
using `change.key`:

```typescript
// React to a single key
storage.subscribe((change) => {
  if (change.key === 'theme') {
    console.log('Theme changed to:', change.newValue);
    applyTheme(change.newValue);
  }
});

// React to a set of keys
const watched = new Set(['user', 'profile', 'settings']);
storage.subscribe((change) => {
  if (change.key && watched.has(change.key)) {
    console.log('User data changed:', change);
  }
});
```

### Subscribe to Key Patterns

```typescript
// React to keys matching a pattern
storage.subscribe((change) => {
  if (change.key && /^pref:/.test(change.key)) {
    console.log('User preference changed:', change);
  }
});
```

## Change Events

### StorageChange Shape

The subscribe callback receives a `StorageChange`. There is no `type` field —
infer the operation from `newValue`/`oldValue`:

```typescript
interface StorageChange<T = unknown> {
  key: string;
  oldValue?: T; // undefined when the key did not previously exist
  newValue?: T; // undefined when the key was removed
  source: 'local' | 'remote' | 'sync'; // change category, not a tab id
  storage: StorageType; // storage adapter the change came from
  timestamp: number;
}
```

### Event Examples

**Value set (created):**
```typescript
{
  key: 'username',
  newValue: 'john_doe',
  oldValue: undefined,
  source: 'remote',
  storage: 'localStorage',
  timestamp: 1640000000000
}
```

**Value removed (`newValue` is undefined):**
```typescript
{
  key: 'username',
  newValue: undefined,
  oldValue: 'john_doe',
  source: 'remote',
  storage: 'localStorage',
  timestamp: 1640000000000
}
```

## Methods

### subscribe(callback, options?)

Subscribe to change events. The optional `options` only narrows which storage
and namespace are observed (`StorageOptions`); there is no per-subscription key
or type filter — filter inside the callback via `change.key`:

```typescript
const unsubscribe = storage.subscribe(
  (change) => {
    // Handle change; filter on change.key as needed
  },
  {
    storage: 'localStorage', // Optional: only this storage adapter
    namespace: 'app' // Optional: only this namespace
  }
);
```

### unsubscribe()

The function returned by `subscribe` removes that subscription:

```typescript
const unsubscribe = storage.subscribe((change) => {
  console.log(change);
});

// Later...
unsubscribe();
```

## Real-World Examples

### Theme Synchronization

```typescript
class ThemeManager {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true }
    });
  }

  async initialize() {
    await this.storage.initialize();

    // Subscribe to theme changes from other tabs
    this.storage.subscribe((change) => {
      if (change.key === 'theme') {
        this.applyTheme(change.newValue);
      }
    });

    // Apply initial theme
    const theme = await this.storage.get('theme') || 'light';
    this.applyTheme(theme);
  }

  async setTheme(theme: 'light' | 'dark') {
    await this.storage.set('theme', theme);
    // Other tabs will automatically receive this change
  }

  private applyTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Usage
const themeManager = new ThemeManager();
await themeManager.initialize();

// Change theme in one tab
await themeManager.setTheme('dark');
// All other tabs automatically update
```

### User Session Sync

```typescript
class SessionManager {
  private storage: Strata;
  private onLogoutCallback?: () => void;

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true }
    });
  }

  async initialize() {
    await this.storage.initialize();

    // Subscribe to session changes
    this.storage.subscribe((change) => {
      if (change.key === 'session:token') {
        if (!change.newValue && change.oldValue) {
          // Session removed in another tab - logout this tab
          this.handleRemoteLogout();
        }
      }
    });
  }

  async login(token: string, userData: any) {
    await this.storage.set('session:token', token);
    await this.storage.set('session:user', userData);
  }

  async logout() {
    await this.storage.remove('session:token');
    await this.storage.remove('session:user');
    // All tabs will receive this change
  }

  onLogout(callback: () => void) {
    this.onLogoutCallback = callback;
  }

  private handleRemoteLogout() {
    // Another tab logged out - clean up this tab
    this.onLogoutCallback?.();
    window.location.href = '/login';
  }
}

// Usage
const session = new SessionManager();
await session.initialize();

session.onLogout(() => {
  console.log('Logged out from another tab');
});

// Logout in one tab
await session.logout();
// All tabs redirect to login
```

### Shopping Cart Sync

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

class ShoppingCart {
  private storage: Strata;
  private onUpdateCallback?: (cart: CartItem[]) => void;

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true }
    });
  }

  async initialize() {
    await this.storage.initialize();

    // Sync cart updates across tabs
    this.storage.subscribe((change) => {
      if (change.key === 'cart') {
        this.onUpdateCallback?.(change.newValue || []);
      }
    });
  }

  async addItem(item: CartItem) {
    const cart = await this.getCart();
    const existing = cart.find(i => i.id === item.id);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    await this.storage.set('cart', cart);
    // Other tabs will automatically update
  }

  async removeItem(itemId: string) {
    const cart = await this.getCart();
    const filtered = cart.filter(i => i.id !== itemId);
    await this.storage.set('cart', filtered);
  }

  async getCart(): Promise<CartItem[]> {
    return await this.storage.get('cart') || [];
  }

  onUpdate(callback: (cart: CartItem[]) => void) {
    this.onUpdateCallback = callback;
  }
}

// Usage in React
function CartComponent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartManager = useRef(new ShoppingCart());

  useEffect(() => {
    const manager = cartManager.current;

    manager.initialize().then(() => {
      manager.getCart().then(setCart);
      manager.onUpdate(setCart);
    });
  }, []);

  return (
    <div>
      {cart.map(item => (
        <div key={item.id}>{item.name} x {item.quantity}</div>
      ))}
    </div>
  );
}
```

### Notification Sync

```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
}

class NotificationManager {
  private storage: Strata;
  private onNewNotification?: (notification: Notification) => void;

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true }
    });
  }

  async initialize() {
    await this.storage.initialize();

    // Listen for new notifications
    this.storage.subscribe((change) => {
      if (change.key?.startsWith('notification:')) {
        if (!change.oldValue && change.newValue) {
          // New notification
          this.onNewNotification?.(change.newValue);
        }
      }
    });
  }

  async addNotification(notification: Notification) {
    await this.storage.set(`notification:${notification.id}`, notification);
  }

  async markAsRead(notificationId: string) {
    const notification = await this.storage.get(`notification:${notificationId}`);
    if (notification) {
      notification.read = true;
      await this.storage.set(`notification:${notificationId}`, notification);
    }
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const keys = await this.storage.keys();
    const notificationKeys = keys.filter(k => k.startsWith('notification:'));

    const notifications: Notification[] = [];
    for (const key of notificationKeys) {
      const notification = await this.storage.get(key);
      if (notification && !notification.read) {
        notifications.push(notification);
      }
    }

    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  }

  onNew(callback: (notification: Notification) => void) {
    this.onNewNotification = callback;
  }
}

// Usage
const notifications = new NotificationManager();
await notifications.initialize();

notifications.onNew((notification) => {
  // Show toast/banner in this tab when notification added in another tab
  showToast(notification.title, notification.message);
});
```

## Advanced Usage

### Conflict Resolution

Handle conflicts when same key is updated in multiple tabs:

```typescript
storage.subscribe((change) => {
  if (change.key === 'counter') {
    // Resolve conflict: always use higher value
    const currentValue = await storage.get('counter') || 0;
    const newValue = change.newValue || 0;

    if (newValue > currentValue) {
      // Accept remote change
      await storage.set('counter', newValue);
    } else {
      // Keep local value
      console.log('Conflict resolved: keeping local value');
    }
  }
});
```

### Custom Sync Logic

```typescript
import type { StorageChange } from 'strata-storage';

class CustomSyncManager {
  private storage: Strata;
  private syncQueue: StorageChange[] = [];

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true }
    });
  }

  async initialize() {
    await this.storage.initialize();

    this.storage.subscribe((change) => {
      this.syncQueue.push(change);
      this.processSyncQueue();
    });
  }

  private async processSyncQueue() {
    // Batch process changes
    if (this.syncQueue.length === 0) return;

    const changes = [...this.syncQueue];
    this.syncQueue = [];

    // Group changes by key
    const grouped = changes.reduce((acc, change) => {
      if (!acc[change.key]) acc[change.key] = [];
      acc[change.key].push(change);
      return acc;
    }, {} as Record<string, StorageChange[]>);

    // Apply latest change for each key
    for (const [key, keyChanges] of Object.entries(grouped)) {
      const latest = keyChanges[keyChanges.length - 1];
      await this.applyChange(latest);
    }
  }

  private async applyChange(change: StorageChange) {
    // Custom sync logic
    console.log('Applying synced change:', change);
  }
}
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| BroadcastChannel | 54+ | 38+ | 15.4+ | 79+ |
| Storage Events | All | All | All | All |

Strata automatically uses BroadcastChannel when available and falls back to storage events for older browsers.

## Performance Considerations

### Filter Early in the Callback

The callback fires for every change, so return early for keys you don't care
about to keep handlers cheap:

```typescript
storage.subscribe((change) => {
  // Bail out fast for unrelated keys
  if (change.key !== 'theme') return;
  updateTheme(change.newValue);
});
```

### Scope by Storage or Namespace

Pass `storage`/`namespace` options so the subscription only observes the
adapter or namespace you care about:

```typescript
storage.subscribe(
  (change) => {
    updateTheme(change.newValue);
  },
  { storage: 'localStorage', namespace: 'app' }
);
```

## Best Practices

1. **Filter early in the callback** by checking `change.key` before doing work
2. **Scope subscriptions** with the `storage`/`namespace` options when possible
3. **Clean up subscriptions** when components unmount
4. **Handle conflicts** with `sync.conflictResolution` (default `'latest'`)
5. **Use TTL** for temporary synced data

## See Also

- [Query API](./query.md)
- [TTL API](./ttl.md)
- [Encryption API](./encryption.md)
