/**
 * Basic Usage Examples for Strata Storage
 */

import { Strata } from '../src';

async function basicUsageExample() {
  // Initialize storage with default configuration
  const storage = new Strata();
  await storage.initialize();

  // Basic set and get
  await storage.set('username', 'john_doe');
  const username = await storage.get('username');
  console.log('Username:', username); // john_doe

  // Store complex objects
  await storage.set('user', {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      language: 'en'
    }
  });

  const user = await storage.get('user');
  console.log('User:', user);

  // Use TTL (Time To Live)
  await storage.set('session', 'abc123', { 
    ttl: 3600000 // 1 hour
  });

  // Check remaining TTL
  const ttl = await storage.getTTL('session');
  console.log('Session expires in:', ttl, 'ms');

  // Use tags for grouping
  await storage.set('config:theme', 'dark', { tags: ['config', 'ui'] });
  await storage.set('config:language', 'en', { tags: ['config', 'i18n'] });
  
  // Query by tags
  const configs = await storage.query({ tags: { $in: ['config'] } });
  console.log('Config items:', configs);

  // Use encryption
  await storage.set('secret', 'sensitive data', {
    encrypt: true,
    encryptionPassword: 'mySecretPassword'
  });

  // Use compression
  const largeData = Array(1000).fill('Lorem ipsum dolor sit amet');
  await storage.set('compressed', largeData, {
    compress: true
  });

  // Clear expired items
  const expiredCount = await storage.cleanupExpired();
  console.log('Cleaned up', expiredCount, 'expired items');

  // Export data
  const exportedData = await storage.export({
    keys: ['user', 'config:theme', 'config:language'],
    pretty: true
  });
  console.log('Exported data:', exportedData);

  // Close storage when done
  await storage.close();
}

async function advancedQueryExample() {
  const storage = new Strata();
  await storage.initialize();

  // Store some products
  await storage.set('product:1', { 
    name: 'Laptop', 
    price: 999, 
    category: 'electronics',
    inStock: true 
  });
  
  await storage.set('product:2', { 
    name: 'Mouse', 
    price: 29, 
    category: 'electronics',
    inStock: true 
  });
  
  await storage.set('product:3', { 
    name: 'Desk', 
    price: 299, 
    category: 'furniture',
    inStock: false 
  });

  // Query examples
  
  // Find all electronics
  const electronics = await storage.query({ 
    category: 'electronics' 
  });
  console.log('Electronics:', electronics);

  // Find products under $100
  const affordable = await storage.query({ 
    price: { $lt: 100 } 
  });
  console.log('Affordable products:', affordable);

  // Find in-stock products over $100
  const premiumInStock = await storage.query({
    $and: [
      { price: { $gte: 100 } },
      { inStock: true }
    ]
  });
  console.log('Premium in-stock:', premiumInStock);

  // Find by name pattern
  const withPattern = await storage.query({
    name: { $regex: '^[LM]' } // Starts with L or M
  });
  console.log('Products starting with L or M:', withPattern);

  await storage.close();
}

async function crossTabSyncExample() {
  const storage = new Strata({
    sync: { enabled: true }
  });
  await storage.initialize();

  // Subscribe to changes
  const unsubscribe = storage.subscribe((change) => {
    console.log(`Storage changed: ${change.key}`);
    console.log(`Old value:`, change.oldValue);
    console.log(`New value:`, change.newValue);
    console.log(`Source:`, change.source); // 'local' or 'remote'
  });

  // Changes in one tab will be reflected in other tabs
  await storage.set('sharedData', { count: 1 });

  // Cleanup
  unsubscribe();
  await storage.close();
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('=== Basic Usage ===');
    await basicUsageExample();
    
    console.log('\n=== Advanced Query ===');
    await advancedQueryExample();
    
    console.log('\n=== Cross-Tab Sync ===');
    await crossTabSyncExample();
  })();
}