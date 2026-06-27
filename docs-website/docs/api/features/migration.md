# Migration API

Data migration and versioning utilities for evolving your storage schema.

> **Note:** Migrations are an **EXPERIMENTAL, adapter-level utility** (`MigrationManager`). They are **not** configured through `StrataConfig` — there is no `migrations` option on `new Strata(...)`. You run them explicitly against a low-level storage **adapter** (e.g. `LocalStorageAdapter`, `IndexedDBAdapter`).

## Overview

As your application evolves, you may need to change the structure of stored data. The Migration API provides a small, standalone tool — `MigrationManager` — to safely transform data from old formats to new formats. It tracks the current schema version internally (under the key `__strata_version__`) and runs the registered migrations needed to move **up** or **down** to a target version.

## Importing

Everything ships from the main package entry point:

```typescript
import { MigrationManager, LocalStorageAdapter } from 'strata-storage';
import type { Migration } from 'strata-storage';
```

## The `Migration` Interface

```typescript
interface Migration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
  down?: (adapter: StorageAdapter) => Promise<void>;
}
```

- `version` — the schema version this migration produces. Migrations are run in ascending order when migrating up, and in descending order when migrating down.
- `up` — applies the migration. Receives the low-level `StorageAdapter`.
- `down` — optional reverse migration, used when migrating to a lower target version.

The `up`/`down` callbacks receive a `StorageAdapter`, so they read and write through the adapter's primitives: `adapter.get(key)`, `adapter.set(key, value)`, `adapter.remove(key)`, `adapter.keys()`, `adapter.has(key)`, and `adapter.clear()`. Note that `adapter.get(key)` returns a `StorageValue` wrapper (`{ value, created, updated, ... }` or `null`), and `adapter.set(key, value)` expects that same wrapper shape.

## The `MigrationManager` Class

`MigrationManager` has exactly two public methods:

| Method | Description |
|--------|-------------|
| `register(migration: Migration): void` | Register a migration. Migrations are kept sorted by `version`. |
| `migrate(adapter: StorageAdapter, targetVersion: number): Promise<void>` | Migrate the adapter's data up or down to `targetVersion`. |

```typescript
const manager = new MigrationManager();
manager.register(migration);
await manager.migrate(adapter, targetVersion);
```

`migrate()` reads the current version from the adapter, compares it to `targetVersion`, and:

- runs each pending migration's `up()` in ascending order when moving **up**, or
- runs each migration's `down()` in descending order when moving **down**.

After each step it persists the new version under `__strata_version__`. If the current version already equals `targetVersion`, `migrate()` is a no-op.

## Setting Up an Adapter

`migrate()` operates on an initialized adapter, **not** a `Strata` instance:

```typescript
import { LocalStorageAdapter } from 'strata-storage';

const adapter = new LocalStorageAdapter();
await adapter.initialize();
```

Any adapter that implements `StorageAdapter` works — for example `IndexedDBAdapter`, `MemoryAdapter`, or a Capacitor adapter.

## Defining and Running Migrations

### Basic Migration

```typescript
import { MigrationManager, LocalStorageAdapter } from 'strata-storage';
import type { Migration } from 'strata-storage';

const adapter = new LocalStorageAdapter();
await adapter.initialize();

const manager = new MigrationManager();

manager.register({
  version: 1,
  up: async (a) => {
    // Add a default theme if none exists
    const theme = await a.get('theme');
    if (!theme) {
      await a.set('theme', { value: 'light', created: Date.now(), updated: Date.now() });
    }
  },
});

manager.register({
  version: 2,
  up: async (a) => {
    // Rename 'username' to a structured 'user' record
    const username = await a.get<string>('username');
    if (username) {
      await a.set('user', {
        value: { name: username.value },
        created: Date.now(),
        updated: Date.now(),
      });
      await a.remove('username');
    }
  },
});

// Migrate up to version 2 (runs v1 then v2 as needed)
await manager.migrate(adapter, 2);
```

### Migration with Rollback

Provide a `down` function so the migration can be reversed when you migrate to a lower target version:

```typescript
const migration: Migration = {
  version: 2,
  up: async (a) => {
    const username = await a.get<string>('username');
    if (username) {
      await a.set('user', {
        value: { name: username.value },
        created: Date.now(),
        updated: Date.now(),
      });
      await a.remove('username');
    }
  },
  down: async (a) => {
    const user = await a.get<{ name: string }>('user');
    if (user?.value?.name) {
      await a.set('username', {
        value: user.value.name,
        created: Date.now(),
        updated: Date.now(),
      });
      await a.remove('user');
    }
  },
};

manager.register(migration);

// Roll back to version 1 (runs v2's `down`)
await manager.migrate(adapter, 1);
```

## Real-World Examples

### User Profile Migration

