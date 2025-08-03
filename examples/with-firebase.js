// Example: Using Strata Storage with Firebase (optional cloud sync)
import { storage } from 'strata-storage';
import { enableFirebaseSync } from 'strata-storage/firebase';

// Optional: Enable Firebase sync only if you need it
async function setupFirebaseSync() {
  try {
    await enableFirebaseSync(storage, {
      apiKey: 'your-api-key',
      authDomain: 'your-auth-domain',
      projectId: 'your-project-id',
      appId: 'your-app-id',
      firestore: true,  // Enable Firestore adapter
      realtimeDatabase: true,  // Enable Realtime Database adapter
      syncInterval: 5000  // Sync every 5 seconds
    });
    
    console.log('Firebase sync enabled');
    
    // Now you can use Firebase as a storage backend
    await storage.set('user', { name: 'John' }, { storage: 'firestore' });
    await storage.set('config', { theme: 'dark' }, { storage: 'realtime' });
  } catch (error) {
    console.warn('Firebase not available, using local storage only');
  }
}

// Your app works the same with or without Firebase
async function app() {
  // Optional Firebase setup
  await setupFirebaseSync();
  
  // Regular usage - works offline-first
  await storage.set('todos', [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Write code', done: true }
  ]);
  
  // Data is automatically synced to Firebase if enabled
  const todos = await storage.get('todos');
  console.log('Todos:', todos);
}

// Example: Offline-first with optional sync
async function offlineFirstExample() {
  // Always save locally first
  await storage.set('draft', { 
    title: 'My Post',
    content: 'Lorem ipsum...',
    lastModified: Date.now()
  });
  
  // Try to sync to cloud if available
  const hasFirebase = await isFirebaseAvailable();
  if (hasFirebase) {
    await enableFirebaseSync(storage, { /* config */ });
    
    // Sync local drafts to cloud
    const draft = await storage.get('draft');
    await storage.set('draft', draft, { storage: 'firestore' });
  }
}

// Example: Multi-user collaboration
async function collaborationExample() {
  // Enable real-time sync
  await enableFirebaseSync(storage, {
    apiKey: 'your-api-key',
    projectId: 'your-project-id',
    realtimeDatabase: true
  });
  
  // Subscribe to shared document changes
  storage.subscribe('shared-doc', (event) => {
    console.log('Document updated:', event.value);
    updateUI(event.value);
  });
  
  // Update document - changes sync to all users
  await storage.set('shared-doc', {
    content: 'Updated content',
    lastEditedBy: currentUser.id,
    timestamp: Date.now()
  }, { storage: 'realtime' });
}

// Example: React app with optional Firebase
import { useEffect, useState } from 'react';

function useCloudStorage(key, options = {}) {
  const [value, setValue] = useState(null);
  const [synced, setSynced] = useState(false);
  
  useEffect(() => {
    // Load local value immediately
    storage.get(key).then(setValue);
    
    // Try to enable cloud sync
    enableFirebaseSync(storage, options.firebaseConfig)
      .then(() => {
        setSynced(true);
        // Re-fetch from cloud storage
        return storage.get(key, { storage: 'firestore' });
      })
      .then(cloudValue => {
        if (cloudValue) setValue(cloudValue);
      })
      .catch(() => {
        console.log('Using local storage only');
      });
    
    // Subscribe to changes
    const unsubscribe = storage.subscribe(key, (event) => {
      setValue(event.value);
    });
    
    return unsubscribe;
  }, [key]);
  
  const updateValue = async (newValue) => {
    // Save locally first
    await storage.set(key, newValue);
    
    // Try to sync to cloud
    if (synced) {
      try {
        await storage.set(key, newValue, { storage: 'firestore' });
      } catch (error) {
        console.warn('Cloud sync failed, saved locally');
      }
    }
  };
  
  return [value, updateValue, synced];
}

// Usage in component
function Profile() {
  const [profile, setProfile, synced] = useCloudStorage('userProfile', {
    firebaseConfig: { /* your config */ }
  });
  
  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>Status: {synced ? '☁️ Synced' : '💾 Local only'}</p>
      <button onClick={() => setProfile({ ...profile, name: 'New Name' })}>
        Update Profile
      </button>
    </div>
  );
}