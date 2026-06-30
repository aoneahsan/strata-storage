# AI Integration Guide - strata-storage

Quick reference for AI development agents (Claude Code, Cursor, Copilot, etc.) to integrate `strata-storage` into web and mobile projects. Current version: **2.8.1**.

## Installation

```bash
yarn add strata-storage
```

Zero runtime dependencies. React, Vue, Angular, and `@capacitor/core` are optional peer dependencies — install only what the project uses.

## Core Concepts

- **Zero dependencies** — pure TypeScript core.
- **Provider-free** — `defineStorage()` returns a ready-to-use instance; no React context / Vue plugin / Angular module required.
- **Lazy init** — importing the package does no I/O; instances initialize on first operation. You rarely call `initialize()`.
- **One API, many backends** — `storage` types: `memory`, `localStorage`, `sessionStorage`, `indexedDB`, `cookies`, `cache`, `url`, plus native `preferences`, `secure`, `sqlite`, `filesystem` (Capacitor).
- **Opt-in features** — encryption, compression, TTL, queries, cross-tab sync, integrity, durable writes, mirroring, snapshots. All off by default.

## Entry points (import map)

| Import | Use for |
|--------|---------|
| `strata-storage` | Core API + all web adapters (`memory`, `localStorage`, `sessionStorage`, `indexedDB`, `cookies`, `cache`, `url`). |
| `strata-storage/capacitor` | Native mobile adapters: `PreferencesAdapter`, `SecureAdapter`, `SqliteAdapter`, `FilesystemAdapter`. |
| `strata-storage/firebase` | `enableFirebaseSync`, `isFirebaseAvailable` — cross-device Firestore / Realtime DB sync. `firebase` is an optional peer dep. |
| `strata-storage/react` | `createStrataHooks` (provider-free) + `<StrataProvider>`. |
| `strata-storage/vue` | `createStrataComposables` + `StrataPlugin`. |
| `strata-storage/angular` | `provideStrata` / `StrataService` (RxJS). |

## Choosing a backend (decision guide)

Pick the `storage` per the host project's needs:

- **Web, small & persistent** → `localStorage` (sync-capable).
- **Web, large / structured / queryable** → `indexedDB`.
- **Web, offline assets / big blobs** → `cache`.
- **Shareable UI state in the URL** → `url`.
- **Server-readable small data** → `cookies`.
- **Temporary / tests** → `memory`.
- **Mobile (Capacitor), sensitive** → `secure` (Keychain/Keystore).
- **Mobile, structured / multi-store** → `sqlite` (isolated `(database, table)`).
- **Mobile, document-shaped values** → `filesystem`.
- **Mobile, simple settings** → `preferences`.
- **Cross-device / multi-user sync** → `firestore` or `realtime` (Firebase).

Layer features on top regardless of backend: `encrypt`, `compress`, `ttl`,
`tags`+`query`, cross-tab `sync`, `integrity`/`durable`/`mirror`.

## Quick Start

### Default instance (simplest)

```typescript
import { storage } from 'strata-storage';

await storage.set('user', { id: 1, name: 'John' });
const user = await storage.get<{ id: number; name: string }>('user');
await storage.remove('user');
await storage.clear();
```

### Your own configured instance

```typescript
import { defineStorage } from 'strata-storage';

export const storage = defineStorage({
  defaultStorages: ['indexedDB', 'localStorage'],
});
```

`defineStorage()` pre-registers memory, localStorage, sessionStorage, IndexedDB, cookies, and the Cache API. Use `new Strata(config)` + `registerWebAdapters(instance)` only when you need full control.

## Storage Options (per operation)

```typescript
await storage.set('key', value, {
  storage: 'indexedDB', // pick a specific backend (NOTE: option name is `storage`, not `adapter`)
  ttl: 3_600_000,       // expire in 1 hour (ms)
  encrypt: true,        // async only — requires encryption config + password
  compress: true,       // async only
  tags: ['user-data'],  // grouping; filter with clear({ tags })
  metadata: { version: 1 },
  verify: true,         // store + check an integrity checksum (2.5.0)
  durable: true,        // read back and verify the write (2.5.0)
});

const value = await storage.get('key', { storage: 'indexedDB' });
```

## Query data model

