# Filesystem Adapter

Native file-system storage for iOS and Android via Capacitor.

> **v2.6.0:** `FilesystemAdapter` now has a real native backend on iOS and
> Android. `isAvailable()` returns `true` on both platforms. Prior versions
> had no native implementation and the adapter was effectively unavailable on
> device.
>
> **Pending on-device verification:** The native code is complete and
> code-reviewed. Simulator and real-device sign-off is tracked in
> [`docs/guides/platforms/device-verification.md`](../../../guides/platforms/device-verification.md).

## Overview

Each key is stored as a single JSON file inside a dedicated subdirectory of the
app's sandboxed storage area:

- **iOS:** `<NSDocumentsDirectory>/strata_storage/<sanitised-key>.json`
- **Android:** `<Context.getFilesDir()>/strata_storage/<sanitised-key>.json`

The file content is the full `StorageValue` wrapper serialised to JSON, so TTL,
tags, and metadata are preserved across a write-read cycle. Writes go through an
atomic staging step — the value is written to a temp file in a reserved
`strata_storage/.strata-staging/` subdirectory, then renamed into place — so a crash
during write never leaves a partial file.

On the web (non-Capacitor) platform `isAvailable()` returns `false` and all
calls are routed to the in-memory fallback.

### Capabilities

| Feature | Support |
|---------|---------|
| Persistence | ✅ Yes (app-sandboxed filesystem) |
| Synchronous | ❌ No (async I/O) |
| Observable | ✅ Yes |
| Searchable | ✅ Limited (key-prefix scan) |
| Iterable (`keys()`) | ✅ Yes |
| Capacity | Device storage (unlimited by API) |
| Performance | File I/O speed (variable; slower than SQLite for many small keys) |
| TTL Support | ✅ Yes (stored in value wrapper) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |
| `size(true)` | ✅ Yes (v2.6.0+) |

## Usage

```typescript
import { defineStorage } from 'strata-storage';
import { FilesystemAdapter } from 'strata-storage/capacitor';

const storage = defineStorage({
  adapters: [new FilesystemAdapter()],
  defaultStorages: ['filesystem'],
});
await storage.initialize();

// Write a value
await storage.set('report_q1', { lines: 42, status: 'final' }, {
  storage: 'filesystem',
});

// Read it back
const report = await storage.get<{ lines: number; status: string }>('report_q1', {
  storage: 'filesystem',
});
console.log(report?.lines);  // 42
```

## API Reference

All methods follow the standard `BaseAdapter` contract. Key behaviours specific
to this adapter are noted below.

### `isAvailable(): Promise<boolean>`

Returns `true` when running inside a Capacitor app on iOS or Android. Returns
`false` in a browser context.

```typescript
const fsAdapter = new FilesystemAdapter();
const available = await fsAdapter.isAvailable();
// true on device, false in browser
```

### `get<T>(key: string): Promise<StorageValue<T> | null>`

Reads `strata_storage/<sanitised-key>.json` and deserialises the stored
`StorageValue<T>` wrapper. Returns `null` when the file does not exist. Returns
`null` (treating the entry as a miss) when the file content is not valid JSON —
corrupt legacy files do not throw.

### `set<T>(key: string, value: StorageValue<T>): Promise<void>`

Serialises `value` to JSON and writes it via an atomic rename:

1. Write to `strata_storage/.strata-staging/<sanitised-key>.tmp`
2. Rename into `strata_storage/<sanitised-key>.json`

This prevents partial files from appearing if the process is interrupted.

### `remove(key: string): Promise<void>`

Deletes `strata_storage/<sanitised-key>.json`. No-op if the file does not exist.

### `clear(): Promise<void>`

Deletes every `.json` file in `strata_storage/`. Files in the staging
subdirectory are also removed. Does not delete the directory itself.

### `keys(pattern?: string): Promise<string[]>`

Lists `strata_storage/`, reverses the file-name sanitisation for each `.json`
file, and returns the original key strings. Temp files in `.strata-staging/` are never
included in this list — a key whose name resembles a temp file (e.g.
`"backup.tmp"`) is safely stored and returned by `keys()`.

