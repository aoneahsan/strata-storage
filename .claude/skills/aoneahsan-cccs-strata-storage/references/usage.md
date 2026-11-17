# strata-storage usage patterns

> The package's root `AI-INTEGRATION-GUIDE.md` and `stratastorage.aoneahsan.com` carry the current-version
> API in full — prefer them for signatures; this file carries the owner's usage rules and the proven shapes.

## Entry points

<!-- moved verbatim from SKILL.md on 2026-09-02 for the 1,100-word body cap; not reworded -->

| Import | For |
|---|---|
| `strata-storage` | core + web adapters: `memory` `localStorage` `sessionStorage` `indexedDB` `cookies` `cache` `url` |
| `strata-storage/capacitor` | native: `preferences` `secure` (Keychain/Keystore) `sqlite` `filesystem` |
| `strata-storage/react` · `/vue` · `/angular` | `createStrataHooks` + `<StrataProvider>` · composables · `provideStrata` |
| `strata-storage/firebase` | `enableFirebaseSync` — cross-device Firestore/Realtime sync |

## Instances

```ts
// storage.ts — create ONCE, import anywhere (provider-free)
import { defineStorage } from 'strata-storage';

export const storage = defineStorage({
  namespace: 'myapp',                      // 🔴 the only consistently proven isolation control
  adapters: {
    localStorage:   {},
    sessionStorage: {},
    indexedDB:      { dbName: 'myapp' },
  },
  defaultStorages: ['localStorage', 'indexedDB', 'memory'],   // preference order for this instance
});

// use
await storage.set('user', { id: 1, name: 'John' });
const user = await storage.get<{ id: number; name: string }>('user');
await storage.remove('user');
```

Both top-level and per-adapter `prefix` forms are unsafe guidance: the former is invalid and the latter has
produced conflicting 2.8.5 measurements. Use `namespace`, then verify a physical key. `dbName` still scopes
IndexedDB. `defaultStorages` is preference order for async operations, not a guaranteed sync fallback.

**One instance per app.** Same-tab change events come from each adapter object's own emitter, so two
`defineStorage()` calls in one tab never observe each other's writes.

Per-call backend + feature overrides:

```ts
await storage.set('draft', doc, { storage: 'indexedDB', ttl: 86_400_000 });
await storage.set('token', value, { storage: 'secure' });                    // native Keychain/Keystore
await storage.set('big', blob, { compress: true });
await storage.set('note', text, { encrypt: true, password });               // opt-in, never implicit
```

## The synchronous API

`getSync` · `setSync` · `removeSync` · `hasSync` · `keysSync` · `clearSync`. Sync-capable adapters only:
`memory`, `localStorage`, `sessionStorage`, `cookies`, `url`.

```ts
storage.setSync('lastTab', 'inbox');
const tab = storage.getSync<string>('lastTab');
```

- Async-only backends (`indexedDB`, `cache`, `sqlite`, `filesystem`, `secure`, `preferences`) throw a
  `StorageError` naming the adapter — the failure is loud, never a silent wrong read.
- `getSync` also throws on an encrypted or compressed value; `setSync` refuses `encrypt`/`compress` (both
  are inherently async). Use the async API for those.
- The sync path falls back to the adapter registry, so it works before `initialize()` has completed.

This is what answers "but this call site cannot be async" — reach for it instead of dropping to a raw
web storage API.

## Query, tags, subscribe

```ts
await storage.set('task:1', { status: 'open', score: 12 }, { tags: ['tasks'] });

// query matches the stored value's OWN fields only
const rows = await storage.query<{ status: string; score: number }>({
  status: 'open',
  score: { $gte: 10 },
});                                             // => Array<{ key: string; value: T }>
await storage.query({ status: 'open' }, { sort: { score: -1 }, limit: 20 });
```

🔴 **`key`, `tags`, `created`, `updated`, `expires` and `metadata` are NOT queryable through `query()`** —
they are wrapper fields and a filter on them returns nothing. Filter by tag with `clear({ tags })`, or keep
a queryable copy of the discriminator inside the value.

```ts
const unsub = storage.subscribe((change) => { /* change.key, .newValue, .source */ }, {
  storage: 'localStorage',
});
unsub();                                        // subscribe() returns its own unsubscribe — always call it
```

- **Cross-tab works for `localStorage` with no extra config**: the adapter attaches a `window` `storage`
  listener and delivers `source: 'remote'`.
- 🔴 **Always scope `subscribe()` to a backend that supports it.** The unscoped form fans out to default
  adapters such as IndexedDB and throws `NotSupportedError` before the app can boot (ISSUE-07).