`query(condition, options?)` matches the condition against the **stored value's own
bare fields** (the decoded user value) using MongoDB-style operators
(`$eq $ne $gt $gte $lt $lte $in $nin $regex $exists $type $and $or $not`):

```typescript
// matches stored values whose own `status` === 'active' AND `score` >= 10
const rows = await storage.query<{ status: string; score: number }>({
  status: 'active',
  score: { $gte: 10 },
}); // => Array<{ key: string; value: T }>

// sort/skip/limit/select use bare value field names (no `value.` prefix)
await storage.query({ status: 'active' }, { sort: { score: -1 }, limit: 20 });
```

The wrapper fields `key`, `tags`, `created`, `updated`, `expires`, and `metadata`
are **NOT** queryable via `query()` — they return nothing. Filter by tag with
`clear({ tags })`, not `query()`.

## Synchronous API (2.5.0)

No `await`. Works only on sync-capable adapters: `memory`, `localStorage`, `sessionStorage`, `cookies`, `url`.

```typescript
storage.setSync('lastTab', 'inbox');
const tab = storage.getSync<string>('lastTab');
storage.hasSync('lastTab');
storage.keysSync();   // aggregates across sync-capable adapters
storage.removeSync('lastTab');
storage.clearSync();
```

Constraints: targeting an async-only adapter (indexedDB, cache, sqlite, filesystem, secure, preferences) throws; `setSync` with `encrypt`/`compress` throws; `getSync` on an encrypted/compressed value throws. Use the async API in those cases.

## URL Adapter (2.5.0)

Persist small UI state (tab, filters, pagination) in the URL — survives reload, shareable.

```typescript
import { defineStorage, URLAdapter } from 'strata-storage';

const storage = defineStorage();
storage.registerAdapter(new URLAdapter()); // config: { mode: 'query'|'hash', prefix, history, maxLength }

storage.setSync('tab', 'pending', { storage: 'url' });
const tab = storage.getSync<string>('tab', { storage: 'url' });

storage.subscribe((c) => { if (c.key === 'tab') applyTab(c.newValue); }, { storage: 'url' });
```

Limits: ~2 KB practical URL length; query mode is sent to the server (use `hash` for client-only); browser-only; not durable. Never put secrets in the URL.

## Disaster Recovery (2.5.0, opt-in)

```typescript
const storage = defineStorage({
  integrity: true,        // FNV-1a checksum per value, verified on read
  durableWrites: true,    // read back + retry each write
  mirror: ['indexedDB'],  // copy writes to backups; read-repair on corruption
  autoBackup: { interval: 300_000, storage: 'indexedDB' }, // scheduled snapshots
});

const backup = await storage.snapshot();  // checksum-verified backup string
await storage.restore(backup);            // throws IntegrityError if corrupted
```

```typescript
import { computeChecksum, verifyChecksum, IntegrityError } from 'strata-storage';
```

Honest note: checksums are **non-cryptographic (FNV-1a)** — they detect accidental corruption, not tampering. Use encryption for tamper resistance.

## Framework Integrations (provider-free, 2.5.0)

### React

```tsx
import { defineStorage } from 'strata-storage';
import { createStrataHooks } from 'strata-storage/react';

export const storage = defineStorage();
export const { useStorage, useStorageQuery, useStorageTTL } = createStrataHooks(storage);

// in a component: const [value, setValue, loading] = useStorage<string>('key', 'default');
```

`<StrataProvider instance={storage}>` (or `config={...}`) + the same hooks via context is still supported.

### Vue

```typescript
import { defineStorage } from 'strata-storage';
import { createStrataComposables } from 'strata-storage/vue';

export const storage = defineStorage();
export const { useStorage } = createStrataComposables(storage);

// in setup(): const { value, update, loading } = useStorage<string>('key', 'default');
```

`StrataPlugin` (via `app.use`) is still supported; composables accept an optional instance argument.

### Angular

```typescript
import { defineStorage } from 'strata-storage';
import { provideStrata } from 'strata-storage/angular';

const storage = defineStorage();
// bootstrapApplication(App, { providers: [provideStrata(storage)] });
// inject StrataService — methods return RxJS Observables: this.storage.get('key').subscribe(...)
```

`StrataModule.forRoot(config)` + `StrataService` is still supported. `STRATA_INSTANCE` token holds the instance.