If `pattern` is provided the returned array is filtered by prefix or glob.

### `size(detailed?: boolean): Promise<StorageSize>`

Sums the byte sizes of all `.json` files in `strata_storage/`.

```typescript
// Basic size
const basic = await fsAdapter.size();
// { total: 4096, count: 12 }

// Detailed breakdown (v2.6.0+)
const detail = await fsAdapter.size(true);
// {
//   total: 4096,
//   count: 12,
//   detailed: { keys: 240, values: 3600, metadata: 256 }
// }
```

`detailed.keys` is the byte sum of all key strings, `detailed.values` is the
byte sum of serialised values, and `detailed.metadata` covers timestamps, tags,
and metadata fields.

## Configuration

`FilesystemAdapter` currently takes no constructor options. The storage
subdirectory name (`strata_storage`) and the staging directory
(`strata_storage/.strata-staging`) are fixed.

```typescript
// No options — just instantiate
const fsAdapter = new FilesystemAdapter();
```

## Platform Notes

### iOS

Files are placed in the app's `NSDocumentsDirectory`, which means they are
included in iCloud backups by default. If you are storing large or
reconstruction-only data (caches, derived data), mark the files to exclude them
from backup by setting the `NSURLIsExcludedFromBackupKey` resource value on the
directory — this is not done automatically by the adapter.

### Android

Files are placed in `Context.getFilesDir()`, the app-internal private storage
area. No filesystem permissions are required (no `READ_EXTERNAL_STORAGE` or
`WRITE_EXTERNAL_STORAGE`).

`androidx.security:security-crypto 1.1.0` (stable) is required for v2.6.0 —
this dependency is used by the Secure adapter, not the Filesystem adapter, but
both live in the same Gradle build. The Filesystem adapter itself stores values
as plain JSON without additional OS-level encryption. For sensitive data, use the
[Secure adapter](./secure.md) instead.

## Use Cases

### Persisting Large Documents

The Filesystem adapter is most practical for values that are too large for
Preferences (capped at ~1 MB) or that map naturally to a single file — think
cached API responses, user-generated drafts, or exported reports.

```typescript
async function cacheApiResponse(endpoint: string, data: unknown) {
  // Use a hash of the endpoint as the key to avoid filesystem-illegal chars
  const key = `cache_${btoa(endpoint).replace(/[^A-Za-z0-9]/g, '_')}`;

  await storage.set(key, data, {
    storage: 'filesystem',
    ttl: 3_600_000, // 1 hour
  });
}
```

### Offline Document Store

```typescript
class DocumentStore {
  async save(id: string, content: string) {
    await storage.set(`doc_${id}`, { content, savedAt: Date.now() }, {
      storage: 'filesystem',
    });
  }

  async list(): Promise<string[]> {
    const keys = await storage.keys({ storage: 'filesystem' });
    return keys.filter(k => k.startsWith('doc_')).map(k => k.slice(4));
  }
}
```

## Limitations

- **No sub-directory hierarchy** — all files sit in a flat `strata_storage/`
  directory. Slashes in key names are sanitised to underscores; there is no
  nested folder structure per key.
- **No transactions** — unlike SQLite, concurrent writes to the same key can
  race. Use the adapter only from a single execution context at a time or add
  your own lock.
- **Slower than SQLite for many small keys** — each key requires a separate file
  I/O round-trip. For high-frequency reads/writes of small values, prefer the
  [SQLite adapter](./sqlite.md).
- **Not available in browser** — `isAvailable()` returns `false` outside a
  Capacitor runtime.

## See Also

- [Storage Adapters Overview](../README.md)
- [SQLite Adapter](./sqlite.md) — better choice for many small key-value pairs
- [Platform Guide — iOS](../../../guides/platforms/ios.md)
- [Platform Guide — Android](../../../guides/platforms/android.md)
- [Device Verification Guide](../../../guides/platforms/device-verification.md)
