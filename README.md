# Strata Storage

> Zero-dependency universal storage for the web, iOS, and Android. One API for `localStorage`, IndexedDB, cookies, the URL, native Keychain/Keystore, SQLite, and more — with optional React, Vue, Angular, Capacitor, and Firebase surfaces.

- **[AI Integration Guide](./AI-INTEGRATION-GUIDE.md)** — quick reference for AI development agents (Claude Code, Cursor, Copilot).

[![npm version](https://img.shields.io/npm/v/strata-storage.svg)](https://www.npmjs.com/package/strata-storage)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20iOS%20%7C%20Android-lightgrey.svg)](https://stratastorage.aoneahsan.com)

- **Version:** `2.8.0`
- **License:** MIT
- **Node.js:** `>= 24.13.0`
- **Module format:** ESM only

## Why Strata Storage

Every product re-solves the same storage problem: pick a backend per platform, learn its quirks, wrap it for your framework, and bolt on encryption, expiry, and cross-tab sync by hand. Strata Storage replaces that with one adapter-based API that runs everywhere and keeps the runtime package free of dependencies.

- **Zero runtime dependencies.** The core is pure TypeScript. React, Vue, Angular, and `@capacitor/core` are optional peer dependencies — install only what you use.
- **One API, every backend.** `get`/`set`/`remove`/`query`/`subscribe` behave the same whether the value lives in `localStorage`, IndexedDB, the URL, or the iOS Keychain.
- **Provider-free.** `defineStorage()` returns a ready-to-use instance you create once and import anywhere — no React context, Vue plugin, or Angular module required (the Provider/Plugin/Module styles still work if you prefer them).
- **Opt-in power features.** Encryption, compression, TTL, queries, cross-tab sync, integrity checksums, durable writes, mirroring, and snapshots are all off by default and added per call or per instance.

## Installation

```bash
yarn add strata-storage
```

Framework adapters import from sub-paths; no extra install beyond the framework itself:

```bash
# React / Vue / Angular peers are optional — install the one you use
yarn add react        # for strata-storage/react
yarn add vue          # for strata-storage/vue
yarn add @angular/core @angular/forms   # for strata-storage/angular
yarn add @capacitor/core                # for strata-storage/capacitor
```

## Quick Start

The shortest path is the default `storage` instance. It registers the standard web adapters and initializes lazily on first use, so importing the package does no I/O.

```typescript
import { storage } from 'strata-storage';

// No setup, no Provider, no initialize() call — works immediately.
await storage.set('user', { id: 123, name: 'John Doe' });
const user = await storage.get<{ id: number; name: string }>('user');

await storage.remove('user');
await storage.clear();
```

Need your own configured instance? Use `defineStorage()` — it is the same factory the default instance is built from.

```typescript
import { defineStorage } from 'strata-storage';

export const storage = defineStorage({
  defaultStorages: ['indexedDB', 'localStorage'],
  encryption: { enabled: true, password: process.env.STORAGE_KEY! },
});

await storage.set('token', '...', { encrypt: true });
```

`defineStorage()` registers memory, `localStorage`, `sessionStorage`, IndexedDB, cookies, and the Cache API. Add the URL adapter or native adapters yourself when you need them (see below).

## Provider-Free Usage

The recommended pattern across all frameworks: create one instance and bind to it. No Provider, plugin, or module is required. The Provider-based styles remain available and are documented in the [examples](https://stratastorage-docs.aoneahsan.com/examples).

### Vanilla JavaScript / TypeScript

```typescript
import { defineStorage } from 'strata-storage';

export const storage = defineStorage();

await storage.set('theme', 'dark');
const theme = await storage.get<string>('theme');
```

### React

Bind the hooks to an instance once at module scope with `createStrataHooks`, then use them in any component — no `<StrataProvider>` needed.

```tsx
// storage.ts
import { defineStorage } from 'strata-storage';
import { createStrataHooks } from 'strata-storage/react';

export const storage = defineStorage();
export const { useStorage, useStorageQuery, useStorageTTL } = createStrataHooks(storage);
```

```tsx
// Settings.tsx
import { useStorage } from './storage';

function Settings() {
  // [value, setValue, loading]
  const [theme, setTheme, loading] = useStorage<string>('theme', 'light');

  if (loading) return <p>Loading…</p>;

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Theme: {theme}
    </button>
  );
}
```

Prefer context? `<StrataProvider>` still works and now accepts an `instance` prop so it can wrap an instance you created yourself:

```tsx
import { StrataProvider, useStorage } from 'strata-storage/react';
import { storage } from './storage';

<StrataProvider instance={storage}>
  <App />
</StrataProvider>;
```

### Vue

`createStrataComposables` binds the composables to an instance. Each built-in composable also accepts an optional instance as its last argument, and the classic `StrataPlugin` still works.

```typescript
// storage.ts
import { defineStorage } from 'strata-storage';
import { createStrataComposables } from 'strata-storage/vue';

export const storage = defineStorage();
export const { useStorage, useStorageQuery, useStorageTTL } = createStrataComposables(storage);
```

```vue
<script setup lang="ts">
import { useStorage } from './storage';

const { value: theme, update } = useStorage<string>('theme', 'light');
</script>

<template>
  <button @click="update(theme === 'light' ? 'dark' : 'light')">Theme: {{ theme }}</button>
</template>
```

### Angular

`provideStrata` accepts either a pre-created instance or a config object, and registers `StrataService` for injection. It works in `bootstrapApplication` (standalone) or a component's `providers`. The `STRATA_INSTANCE` token holds the instance; `StrataModule.forRoot(config)` remains for NgModule apps.

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { defineStorage } from 'strata-storage';
import { provideStrata } from 'strata-storage/angular';
import { AppComponent } from './app/app.component';

const storage = defineStorage();

bootstrapApplication(AppComponent, {
  providers: [provideStrata(storage)], // or provideStrata({ defaultStorages: ['indexedDB'] })
});
```

```typescript
// any.component.ts
import { Component } from '@angular/core';
import { StrataService } from 'strata-storage/angular';

@Component({ /* ... */ })
export class AnyComponent {
  constructor(private storage: StrataService) {}

  save() {
    // StrataService methods return RxJS Observables
    this.storage.set('theme', 'dark').subscribe();
  }
}
```

## Synchronous API

For UI code that must read or write without `await` — initial render, event handlers, synchronous state hydration — Strata exposes a synchronous API alongside the async one:

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage();

storage.setSync('lastTab', 'inbox');
const tab = storage.getSync<string>('lastTab'); // 'inbox'
storage.hasSync('lastTab');                      // true
storage.keysSync();                              // string[]
storage.removeSync('lastTab');
storage.clearSync();
```

### Limitations (read these)

The sync API only works on adapters that are genuinely synchronous: **`memory`, `localStorage`, `sessionStorage`, `cookies`, and `url`**. It does not paper over async backends, and it cannot do work that is inherently asynchronous:

- Targeting an async-only adapter (`indexedDB`, `cache`, `sqlite`, `filesystem`, `secure`, `preferences`) throws a `StorageError` telling you to use the async API.
- `setSync` with `{ encrypt: true }` or `{ compress: true }` throws — Web Crypto and compression are async, so use `await storage.set(...)`.
- `getSync` on a value that was stored encrypted or compressed throws — read it with `await storage.get(...)`.

TTL, tags, and metadata work with the sync API; encryption and compression do not.

```typescript
// Pick a sync-capable backend explicitly when needed:
storage.setSync('filters', { status: 'open' }, { storage: 'localStorage', ttl: 60_000 });
```

## URL Adapter

The `URLAdapter` (storage type `'url'`) persists state in the page URL so it survives reloads and round-trips through shareable/bookmarkable links — filters, the active tab, pagination, and other small UI state. It is inherently synchronous and emits change events on `popstate`/`hashchange`, so back/forward navigation and manual URL edits notify subscribers.

```typescript
import { defineStorage, URLAdapter } from 'strata-storage';

const storage = defineStorage();
storage.registerAdapter(new URLAdapter());

// Write to the URL (no await needed — URL access is synchronous)
storage.setSync('tab', 'pending', { storage: 'url' });
storage.setSync('page', 3, { storage: 'url' });

// Read it back (e.g. on reload)
const tab = storage.getSync<string>('tab', { storage: 'url' });

// React to back/forward navigation or manual edits
storage.subscribe((change) => {
  if (change.key === 'tab') applyTab(change.newValue);
}, { storage: 'url' });
```

### Configuration

Pass `URLAdapterConfig` when constructing the adapter:

```typescript
new URLAdapter(); // defaults below
```

| Option | Type | Default | Meaning |
|--------|------|---------|---------|
| `mode` | `'query'` \| `'hash'` | `'query'` | Store params in the query string (`?strata.tab=...`) or the hash fragment (`#strata.tab=...`). |
| `prefix` | `string` | `'strata.'` | Prefix on every param name to avoid collisions with your own query params. |
| `history` | `'push'` \| `'replace'` | `'replace'` | Whether each write adds a browser history entry or replaces the current one. |
| `maxLength` | `number` | `2000` | Soft warning threshold (chars) for total URL length. |

The adapter is configured through `StrataConfig.adapters.url` when you let Strata manage it:

```typescript
const storage = defineStorage({ adapters: { url: { mode: 'hash', history: 'push' } } });
storage.registerAdapter(new URLAdapter());
```

### Limitations (read these)

- **Length limits.** URLs have practical limits (~2000 chars in some browsers and servers). This adapter is for small, simple, serializable state — not bulk data. Writes past `maxLength` are allowed but logged as a warning.
- **Server visibility.** In `'query'` mode the data is sent to the server on every navigation and appears in server/proxy logs. Use `'hash'` mode to keep it client-only (the fragment is never sent to the server).
- **Browser only.** Outside a browser (SSR/Node) the adapter reports unavailable; `isAvailable()` returns `false`.
- **Not persistent.** State lives only as long as the URL does — it is not durable storage.

## Disaster Recovery

Strata includes opt-in recovery features for data you cannot afford to silently lose. **Everything here is off by default** — enable only what you need, since each adds overhead.

### Integrity checksums

Set `integrity: true` (or per call `{ verify: true }`) to compute and store an FNV-1a checksum with each value and verify it on read. On corruption, Strata first attempts mirror read-repair (below); otherwise it honors `{ ignoreCorruption: true }` (returns `null`) or throws a typed `IntegrityError`.

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage({ integrity: true });

await storage.set('config', settings);   // checksum stored
const config = await storage.get('config'); // verified; throws IntegrityError if corrupted
```

> **Honest note:** checksums are **FNV-1a, non-cryptographic**. They cheaply detect *accidental* corruption (truncated writes, bit flips, partial storage). They do **not** resist tampering — for tamper resistance use the encryption feature.

### Durable writes

`durableWrites: true` (or per call `{ durable: true }`) reads each value back after writing and retries on mismatch, throwing `StorageError` if it cannot confirm the write after a few attempts. This adds one read per write.

```typescript
const storage = defineStorage({ durableWrites: true });
await storage.set('order', order); // confirmed written, or throws
```

### Mirroring (read-repair)

`mirror: [...]` copies every write/remove to backup storage types. On a primary read miss or corruption, Strata recovers the value from a mirror and repairs the primary in place.

```typescript
const storage = defineStorage({
  defaultStorages: ['localStorage'],
  integrity: true,
  mirror: ['indexedDB'], // localStorage is primary; indexedDB backs it up
});
```

### Snapshots and scheduled backups

`snapshot()` produces a portable, integrity-verified backup string (embedding a checksum manifest); `restore()` validates that checksum and throws `IntegrityError` on a corrupted backup. `autoBackup` schedules periodic snapshots to a durable adapter.

```typescript
const backup = await storage.snapshot();      // store/download this string
await storage.restore(backup);                 // validates, then restores

// Scheduled, every 5 minutes, into indexedDB
const storage = defineStorage({
  autoBackup: { interval: 5 * 60_000, storage: 'indexedDB' },
});
```

Integrity helpers and error classes are exported for direct use:

```typescript
import { computeChecksum, verifyChecksum, IntegrityError } from 'strata-storage';
```

## Advanced Features

### Encryption (async only)

```typescript
const storage = defineStorage({ encryption: { enabled: true, password: 'secret' } });
await storage.set('secret', { token: 'abc' });        // encrypted with AES-GCM
await storage.set('one-off', data, { encrypt: true }); // per-call override
```

### TTL / expiration

```typescript
await storage.set('session', data, { ttl: 3_600_000 });          // expires in 1 hour
await storage.set('cache', data, { ttl: 600_000, sliding: true }); // reset on access
const ms = await storage.getTTL('session');
await storage.persist('session');                                  // remove expiry
```

### Compression (async only)

```typescript
const storage = defineStorage({ compression: { enabled: true, threshold: 1024 } });
await storage.set('largePayload', bigObject); // compressed above 1KB
```

### Cross-tab sync

```typescript
const storage = defineStorage({ sync: { enabled: true } });
storage.subscribe((change) => {
  console.log(`${change.key} changed`, change.newValue);
});
```

### Queries

```typescript
await storage.set('user:1', user, { tags: ['users', 'active'] });
const active = await storage.query({
  tags: { $in: ['active'] },
  'value.age': { $gte: 18 },
});
```

## Platform Support

### Web (works in any JS environment)

| Adapter | Backend | Use case |
|---------|---------|----------|
| `memory` | In-memory `Map` | Always-available fallback, tests |
| `localStorage` | `window.localStorage` | Persistent key-value (~5 MB) |
| `sessionStorage` | `window.sessionStorage` | Session-scoped data |
| `indexedDB` | IndexedDB | Large structured data |
| `cookies` | `document.cookie` | Small, server-accessible data |
| `cache` | Cache API | Service-worker / HTTP cache |
| `url` | `location` query/hash | Shareable UI state (see above) |

### iOS and Android (via Capacitor)

Register the native adapters you need when running under Capacitor. All four are zero-runtime-dependency: SQLite is hand-rolled (no plugin dependency) and filesystem uses the platform's native `FileManager` / `java.io.File`.

```typescript
import { defineStorage } from 'strata-storage';
import {
  PreferencesAdapter,
  SecureAdapter,
  SqliteAdapter,
  FilesystemAdapter,
} from 'strata-storage/capacitor';

const storage = defineStorage();
storage.registerAdapter(new PreferencesAdapter());   // UserDefaults / SharedPreferences
storage.registerAdapter(new SecureAdapter()); // Keychain / EncryptedSharedPreferences
storage.registerAdapter(new SqliteAdapter());        // native SQLite
storage.registerAdapter(new FilesystemAdapter());    // native files

await storage.set('secret', token, { storage: 'secure' });
```

| Adapter | iOS backend | Android backend |
|---------|-------------|-----------------|
| `preferences` | UserDefaults | SharedPreferences |
| `secure` | Keychain | EncryptedSharedPreferences |
| `sqlite` | SQLite (multi-store) | SQLite (multi-store) |
| `filesystem` | FileManager | java.io.File |

**SQLite multi-store** (2.6.0+): each `SqliteAdapter` instance binds to a `(database, table)` pair, so distinct logical stores map to distinct physical SQLite files / tables and cannot collide.

```typescript
import { SqliteAdapter } from 'strata-storage/capacitor';

const analytics = defineStorage();
analytics.registerAdapter(new SqliteAdapter({ database: 'analytics', table: 'events' }));

const audit = defineStorage();
audit.registerAdapter(new SqliteAdapter({ database: 'audit', table: 'rows' }));
// → separate physical .db files; writes to `analytics` can never bleed into `audit`.
```

`await storage.size(true)` aggregates `{ total, count, byStorage, ... }`; native SQLite and filesystem additionally report a per-column byte breakdown (keys / values / metadata) when called on those adapters directly.

> **Honest note:** the native iOS/Android adapters depend on your downstream Capacitor project setup and platform configuration, and native behavior cannot be exercised in a web/Node environment. Follow the [device-verification guide](https://stratastorage-docs.aoneahsan.com/guides/platforms/device-verification) to verify on a real iOS and Android device after integrating.

### Firebase (optional cloud sync)

```typescript
import { defineStorage } from 'strata-storage';
import { enableFirebaseSync } from 'strata-storage/firebase';

const storage = defineStorage();
await enableFirebaseSync(storage, {
  apiKey: '…', authDomain: '…', projectId: '…', appId: '…',
  firestore: true,
});
// 'firestore' / 'realtime' are runtime adapter names (not in the StorageType
// union, so strict TS may need a cast on the options object).
await storage.set('data', value, { storage: 'firestore' });
```

## Storage Types

| Type | Platform | Synchronous | Encrypt/Compress | Notes |
|------|----------|-------------|-------------------|-------|
| `memory` | All | ✅ | async only | Always available |
| `localStorage` | Web | ✅ | async only | ~5 MB, persistent |
| `sessionStorage` | Web | ✅ | async only | Session-scoped |
| `indexedDB` | Web | ❌ | async only | Large structured data |
| `cookies` | Web | ✅ | async only | ~4 KB, server-readable |
| `cache` | Web | ❌ | async only | Cache API |
| `url` | Web | ✅ | async only | Shareable UI state, length-limited |
| `preferences` | Mobile | ❌ | async only | UserDefaults / SharedPreferences |
| `secure` | Mobile | ❌ | async only | Keychain / EncryptedSharedPreferences |
| `sqlite` | Mobile | ❌ | async only | Native SQLite — multi-store via `(database, table)` (2.6.0+) |
| `filesystem` | Mobile | ❌ | async only | Native files — file-per-key with atomic writes (2.6.0+) |

"async only" means encryption and compression require the `await storage.set(...)` path — the synchronous API cannot encrypt or compress.

## Requirements

- **Node.js:** `>= 24.13.0`
- **TypeScript:** strict mode supported (optional, recommended)
- **Capacitor:** `@capacitor/core >= 8.0.0` (for native platforms; optional peer dependency)

Optional peer dependencies (install only the ones you use): `react >= 19.2.3`, `vue >= 3.5.26`, `@angular/core` & `@angular/forms >= 21.0.6`.

## Documentation

📚 **Full documentation: [stratastorage-docs.aoneahsan.com](https://stratastorage-docs.aoneahsan.com)**
🤖 **For AI agents: [stratastorage-docs.aoneahsan.com/ai](https://stratastorage-docs.aoneahsan.com/ai)** (plus [`/llms.txt`](https://stratastorage-docs.aoneahsan.com/llms.txt) and [`/llms-full.txt`](https://stratastorage-docs.aoneahsan.com/llms-full.txt))

### Getting Started
- [Installation](https://stratastorage-docs.aoneahsan.com/installation) · [Quick Start](https://stratastorage-docs.aoneahsan.com/quick-start) · [Configuration](https://stratastorage-docs.aoneahsan.com/configuration)

### API
- [API Reference](https://stratastorage-docs.aoneahsan.com/api) · [Core (`Strata`)](https://stratastorage-docs.aoneahsan.com/api/core/strata) · [Types](https://stratastorage-docs.aoneahsan.com/api/core/types) · [Errors](https://stratastorage-docs.aoneahsan.com/api/core/errors)
- [All adapters](https://stratastorage-docs.aoneahsan.com/api/adapters) — web (localStorage, IndexedDB, cookies, Cache, URL, …) + Capacitor (Preferences, Secure, SQLite, Filesystem) + remote (Firebase)

### Features
- [Encryption](https://stratastorage-docs.aoneahsan.com/guides/features/encryption) · [Compression](https://stratastorage-docs.aoneahsan.com/guides/features/compression) · [TTL](https://stratastorage-docs.aoneahsan.com/api/features/ttl) · [Sync](https://stratastorage-docs.aoneahsan.com/guides/features/sync) · [Queries](https://stratastorage-docs.aoneahsan.com/guides/features/queries) · [Migrations](https://stratastorage-docs.aoneahsan.com/guides/features/migrations) · [Recovery & Integrity](https://stratastorage-docs.aoneahsan.com/api/features/recovery)

### Platforms
- [Web](https://stratastorage-docs.aoneahsan.com/guides/platforms/web) · [iOS](https://stratastorage-docs.aoneahsan.com/guides/platforms/ios) · [Android](https://stratastorage-docs.aoneahsan.com/guides/platforms/android) · [Capacitor](https://stratastorage-docs.aoneahsan.com/guides/platforms/capacitor) · [Firebase](https://stratastorage-docs.aoneahsan.com/guides/platforms/firebase)

### Examples & Reference
- [Examples](https://stratastorage-docs.aoneahsan.com/examples) · [Changelog](https://stratastorage-docs.aoneahsan.com/reference/changelog) · [FAQ](https://stratastorage-docs.aoneahsan.com/reference/faq) · [Troubleshooting](https://stratastorage-docs.aoneahsan.com/reference/troubleshooting) · [Migration](https://stratastorage-docs.aoneahsan.com/migration)

## Contributing

Contributions are welcome — please read the [Contributing Guide](./.github/CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE). Free for commercial and non-commercial use, modification, distribution, and sublicensing; the only condition is keeping the copyright and license notice; provided without warranty.

## Author

**Ahsan Mahmood**
- Email: aoneahsan@gmail.com
- LinkedIn: [linkedin.com/in/aoneahsan](https://linkedin.com/in/aoneahsan)
- Portfolio: [aoneahsan.com](https://aoneahsan.com)
- GitHub: [@aoneahsan](https://github.com/aoneahsan)
- NPM: [npmjs.com/~aoneahsan](https://www.npmjs.com/~aoneahsan)
- Phone/WhatsApp: +923046619706

## Links

- **NPM Package:** https://www.npmjs.com/package/strata-storage
- **Documentation:** https://stratastorage-docs.aoneahsan.com
- **Website:** https://stratastorage.aoneahsan.com

## Support

1. Check the [FAQ](https://stratastorage-docs.aoneahsan.com/reference/faq) and [Troubleshooting](https://stratastorage-docs.aoneahsan.com/reference/troubleshooting)
2. Browse the [documentation](https://stratastorage-docs.aoneahsan.com)
3. [Contact us / report an issue](https://stratastorage.aoneahsan.com/contact)

---

Developed with ❤️ by the **Strata Storage Team** — maintained by [Ahsan Mahmood](https://aoneahsan.com) · aoneahsan@gmail.com.

**One API. Every Storage. Everywhere.**

<!-- project-links:start -->
## Links

- Live: https://www.npmjs.com/package/strata-storage
- NPM: https://www.npmjs.com/package/strata-storage

_URL source of truth: `01-code/projects/project-live-urls.json` (auto-generated — do not hand-edit between these markers)._
<!-- project-links:end -->
