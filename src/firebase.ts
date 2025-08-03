// Optional Firebase integration - only import this if you need Firebase sync
import type { Strata } from './core/Strata';

/**
 * Firebase sync configuration
 */
export interface FirebaseSyncConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  realtimeDatabase?: boolean;
  firestore?: boolean;
  collectionName?: string;
  syncInterval?: number;
}

/**
 * Enable Firebase sync for Strata Storage
 * This dynamically imports Firebase SDK only when needed
 */
export async function enableFirebaseSync(
  storage: Strata,
  config: FirebaseSyncConfig
): Promise<void> {
  // Dynamically import Firebase only when this function is called
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    
    // Initialize Firebase if not already initialized
    if (!getApps().length) {
      initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
    }

    if (config.firestore) {
      const { getFirestore, doc, setDoc, getDoc, deleteDoc } = await import('firebase/firestore');
      const db = getFirestore();
      const collectionName = config.collectionName || 'strata-storage';

      // Create custom adapter for Firestore
      const firestoreAdapter = {
        name: 'firestore' as const,
        capabilities: {
          persistent: true,
          synchronous: false,
          observable: true,
          transactional: false,
          queryable: true,
          maxSize: -1,
          binary: true,
          encrypted: false,
          crossTab: true,
        },
        async get(key: string) {
          const docRef = doc(db, collectionName, key);
          const docSnap = await getDoc(docRef);
          return docSnap.exists() ? docSnap.data() : null;
        },
        async set(key: string, value: unknown) {
          const docRef = doc(db, collectionName, key);
          await setDoc(docRef, { value, timestamp: Date.now() });
        },
        async remove(key: string) {
          const docRef = doc(db, collectionName, key);
          await deleteDoc(docRef);
        },
        async has(key: string) {
          const docRef = doc(db, collectionName, key);
          const docSnap = await getDoc(docRef);
          return docSnap.exists();
        },
        async clear() {
          // Firestore doesn't have a direct clear method
          console.warn('Clear operation not supported for Firestore adapter');
        },
        async keys() {
          // Would need to implement with queries
          return [];
        },
        async size() {
          return { total: 0, count: 0 };
        },
        async initialize() {
          // Already initialized
        },
        async isAvailable() {
          return true;
        },
      };

      // Register the Firestore adapter
      storage.registerAdapter(firestoreAdapter as any);
    }

    if (config.realtimeDatabase) {
      const { getDatabase, ref, set, get, remove } = await import('firebase/database');
      const db = getDatabase();

      // Create custom adapter for Realtime Database
      const realtimeAdapter = {
        name: 'realtime' as const,
        capabilities: {
          persistent: true,
          synchronous: false,
          observable: true,
          transactional: false,
          queryable: false,
          maxSize: -1,
          binary: false,
          encrypted: false,
          crossTab: true,
        },
        async get(key: string) {
          const snapshot = await get(ref(db, `strata-storage/${key}`));
          return snapshot.exists() ? snapshot.val() : null;
        },
        async set(key: string, value: unknown) {
          await set(ref(db, `strata-storage/${key}`), value);
        },
        async remove(key: string) {
          await remove(ref(db, `strata-storage/${key}`));
        },
        async has(key: string) {
          const snapshot = await get(ref(db, `strata-storage/${key}`));
          return snapshot.exists();
        },
        async clear() {
          await remove(ref(db, 'strata-storage'));
        },
        async keys() {
          const snapshot = await get(ref(db, 'strata-storage'));
          return snapshot.exists() ? Object.keys(snapshot.val()) : [];
        },
        async size() {
          const snapshot = await get(ref(db, 'strata-storage'));
          const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
          return { total: count * 100, count }; // Rough estimate
        },
        async initialize() {
          // Already initialized
        },
        async isAvailable() {
          return true;
        },
      };

      // Register the Realtime Database adapter
      storage.registerAdapter(realtimeAdapter as any);
    }

    console.log('Firebase sync enabled successfully');
  } catch (error) {
    throw new Error(`Failed to enable Firebase sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if Firebase is available in the environment
 */
export async function isFirebaseAvailable(): Promise<boolean> {
  try {
    await import('firebase/app');
    return true;
  } catch {
    return false;
  }
}