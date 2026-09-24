<div align="center">

<img src="https://raw.githubusercontent.com/aoneahsan/strata-storage/main/assets/logo.svg" alt="Strata Storage logo" width="120" />

<h1>strata-storage</h1>

<p><strong>One storage API across web, iOS and Android — zero runtime dependencies.</strong></p>

[![npm version](https://img.shields.io/npm/v/strata-storage.svg)](https://www.npmjs.com/package/strata-storage)
[![downloads](https://img.shields.io/npm/dm/strata-storage.svg)](https://www.npmjs.com/package/strata-storage)
[![license](https://img.shields.io/npm/l/strata-storage.svg)](https://github.com/aoneahsan/strata-storage/blob/main/LICENSE)
[![types](https://img.shields.io/npm/types/strata-storage.svg)](https://www.npmjs.com/package/strata-storage)
[![bundle size](https://img.shields.io/bundlephobia/minzip/strata-storage.svg)](https://bundlephobia.com/package/strata-storage)
[![CI](https://github.com/aoneahsan/strata-storage/actions/workflows/ci.yml/badge.svg)](https://github.com/aoneahsan/strata-storage/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/strata-storage.svg)](https://nodejs.org)

[Docs](https://stratastorage-docs.aoneahsan.com) · [npm](https://www.npmjs.com/package/strata-storage) · [GitHub](https://github.com/aoneahsan/strata-storage) · [Changelog](https://github.com/aoneahsan/strata-storage/blob/main/CHANGELOG.md) · [AI Guide](https://github.com/aoneahsan/strata-storage/blob/main/AI-INTEGRATION-GUIDE.md) · [Support](https://github.com/aoneahsan/strata-storage/issues)

</div>

> [!IMPORTANT]
> In a Capacitor app, run **`npx cap sync`** after installing. Without it the native module is never
> copied into your iOS/Android projects and the native adapters — `secure`, `sqlite`, `preferences`,
> `filesystem` — fail silently on device while working fine in the browser.

Strata Storage gives you one `get`/`set`/`remove`/`query`/`subscribe` API over every storage backend a
cross-platform app touches: `localStorage`, `sessionStorage`, IndexedDB, cookies, the Cache API, the page
URL, and — through Capacitor — the iOS Keychain, Android EncryptedSharedPreferences, native SQLite and the
filesystem. The core is pure TypeScript with **no runtime dependencies**; React, Vue, Angular, Capacitor and
Firebase are optional peers you install only if you use them. Encryption, compression, TTL, cross-tab sync,
integrity checksums and mirrored backups are opt-in per call or per instance.

| | |
|---|---|
| **Version** | `3.1.0` |
| **License** | MIT |
| **Node** | `>=24.13.0` |
| **Platforms** | Web · iOS · Android (via Capacitor) |
| **Module format** | ESM only — no CommonJS build |
| **Install size** | 155 kB packed · 660 kB unpacked, of which 130 kB is iOS + Android native source |
| **Types** | Bundled `.d.ts` for every entry point |
| **Status** | Stable · actively maintained |

<a id="table-of-contents"></a>
## 🧭 Table of Contents&nbsp;[#](#table-of-contents)

- [💡 Why strata-storage](#why-strata-storage)
- [✨ Features](#features)
- [📱 Platform Support](#platform-support)
- [📋 Requirements](#requirements)
- [📦 Installation](#installation)
- [🚀 Quick Start](#quick-start)
- [🛠️ Usage](#usage)
- [⚙️ Configuration](#configuration)
- [🔧 API Reference](#api-reference)
- [🧩 Types](#types)
- [💻 Command Line](#command-line)
- [🧪 Examples](#examples)
- [🎛️ Advanced Features](#advanced-features)
- [🚑 Recovery & Troubleshooting](#recovery-troubleshooting)
- [🚧 Limitations](#limitations)
- [📚 Documentation](#documentation)
- [🔄 Changelog](#changelog)
- [🤝 Contributing](#contributing)
- [🗂️ Repository](#repository)
- [💬 Support](#support)
- [📄 License](#license)
- [👤 Author](#author)
- [🔗 Links](#links)
- [🏷️ Keywords](#keywords)

<a id="why-strata-storage"></a>
## 💡 Why strata-storage&nbsp;[#](#why-strata-storage)

Every cross-platform product re-solves the same problem: pick a storage backend per platform, learn each
one's quirks, wrap it for your framework, then bolt on encryption, expiry and cross-tab sync by hand. The
result is a per-platform layer nobody wants to own. Strata Storage replaces it with one adapter-based API
that behaves identically everywhere, and keeps the runtime package dependency-free so it adds nothing to
your dependency tree.

| | `strata-storage` | Rolling your own per platform |
|---|---|---|
| Backends | 11 adapters behind one API | one integration per backend, written twice |
| Runtime dependencies | none | whatever each wrapper pulls in |
| Framework binding | optional sub-path imports, no provider required | hand-written hooks per framework |
| Encryption · TTL · sync · queries | opt-in flags | built and maintained by you |
| Native iOS/Android | ships as a Capacitor plugin | a separate native module to maintain |
| Automated test suite | **none** — typecheck, lint and build are the gates | yours to write |

**Not the right tool when** — you only need `localStorage` in one web app (use it directly); you need a
CommonJS build or Node below 24.13 (this package is ESM-only); you need a server-side or multi-user
database (this is client-side key-value storage); or you need cryptographic tamper-proofing from the
integrity feature specifically — its checksums are non-cryptographic, so use the encryption feature instead.

<a id="features"></a>
## ✨ Features&nbsp;[#](#features)

- **One API, every backend** — the same calls whether the value lives in `localStorage`, IndexedDB, the URL
  or the iOS Keychain.
- **Zero runtime dependencies** — the core is pure TypeScript; every framework and platform binding is an
  optional peer.
- **Provider-free by default** — create one instance and import it anywhere. No React context, Vue plugin or
  Angular module is required, though all three styles are still supported.
- **Synchronous API alongside the async one** — for initial render and event handlers, on the backends that
  are genuinely synchronous.
- **Opt-in encryption and compression** — AES-GCM via Web Crypto, size-thresholded compression, both off by
  default.
- **TTL and expiry** — absolute or sliding, with expiry inspection and a cleanup sweep.
- **Queries and tags** — MongoDB-style conditions over stored values and their tags.
- **Cross-tab synchronisation** — subscribe to changes made in other tabs of the same origin.
- **Recovery features** — integrity checksums, durable writes, mirrored read-repair, portable snapshots and
  scheduled backups.
- **Native adapters with no plugin dependencies** — SQLite is hand-rolled and the filesystem adapter uses
  the platform's own `FileManager` / `java.io.File`.
- **Typed end to end** — bundled declarations for every entry point, including each framework sub-path.

<a id="platform-support"></a>
## 📱 Platform Support&nbsp;[#](#platform-support)

| Platform | Supported | Notes |
|---|---|---|
| Browsers | ✅ | All seven web adapters: `memory`, `localStorage`, `sessionStorage`, `indexedDB`, `cookies`, `cache`, `url`. |
| iOS | ✅ | Via Capacitor. Requires `npx cap sync`. Keychain, UserDefaults, SQLite, FileManager. |
| Android | ✅ | Via Capacitor. Requires `npx cap sync`. EncryptedSharedPreferences, SharedPreferences, SQLite, `java.io.File`. |
| Node / SSR | ⚠️ | Imports and runs, but only the `memory` adapter is available — there is no DOM storage. Browser-only adapters report `isAvailable() === false` instead of throwing. |
| Firebase | ✅ | Optional cloud sync through the `strata-storage/firebase` sub-path. |

<a id="requirements"></a>
## 📋 Requirements&nbsp;[#](#requirements)

| Requirement | Version | Why |
|---|---|---|
| Node | `>=24.13.0` | Matches `.nvmrc`; the package is ESM-only and relies on modern Node resolution. |
| TypeScript | `moduleResolution: "bundler"` or `"nodenext"` | Older `node`/`node10` resolution cannot see the typed sub-path exports. |
| `@capacitor/core` | `>=8.0.0` | Optional peer — only for the native iOS/Android adapters. |
| `react` | `>=19.2.3` | Optional peer — only for `strata-storage/react`. |
| `vue` | `>=3.5.26` | Optional peer — only for `strata-storage/vue`. |
| `@angular/core`, `@angular/forms` | `>=21.0.6` | Optional peers — only for `strata-storage/angular`. |
| `firebase` | `>=10.0.0` | Optional peer — only for `strata-storage/firebase`. |

<a id="installation"></a>
## 📦 Installation&nbsp;[#](#installation)

```bash
yarn add strata-storage
```

Nothing else is needed for web use. Install only the optional peer you actually import:

```bash
yarn add react                          # for strata-storage/react
yarn add vue                            # for strata-storage/vue
yarn add @angular/core @angular/forms   # for strata-storage/angular
yarn add @capacitor/core                # for strata-storage/capacitor
yarn add firebase                       # for strata-storage/firebase
```

**Capacitor apps must then sync the native module**, or the native adapters will not work on device:

```bash
npx cap sync
```

An optional interactive wizard can scaffold a configuration file for you — see
[Command Line](#command-line).

<a id="quick-start"></a>
## 🚀 Quick Start&nbsp;[#](#quick-start)

The default `storage` instance registers the standard web adapters and initialises lazily on first use, so
importing the package performs no I/O.

```typescript
import { storage } from 'strata-storage';

await storage.set('user', { id: 123, name: 'Ada Lovelace' });
const user = await storage.get<{ id: number; name: string }>('user');

await storage.remove('user');
```

<a id="usage"></a>
## 🛠️ Usage&nbsp;[#](#usage)

### Your own configured instance

`defineStorage()` is the same factory the default instance is built from. Create one at module scope and
import it anywhere — no provider needed.

```typescript
import { defineStorage } from 'strata-storage';

export const storage = defineStorage({
  defaultStorages: ['indexedDB', 'localStorage'],
  encryption: { enabled: true, password: process.env.STORAGE_KEY! },
});

await storage.set('token', '…', { encrypt: true });
```

It registers `memory`, `localStorage`, `sessionStorage`, `indexedDB`, `cookies` and `cache`. Register the
URL adapter and the native adapters yourself when you need them.

### React

Bind the hooks to an instance once, then use them in any component.

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
  const [theme, setTheme, loading] = useStorage<string>('theme', 'light');
  if (loading) return <p>Loading…</p>;
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Theme: {theme}</button>
  );
}
```

`<StrataProvider instance={storage}>` still works if you prefer context.

### Vue

```typescript
import { defineStorage } from 'strata-storage';
import { createStrataComposables } from 'strata-storage/vue';

export const storage = defineStorage();
export const { useStorage, useStorageQuery, useStorageTTL } = createStrataComposables(storage);
```

The classic `StrataPlugin` remains available, and each built-in composable also accepts an instance as its
last argument.

### Angular

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { defineStorage } from 'strata-storage';
import { provideStrata } from 'strata-storage/angular';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, { providers: [provideStrata(defineStorage())] });
```

`StrataService` is then injectable and returns RxJS Observables. `StrataModule.forRoot(config)` remains for
NgModule applications.

### Native adapters (iOS and Android)

```typescript
import { defineStorage } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

const storage = defineStorage();
await registerCapacitorAdapters(storage);

await storage.set('token', value, { storage: 'secure' }); // Keychain / EncryptedSharedPreferences
```

`PreferencesAdapter`, `SecureAdapter`, `SqliteAdapter` and `FilesystemAdapter` are also exported
individually when you need per-adapter configuration. Each `SqliteAdapter` binds to one `(database, table)`
pair, so separate logical stores map to separate physical files and cannot collide.

### The synchronous API

```typescript
storage.setSync('lastTab', 'inbox');
const tab = storage.getSync<string>('lastTab');
storage.removeSync('lastTab');
```

Available on `memory`, `localStorage`, `sessionStorage`, `cookies` and `url` only, and it cannot encrypt or
compress — see [Limitations](#limitations).

### The URL adapter

Persists small UI state in the page URL so it survives reloads and shareable links, and emits change events
on `popstate`/`hashchange`.

```typescript
import { defineStorage, URLAdapter } from 'strata-storage';

const storage = defineStorage();
storage.registerAdapter(new URLAdapter());

storage.setSync('tab', 'pending', { storage: 'url' });
const tab = storage.getSync<string>('tab', { storage: 'url' });
```

<a id="configuration"></a>
## ⚙️ Configuration&nbsp;[#](#configuration)

Passed to `defineStorage(config)` or `new Strata(config)`:

| Option | Type | Default | What it does |
|---|---|---|---|
| `defaultStorages` | `StorageType[]` | `['localStorage', 'indexedDB', 'sessionStorage', 'memory']` | Preference order for picking the default adapter, and the fallback order when one is unusable. 🔴 **Not a registration list** — operations with no explicit `storage` (`keys`, `clear`, `size`, `subscribe`) span every *registered* adapter. To leave one out entirely use `adapters: { <name>: false }`. |
| `keyPrefix` | `string \| false` | `'strata:'` | Key prefix for `localStorage`/`sessionStorage`. `false` restores pre-3.0 unprefixed keys — take it when anything outside this library reads a physical key directly. |
| `migrateLegacyKeys` | `boolean` | `true` | Adopt pre-3.0 unprefixed entries on read: never a bulk sweep, never a non-envelope, never overwriting an existing prefixed value. |
| `adapters` | `object` | `{}` | Per-adapter settings, or `false` to leave that adapter unregistered entirely. `localStorage`/`sessionStorage` take `{ prefix }`; `indexedDB` takes `{ dbName, version }`; `cookies` takes `{ secure, sameSite }`; `cache` takes `{ cacheName }`. Settings apply immediately, so they hold for `setSync`/`getSync` issued before `initialize()` resolves. |
| `encryption` | `{ enabled, password }` | disabled | AES-GCM encryption on every write. Async path only. |
| `compression` | `{ enabled, threshold }` | disabled | Compress values above `threshold` bytes. Async path only. |
| `sync` | `{ enabled }` | disabled | Cross-tab change notifications. |
| `integrity` | `boolean` | `false` | Store an FNV-1a checksum with each value and verify it on read. |
| `durableWrites` | `boolean` | `false` | Read each write back and retry on mismatch. Costs one extra read per write. |
| `mirror` | `StorageType[]` | `[]` | Copy every write to backup storages, and read-repair the primary from them. |
| `autoBackup` | `{ interval, storage }` | disabled | Take periodic snapshots into a durable adapter. |
| `debug` | `boolean` | `false` | Raise the internal log level from `warn` to `debug`. |

The `URLAdapter` takes its own options: `mode` (`'query'` \| `'hash'`, default `'query'`), `prefix`
(default `'strata.'`), `history` (`'push'` \| `'replace'`, default `'replace'`) and `maxLength` (default
`2000`).

Full reference: [Configuration](https://stratastorage-docs.aoneahsan.com/configuration).

<a id="api-reference"></a>
## 🔧 API Reference&nbsp;[#](#api-reference)

An index of the main surface. Full signatures and behaviour live on the docs site.

| Export | Signature | Docs |
|---|---|---|
| `storage` | the default `Strata` instance | [→](https://stratastorage-docs.aoneahsan.com/quick-start) |
| `defineStorage` | `(config?: StrataConfig) => Strata` | [→](https://stratastorage-docs.aoneahsan.com/configuration) |
| `Strata` | `new (config?: StrataConfig)` | [→](https://stratastorage-docs.aoneahsan.com/api/core/strata) |
| `.get` / `.set` | `get<T>(key, opts?) => Promise<T \| null>` · `set<T>(key, value, opts?) => Promise<void>` | [→](https://stratastorage-docs.aoneahsan.com/api/core/strata) |
| `.remove` / `.clear` / `.has` / `.keys` | `(key?, opts?) => Promise<…>` | [→](https://stratastorage-docs.aoneahsan.com/api/core/strata) |
| `.getSync` / `.setSync` / `.removeSync` / `.hasSync` / `.keysSync` / `.clearSync` | synchronous equivalents, sync-capable adapters only | [→](https://stratastorage-docs.aoneahsan.com/api/core/strata) |
| `.query` | `(condition, opts?) => Promise<Array<{ key, value }>>` | [→](https://stratastorage-docs.aoneahsan.com/guides/features/queries) |
| `.subscribe` | `(cb, opts?) => UnsubscribeFunction` | [→](https://stratastorage-docs.aoneahsan.com/guides/features/sync) |
| `.getTTL` / `.extendTTL` / `.persist` / `.getExpiring` / `.cleanupExpired` | TTL inspection and maintenance | [→](https://stratastorage-docs.aoneahsan.com/api/features/ttl) |
| `.snapshot` / `.restore` / `.export` / `.import` | portable backup and transfer | [→](https://stratastorage-docs.aoneahsan.com/api/features/recovery) |
| `.size` / `.getCapabilities` / `.getAvailableStorageTypes` | introspection | [→](https://stratastorage-docs.aoneahsan.com/api/core/strata) |
| `.registerAdapter` / `.refreshAdapters` / `.close` | lifecycle | [→](https://stratastorage-docs.aoneahsan.com/api/adapters) |
| `computeChecksum` / `verifyChecksum` | `(data) => string` · `(data, sum) => boolean` | [→](https://stratastorage-docs.aoneahsan.com/api/features/recovery) |
| `URLAdapter` and the six web adapters | `new (config?)` | [→](https://stratastorage-docs.aoneahsan.com/api/adapters) |
| `registerCapacitorAdapters` | `(strata) => Promise<void>` — `strata-storage/capacitor` | [→](https://stratastorage-docs.aoneahsan.com/guides/platforms/capacitor) |
| `enableFirebaseSync` | `(strata, config) => Promise<void>` — `strata-storage/firebase` | [→](https://stratastorage-docs.aoneahsan.com/guides/platforms/firebase) |
| Error classes | `StrataError`, `StorageError`, `IntegrityError`, `QuotaExceededError`, `EncryptionError`, `CompressionError`, `SerializationError`, `ValidationError`, `NotSupportedError`, `AdapterNotAvailableError` | [→](https://stratastorage-docs.aoneahsan.com/api/core/errors) |

<a id="types"></a>
## 🧩 Types&nbsp;[#](#types)

The types a consumer touches directly. Full definitions:
[Types](https://stratastorage-docs.aoneahsan.com/api/core/types).

```typescript
type StorageType =
  | 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cookies' | 'cache' | 'url'
  | 'preferences' | 'secure' | 'sqlite' | 'filesystem';

interface StorageOptions {
  storage?: StorageType;      // target a specific adapter
  ttl?: number;               // milliseconds
  sliding?: boolean;          // reset the TTL on each read
  tags?: string[];            // for query()
  encrypt?: boolean;          // per-call override (async only)
  compress?: boolean;         // per-call override (async only)
  verify?: boolean;           // integrity check on read
  durable?: boolean;          // read-back-and-retry on write
}

interface StrataConfig {
  defaultStorages?: StorageType[];
  adapters?: { /* per-adapter settings — see Configuration */ };
  encryption?: EncryptionConfig;
  compression?: CompressionConfig;
  sync?: SyncConfig;
  integrity?: boolean;
  durableWrites?: boolean;
  mirror?: StorageType[];
  autoBackup?: { interval: number; storage: StorageType };
  debug?: boolean;
}
```

<a id="command-line"></a>
## 💻 Command Line&nbsp;[#](#command-line)

```bash
npx strata-storage <command>
```

| Command | What it does |
|---|---|
| `configure` | Interactive wizard that writes a Strata configuration for your project. |
| `init` | Alias for `configure`. |
| `setup` | Alias for `configure`. |
| `--help` | Print usage. |

The CLI is optional — everything it produces can be written by hand.

<a id="examples"></a>
## 🧪 Examples&nbsp;[#](#examples)

| Goal | Example |
|---|---|
| See every core call in one file | [`docs/examples/basic-usage.ts`](https://github.com/aoneahsan/strata-storage/blob/main/docs/examples/basic-usage.ts) |
| Run a real app against a local build | [`example-apps/demo-app`](https://github.com/aoneahsan/strata-storage/tree/main/example-apps/demo-app) |
| Browse framework and feature recipes | [Examples on the docs site](https://stratastorage-docs.aoneahsan.com/examples) |

<a id="advanced-features"></a>
## 🎛️ Advanced Features&nbsp;[#](#advanced-features)

- **Encryption** — AES-GCM through Web Crypto, per instance or per call.
  [→](https://stratastorage-docs.aoneahsan.com/guides/features/encryption)
- **Compression** — applied above a byte threshold you set.
  [→](https://stratastorage-docs.aoneahsan.com/guides/features/compression)
- **TTL and expiry** — absolute or sliding, with a cleanup sweep.
  [→](https://stratastorage-docs.aoneahsan.com/api/features/ttl)
- **Queries** — MongoDB-style conditions over values and tags.
  [→](https://stratastorage-docs.aoneahsan.com/guides/features/queries)
- **Cross-tab sync** — change notifications across tabs of one origin.
  [→](https://stratastorage-docs.aoneahsan.com/guides/features/sync)
- **Integrity, durable writes, mirroring, snapshots** — the opt-in recovery set, all off by default.
  [→](https://stratastorage-docs.aoneahsan.com/api/features/recovery)
- **Migrations** — an experimental adapter-level utility for reshaping stored data.
  [→](https://stratastorage-docs.aoneahsan.com/guides/features/migrations)
- **Firebase sync** — mirror values to Firestore or the Realtime Database.
  [→](https://stratastorage-docs.aoneahsan.com/guides/platforms/firebase)

<a id="recovery-troubleshooting"></a>
## 🚑 Recovery & Troubleshooting&nbsp;[#](#recovery-troubleshooting)

| Symptom | Cause | Fix |
|---|---|---|
| Native adapters do nothing on device, but web works | The native module was never copied into the iOS/Android project | Run `npx cap sync`, then rebuild the app |
| `Cannot find module 'strata-storage/react'` or its types | TypeScript is on `moduleResolution: "node"`, which cannot read sub-path exports | Set `"moduleResolution": "bundler"` or `"nodenext"` in `tsconfig.json` |
| `StorageError` telling you to use the async API | A sync call targeted an async-only adapter (`indexedDB`, `cache`, `sqlite`, `filesystem`, `secure`, `preferences`) | Use `await storage.get/set(...)`, or pass `{ storage: 'localStorage' }` |
| `setSync` throws with `{ encrypt: true }` or `{ compress: true }` | Web Crypto and compression are asynchronous | Use `await storage.set(...)` for encrypted or compressed values |
| `getSync` throws on a value you stored earlier | The value was written encrypted or compressed | Read it with `await storage.get(...)` |
| `IntegrityError` on read | The stored value no longer matches its checksum | Configure `mirror` for read-repair, or pass `{ ignoreCorruption: true }` to get `null` instead |
| `No available storage adapters` | Every adapter in `defaultStorages` reported unavailable — common in Node and SSR | Include `'memory'` in `defaultStorages`, or guard the call behind a browser check |
| Console errors naming keys your app owns, not Strata's | Known open defect — see [Limitations](#limitations) | Set a prefix: `defineStorage({ adapters: { localStorage: { prefix: 'myapp:' } } })` |

More: [Troubleshooting](https://stratastorage-docs.aoneahsan.com/reference/troubleshooting) ·
[FAQ](https://stratastorage-docs.aoneahsan.com/reference/faq).

<a id="limitations"></a>
## 🚧 Limitations&nbsp;[#](#limitations)

- **ESM only.** There is no CommonJS build. `engines.node` is `>=24.13.0`, where Node can `require()` an ESM
  graph; on older Node a `require('strata-storage')` will fail.
- **No automated test suite.** This is a deliberate project decision — `yarn typecheck`, `yarn lint` and
  `yarn build` are the gates, in local development and in CI. There is no unit or integration coverage to
  point at.
- **Native behaviour cannot be verified from web or Node.** The iOS and Android adapters depend on your
  Capacitor project's own configuration, so verify them on a real device using the
  [device-verification guide](https://stratastorage-docs.aoneahsan.com/guides/platforms/device-verification).
- **Integrity checksums are not cryptographic.** They are FNV-1a: they cheaply catch accidental corruption
  such as truncated writes, and they do **not** resist deliberate tampering. Use encryption for that.
- **The synchronous API is genuinely limited.** It works only on `memory`, `localStorage`,
  `sessionStorage`, `cookies` and `url`, and it cannot encrypt or compress.
- **The URL adapter is not durable storage.** URLs have practical length limits around 2,000 characters,
  and in `'query'` mode the data is sent to the server and appears in its logs. Use `'hash'` mode to keep it
  client-side.
- **Node support is minimal.** Only the `memory` adapter is available outside a browser, so values do not
  persist across processes.
- **Web adapters share their storage area, and identify their own data by shape.** `localStorage`,
  `sessionStorage` and cookies are shared with every other script on the origin. An adapter treats a key
  as its own only when the stored value is a `StorageValue` envelope, so `keys()`, the TTL sweep and
  `clear()` never touch another application's data, and a value we cannot read is skipped at `debug`
  rather than reported as an error. **The consequence to know about:** a key written to the same area by
  something other than this library is invisible to `keys()` by design. Call `setLogLevel('debug')` to see
  what is being skipped and why.
- **Keys are prefixed `strata:` since 3.0.0, and that is a breaking change.** Existing data migrates
  itself on read, so most consumers do nothing. 🔴 **But if anything outside this library reads a physical
  key directly — a pre-paint theme script, a logger reading its own level — set
  `defineStorage({ keyPrefix: false })`.** Migration keeps the data reachable through this library; it
  cannot fix a hard-coded reader. See [Changelog](https://github.com/aoneahsan/strata-storage/blob/main/CHANGELOG.md).
- **Firebase adapter names are not in the `StorageType` union.** `'firestore'` and `'realtime'` are runtime
  names, so strict TypeScript may need a cast on the options object.

<a id="documentation"></a>
## 📚 Documentation&nbsp;[#](#documentation)

| Document | Read it when |
|---|---|
| [Installation](https://stratastorage-docs.aoneahsan.com/installation) | setting the package up for the first time |
| [Quick start](https://stratastorage-docs.aoneahsan.com/quick-start) | you want a working call in two minutes |
| [Configuration](https://stratastorage-docs.aoneahsan.com/configuration) | you need the full option set |
| [API reference](https://stratastorage-docs.aoneahsan.com/api) | you need an exact signature |
| [Adapters](https://stratastorage-docs.aoneahsan.com/api/adapters) | choosing a backend, or writing your own |
| [Platform guides](https://stratastorage-docs.aoneahsan.com/guides/platforms/capacitor) | wiring web, iOS, Android, Capacitor or Firebase |
| [Recovery and integrity](https://stratastorage-docs.aoneahsan.com/api/features/recovery) | the data must survive corruption |
| [Migration guide](https://stratastorage-docs.aoneahsan.com/migration) | upgrading from an earlier major |
| [Troubleshooting](https://stratastorage-docs.aoneahsan.com/reference/troubleshooting) · [FAQ](https://stratastorage-docs.aoneahsan.com/reference/faq) | something is not behaving |
| [AI integration guide](https://github.com/aoneahsan/strata-storage/blob/main/AI-INTEGRATION-GUIDE.md) | a coding agent is implementing against this package |
| [llms.txt](https://stratastorage-docs.aoneahsan.com/llms.txt) · [llms-full.txt](https://stratastorage-docs.aoneahsan.com/llms-full.txt) | you need the docs as machine-readable text |

<a id="changelog"></a>
## 🔄 Changelog&nbsp;[#](#changelog)

Latest release: **`2.8.5`** — documentation only: the at-a-glance table above reported the previous version, because it is a static duplicate of `package.json`. Full history in the changelog.

Full history: [CHANGELOG.md](https://github.com/aoneahsan/strata-storage/blob/main/CHANGELOG.md).

<a id="contributing"></a>
## 🤝 Contributing&nbsp;[#](#contributing)

Fork and open a pull request — see
[CONTRIBUTING.md](https://github.com/aoneahsan/strata-storage/blob/main/CONTRIBUTING.md) for setup,
standards, and how to
[request collaborator access](https://github.com/aoneahsan/strata-storage/blob/main/CONTRIBUTING.md#becoming-a-contributor).
`main` is protected: every change lands through a reviewed pull request.

<a id="repository"></a>
## 🗂️ Repository&nbsp;[#](#repository)

```text
src/            TypeScript source — core, adapters, features, framework integrations
dist/           build output (published)
ios/            native iOS plugin sources (published, for Capacitor)
android/        native Android plugin sources (published, for Capacitor)
scripts/        build script and the npx CLI (published)
docs/           internal project records — NOT the docs site
example-apps/   runnable demo application
```

The documentation site lives in its own repository:
[aoneahsan/strata-storage-docs](https://github.com/aoneahsan/strata-storage-docs).

<a id="support"></a>
## 💬 Support&nbsp;[#](#support)

Questions and bugs: [open an issue](https://github.com/aoneahsan/strata-storage/issues).

If this package saves you time, you can support its maintenance at
[aoneahsan.com/payment](https://aoneahsan.com/payment?project-id=strata-storage&project-identifier=strata-storage).

<a id="license"></a>
## 📄 License&nbsp;[#](#license)

MIT © Ahsan Mahmood — see
[LICENSE](https://github.com/aoneahsan/strata-storage/blob/main/LICENSE).

<a id="author"></a>
## 👤 Author&nbsp;[#](#author)

**Ahsan Mahmood** — [aoneahsan.com](https://aoneahsan.com) · [GitHub](https://github.com/aoneahsan) ·
[LinkedIn](https://linkedin.com/in/aoneahsan) · [aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)

<a id="links"></a>
## 🔗 Links&nbsp;[#](#links)

| | |
|---|---|
| Documentation | https://stratastorage-docs.aoneahsan.com |
| npm | https://www.npmjs.com/package/strata-storage |
| Repository | https://github.com/aoneahsan/strata-storage |
| Issues | https://github.com/aoneahsan/strata-storage/issues |
| Changelog | https://github.com/aoneahsan/strata-storage/blob/main/CHANGELOG.md |
| Docs site source | https://github.com/aoneahsan/strata-storage-docs |
| Project website | https://stratastorage.aoneahsan.com |
| Support the project | https://aoneahsan.com/payment |

<a id="keywords"></a>
## 🏷️ Keywords&nbsp;[#](#keywords)

*storage · capacitor · localstorage · indexeddb · sqlite · keychain · cross-platform · zero-dependencies ·
react · vue · angular · typescript*
