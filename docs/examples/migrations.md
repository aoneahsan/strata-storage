# Migration Examples

Examples of implementing data migrations in Strata Storage.

> Migrations are an experimental, adapter-level utility (`MigrationManager`). They are **not** configured through `StrataConfig`; you run them explicitly against an initialized storage **adapter**. See the [Migration API](../api/features/migration.md) and [Migrations Guide](../guides/features/migrations.md).

## Basic Migration

```typescript
import { MigrationManager, LocalStorageAdapter } from 'strata-storage';
import type { Migration } from 'strata-storage';

const adapter = new LocalStorageAdapter();
await adapter.initialize();

const migrations: Migration[] = [
  {
    version: 1,
    up: async (a) => {
      const keys = await a.keys();
      const now = Date.now();

      for (const key of keys) {
        const record = await a.get<Record<string, unknown>>(key);
        if (record && record.value && !('created' in record.value)) {
          await a.set(key, {
            value: { ...record.value, created: now },
            created: record.created,
            updated: now,
          });
        }
      }
    },
  },
];

const manager = new MigrationManager();
migrations.forEach((m) => manager.register(m));

await manager.migrate(adapter, 1);
```

## Migration with Rollback

```typescript
const migration: Migration = {
  version: 2,
  up: async (a) => {
    const keys = await a.keys(/^user:/);

    for (const key of keys) {
      const record = await a.get<{
        name: string;
        avatar?: string;
        email: string;
        phone?: string;
        settings?: unknown;
      }>(key);
      if (!record) continue;

      const old = record.value;
      await a.set(key, {
        value: {
          profile: { name: old.name, avatar: old.avatar },
          contact: { email: old.email, phone: old.phone },
          settings: old.settings ?? {},
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
        profile?: { name?: string; avatar?: string };
        contact?: { email?: string; phone?: string };
        settings?: unknown;
      }>(key);
      if (!record) continue;

      const updated = record.value;
      await a.set(key, {
        value: {
          name: updated.profile?.name,
          avatar: updated.profile?.avatar,
          email: updated.contact?.email,
          phone: updated.contact?.phone,
          settings: updated.settings,
        },
        created: record.created,
        updated: Date.now(),
      });
    }
  },
};
```

## Progressive (Batched) Migration

For large data sets, process keys in batches inside the migration to keep memory use bounded:

```typescript
const migrations: Migration[] = [
  {
    version: 1,
    up: async (a) => {
      const allKeys = (await a.keys()).filter((k) => k.startsWith('user:'));
      const batchSize = 100;

      for (let offset = 0; offset < allKeys.length; offset += batchSize) {
        const batch = allKeys.slice(offset, offset + batchSize);

        for (const key of batch) {
          const record = await a.get<Record<string, unknown>>(key);
          if (!record) continue;
          await a.set(key, {
            value: { ...record.value, roles: ['user'] },
            created: record.created,
            updated: Date.now(),
          });
        }

        console.log(`Migrated ${Math.min(offset + batchSize, allKeys.length)} items`);
      }
    },
  },
];
```

## Conditional Migration

```typescript
function isCorrupted(data: unknown): boolean {
  return !data || typeof data !== 'object' || !('id' in (data as object));
}

function fixData(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    id: data.id ?? generateId(),
    repaired: true,
    repairedAt: Date.now(),
  };
}

const migrations: Migration[] = [
  {
    version: 3,
    up: async (a) => {
      const keys = await a.keys();

      for (const key of keys) {
        const record = await a.get<Record<string, unknown>>(key);
        if (record && isCorrupted(record.value)) {
          await a.set(key, {
            value: fixData(record.value),
            created: record.created,
            updated: Date.now(),
          });
          console.log(`Fixed corrupted data: ${key}`);
        }
      }
    },
  },
];
```

## Moving Data Between Adapters

Each migration receives a single adapter, so moving data between two backends is done directly — read from the source adapter, write to the destination:

```typescript
import { LocalStorageAdapter, IndexedDBAdapter } from 'strata-storage';

const source = new LocalStorageAdapter();
const target = new IndexedDBAdapter();
await source.initialize();
await target.initialize();

const keys = await source.keys();
console.log(`Migrating ${keys.length} items to IndexedDB`);

for (const key of keys) {
  const record = await source.get(key);
  if (record !== null) {
    await target.set(key, record);
    await source.remove(key);
  }
}
```

## Data Format Migration

```typescript
const formatMigrations: Migration[] = [
  {
    version: 5,
    up: async (a) => {
      const keys = await a.keys();

      for (const key of keys) {
        const record = await a.get<{ created?: unknown; updated?: unknown }>(key);
        if (!record) continue;

        const value = { ...record.value };
        let changed = false;

        if (typeof value.created === 'number') {
          value.created = new Date(value.created).toISOString();
          changed = true;
        }
        if (typeof value.updated === 'number') {
          value.updated = new Date(value.updated).toISOString();
          changed = true;
        }

        if (changed) {
          await a.set(key, { value, created: record.created, updated: Date.now() });
        }
      }
    },
  },
];
```

## Safe Migration Pattern

Snapshot the adapter's data before migrating, and restore it if the migration fails:

```typescript
import { MigrationManager, StorageAdapter } from 'strata-storage';

async function runSafely(
  manager: MigrationManager,
  adapter: StorageAdapter,
  targetVersion: number,
) {
  // 1. Back up current data
  const keys = await adapter.keys();
  const backup: Array<[string, unknown]> = [];
  for (const key of keys) backup.push([key, await adapter.get(key)]);

  try {
    // 2. Run the migration
    await manager.migrate(adapter, targetVersion);
  } catch (error) {
    console.error('Migration failed, restoring backup:', error);

    // 3. Restore from backup
    for (const [key, record] of backup) {
      if (record !== null) await adapter.set(key, record as never);
    }
    throw error;
  }
}
```

## See Also

- [Migration API](../api/features/migration.md)
- [Migration Guide](../guides/features/migrations.md)
- [Data Sync](./data-sync.md)
- [Configuration](./configuration.md)
