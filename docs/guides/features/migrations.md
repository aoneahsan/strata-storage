# Migrations Guide

Guide for implementing data migrations and schema updates in Strata Storage.

> **Note:** Migrations are an **EXPERIMENTAL, adapter-level utility** (`MigrationManager`). They are **not** configured through `StrataConfig` — there is no `migrations` option on `new Strata(...)`. You run them explicitly against a low-level storage **adapter** (e.g. `LocalStorageAdapter`, `IndexedDBAdapter`).

## Overview

`MigrationManager` is a small, standalone helper for handling data schema changes, format updates, and version upgrades. You register migrations, then call `migrate(adapter, targetVersion)` to move the adapter's data up or down to a target schema version. The current version is tracked internally under the key `__strata_version__`.

## Quick Start

```typescript
import { MigrationManager, LocalStorageAdapter } from 'strata-storage';
import type { Migration } from 'strata-storage';

// 1. Create and initialize a storage adapter
const adapter = new LocalStorageAdapter();
await adapter.initialize();

// 2. Define migrations
const migrations: Migration[] = [
  {
    version: 1,
    up: async (a) => {
      // Add a default role to every user record
      const keys = await a.keys();
      for (const key of keys) {
        if (!key.startsWith('user:')) continue;
        const record = await a.get<Record<string, unknown>>(key);
        if (record) {
          await a.set(key, {
            value: { ...record.value, roles: ['user'] },
            created: record.created,
            updated: Date.now(),
          });
        }
      }
    },
  },
];

// 3. Register and run
const manager = new MigrationManager();
migrations.forEach((m) => manager.register(m));
await manager.migrate(adapter, 1);
```

## The API

```typescript
interface Migration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
  down?: (adapter: StorageAdapter) => Promise<void>;
}

class MigrationManager {
  register(migration: Migration): void;
  migrate(adapter: StorageAdapter, targetVersion: number): Promise<void>;
}
```

`MigrationManager` has exactly two public methods:

- `register(migration)` — adds a migration; the manager keeps them sorted by `version`.
- `migrate(adapter, targetVersion)` — runs the migrations needed to reach `targetVersion`, up or down.

Inside `up`/`down` you work with the adapter primitives: `get`, `set`, `remove`, `keys`, `has`, `clear`. Remember that `get(key)` returns a `StorageValue` wrapper (`{ value, created, updated, ... }` or `null`), and `set(key, value)` expects the same wrapper shape.

## Writing Migrations

### Basic Migration

```typescript
const migration: Migration = {
  version: 2,
  up: async (a) => {
    const keys = await a.keys();
    const now = Date.now();

    for (const key of keys) {
      const record = await a.get<Record<string, unknown>>(key);
      if (record && typeof record.value === 'object') {
        await a.set(key, {
          value: { ...record.value, createdAt: now, updatedAt: now },
          created: record.created,
          updated: now,
        });
      }
    }
  },
};
```

### Migration with Rollback

```typescript
const migration: Migration = {
  version: 3,
  up: async (a) => {
    const keys = await a.keys(/^user:/);

    for (const key of keys) {
      const record = await a.get<{ name: string; email: string; phone: string }>(key);
      if (!record) continue;

      // Old: { name, email, phone } → New: { profile, contact }
      await a.set(key, {
        value: {
          profile: { name: record.value.name },
          contact: { email: record.value.email, phone: record.value.phone },
        },
        created: record.created,
        updated: Date.now(),
      });
    }
  },
  down: async (a) => {
    const keys = await a.keys(/^user:/);

    for (const key of keys) {
      const record = await a.get<{
        profile?: { name?: string };
        contact?: { email?: string; phone?: string };
      }>(key);
      if (!record) continue;

      // Revert to old structure
      await a.set(key, {
        value: {
          name: record.value.profile?.name,
          email: record.value.contact?.email,
          phone: record.value.contact?.phone,
        },
        created: record.created,
        updated: Date.now(),
      });
    }
  },
};
```

> `a.keys(pattern)` accepts a string or `RegExp` to filter keys, which is handy for targeting a subset of records.

## Migration Strategies

### 1. Schema Updates

```typescript
const schemaMigrations: Migration[] = [
  {
    version: 1,
    up: async (a) => {
      // Record an initial schema marker
      await a.set('_schema', { value: { version: 1 }, created: Date.now(), updated: Date.now() });
    },
  },
  {
    version: 2,
    up: async (a) => {
      const keys = await a.keys(/^user:/);
      for (const key of keys) {
        const record = await a.get<Record<string, unknown>>(key);
        if (!record) continue;
        await a.set(key, {
          value: {
            ...record.value,
            preferences: { theme: 'light', notifications: true, language: 'en' },
          },
          created: record.created,
          updated: Date.now(),
        });
      }
    },
  },
];
```

