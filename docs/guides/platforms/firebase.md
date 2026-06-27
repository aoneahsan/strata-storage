# Firebase Sync Guide

Sync Strata Storage across devices and users with **Firebase** — either **Cloud
Firestore** or the **Realtime Database**. Firebase is an **optional peer
dependency**: it is loaded dynamically only when you call `enableFirebaseSync`,
so it adds nothing to your bundle unless you use it. The core package keeps its
zero-runtime-dependency guarantee.

## Installation

```bash
# the package itself
npm install strata-storage

# Firebase is an OPTIONAL peer dependency — install it only if you use this feature
npm install firebase
```

Import the Firebase helpers from the dedicated entry point:

```typescript
import { enableFirebaseSync, isFirebaseAvailable } from 'strata-storage/firebase';
```

## Quick start (Firestore)

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
  firestore: true,            // register the Firestore adapter
  collectionName: 'strata-storage', // optional (this is the default)
});

// Use it like any other store — writes go to Firestore, and onSnapshot pushes
// remote changes back into your subscribers.
await storage.set('profile', { name: 'Ada' }, { storage: 'firestore' });
const profile = await storage.get('profile', { storage: 'firestore' });
```

## Quick start (Realtime Database)

```typescript
await enableFirebaseSync(storage, {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-app',
  appId: 'YOUR_APP_ID',
  realtimeDatabase: true, // register the Realtime Database adapter
});

await storage.set('counter', 1, { storage: 'realtime' });
```

You can enable **both** at once (`firestore: true, realtimeDatabase: true`) — each
registers its own adapter (`firestore` / `realtime`).

## Configuration — `FirebaseSyncConfig`

```typescript
interface FirebaseSyncConfig {
  apiKey: string;            // required — Firebase web API key
  authDomain: string;        // required
  projectId: string;         // required
  appId: string;             // required
  storageBucket?: string;
  messagingSenderId?: string;
  realtimeDatabase?: boolean; // register the Realtime Database adapter
  firestore?: boolean;        // register the Firestore adapter
  collectionName?: string;    // Firestore collection only (default: 'strata-storage'); the RTDB root is always 'strata-storage'
  syncInterval?: number;
}
```

`enableFirebaseSync` initializes the Firebase app if one is not already
initialized, then registers the requested adapter(s) on your `Strata` instance
via `registerAdapter`. Target them explicitly with `{ storage: 'firestore' }` or
`{ storage: 'realtime' }`, or add them to your `defaultStorages` order.

## How the adapters behave

| | `firestore` | `realtime` |
|---|---|---|
| Persistence | ✅ remote | ✅ remote |
| Observable (`subscribe`) | ✅ via `onSnapshot` | ✅ via `onValue` |
| Queryable | ✅ | ❌ |
| Storage layout | one document per key in `collectionName` | `strata-storage/<key>` |
| `size()` | returns `{ total: 0, count: 0 }` (not computed) | rough estimate |

Remote changes arrive through your `subscribe(...)` callback with
`source: 'remote'`, so you can distinguish them from local writes.

## Checking availability

```typescript
import { isFirebaseAvailable } from 'strata-storage/firebase';

if (await isFirebaseAvailable()) {
  await enableFirebaseSync(storage, config);
}
```

`isFirebaseAvailable()` resolves `true` only when the optional `firebase`
dependency can be imported.

## Caveats & best practices

- **These adapters are not encrypted at rest by Strata** (`encrypted: false`).
  Data is stored in Firebase as-is. If you need confidentiality, combine this
  with the [Encryption feature](../features/encryption.md) (encrypt values before
  they leave the device) and/or rely on Firebase Security Rules for access
  control.
- **Secure your Firebase project** with Auth + Security Rules — Strata does not
  manage authentication or authorization.
- `firestore.size()` is a stub (`{ total: 0, count: 0 }`); don't rely on it for
  quota math.
- Pricing/quotas are governed by Firebase, not Strata — design your read/write
  patterns accordingly.

## See also

- [Firebase examples](../../examples/firebase.md)
- [Sync feature](../features/sync.md)
- [Encryption guide](../features/encryption.md)
