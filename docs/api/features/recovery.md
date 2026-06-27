# Recovery & Integrity

## Overview

Strata Storage includes a set of opt-in recovery features for data you cannot afford to silently lose: integrity checksums, durable writes, mirroring with read-repair, and integrity-verified snapshots. Added in `2.5.0`. **Every feature here is off by default** — each adds overhead, so enable only what a given dataset needs.

## Features

- **Integrity checksums** — detect accidental corruption on read with a fast FNV-1a checksum.
- **Durable writes** — read each write back and retry until it is confirmed.
- **Mirroring** — copy writes to backup adapters and recover (read-repair) from them on corruption or a primary miss.
- **Snapshots & auto-backup** — produce portable, checksum-verified backups and schedule them.

## Integrity Checksums

Enable with `integrity: true` on the instance, or per call with `{ verify: true }`. Strata computes an FNV-1a checksum over each stored value and verifies it on every read.

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage({ integrity: true });

await storage.set('config', settings);     // checksum stored alongside the value
const config = await storage.get('config'); // verified on read
```

When a read fails verification, Strata responds in this order:

1. If `mirror` is configured, it attempts read-repair from a mirror (see below).
2. Otherwise, if `{ ignoreCorruption: true }` was passed, it returns `null`.
3. Otherwise, it throws a typed `IntegrityError`.

```typescript
import { IntegrityError } from 'strata-storage';

try {
  const value = await storage.get('config');
} catch (error) {
  if (error instanceof IntegrityError) {
    // The stored value did not match its checksum.
  }
}

// Or degrade gracefully:
const value = await storage.get('config', { ignoreCorruption: true }); // null if corrupted
```

> **Honest note:** these checksums are **FNV-1a, which is non-cryptographic**. They cheaply detect *accidental* corruption — truncated writes, bit flips, partial storage. They do **not** resist deliberate tampering: an attacker who can modify the value can recompute the checksum. For tamper resistance, use the [encryption feature](../../guides/features/encryption.md).

### Standalone checksum helpers

The checksum functions are exported for direct use:

```typescript
import { computeChecksum, verifyChecksum } from 'strata-storage';

const sum = computeChecksum({ a: 1 });          // 8-char hex string
const ok = verifyChecksum({ a: 1 }, sum);        // true
verifyChecksum({ a: 1 }, undefined);             // true — nothing to verify
```

`verifyChecksum` returns `true` when no checksum is supplied, so it is safe to call unconditionally.

## Durable Writes

Enable with `durableWrites: true` on the instance, or per call with `{ durable: true }`. After writing, Strata reads the value back and compares checksums, retrying on mismatch. If it cannot confirm the write after a few attempts, it throws a `StorageError`.

```typescript
const storage = defineStorage({ durableWrites: true });
await storage.set('order', order); // confirmed written, or throws StorageError
```

This adds one read per write. Use it for writes that must not be lost, not for high-frequency hot paths.

## Mirroring (Read-Repair)

`mirror: [storageType, ...]` copies every write and remove to the listed backup storage types. On a primary read miss or a corruption detected by the integrity check, Strata recovers the value from the first mirror that still verifies, and repairs the primary in place.

```typescript
const storage = defineStorage({
  defaultStorages: ['localStorage'],
  integrity: true,        // needed for corruption detection
  mirror: ['indexedDB'],  // localStorage is primary; indexedDB is the backup
});

await storage.set('profile', profile); // written to localStorage AND indexedDB
const profile = await storage.get('profile'); // repaired from indexedDB if localStorage is corrupt
```

The mirror adapters must be registered on the instance (the default web adapters cover `localStorage` and `indexedDB`). Mirror failures are logged but never block the primary operation.

## Snapshots & Auto-Backup

### snapshot() / restore()

`snapshot()` exports all data (including metadata) into a portable string that embeds a checksum manifest. `restore()` validates that checksum and throws `IntegrityError` if the backup is corrupted. A raw `export()` string (no manifest) is also accepted by `restore()`.

```typescript
const backup = await storage.snapshot();   // store/download this string
await storage.restore(backup);             // validates checksum, then restores
```

Snapshot payloads are restored with their full value wrappers intact, so TTL, tags, encryption flags, and checksums survive a restore (unlike `import()`, which re-wraps values through `set()`).

### Scheduled auto-backup

`autoBackup` schedules periodic snapshots to a durable adapter:

```typescript
const storage = defineStorage({
  autoBackup: {
    interval: 5 * 60_000,   // every 5 minutes
    storage: 'indexedDB',   // where to write the snapshot
    key: '__strata_backup__', // optional, this is the default
  },
});
```

The timer is cleared automatically when you call `storage.close()`.

## Configuration Reference

| Config field | Per-call option | Default | Effect |
|--------------|-----------------|---------|--------|
| `integrity: boolean` | `verify: boolean` | off | Compute + verify an FNV-1a checksum per value. |
| `durableWrites: boolean` | `durable: boolean` | off | Read back and verify each write, retrying on mismatch. |
| `mirror: StorageType[]` | — | none | Copy writes/removes to backups; read-repair on corruption/miss. |
| `autoBackup: { interval, storage, key? }` | — | none | Periodic `snapshot()` to a durable adapter. |
| — | `ignoreCorruption: boolean` | off | On a failed integrity check (after mirror repair), return `null` instead of throwing. |

## Cost & Trade-offs

- Integrity adds a small per-value hash on read and write.
- Durable writes add one extra read per write.
- Mirroring multiplies write cost by the number of mirrors.
- Auto-backup serializes all data on each interval — choose an interval and durable adapter that match your data size.

Enable these per dataset, not globally, unless the whole store is recovery-critical.

## See Also

- [Strata Class API](../core/strata.md) — `snapshot()`, `restore()`, recovery config
- [Error Classes](../core/errors.md) — `IntegrityError`, `StorageError`
- [Encryption](../../guides/features/encryption.md) — for tamper resistance (checksums are not cryptographic)
