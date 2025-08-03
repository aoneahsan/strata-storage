// Example: Using Strata Storage with Capacitor (optional)
import { storage } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

// Optional: Enable Capacitor adapters only if you need them
async function setupCapacitorStorage() {
  // Check if running in Capacitor
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    // Register Capacitor-specific adapters
    await registerCapacitorAdapters(storage);
    
    // Now you can use mobile-specific storage
    await storage.set('preference', 'value', { storage: 'preferences' });
    await storage.set('secure-token', 'secret', { storage: 'secure' });
    await storage.set('db-data', { /* data */ }, { storage: 'sqlite' });
  }
}

// The rest of your app works the same whether Capacitor is available or not
async function app() {
  // Optional Capacitor setup
  await setupCapacitorStorage();
  
  // Regular usage - works everywhere
  await storage.set('user', { name: 'John' });
  const user = await storage.get('user');
  
  // Advanced features work the same
  await storage.set('encrypted', 'secret', {
    encrypt: true,
    encryptionPassword: 'key'
  });
  
  // Query across all available storages
  const results = await storage.query({
    where: { tags: { $contains: 'important' } }
  });
}

// Example: Ionic React app with optional Capacitor
import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';

function HomePage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Initialize with Capacitor if available
    setupCapacitorStorage().then(() => {
      // Load data - works with or without Capacitor
      storage.get('appData').then(setData);
    });
  }, []);
  
  return (
    <IonPage>
      <IonContent>
        {/* Your app UI */}
      </IonContent>
    </IonPage>
  );
}

// Example: Progressive enhancement
async function progressiveStorageExample() {
  // Start with web storage
  await storage.set('data', 'value');
  
  // Later, if user installs as mobile app
  if (window.Capacitor) {
    await registerCapacitorAdapters(storage);
    
    // Migrate data to more secure storage
    const data = await storage.get('data', { storage: 'localStorage' });
    await storage.set('data', data, { storage: 'secure' });
    await storage.remove('data', { storage: 'localStorage' });
  }
}