### Capacitor (native)

`strata-storage` ships as a Capacitor plugin (native iOS + Android). In a Capacitor
app, after installing run **`npx cap sync`** so the native module is copied into the
iOS/Android projects — the native adapters (`secure`, `sqlite`, `preferences`,
`filesystem`) **do not work on-device without it**. No manual plugin registration in
JS is needed; Capacitor auto-discovers the `StrataStorage` plugin.

```typescript
import { defineStorage } from 'strata-storage';
import {
  registerCapacitorAdapters,
  PreferencesAdapter,
  SecureAdapter,
  SqliteAdapter,
  FilesystemAdapter,
} from 'strata-storage/capacitor';

const storage = defineStorage();

// Easiest — register all four native adapters at once (also refreshes the active set):
await registerCapacitorAdapters(storage);

// …or register individually for fine-grained control / custom adapter config:
// storage.registerAdapter(new SecureAdapter());
// storage.registerAdapter(new SqliteAdapter());     // 2.6.0 — multi-store (database + table)
// storage.registerAdapter(new FilesystemAdapter()); // 2.6.0 — file-per-key, atomic writes

await storage.set('secret', token, { storage: 'secure' });
```

**SQLite multi-store** (2.6.0): each `new SqliteAdapter({ database, table })` is an isolated store — distinct `(database, table)` pairs map to distinct physical `.db` files / tables natively and cannot collide. **Filesystem** (2.6.0): one JSON file per key under the app's documents/files directory; `isAvailable()` now returns `true` on iOS and Android.