```typescript
import { MigrationManager, IndexedDBAdapter } from 'strata-storage';

const adapter = new IndexedDBAdapter();
await adapter.initialize();

const manager = new MigrationManager();

// Version 2: migrate flat username/email into a single user object
manager.register({
  version: 2,
  up: async (a) => {
    const username = await a.get<string>('username');
    const email = await a.get<string>('email');

    if (username || email) {
      await a.set('user', {
        value: {
          username: username?.value ?? '',
          email: email?.value ?? '',
          createdAt: Date.now(),
        },
        created: Date.now(),
        updated: Date.now(),
      });

      await a.remove('username');
      await a.remove('email');
    }
  },
  down: async (a) => {
    const user = await a.get<{ username: string; email: string }>('user');
    if (user) {
      const now = Date.now();
      await a.set('username', { value: user.value.username, created: now, updated: now });
      await a.set('email', { value: user.value.email, created: now, updated: now });
      await a.remove('user');
    }
  },
});

// Version 3: add user preferences
manager.register({
  version: 3,
  up: async (a) => {
    const user = await a.get<Record<string, unknown>>('user');
    if (user && !user.value.preferences) {
      await a.set('user', {
        value: {
          ...user.value,
          preferences: { theme: 'light', language: 'en', notifications: true },
        },
        created: user.created,
        updated: Date.now(),
      });
    }
  },
  down: async (a) => {
    const user = await a.get<Record<string, unknown>>('user');
    if (user?.value?.preferences) {
      const { preferences, ...rest } = user.value as Record<string, unknown>;
      await a.set('user', { value: rest, created: user.created, updated: Date.now() });
    }
  },
});

await manager.migrate(adapter, 3);
```

### Settings Structure Migration

```typescript
// Migrate from flat settings to a nested structure
manager.register({
  version: 2,
  up: async (a) => {
    const theme = await a.get<string>('setting_theme');
    const lang = await a.get<string>('setting_language');
    const notifications = await a.get<boolean>('setting_notifications');

    await a.set('settings', {
      value: {
        appearance: { theme: theme?.value ?? 'light' },
        locale: { language: lang?.value ?? 'en' },
        notifications: { enabled: notifications?.value ?? true },
      },
      created: Date.now(),
      updated: Date.now(),
    });

    await a.remove('setting_theme');
    await a.remove('setting_language');
    await a.remove('setting_notifications');
  },
  down: async (a) => {
    const settings = await a.get<{
      appearance?: { theme?: string };
      locale?: { language?: string };
      notifications?: { enabled?: boolean };
    }>('settings');

    if (settings) {
      const now = Date.now();
      await a.set('setting_theme', { value: settings.value.appearance?.theme, created: now, updated: now });
      await a.set('setting_language', { value: settings.value.locale?.language, created: now, updated: now });
      await a.set('setting_notifications', { value: settings.value.notifications?.enabled, created: now, updated: now });
      await a.remove('settings');
    }
  },
});
```

### Data Type Migration

```typescript
// Convert date strings to timestamps across all task records
manager.register({
  version: 2,
  up: async (a) => {
    const keys = await a.keys();

    for (const key of keys) {
      if (!key.startsWith('task:')) continue;

      const record = await a.get<{ dueDate?: unknown; createdAt?: unknown }>(key);
      if (!record) continue;

      const task = { ...record.value };
      let changed = false;

      if (typeof task.dueDate === 'string') {
        task.dueDate = new Date(task.dueDate).getTime();
        changed = true;
      }
      if (typeof task.createdAt === 'string') {
        task.createdAt = new Date(task.createdAt).getTime();
        changed = true;
      }

      if (changed) {
        await a.set(key, { value: task, created: record.created, updated: Date.now() });
      }
    }
  },
});
```

### Namespace Migration

```typescript
// Add namespacing to keys
manager.register({
  version: 2,
  up: async (a) => {
    const keyMapping: Record<string, string> = {
      theme: 'app:theme',
      language: 'app:language',
      token: 'auth:token',
      user: 'auth:user',
    };

    for (const [oldKey, newKey] of Object.entries(keyMapping)) {
      const record = await a.get(oldKey);
      if (record !== null) {
        await a.set(newKey, record);
        await a.remove(oldKey);
      }
    }
  },
  down: async (a) => {
    const keyMapping: Record<string, string> = {
      'app:theme': 'theme',
      'app:language': 'language',
      'auth:token': 'token',
      'auth:user': 'user',
    };

    for (const [newKey, oldKey] of Object.entries(keyMapping)) {
      const record = await a.get(newKey);
      if (record !== null) {
        await a.set(oldKey, record);
        await a.remove(newKey);
      }
    }
  },
});
```

## Best Practices

1. **Version Sequentially**: Start at 1, increment by 1.
2. **Initialize the adapter first**: Call `await adapter.initialize()` before `migrate()`.
3. **Provide Rollback**: Implement `down` whenever a migration is reversible.
4. **Preserve the wrapper**: Remember `get()` returns `{ value, created, updated }` and `set()` expects the same shape — re-wrap your transformed value.
5. **Back Up Data**: Snapshot critical data before running migrations (see `snapshot()`/`restore()` in the disaster-recovery features).
6. **Keep migrations small**: One focused change per version is easier to test and reverse.
7. **Migrations are experimental**: Test thoroughly against real adapter data before relying on them in production.

## See Also

- [Query API](./query.md)
- [Encryption API](./encryption.md)
- [TTL API](./ttl.md)