- `sync: { enabled: true }` is only needed to propagate the **non-localStorage** backends
  (`memory`, `indexedDB`, `cache`) across tabs, via `BroadcastChannel`.
- The exported `StorageObserver` class in `features/observer` is **not** wired into the `subscribe()` path.
  Do not build on it.

## React

```ts
import { createStrataHooks } from 'strata-storage/react';
export const { useStorage, useStorageValue } = createStrataHooks(storage);   // provider-free

// or the provider style if the project prefers it:
// <StrataProvider storage={storage}>…</StrataProvider>
```

Zustand persistence: implement the persist middleware's storage adapter over a strata instance — the
`strataAdapter` in `aoneahsan-cccs-react-state-zustand`, its patterns reference.

## Capacitor native

```ts
import { PreferencesAdapter, SecureAdapter, SqliteAdapter, FilesystemAdapter } from 'strata-storage/capacitor';
```

- `cap sync` after install (native plugin). Verify each native adapter **on a device/emulator** — web
  fallbacks can mask a broken native path.
- `sqlite` isolates by `(database, table)` — one database per domain area, not one global bag.
- `secure` = Keychain (iOS) / Keystore (Android): the only place for tokens or anything sensitive. Web has
  no secure equivalent — do not store secrets in web storage at all.

## Firebase cross-device sync

```ts
import { enableFirebaseSync, isFirebaseAvailable } from 'strata-storage/firebase';
// firebase is an optional peer; gate on isFirebaseAvailable() so absence degrades silently
```

Respect the data-fetch budget (`aoneahsan-cccs-react-api-tanstack-query`) — synced collections are still
Firestore reads.

## Migration from raw storage

`features/migration` supports versioned migrations. When replacing hand-rolled `localStorage` code, migrate
the existing keys INTO the prefixed namespace in one pass (read old key → set via strata → remove old), so
users don't lose state; never leave both paths live.

## Verification checklist

- [ ] Project `namespace` set; one physical key proves `<namespace>:<key>`; `keys()` is scoped as expected.
- [ ] Every subscription names a supported `storage` backend and its unsubscribe is called.
- [ ] No `Failed to get key … is not valid JSON` console noise (the foreign-key signature).
- [ ] `grep -rnE "\b(localStorage|sessionStorage|indexedDB|document\.cookie|caches)\b" src/` returns only
      the storage module and the documented pre-paint theme script.
- [ ] Values survive reload; TTL entries expire; native adapters proven on-device.
- [ ] No secrets in web storage; native secrets in `secure` only.
- [ ] Any package bug → strata repo `docs/REPORTED-ISSUES.md` (full root cause, repro, version) + note in the
      consuming project.

## Moved out of SKILL.md on 2026-10-01 for the 1,100-word body cap

Not new law — the full text of the blocks the skill body now summarises and points at.

### Which skills defer to this one

**`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, the Cache API and URL-persisted state all
go through strata-storage.** It covers every one of them behind one API, and on native the same call wraps
Preferences / Keychain / Keystore — so one line is correct on web and mobile. Fleet-wide: the storage
sentence in `aoneahsan-cccs-react-state-zustand`, `-react-theming`, `-react-api-tanstack-query`,
`-react-performance`, `-offline-sync`, `-url-state-persistence` and `-click-dummy` resolves here.

### Migrating raw-written data — the worked adapter

🔴 **Migrating data a raw `setItem` or a pre-strata zustand store wrote is NOT an exception** — since
`3.1.0`, `storage.importRawSync(rawKey, key, { storage: 'localStorage' })` adopts that ONE named key (moved,
original deleted; an existing strata value wins). Reference: ztools `src/services/storage/strata.ts`
(`localStateStorage`, a sync zustand adapter that imports on first read). 3.0.x also left `sessionStorage`
unprefixed (ISSUE-13) — require **>= 3.1.0**.

### Setup — provider-free, in full

**Provider-free:** `defineStorage()` returns a ready instance you create once and import anywhere — no React
context, Vue plugin or Angular module required. Importing does no I/O and every operation awaits readiness
internally, so `initialize()` is optional. A default singleton is exported too, but **prefer
`defineStorage`** — the singleton cannot carry the prefix config above.

## Reporting a package bug (moved from SKILL.md)

- A package bug found while integrating goes to the package repo's **`docs/REPORTED-ISSUES.md`** with full
  detail (`aoneahsan-cccs-report-project-issues`) — ISSUE-01 above is the model entry.