### 2. Data Format Changes

```typescript
const formatMigrations: Migration[] = [
  {
    version: 4,
    up: async (a) => {
      const keys = await a.keys();
      for (const key of keys) {
        const record = await a.get<{ created?: number; updated?: number }>(key);
        if (!record) continue;

        const value = { ...record.value };
        if (typeof value.created === 'number') value.created = new Date(value.created).toISOString() as never;
        if (typeof value.updated === 'number') value.updated = new Date(value.updated).toISOString() as never;

        await a.set(key, { value, created: record.created, updated: Date.now() });
      }
    },
  },
  {
    version: 5,
    up: async (a) => {
      const keys = await a.keys(/^user:/);
      for (const key of keys) {
        const record = await a.get<{ phone?: string }>(key);
        if (!record?.value?.phone) continue;

        const normalized = record.value.phone
          .replace(/[^\d+]/g, '') // Remove non-digits except +
          .replace(/^00/, '+'); // Convert 00 to +

        await a.set(key, {
          value: { ...record.value, phone: normalized },
          created: record.created,
          updated: Date.now(),
        });
      }
    },
  },
];
```

### 3. Moving Data Between Adapters

Because each migration receives a single adapter, moving data between two backends is done outside the manager — read from the source adapter and write to the destination:

```typescript
import { LocalStorageAdapter, IndexedDBAdapter } from 'strata-storage';

const source = new LocalStorageAdapter();
const target = new IndexedDBAdapter();
await source.initialize();
await target.initialize();

const keys = await source.keys();
for (const key of keys) {
  const record = await source.get(key);
  if (record !== null) {
    await target.set(key, record);
    await source.remove(key);
  }
}
```

## Error Handling

`migrate()` runs migrations sequentially and persists the version after each successful step, so a failure stops the process at the last completed version. Wrap the call and react to failures yourself:

```typescript
try {
  await manager.migrate(adapter, targetVersion);
} catch (error) {
  console.error('Migration failed:', error);
  // Restore from a snapshot/backup, then investigate before retrying.
}
```

If a migration is reversible, you can move back down to a known-good version:

```typescript
await manager.migrate(adapter, lastKnownGoodVersion);
```

## Testing Migrations

Use an in-memory adapter to exercise a migration end-to-end without touching real storage:

```typescript
import { MigrationManager, MemoryAdapter } from 'strata-storage';

async function testMigration(migration: Migration) {
  const adapter = new MemoryAdapter();
  await adapter.initialize();

  // Seed test data
  await adapter.set('user:1', {
    value: { name: 'Ada', email: 'ada@example.com', phone: '555-0100' },
    created: Date.now(),
    updated: Date.now(),
  });

  const manager = new MigrationManager();
  manager.register(migration);

  // Run up
  await manager.migrate(adapter, migration.version);
  // ...assert the migrated shape via adapter.get(...)

  // Run down (if reversible)
  if (migration.down) {
    await manager.migrate(adapter, migration.version - 1);
    // ...assert the rolled-back shape
  }

  await adapter.clear();
}
```

## Best Practices

### 1. Incremental Migrations

```typescript
// Good: small, focused migrations
const migrations: Migration[] = [
  { version: 1, up: async (a) => { /* add created date */ } },
  { version: 2, up: async (a) => { /* add updated date */ } },
  { version: 3, up: async (a) => { /* add user roles */ } },
];

// Avoid: one giant migration that restructures everything at once.
```

### 2. Back Up Before Migrating

Snapshot critical data before running migrations so you can restore if something goes wrong:

```typescript
const keys = await adapter.keys();
const backup: Record<string, unknown> = {};
for (const key of keys) backup[key] = await adapter.get(key);

try {
  await manager.migrate(adapter, targetVersion);
} catch (error) {
  // Restore from `backup`
  for (const [key, record] of Object.entries(backup)) {
    if (record !== null) await adapter.set(key, record as never);
  }
  throw error;
}
```

> Strata also ships opt-in disaster-recovery features (`snapshot()` / `restore()`) at the `Strata` level — see the disaster-recovery guide.

### 3. Re-wrap Transformed Values

`get()` returns `{ value, created, updated, ... }`. When you transform data, build a fresh wrapper for `set()` and preserve the original `created` timestamp where it matters:

```typescript
const record = await adapter.get(key);
if (record) {
  await adapter.set(key, {
    value: transform(record.value),
    created: record.created,
    updated: Date.now(),
  });
}
```

## See Also

- [API Reference - Migrations](../../api/features/migration.md)
- [Configuration Guide](../../configuration.md)
