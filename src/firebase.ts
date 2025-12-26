// Optional Firebase integration - only import this if you need Firebase sync
import type { Strata } from './core/Strata';
import type { StorageAdapter, StorageChange, StorageType } from './types';
import { StorageError } from './utils/errors';

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
  config: FirebaseSyncConfig,
): Promise<void> {
  // Dynamically import Firebase only when this function is called
  try {
    // @ts-expect-error - Firebase is an optional peer dependency
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
      const { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs, onSnapshot } =
        // @ts-expect-error - Firebase is an optional peer dependency
        await import('firebase/firestore');
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
          try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            const deletePromises = snapshot.docs.map((docSnapshot: unknown) =>
              deleteDoc(doc(db, collectionName, (docSnapshot as { id: string }).id)),
            );
            await Promise.all(deletePromises);
          } catch (error) {
            throw new StorageError('Failed to clear Firestore collection', {
              collectionName,
              originalError: error,
            });
          }
        },
        async keys() {
          try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            return snapshot.docs.map((docSnapshot: unknown) => (docSnapshot as { id: string }).id);
          } catch (error) {
            throw new StorageError('Failed to retrieve keys from Firestore', {
              collectionName,
              originalError: error,
            });
          }
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
        subscribe(callback: (change: StorageChange) => void) {
          const collectionRef = collection(db, collectionName);
          const unsubscribe = onSnapshot(collectionRef, (snapshot: unknown) => {
            (
              snapshot as {
                docChanges: () => Array<{
                  type: string;
                  doc: { id: string; data: () => unknown };
                }>;
              }
            )
              .docChanges()
              .forEach((change) => {
                const docData = change.doc.data() as { value?: unknown };
                callback({
                  key: change.doc.id,
                  oldValue: change.type === 'removed' ? docData.value : undefined,
                  newValue: change.type !== 'removed' ? docData.value : undefined,
                  source: 'remote',
                  storage: 'firestore' as unknown as StorageType,
                  timestamp: Date.now(),
                });
              });
          });
          return unsubscribe;
        },
        async close() {
          // No cleanup needed
        },
      };

      // Register the Firestore adapter
      // Cast to unknown first to bypass type checking for custom adapter
      storage.registerAdapter(firestoreAdapter as unknown as StorageAdapter);
    }

    if (config.realtimeDatabase) {
      // @ts-expect-error - Firebase is an optional peer dependency
      const { getDatabase, ref, set, get, remove, onValue } = await import('firebase/database');
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
        subscribe(callback: (change: StorageChange) => void) {
          const dbRef = ref(db, 'strata-storage');
          let previousData: Record<string, unknown> = {};

          const unsubscribe = onValue(dbRef, (snapshot: unknown) => {
            const snapshotTyped = snapshot as {
              exists: () => boolean;
              val: () => Record<string, unknown>;
            };
            const currentData = snapshotTyped.exists()
              ? (snapshotTyped.val() as Record<string, unknown>)
              : {};

            const allKeys = new Set([...Object.keys(previousData), ...Object.keys(currentData)]);

            allKeys.forEach((key) => {
              const oldValue = previousData[key];
              const newValue = currentData[key];

              if (oldValue !== newValue) {
                callback({
                  key,
                  oldValue,
                  newValue,
                  source: 'remote',
                  storage: 'realtime' as unknown as StorageType,
                  timestamp: Date.now(),
                });
              }
            });

            previousData = { ...currentData };
          });

          return unsubscribe;
        },
        async close() {
          // No cleanup needed
        },
      };

      // Register the Realtime Database adapter
      // Cast to unknown first to bypass type checking for custom adapter
      storage.registerAdapter(realtimeAdapter as unknown as StorageAdapter);
    }

    // Firebase sync enabled successfully
  } catch (error) {
    throw new StorageError('Failed to enable Firebase sync', {
      originalError: error,
      config,
    });
  }
}

/**
 * Check if Firebase is available in the environment
 */
export async function isFirebaseAvailable(): Promise<boolean> {
  try {
    // @ts-expect-error - Firebase is an optional peer dependency
    await import('firebase/app');
    return true;
  } catch {
    return false;
  }
}
