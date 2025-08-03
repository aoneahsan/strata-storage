// Example: Using Strata Storage in a simple web app (no Capacitor required)
import { storage } from 'strata-storage';

// Works immediately without any setup or initialization
async function demoBasicUsage() {
  // Set a value
  await storage.set('user', { name: 'John Doe', age: 30 });
  
  // Get a value
  const user = await storage.get('user');
  console.log('User:', user); // { name: 'John Doe', age: 30 }
  
  // Check if key exists
  const hasUser = await storage.has('user');
  console.log('Has user:', hasUser); // true
  
  // Remove a value
  await storage.remove('user');
  
  // Clear all storage
  await storage.clear();
}

// Advanced features
async function demoAdvancedFeatures() {
  // Use different storage types
  await storage.set('temp', 'value', { storage: 'sessionStorage' });
  await storage.set('persistent', 'value', { storage: 'localStorage' });
  await storage.set('cached', 'value', { storage: 'cache' });
  
  // Encryption
  await storage.set('secret', 'sensitive data', {
    encrypt: true,
    encryptionPassword: 'my-secret-key'
  });
  
  // Compression
  await storage.set('large', { /* large object */ }, {
    compress: true
  });
  
  // TTL (Time To Live)
  await storage.set('temporary', 'expires soon', {
    ttl: 60000 // 1 minute
  });
  
  // Namespaces
  await storage.set('key', 'value', {
    namespace: 'my-app'
  });
  
  // Query data
  const results = await storage.query({
    where: { tags: { $contains: 'important' } }
  });
  
  // Watch for changes
  const unsubscribe = storage.subscribe('key', (event) => {
    console.log('Storage changed:', event);
  });
}

// Using with React (no provider needed)
function UserProfile() {
  const [user, setUser] = React.useState(null);
  
  React.useEffect(() => {
    // Load user data
    storage.get('currentUser').then(setUser);
    
    // Subscribe to changes
    const unsubscribe = storage.subscribe('currentUser', (event) => {
      setUser(event.value);
    });
    
    return unsubscribe;
  }, []);
  
  const updateUser = async (newData) => {
    await storage.set('currentUser', newData);
    // State automatically updates via subscription
  };
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser({ name: 'Jane Doe' })}>
        Update Name
      </button>
    </div>
  );
}

// Run demos
demoBasicUsage();
demoAdvancedFeatures();