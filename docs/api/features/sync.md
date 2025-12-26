# Synchronization API

Real-time cross-tab synchronization for browser-based applications.

## Overview

Strata Storage provides automatic synchronization of data changes across multiple browser tabs and windows. When data is modified in one tab, other tabs are immediately notified and can react to the changes.

This feature uses BroadcastChannel API (modern browsers) with a fallback to storage events for broader compatibility.

## Configuration

### Enable Synchronization

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  sync: {
    enabled: true,
    channel: 'strata-sync', // Custom channel name (optional)
    debounce: 100 // Debounce sync events in ms (optional)
  }
});

await storage.initialize();
```

### Configuration Options

```typescript
interface SyncConfig {
  enabled: boolean; // Enable/disable sync
  channel?: string; // BroadcastChannel name (default: 'strata-sync')
  debounce?: number; // Debounce time in ms (default: 100)
  syncDelay?: number; // Delay before syncing in ms (default: 0)
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
  //   type: 'set' | 'remove' | 'clear',
  //   key: 'username',
  //   newValue: 'john_doe',
  //   oldValue: null,
  //   timestamp: 1640000000000,
  //   source: 'tab-abc123'
  // }
});

// Unsubscribe when done
unsubscribe();
```

### Subscribe to Specific Keys

Listen for changes to specific keys:

```typescript
// Subscribe to specific key
storage.subscribe((change) => {
  if (change.key === 'theme') {
    console.log('Theme changed to:', change.newValue);
    applyTheme(change.newValue);
  }
});

// Or use key filter
storage.subscribe((change) => {
  console.log('User data changed:', change);
}, {
  keys: ['user', 'profile', 'settings']
});
```

### Subscribe to Key Patterns

```typescript
// Subscribe to keys matching pattern
storage.subscribe((change) => {
  console.log('User preference changed:', change);
}, {
  keyPattern: /^pref:/
});
```

## Change Events

### Event Types

```typescript
interface ChangeEvent {
  type: 'set' | 'remove' | 'clear';
  key?: string; // undefined for 'clear' events
  newValue?: any; // undefined for 'remove' events
  oldValue?: any;
  timestamp: number;
  source: string; // Tab/window identifier
  storage?: string; // Storage adapter used
}
```

### Event Examples

**Set Event:**
```typescript
{
  type: 'set',
  key: 'username',
  newValue: 'john_doe',
  oldValue: null,
  timestamp: 1640000000000,
  source: 'tab-abc123',
  storage: 'localStorage'
}
```

**Remove Event:**
```typescript
{
  type: 'remove',
  key: 'username',
  newValue: undefined,
  oldValue: 'john_doe',
  timestamp: 1640000000000,
  source: 'tab-xyz789',
  storage: 'localStorage'
}
```

**Clear Event:**
```typescript
{
  type: 'clear',
  timestamp: 1640000000000,
  source: 'tab-abc123'
}
```

## Methods

### subscribe(callback, options?)

Subscribe to change events:

```typescript
const unsubscribe = storage.subscribe(
  (change) => {
    // Handle change
  },
  {
    keys: ['user', 'settings'], // Optional: filter by keys
    keyPattern: /^pref:/, // Optional: filter by pattern
    types: ['set', 'remove'], // Optional: filter by event types
    debounce: 200 // Optional: debounce events
  }
);
```

### unsubscribe()

Remove a subscription:

```typescript
const unsubscribe = storage.subscribe((change) => {
  console.log(change);
});

// Later...
unsubscribe();
```

### unsubscribeAll()

Remove all subscriptions:

```typescript
storage.unsubscribeAll();
```

### syncNow()

Force immediate synchronization:

```typescript
await storage.syncNow();
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

  async init() {
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
await themeManager.init();

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

  async init() {
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
await session.init();

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

  async init() {
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

    manager.init().then(() => {
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

  async init() {
    await this.storage.initialize();

    // Listen for new notifications
    this.storage.subscribe((change) => {
      if (change.type === 'set' && change.key?.startsWith('notification:')) {
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
await notifications.init();

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

### Selective Sync

Sync only specific operations:

```typescript
const storage = new Strata({
  sync: {
    enabled: true,
    syncFilter: (change) => {
      // Only sync non-temporary data
      return !change.key?.startsWith('temp:');
    }
  }
});
```

### Custom Sync Logic

```typescript
class CustomSyncManager {
  private storage: Strata;
  private syncQueue: ChangeEvent[] = [];

  constructor() {
    this.storage = new Strata({
      sync: { enabled: true, debounce: 500 }
    });
  }

  async init() {
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
      if (!acc[change.key!]) acc[change.key!] = [];
      acc[change.key!].push(change);
      return acc;
    }, {} as Record<string, ChangeEvent[]>);

    // Apply latest change for each key
    for (const [key, keyChanges] of Object.entries(grouped)) {
      const latest = keyChanges[keyChanges.length - 1];
      await this.applyChange(latest);
    }
  }

  private async applyChange(change: ChangeEvent) {
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

### Debouncing

Debounce rapid changes to reduce event overhead:

```typescript
const storage = new Strata({
  sync: {
    enabled: true,
    debounce: 300 // Wait 300ms before syncing
  }
});
```

### Selective Subscriptions

Only subscribe to keys you need:

```typescript
// ❌ BAD - subscribes to all changes
storage.subscribe((change) => {
  if (change.key === 'theme') {
    updateTheme(change.newValue);
  }
});

// ✅ GOOD - filters at subscription level
storage.subscribe((change) => {
  updateTheme(change.newValue);
}, {
  keys: ['theme']
});
```

## Best Practices

1. **Enable debouncing** for frequently updated data
2. **Filter subscriptions** to specific keys or patterns
3. **Clean up subscriptions** when components unmount
4. **Handle conflicts** when same data updated in multiple tabs
5. **Use TTL** for temporary synced data

## See Also

- [Query API](./query.md)
- [TTL API](./ttl.md)
- [Encryption API](./encryption.md)
