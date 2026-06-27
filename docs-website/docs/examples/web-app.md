# Web Application Examples

Complete examples of using Strata Storage in web applications.

## Single Page Application (SPA)

```typescript
import { Strata } from 'strata-storage';

// Initialize for web
const storage = new Strata({
  namespace: 'my-web-app',
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  sync: { enabled: true }
});

// App initialization
async function initApp() {
  // Check authentication
  const token = await storage.get('auth-token');
  if (token) {
    await loadUserData();
  } else {
    showLoginScreen();
  }
  
  // Load preferences
  const theme = await storage.get('theme') || 'light';
  applyTheme(theme);
}
```

## Progressive Web App (PWA)

```typescript
// Service Worker
self.addEventListener('install', async (event) => {
  const storage = new Strata({
    namespace: 'pwa-cache',
    defaultStorages: ['cache', 'indexedDB']
  });
  
  // Cache essential assets
  await storage.set('app-shell', {
    html: await fetchAndCache('/index.html'),
    css: await fetchAndCache('/styles.css'),
    js: await fetchAndCache('/app.js')
  });
});

// Main app
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const storage = new Strata({
  namespace: 'pwa-app',
  defaultStorages: ['indexedDB', 'localStorage']
});
```

## Offline-First App

```typescript
class OfflineFirstApp {
  private storage: Strata;
  private syncQueue: any[] = [];
  
  constructor() {
    this.storage = new Strata({
      namespace: 'offline-app',
      defaultStorages: ['indexedDB', 'localStorage']
    });
    
    this.setupOfflineHandling();
  }
  
  private setupOfflineHandling() {
    window.addEventListener('online', () => this.syncData());
    window.addEventListener('offline', () => this.notifyOffline());
  }
  
  async saveData(key: string, data: any) {
    // Always save locally first
    await this.storage.set(key, data);
    
    if (navigator.onLine) {
      try {
        await this.syncToServer(key, data);
      } catch (error) {
        this.queueForSync(key, data);
      }
    } else {
      this.queueForSync(key, data);
    }
  }
  
  private async syncData() {
    const pending = await this.storage.get('sync-queue') || [];
    
    for (const item of pending) {
      try {
        await this.syncToServer(item.key, item.data);
      } catch (error) {
        console.error('Sync failed for:', item.key);
      }
    }
    
    await this.storage.remove('sync-queue');
  }
}
```

## Multi-Page Application

```html
<!-- Shared storage across pages -->
<script src="strata-storage.js"></script>
<script>
  const storage = new Strata({
    namespace: 'multi-page-app',
    sync: { enabled: true }
  });
  
  // Page 1: Save user preferences
  async function savePreferences() {
    await storage.set('preferences', {
      language: document.getElementById('language').value,
      theme: document.getElementById('theme').value
    });
  }
  
  // Page 2: Load preferences
  async function loadPreferences() {
    const prefs = await storage.get('preferences');
    if (prefs) {
      applyPreferences(prefs);
    }
  }
</script>
```

## E-Commerce Example

```typescript
class EcommerceStorage {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      namespace: 'ecommerce',
      compression: { enabled: true },
      ttl: { enabled: true }
    });
  }
  
  // Shopping cart with persistence
  async addToCart(product: Product) {
    const cart = await this.getCart();
    const existing = cart.items.find(i => i.id === product.id);
    
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.items.push({ ...product, quantity: 1 });
    }
    
    cart.updatedAt = Date.now();
    await this.storage.set('cart', cart);
  }
  
  // Recently viewed with TTL
  async addRecentlyViewed(product: Product) {
    const recent = await this.storage.get('recently-viewed') || [];
    
    // Remove if already exists
    const filtered = recent.filter(p => p.id !== product.id);
    
    // Add to front
    filtered.unshift(product);
    
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    
    await this.storage.set('recently-viewed', trimmed, {
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
  
  // Search history
  async saveSearch(query: string) {
    const searches = await this.storage.get('search-history') || [];
    if (!searches.includes(query)) {
      searches.unshift(query);
      await this.storage.set('search-history', searches.slice(0, 20));
    }
  }
}
```

## Dashboard Application

```typescript
class DashboardStorage {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      namespace: 'dashboard',
      defaultStorages: ['indexedDB', 'localStorage']
    });
  }
  
  // Cache API responses
  async fetchData(endpoint: string, ttl = 300000) {
    const cacheKey = `api:${endpoint}`;
    const cached = await this.storage.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(`/api/${endpoint}`);
    const data = await response.json();
    
    await this.storage.set(cacheKey, data, { ttl });
    return data;
  }
  
  // Save dashboard layout
  async saveLayout(layout: DashboardLayout) {
    await this.storage.set('dashboard-layout', layout, {
      sync: true // Sync across tabs
    });
  }
  
  // User preferences
  async saveWidgetSettings(widgetId: string, settings: any) {
    const allSettings = await this.storage.get('widget-settings') || {};
    allSettings[widgetId] = settings;
    await this.storage.set('widget-settings', allSettings);
  }
}
```

## Performance Optimization

```typescript
// Lazy loading with storage
class LazyLoader {
  private storage: Strata;
  private loaded = new Set<string>();
  
  async loadModule(moduleName: string) {
    if (this.loaded.has(moduleName)) {
      return;
    }
    
    // Check cache first
    const cached = await this.storage.get(`module:${moduleName}`);
    if (cached && cached.version === APP_VERSION) {
      eval(cached.code); // Use the cached module
      this.loaded.add(moduleName);
      return;
    }
    
    // Load from network
    const response = await fetch(`/modules/${moduleName}.js`);
    const code = await response.text();
    
    // Cache for next time
    await this.storage.set(`module:${moduleName}`, {
      code,
      version: APP_VERSION
    }, {
      compress: true // Compress JavaScript code
    });
    
    eval(code);
    this.loaded.add(moduleName);
  }
}
```

## See Also

- [React Native Example](./react-native.md)
- [Capacitor Example](./capacitor-app.md)
- [Web Platform Guide](../guides/platforms/web.md)