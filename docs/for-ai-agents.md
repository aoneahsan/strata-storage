---
slug: /ai
sidebar_label: For AI Agents
sidebar_position: 99
title: For AI Agents & LLMs
description: A single-page, machine-friendly map of strata-storage — entry points, every adapter and feature, framework bindings, and copy-paste integration recipes for AI coding agents.
keywords: [AI, LLM, agent, integration, strata-storage, machine-readable, recipes]
---

# For AI Agents & LLMs

This page is a dense, single-screen map of `strata-storage` for AI coding agents
(Claude Code, Cursor, Copilot, etc.). It exists so you can integrate the package
into **any** project by matching the host project's needs to the right adapters
and features — without reading the whole site.

> **Package:** `strata-storage` · current version **2.8.1** · MIT · **zero runtime dependencies**.
> Install: `npm i strata-storage` (or `yarn add strata-storage`). Node ≥ 24.13.

> Machine-readable companions: [`/llms.txt`](https://stratastorage-docs.aoneahsan.com/llms.txt)
> (index) and [`/llms-full.txt`](https://stratastorage-docs.aoneahsan.com/llms-full.txt)
> (the entire docs concatenated into one file for one-shot ingestion). A bundled
> [`AI-INTEGRATION-GUIDE.md`](https://www.npmjs.com/package/strata-storage) also
> ships inside the npm package.

## What it is

One unified **async + sync** key-value API over many backends — web
(localStorage, IndexedDB, cookies, Cache API, memory, URL), native mobile via
Capacitor (Preferences, Keychain/Keystore, SQLite, Filesystem), and optional
remote (Firebase). **Zero runtime dependencies**; framework/native/Firebase deps
are optional peer deps. Features (encryption, compression, TTL, queries, sync,
integrity/recovery) are opt-in and compose across any backend.

## Entry points (import map)

| Import | Provides |
|--------|----------|
| `strata-storage` | `Strata`, `defineStorage`, the default `storage`, all web adapters, `URLAdapter`, feature helpers. |
| `strata-storage/capacitor` | `PreferencesAdapter`, `SecureAdapter`, `SqliteAdapter`, `FilesystemAdapter`. |
| `strata-storage/firebase` | `enableFirebaseSync`, `isFirebaseAvailable`. |
| `strata-storage/react` | `createStrataHooks` (provider-free) + `<StrataProvider>`. |
| `strata-storage/vue` | `createStrataComposables` + `StrataPlugin`. |
| `strata-storage/angular` | `provideStrata` / `StrataService` (RxJS). |

## Adapters (pick by `{ storage: '...' }`)

| `storage` | Platform | Sync API? | Observable | Queryable | Use when |
|-----------|----------|-----------|------------|-----------|----------|
| `memory` | all | ✅ | ✅ | ✅ | tests, ephemeral cache |
| `localStorage` | web | ✅ | ✅ | ✅ | small persistent data |
| `sessionStorage` | web | ✅ | ✅ | ✅ | per-session data |
| `indexedDB` | web | ❌ | ❌ | ✅ | large / structured data |
| `cookies` | web | ✅ | ❌ | ✅ | small server-readable data |
| `cache` | web | ❌ | ❌ | ✅ | offline assets / big blobs |
| `url` | web | ✅ | ✅ | ✅ | shareable UI state in the URL |
| `preferences` | Capacitor | ❌ | ❌ | ✅ | simple native settings |
| `secure` | Capacitor | ❌ | ❌ | ✅ | secrets (Keychain/Keystore) |
| `sqlite` | Capacitor | ❌ | ❌ | ✅ | structured / multi-store (`database`+`table`) |
| `filesystem` | Capacitor | ❌ | ❌ | ✅ | document-shaped values |
| `firestore` | Firebase | ❌ | ✅ | ✅ | cross-device/user document sync |
| `realtime` | Firebase | ❌ | ✅ | ❌ | low-latency shared state |

Sync-API adapters support `getSync/setSync/...`; the rest are async-only. See the
[adapters reference](./api/adapters/README.md).

`defineStorage()` auto-registers the web adapters **except `url`** — call
`storage.registerAdapter(new URLAdapter())` (imported from `strata-storage`) before
using `{ storage: 'url' }`. Native adapters need `registerCapacitorAdapters()`;
`firestore`/`realtime` need `enableFirebaseSync()`.

## Features (opt-in, compose on any backend)

| Feature | Enable with |
|---------|-------------|
| Encryption | `encryption: { enabled, password, algorithm }` config, or per-op `{ encrypt: true, encryptionPassword }` |
| Compression | `{ compress: true }` (algorithm `'lz'`) |
| TTL / expiry | `{ ttl: ms }`; `getTTL`/`extendTTL`/`persist` |
| Query | `query(condition)` matches the stored value's own bare fields (MongoDB-style operators) |
| Tags | `{ tags: [...] }` group values; filter with `clear({ tags })` (tags are NOT queryable via `query()`) |
| Cross-tab sync | `sync: { enabled: true, storages: ['localStorage'] }` |
| Cross-device sync | `enableFirebaseSync(storage, config)` |
| Integrity / recovery | `{ integrity, durableWrites, mirror, autoBackup }`; `snapshot()`/`restore()` |
| Namespacing | `namespace` (config or per-op) isolates keys |

Encryption (2.7.0): `AES-GCM` (default, AEAD) or `AES-CBC` (authenticated via
Encrypt-then-MAC); PBKDF2 default 600,000 iterations. See the
[encryption API](./api/features/encryption.md).

## Framework bindings (provider-free)

```ts
// React
import { createStrataHooks } from 'strata-storage/react';
export const { useStorage } = createStrataHooks(defineStorage());

// Vue
import { createStrataComposables } from 'strata-storage/vue';
export const { useStorage } = createStrataComposables(defineStorage());

// Angular
import { provideStrata } from 'strata-storage/angular'; // providers: [provideStrata(defineStorage())]
```

## Recipes

**Web app, fast persistent store**
```ts
import { defineStorage } from 'strata-storage';
export const storage = defineStorage({ defaultStorages: ['indexedDB', 'localStorage'] });
await storage.set('cart', items);
```

**Secure value on mobile (Capacitor)**
```ts
import { defineStorage } from 'strata-storage';
import { SecureAdapter } from 'strata-storage/capacitor';
const storage = defineStorage();
storage.registerAdapter(new SecureAdapter());
await storage.set('token', jwt, { storage: 'secure' });
```

**Cross-device sync (Firebase)**
```ts
import { enableFirebaseSync } from 'strata-storage/firebase';
await enableFirebaseSync(storage, { apiKey, authDomain, projectId, appId, firestore: true });
await storage.set('profile', data, { storage: 'firestore' });
```

**Encrypted + expiring secret**
```ts
await storage.set('otp', code, { encrypt: true, encryptionPassword: pw, ttl: 300_000 });
```

**Query stored values** (condition matches the stored value's own bare fields)
```ts
const rows = await storage.query({ status: 'active', score: { $gte: 10 } });
// => Array<{ key: string; value: T }>
```

## Package & contact

- **Docs:** <https://stratastorage-docs.aoneahsan.com> · **Marketing site:** <https://stratastorage.aoneahsan.com> · **npm:** <https://www.npmjs.com/package/strata-storage>
- Developed with ❤️ by the **Strata Storage Team** — maintained by [Ahsan Mahmood](https://aoneahsan.com).
- Questions, issues, or integration help: **aoneahsan@gmail.com**.

> Caveats for agents: browser encryption needs a **secure context** (HTTPS/localhost)
> for `crypto.subtle`; `getSync`/`setSync` throw on async-only adapters and on
> encrypted/compressed values — use the async API there.

## Most-used API

`get<T>` · `set<T>` · `remove` · `has` · `keys` · `clear` · `query<T>` ·
`subscribe` · `getSync`/`setSync`/… · `snapshot`/`restore` ·
`getTTL`/`extendTTL`/`persist` · `cleanupExpired` · `registerAdapter`.
Full signatures: [Core API](./api/core/strata.md).

## See also

- [Installation](./installation.md) · [Quick Start](./quick-start.md) · [Configuration](./configuration.md)
- [Capacitor](./guides/platforms/capacitor.md) · [Firebase](./guides/platforms/firebase.md)
- [Changelog](./reference/changelog.md)
