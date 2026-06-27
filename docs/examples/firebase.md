# Firebase Sync Examples

Copy-pasteable examples for syncing Strata Storage through **Firebase** (Cloud
Firestore or the Realtime Database). See the [Firebase guide](../guides/platforms/firebase.md)
for the full configuration reference.

> Install the optional peer dependency first: `npm install firebase`.

## Firestore: cross-device profile

```typescript
import { Strata } from 'strata-storage';
import { enableFirebaseSync } from 'strata-storage/firebase';

const storage = new Strata();
await storage.initialize();

await enableFirebaseSync(storage, {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-app',
  appId: 'YOUR_APP_ID',
  firestore: true,
});

// Write/read against Firestore
await storage.set('profile', { name: 'Ada', theme: 'dark' }, { storage: 'firestore' });
const profile = await storage.get('profile', { storage: 'firestore' });

// React to remote changes from other devices/users
const unsubscribe = storage.subscribe(
  (change) => {
    if (change.source === 'remote') {
      console.log('Remote update:', change.key, change.newValue);
    }
  },
  { storage: 'firestore' },
);

// later: unsubscribe();
```

## Realtime Database: shared counter

```typescript
import { Strata } from 'strata-storage';
import { enableFirebaseSync } from 'strata-storage/firebase';

const storage = new Strata();
await storage.initialize();

await enableFirebaseSync(storage, {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-app',
  appId: 'YOUR_APP_ID',
  realtimeDatabase: true,
});

await storage.set('counter', 0, { storage: 'realtime' });

storage.subscribe(
  (change) => console.log('counter is now', change.newValue),
  { storage: 'realtime' },
);
```

## Encrypt before it leaves the device

The Firebase adapters store values as-is (no client-side encryption). To keep
data confidential in Firebase, encrypt with the [encryption feature](../guides/features/encryption.md)
and write the result to the Firebase store:

```typescript
await storage.set('secret', sensitiveValue, {
  storage: 'firestore',
  encrypt: true,
  encryptionPassword: 'user-derived-password',
});
```

## Guarded enable

```typescript
import { enableFirebaseSync, isFirebaseAvailable } from 'strata-storage/firebase';

if (await isFirebaseAvailable()) {
  await enableFirebaseSync(storage, config);
} else {
  console.warn('Install the optional `firebase` dependency to enable cloud sync.');
}
```

## See also

- [Firebase guide](../guides/platforms/firebase.md)
- [Sync examples](./cross-tab-sync.md)
- [Encryption guide](../guides/features/encryption.md)
