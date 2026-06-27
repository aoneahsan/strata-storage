# URL Adapter

Persists state in the page URL — shareable, bookmarkable, reload-surviving UI state.

## Overview

The URL adapter (`URLAdapter`, storage type `'url'`) stores each key as a URL parameter, either in the query string (`?strata.tab=pending`) or the hash fragment (`#strata.tab=pending`). It is built for small, serializable UI state that should survive a reload and round-trip through navigation: active tab, filters, pagination, selected entity. Added in `2.5.0`.

URL access is inherently synchronous, so this adapter works with the [synchronous API](../../core/strata.md#synchronous-api). It also listens for `popstate` (query mode) or `hashchange` (hash mode), so back/forward navigation and manual URL edits notify subscribers as `'remote'` changes.

### Capabilities

| Feature | Support |
|---------|---------|
| Persistence | ❌ No (lives only as long as the URL) |
| Synchronous | ✅ Yes |
| Observable | ✅ Yes (`popstate` / `hashchange`) |
| Searchable | ✅ Yes (via key scan) |
| Iterable | ✅ Yes |
| Capacity | ~2 KB practical URL budget |
| Cross-tab | ❌ No |
| Encrypted | ❌ No |
| Transaction Support | ❌ No |

## Usage

The URL adapter is not part of the default web set, so register it explicitly:

```typescript
import { defineStorage, URLAdapter } from 'strata-storage';

const storage = defineStorage();
storage.registerAdapter(new URLAdapter());

// Write (no await needed — URL access is synchronous)
storage.setSync('tab', 'pending', { storage: 'url' });
storage.setSync('page', 3, { storage: 'url' });

// Read it back, e.g. on reload
const tab = storage.getSync<string>('tab', { storage: 'url' });

// The async API works too and delegates to the synchronous core
await storage.set('q', 'invoices', { storage: 'url' });
```

## Configuration

Pass `URLAdapterConfig` when constructing the adapter, or configure it through `StrataConfig.adapters.url`.

```typescript
import { URLAdapter } from 'strata-storage';

new URLAdapter(); // all defaults

// Configured via Strata
const storage = defineStorage({ adapters: { url: { mode: 'hash', history: 'push' } } });
storage.registerAdapter(new URLAdapter());
```

### Configuration Options

| Option | Type | Default | Meaning |
|--------|------|---------|---------|
| `mode` | `'query'` \| `'hash'` | `'query'` | Store params in the query string or the hash fragment. |
| `prefix` | `string` | `'strata.'` | Prefix on every param name to avoid collisions with your own query params. |
| `history` | `'push'` \| `'replace'` | `'replace'` | Add a browser history entry per write, or replace the current entry. |
| `maxLength` | `number` | `2000` | Soft warning threshold (chars) for total URL length. |

## Features

### Reacting to navigation

The adapter emits change events when the URL changes from outside your code — browser back/forward, or a user editing the address bar. Subscribe to react to those changes:

```typescript
storage.subscribe((change) => {
  if (change.key === 'tab') applyTab(change.newValue);
}, { storage: 'url' });
```

### Query vs hash mode

Query mode (`?strata.tab=...`) is shared with the server on every navigation and works well for SSR-readable state. Hash mode (`#strata.tab=...`) keeps state entirely client-side — the fragment is never sent to the server.

```typescript
// Server-readable state
storage.registerAdapter(new URLAdapter()); // mode: 'query' (default)

// Client-only state
storage.registerAdapter(new URLAdapter()); // construct with { mode: 'hash' }
```

## Use Cases

### 1. Shareable list filters

```typescript
function applyFilter(status: string, page: number) {
  storage.setSync('status', status, { storage: 'url' });
  storage.setSync('page', page, { storage: 'url' });
}

// On load, restore the filters from the URL so a shared link reproduces the view
const status = storage.getSync<string>('status', { storage: 'url' }) ?? 'all';
const page = storage.getSync<number>('page', { storage: 'url' }) ?? 1;
```

### 2. Active tab that survives reload

```typescript
function selectTab(tab: string) {
  storage.setSync('tab', tab, { storage: 'url' });
}

window.addEventListener('load', () => {
  selectTab(storage.getSync<string>('tab', { storage: 'url' }) ?? 'overview');
});
```

## Limitations

Documented honestly so you choose the right backend:

- **Length limits.** URLs have practical limits (~2000 chars in some browsers and servers). This adapter is for small, simple, serializable state — not bulk data. Writes past `maxLength` are still performed but logged as a debug warning suggesting a different storage.
- **Server visibility.** In `'query'` mode the data is sent to the server on every navigation and appears in server/proxy/referrer logs. Use `'hash'` mode for client-only state. Never store secrets in the URL in either mode.
- **Browser only.** Outside a browser (SSR/Node), `isAvailable()` returns `false` and the adapter is skipped.
- **Not durable.** State lives only as long as the URL does. It is not persistent storage — pair with `localStorage`/IndexedDB if the value must outlive the URL.
- **No encryption/compression.** Like all backends, encrypt/compress require the async path; for the URL adapter, storing large or sensitive values is discouraged regardless.

## See Also

- [Storage Adapters Overview](../README.md)
- [Synchronous API](../../core/strata.md#synchronous-api) — read/write the URL without `await`
- [LocalStorage Adapter](./localstorage.md) — durable client-only storage
- [Cookie Adapter](./cookies.md) — small server-readable storage
