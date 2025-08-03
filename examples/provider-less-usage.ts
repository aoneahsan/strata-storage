/**
 * Provider-less Usage Examples for Strata Storage
 * Demonstrates how to use Strata Storage with and without Capacitor
 */

// Example 1: Web-only usage (no Capacitor)
async function webOnlyExample() {
  // Import only what you need - no Capacitor code included
  const { Strata } = await import('../src');
  
  const storage = new Strata({
    // Uses web-only storages by default
    defaultStorages: ['indexedDB', 'localStorage', 'memory'],
    encryption: { enabled: true },
    compression: { enabled: true }
  });
  
  await storage.initialize();
  
  // Works perfectly in browsers without any native dependencies
  await storage.set('user', { name: 'John', role: 'admin' });
  const user = await storage.get('user');
  console.log('User:', user);
  
  // All web features work out of the box
  await storage.set('encrypted', 'secret', { encrypt: true });
  await storage.set('compressed', new Array(1000).fill('data'), { compress: true });
  
  await storage.close();
}

// Example 2: Progressive enhancement with Capacitor
async function progressiveEnhancementExample() {
  const { Strata } = await import('../src');
  
  const storage = new Strata();
  
  // Check if running in Capacitor environment
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    // Dynamically load and register Capacitor adapters
    const { registerCapacitorAdapters } = await import('../src/capacitor');
    await registerCapacitorAdapters(storage);
    
    console.log('Capacitor adapters registered!');
  }
  
  await storage.initialize();
  
  // This works whether Capacitor is available or not
  const available = storage.getAvailableStorageTypes();
  console.log('Available storages:', available);
  
  // Use the best available storage
  await storage.set('key', 'value');
  
  await storage.close();
}

// Example 3: Explicit Capacitor usage
async function capacitorExample() {
  // Import core and Capacitor features separately
  const { Strata } = await import('../src');
  const { registerCapacitorAdapters, isCapacitorAvailable } = await import('../src/capacitor');
  
  if (!isCapacitorAvailable()) {
    console.log('This example requires Capacitor');
    return;
  }
  
  const storage = new Strata({
    // Prefer native storages when available
    defaultStorages: ['preferences', 'secure', 'sqlite', 'indexedDB', 'localStorage']
  });
  
  // Register Capacitor adapters
  await registerCapacitorAdapters(storage);
  await storage.initialize();
  
  // Use native secure storage
  await storage.set('api-key', 'secret-key-123', { 
    storage: 'secure',
    encrypt: true 
  });
  
  // Use native preferences
  await storage.set('theme', 'dark', { 
    storage: 'preferences' 
  });
  
  // Use SQLite for complex data
  await storage.set('products', [
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 149.99 }
  ], { 
    storage: 'sqlite' 
  });
  
  await storage.close();
}

// Example 4: Using the convenience function
async function convenienceExample() {
  // For Capacitor projects, use the convenience function
  const { createCapacitorStrata } = await import('../src/capacitor');
  
  // This automatically registers all Capacitor adapters
  const storage = await createCapacitorStrata({
    defaultStorages: ['preferences', 'sqlite', 'localStorage'],
    sync: { enabled: true }
  });
  
  // Ready to use with all adapters
  await storage.set('pref', 'value', { storage: 'preferences' });
  await storage.set('secure', 'secret', { storage: 'secure' });
  await storage.set('web', 'data', { storage: 'localStorage' });
  
  await storage.close();
}

// Example 5: Custom adapter registration
async function customAdapterExample() {
  const { Strata, BaseAdapter } = await import('../src');
  
  // Create a custom adapter
  class RedisAdapter extends BaseAdapter {
    readonly name = 'redis' as const;
    readonly capabilities = {
      persistent: true,
      synchronous: false,
      observable: false,
      transactional: false,
      queryable: true,
      maxSize: -1,
      binary: true,
      encrypted: false,
      crossTab: true,
    };
    
    async isAvailable() {
      // Check if Redis client is available
      return typeof (globalThis as any).redis !== 'undefined';
    }
    
    async get(key: string) {
      // Implementation here
      return null;
    }
    
    async set(key: string, value: any) {
      // Implementation here
    }
    
    async remove(key: string) {
      // Implementation here
    }
    
    async keys(pattern?: string | RegExp) {
      return [];
    }
    
    async size() {
      return { total: 0, count: 0 };
    }
  }
  
  const storage = new Strata();
  
  // Register custom adapter
  storage.registerAdapter(new RedisAdapter());
  
  await storage.initialize();
  
  // Use custom adapter if available
  if (storage.getAvailableStorageTypes().includes('redis' as any)) {
    await storage.set('key', 'value', { storage: 'redis' as any });
  }
  
  await storage.close();
}

// Example 6: Framework-agnostic usage
async function frameworkAgnosticExample() {
  // Works in any JavaScript environment
  const { Strata } = await import('../src');
  
  class AppStorage {
    private storage: InstanceType<typeof Strata>;
    
    constructor() {
      this.storage = new Strata({
        defaultStorages: ['indexedDB', 'localStorage', 'memory'],
        encryption: { enabled: true },
        ttl: { checkInterval: 60000 } // Check every minute
      });
    }
    
    async init() {
      await this.storage.initialize();
      
      // Set up auto-save for app state
      setInterval(() => this.saveAppState(), 30000);
    }
    
    async saveAppState() {
      const state = this.getAppState();
      await this.storage.set('app-state', state, {
        ttl: 86400000, // 24 hours
        encrypt: true
      });
    }
    
    getAppState() {
      // Get current app state
      return {
        timestamp: Date.now(),
        user: 'current-user',
        preferences: {}
      };
    }
    
    async loadAppState() {
      return await this.storage.get('app-state');
    }
    
    async cleanup() {
      await this.storage.close();
    }
  }
  
  const appStorage = new AppStorage();
  await appStorage.init();
  
  // Use throughout your app
  const state = await appStorage.loadAppState();
  console.log('Loaded app state:', state);
  
  await appStorage.cleanup();
}

// Run examples based on environment
if (typeof window !== 'undefined') {
  // Browser environment
  webOnlyExample();
  progressiveEnhancementExample();
} else {
  // Node.js environment
  console.log('Some examples require a browser environment');
}