Native adapters depend on the downstream Capacitor project setup; follow the [device-verification guide](https://stratastorage-docs.aoneahsan.com/guides/platforms/device-verification) to verify on a real iOS + Android device.

### Firebase cross-device sync (optional)

`firebase` is an optional peer dependency, loaded dynamically only when used.

```typescript
import { enableFirebaseSync, isFirebaseAvailable } from 'strata-storage/firebase';

await enableFirebaseSync(storage, {
  apiKey: '…', authDomain: '…', projectId: '…', appId: '…',
  firestore: true,          // registers the `firestore` adapter
  realtimeDatabase: true,   // registers the `realtime` adapter
  collectionName: 'strata-storage', // optional (default)
});

await storage.set('profile', data, { storage: 'firestore' });
storage.subscribe((c) => { if (c.source === 'remote') apply(c); }, { storage: 'firestore' });
```

`firestore` is observable + queryable; `realtime` is observable. **Neither is
encrypted at rest by Strata** — combine with `encrypt: true` and/or Firebase
Security Rules for confidentiality. `firestore.size()` returns `{ total: 0, count: 0 }`.
Note: `'firestore'`/`'realtime'` are runtime adapter names (not in the `StorageType`
union), so strict TS may need a cast on the per-call options object.

## Encryption & security (2.7.0)

```typescript
const storage = defineStorage({
  encryption: {
    enabled: true,
    password: 'user-derived-password',
    algorithm: 'AES-GCM',  // default; or 'AES-CBC' (authenticated via Encrypt-then-MAC)
    iterations: 600000,    // PBKDF2 default (OWASP); stored per-record, used on decrypt
  },
});
```

- **`AES-GCM`** (default) is AEAD. **`AES-CBC`** is authenticated with
  Encrypt-then-MAC (HMAC-SHA256 over `iv ‖ ciphertext`, verified before decrypt).
- **Breaking:** legacy AES-CBC ciphertexts written before authentication have no
  MAC and now fail closed with a "re-encrypt" error — re-encrypt them or use GCM.
  GCM data is unaffected.
- Encryption runs on the Web Crypto API on web, Capacitor webviews, and Node 20+ (SSR).

## Strata API (most-used methods)

| Method | Returns |
|--------|---------|
| `get<T>(key, options?)` | `Promise<T \| null>` |
| `set<T>(key, value, options?)` | `Promise<void>` |
| `remove(key, options?)` | `Promise<void>` |
| `has(key, options?)` | `Promise<boolean>` |
| `keys(pattern?, options?)` | `Promise<string[]>` |
| `clear(options?)` | `Promise<void>` |
| `query<T>(condition, options?)` | `Promise<Array<{ key, value }>>` |
| `subscribe(cb, options?)` | `UnsubscribeFunction` |
| `getSync`/`setSync`/`removeSync`/`hasSync`/`keysSync`/`clearSync` | sync equivalents (2.5.0) |
| `snapshot(options?)` / `restore(snapshot, options?)` | `Promise<string>` / `Promise<void>` (2.5.0) |
| `getTTL`/`extendTTL`/`persist` | TTL management |
| `registerAdapter(adapter)` | `void` |

## Notes for AI agents

- **Error handling** — every library error class (`QuotaExceededError`,
  `EncryptionError`, `ValidationError`, `NotFoundError`, `IntegrityError`, etc.)
  extends `StrataError`. Catch any of them with `catch (e) { if (e instanceof StrataError) … }`.
- **Server / SSR durability** — the default `storage` singleton uses web adapters and
  **falls back to non-persistent `memory` on Node/SSR** (no localStorage/IndexedDB there).
  For durable server storage register `sqlite`/`filesystem` or a custom adapter and
  target it with `{ storage: '…' }`.
- **Browser encryption** — `crypto.subtle` requires a **secure context**
  (HTTPS or `localhost`); encryption throws on insecure-origin pages. Node 20+ is fine.
- **Sync API limits** — `getSync`/`setSync`/… throw on async-only adapters
  (indexedDB, cache, sqlite, filesystem, secure, preferences); `setSync` throws if
  `encrypt`/`compress` is requested, and `getSync` throws on an encrypted/compressed
  stored value. Use the async API there.
- **`useStorage` value is `T | null`** — element `[0]` is `null` during initial load
  and when the key is absent with no default, *even when a defaultValue is passed*.
  Null-guard before use.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Framework import fails | Ensure `strata-storage >= 2.5.0` (earlier versions never shipped the built entry points). |
| TS can't find types for `strata-storage/react` \| `/vue` \| `/angular` \| `/capacitor` \| `/firebase` | Set `"moduleResolution": "bundler"` (or `"nodenext"`) in `tsconfig.json`. The package is ESM-only and exposes typed `exports` subpaths; classic `"node"` resolution can't see them. Modern Vite / Angular / Vue templates already use `bundler`/`nodenext`. |
| Native adapters do nothing on device | Run `npx cap sync` after install so the native iOS/Android module is wired in, then register the Capacitor adapters (`registerCapacitorAdapters(storage)`). |
| "does not support synchronous operations" | The targeted adapter is async-only; use the async API or a sync-capable adapter. |
| Sync set throws on encrypt/compress | Encryption/compression are async — use `await storage.set(...)`. |
| `useStrata must be used within <StrataProvider>` | Use `createStrataHooks(instance)` for provider-free code. |
| Native storage not working | Register Capacitor adapters explicitly; verify on a real device. |
| URL too long warning | URL adapter is for small state; move bulk data to indexedDB/localStorage. |

## Links

Full documentation lives at **https://stratastorage-docs.aoneahsan.com**:

- [Documentation home](https://stratastorage-docs.aoneahsan.com/)
- [For AI Agents (this guide, expanded)](https://stratastorage-docs.aoneahsan.com/ai)
- [Core API](https://stratastorage-docs.aoneahsan.com/api/core/strata)
- [Firebase sync](https://stratastorage-docs.aoneahsan.com/guides/platforms/firebase)
- [URL Adapter](https://stratastorage-docs.aoneahsan.com/api/adapters/web/url)
- [Recovery & Integrity](https://stratastorage-docs.aoneahsan.com/api/features/recovery)
- [Changelog](https://stratastorage-docs.aoneahsan.com/reference/changelog)
- Machine-readable: [`/llms.txt`](https://stratastorage-docs.aoneahsan.com/llms.txt) · [`/llms-full.txt`](https://stratastorage-docs.aoneahsan.com/llms-full.txt)

Project: [npm](https://www.npmjs.com/package/strata-storage) · [GitHub](https://github.com/aoneahsan/strata-storage) · [Report an issue](https://github.com/aoneahsan/strata-storage/issues)

---

Developed with ❤️ by the **Strata Storage Team** — maintained by [Ahsan Mahmood](https://aoneahsan.com). Questions or integration help: **aoneahsan@gmail.com**.
