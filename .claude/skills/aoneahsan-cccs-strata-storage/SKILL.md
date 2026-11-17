---
name: aoneahsan-cccs-strata-storage
description: 'The fleet storage rule and the package enforcing it: strata-storage is the only thing that may touch localStorage, sessionStorage, indexedDB, cookies, the Cache API or URL state, and the same API wraps native Keychain/Keystore, Preferences, SQLite and the filesystem. Use before reaching for any web storage API directly.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/projects/strata-storage-package.md
---

# strata-storage

The owner's own package (`strata-storage`, zero runtime deps, ESM-only) and **the storage layer in the
Capacitor package baseline** (`aoneahsan-cccs-capacitor-packages-setup`). One
`get/set/remove/query/subscribe` API over every backend, web + Android + iOS.

First pointer for any agent: the repo's root **`AI-INTEGRATION-GUIDE.md`** (current, versioned) and the docs
site `stratastorage.aoneahsan.com`. This skill carries the stable usage rules.

## 🔴 The rule — never touch a web storage API directly

**`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, the Cache API and URL-persisted state all
go through strata-storage.** It covers every one of them behind one API, and on native the same call wraps
Preferences / Keychain / Keystore — so one line is correct on web and mobile.

**"It has to be synchronous" is not an exception.** `getSync` / `setSync` / `removeSync` (plus
`hasSync` / `keysSync` / `clearSync`) work on `memory`, `localStorage`, `sessionStorage`, `cookies` and
`url`. They throw a clear `StorageError` on async-only backends (`indexedDB`, `cache`, native) and on
encrypted or compressed values — a wrong target fails loudly rather than silently.

### Exactly three sanctioned exceptions — and a fourth does not exist

1. **The pre-paint theme script** — it runs before any module loads, so nothing exists for it to call. It must
   read the *physical* key (`<namespace>:` + key) and `JSON.parse(raw).value`, never the raw string.
   🔴 **And it reads EVERY preference axis, not just the theme** — iterating one table, never hand-written
   reads (`aoneahsan-cccs-react-theming`; why: `references/web-storage-exceptions.md`).
2. **A cookie whose FORMAT is owned elsewhere** — a server, consent framework or analytics vendor that
   *parses* the cookie cannot read strata's `encodeURIComponent(JSON.stringify(wrapper))` envelope.
3. **A takeover service worker deleting its predecessor's caches** (owner, 2026-11-06): `caches.keys()` +
   `caches.delete()` in `activate`, own old names only.

**Nothing else qualifies; a new exception is added to `references/web-storage-exceptions.md` or it is a
violation.**

🔴 **Migrating data a raw `setItem` or a pre-strata zustand store wrote is NOT an exception** — since
`3.1.0`, `storage.importRawSync(rawKey, key, { storage: 'localStorage' })` adopts that ONE named key (moved,
original deleted; an existing strata value wins). Require **>= 3.1.0** — 3.0.x left `sessionStorage`
unprefixed (ISSUE-13); a worked zustand adapter: `references/usage.md`.

Read **`references/web-storage-exceptions.md`** before using one — the first two fail silently.

## 🔴 Require **>= 3.0.0** — keys are prefixed `strata:`, and some projects MUST opt out

`3.0.0` prefixes `localStorage`/`sessionStorage` keys with `strata:`; existing data migrates itself on read,
so most projects need nothing. Cookies (already `strata_`), indexedDB, cache, memory and url are unchanged,
and `namespace` composes: the physical key is `<keyPrefix><namespace>:<key>`.

🔴 **Set `keyPrefix: false` when anything OUTSIDE this library reads a physical key** — in this fleet that is
always one of the sanctioned exceptions above, **a pre-paint theme script** or **a logger reading its own
level**. Both hard-code the key name, a prefix changes it underneath them, and migration cannot fix a
hard-coded reader. Frozen physical key names are the same case. Check for those readers **before** bumping.

```ts
export const storage = defineStorage({ keyPrefix: false });          // frozen keys / external readers
export const storage = defineStorage({ migrateLegacyKeys: false });  // a sibling app is still on 2.x
```

## 2.9.0 — the five rules it left behind

A web adapter owns only `StorageValue`-shaped keys, so 🔴 a foreign key is **invisible to `keys()` by design**;
🔴 `defaultStorages` is the default adapter's preference order, never a registration list; ⚠️ prefixing is
hygiene, not safety; 🔴 never assume the physical key. Read `references/releases.md` → *The five rules 2.9.0
left behind* before debugging a missing key, a TTL sweep or a cleared origin.

**`references/releases.md`** — the full 3.0.0 and 2.9.0 narratives and the 2.8.5 symptoms.
**`references/namespacing.md`** — the probe table, the contested lifewell-vs-habitforge measurement, and what
a namespace does and does not buy; read it before changing a namespace or debugging a missing key.

## Setup

`yarn add strata-storage` — every framework peer is optional; install only what the host uses.
**Provider-free:** `defineStorage()` returns a ready instance — create it once, import it anywhere, and
`initialize()` is optional. **Prefer it over the default singleton**, which cannot carry the prefix config
above.

Entry points (core + web, native, React/Vue/Angular, Firebase sync): **`references/usage.md`**.

## Choosing a backend

web small+persistent → `localStorage` · large/structured/queryable → `indexedDB` · offline blobs → `cache` ·
shareable UI state → `url` (compose with `aoneahsan-cccs-url-state-persistence`) · server-readable →
`cookies` · tests → `memory` · **mobile sensitive → `secure`** · mobile structured → `sqlite` (isolated
`(database, table)`) · mobile documents → `filesystem` · mobile settings → `preferences` · cross-device →
Firebase sync.

**Features are opt-in and off by default** — `encrypt`, `compress`, `ttl`, `tags`, cross-tab `sync`,
`integrity`, `durable`, `mirror`, snapshots. Never assume one is on.

🔴 **Scope `subscribe()` to a backend that supports it** when only one matters, normally
`{ storage: 'localStorage' }`, and always call the returned unsubscribe. On the supported floor the unscoped
form is safe — non-observable backends are skipped (why it once was not: `references/releases.md`).

## Rules that keep it honest

- Sensitive values on native go in `secure`, never `preferences`/`localStorage`. Secrets never in web
  storage at all — an encrypted web value is only as safe as the key shipped beside it.
- **One instance per app.** Same-tab change events come from the adapter object's own emitter, so two
  `defineStorage()` calls in one tab never see each other's writes.
- It IS a Capacitor plugin (own Android/iOS code) — `cap sync` after install; the package baseline applies.
- A package bug found while integrating is reported to the package repo (`references/usage.md`).

Usage patterns (instances, the sync API, hooks, native, cross-tab, query limits, migration):
`references/usage.md`.
