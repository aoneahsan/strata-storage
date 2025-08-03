/**
 * Capacitor Usage Examples for Strata Storage
 * Shows how to use native storage features with Capacitor
 */

import { Strata } from '../src';
import { 
  registerCapacitorAdapters, 
  createCapacitorStrata,
  PreferencesAdapter,
  SqliteAdapter,
  SecureAdapter,
  FilesystemAdapter
} from '../src/capacitor';

// Example 1: Basic Capacitor setup
async function basicCapacitorSetup() {
  const storage = new Strata({
    // Configure to prefer native storages
    defaultStorages: ['preferences', 'sqlite', 'secure', 'indexedDB', 'localStorage', 'memory']
  });
  
  // Register Capacitor adapters
  await registerCapacitorAdapters(storage);
  await storage.initialize();
  
  // Check what's available
  const availableStorages = storage.getAvailableStorageTypes();
  console.log('Available storages:', availableStorages);
  
  // Use native preferences (synced across app)
  await storage.set('user-preferences', {
    theme: 'dark',
    language: 'en',
    notifications: true
  }, { storage: 'preferences' });
  
  // Use secure storage for sensitive data
  await storage.set('auth-token', 'secret-jwt-token', { 
    storage: 'secure',
    encrypt: true 
  });
  
  // Use SQLite for structured data
  await storage.set('user-profile', {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    metadata: { loginCount: 5 }
  }, { storage: 'sqlite' });
  
  await storage.close();
}

// Example 2: Using convenience function
async function convenienceSetup() {
  // This automatically sets up everything for Capacitor
  const storage = await createCapacitorStrata({
    defaultStorages: ['preferences', 'sqlite', 'localStorage'],
    encryption: { 
      enabled: true,
      password: 'app-secret-key'
    },
    sync: { enabled: true }
  });
  
  // Ready to use immediately
  await storage.set('config', { apiUrl: 'https://api.example.com' });
  const config = await storage.get('config');
  console.log('Config:', config);
  
  await storage.close();
}

// Example 3: Platform-specific features
async function platformSpecificFeatures() {
  const storage = await createCapacitorStrata();
  
  // iOS Keychain usage (via secure adapter)
  if (storage.getCapabilities('secure').encrypted) {
    const secureAdapter = storage.getRegistry().get('secure') as SecureAdapter;
    
    // Store in iOS Keychain
    await secureAdapter.setKeychain('api-key', 'secret-key-123', {
      accessible: 'afterFirstUnlock',
      group: 'com.example.app'
    });
    
    // Retrieve from Keychain
    const apiKey = await secureAdapter.getKeychain('api-key');
    console.log('API Key from Keychain:', apiKey);
  }
  
  // Android Encrypted SharedPreferences
  if (storage.getCapabilities('secure').encrypted) {
    const secureAdapter = storage.getRegistry().get('secure') as SecureAdapter;
    
    await secureAdapter.setEncryptedPreference('user-pin', '1234');
    const pin = await secureAdapter.getEncryptedPreference('user-pin');
    console.log('PIN from Encrypted Preferences:', pin);
  }
  
  await storage.close();
}

// Example 4: SQLite advanced usage
async function sqliteAdvancedUsage() {
  const storage = new Strata();
  
  // Register only SQLite adapter
  const sqliteAdapter = new SqliteAdapter({
    database: 'myapp.db',
    version: 1
  });
  storage.registerAdapter(sqliteAdapter);
  
  await storage.initialize();
  
  // Use SQLite transactions
  const transaction = await storage.beginTransaction?.('sqlite');
  
  try {
    await storage.set('user:1', { name: 'Alice' }, { storage: 'sqlite' });
    await storage.set('user:2', { name: 'Bob' }, { storage: 'sqlite' });
    await storage.set('user:3', { name: 'Charlie' }, { storage: 'sqlite' });
    
    await transaction?.commit();
  } catch (error) {
    await transaction?.rollback();
    throw error;
  }
  
  // Query SQLite data
  const users = await storage.query({ 
    name: { $regex: '^[AB]' } 
  }, { storage: 'sqlite' });
  
  console.log('Users starting with A or B:', users);
  
  await storage.close();
}

// Example 5: File system storage
async function filesystemUsage() {
  const storage = new Strata();
  
  // Register filesystem adapter
  storage.registerAdapter(new FilesystemAdapter({
    directory: 'AppData',
    encoding: 'utf8'
  }));
  
  await storage.initialize();
  
  // Store large files
  const largeData = {
    images: Array(100).fill('base64-image-data'),
    videos: Array(10).fill('video-metadata')
  };
  
  await storage.set('media-cache', largeData, { 
    storage: 'filesystem',
    compress: true 
  });
  
  // Store app logs
  await storage.set('logs/2024-01-15.log', 'Application logs...', { 
    storage: 'filesystem' 
  });
  
  await storage.close();
}

// Example 6: Migration from web to native
async function migrationExample() {
  const storage = await createCapacitorStrata();
  
  // Check if we have data in web storage that should be migrated
  const webData = await storage.get('important-data', { storage: 'localStorage' });
  
  if (webData && storage.getAvailableStorageTypes().includes('preferences')) {
    // Migrate to native storage
    await storage.set('important-data', webData, { storage: 'preferences' });
    
    // Remove from web storage
    await storage.remove('important-data', { storage: 'localStorage' });
    
    console.log('Data migrated to native storage');
  }
  
  await storage.close();
}

// Example 7: Handling offline/online sync
async function offlineSyncExample() {
  const storage = await createCapacitorStrata({
    sync: { enabled: true }
  });
  
  // Queue operations when offline
  const offlineQueue: Array<() => Promise<void>> = [];
  
  async function saveData(key: string, value: unknown) {
    try {
      await storage.set(key, value, { storage: 'preferences' });
    } catch (error) {
      // If offline, queue the operation
      offlineQueue.push(async () => {
        await storage.set(key, value, { storage: 'preferences' });
      });
    }
  }
  
  // Process queue when back online
  window.addEventListener('online', async () => {
    console.log('Back online, syncing data...');
    
    for (const operation of offlineQueue) {
      try {
        await operation();
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    
    offlineQueue.length = 0;
  });
  
  await storage.close();
}

// Run examples
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  console.log('Running Capacitor examples...');
  basicCapacitorSetup();
} else {
  console.log('These examples require Capacitor environment');
}