# SQLite Adapter

SQL database storage for iOS and Android via Capacitor.

> **v2.6.0 changes:**
> - **Multi-store:** the `database` and `table` constructor options are now
>   honoured on iOS and Android. Each unique `(database, table)` pair maps to a
>   distinct physical database file and table. Previously these options were
>   ignored and every adapter instance shared one table.
> - **Value round-trip fixed:** native `get` now returns the full
>   `StorageValue` wrapper (`value`, `created`, `updated`, `expires`, `tags`,
>   `metadata`) instead of a raw blob. TTL, tags, and metadata now survive a
>   write→read cycle.
> - **`size(true)`** now populates the `detailed.keys /
>   values / metadata` byte breakdown on native backends.
>
> **Pending on-device verification:** the native code is complete and
> code-reviewed. Simulator and real-device sign-off is tracked in
> [`docs/guides/platforms/device-verification.md`](../../../guides/platforms/device-verification.md).

## Overview

The SQLite adapter provides full SQL database capabilities for structured data
storage on mobile platforms.

### Capabilities

| Feature | Support |
|---------|---------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ❌ No (`subscribe()` is not supported) |
| Searchable | ✅ Yes (SQL) |
| Iterable | ✅ Yes |
| Capacity | Unlimited |
| Performance | ⚡ Fast |
| TTL Support | ✅ Yes (stored in value wrapper) |
| Batch Support | ✅ Yes |
| Transaction Support | ⚠️ Best-effort batch (not atomic) |
| Multi-store | ✅ Yes (v2.6.0, via `database` + `table` options) |
| `size(true)` | ✅ Yes (v2.6.0+) |

## Usage

```typescript
import { defineStorage } from 'strata-storage';
import { SqliteAdapter } from 'strata-storage/capacitor';

const storage = defineStorage({
  adapters: [new SqliteAdapter()],
  defaultStorages: ['sqlite'],
});
await storage.initialize();

// Store in SQLite
await storage.set('user:123', userData, {
  storage: 'sqlite',
});
```

## Multi-Store (v2.6.0+)

Use separate `defineStorage` instances with distinct `database` and/or `table`
options to keep different domains of data fully isolated. Each combination maps
to a separate `.db` file on disk.

```typescript
import { defineStorage } from 'strata-storage';
import { SqliteAdapter } from 'strata-storage/capacitor';

// Store A — app settings in settings.db / settings table
const settingsStorage = defineStorage({
  adapters: [new SqliteAdapter({ database: 'settings', table: 'settings' })],
  defaultStorages: ['sqlite'],
});

// Store B — user data in userdata.db / profiles table
const userStorage = defineStorage({
  adapters: [new SqliteAdapter({ database: 'userdata', table: 'profiles' })],
  defaultStorages: ['sqlite'],
});

await settingsStorage.initialize();
await userStorage.initialize();

// Writing the same key to both stores never produces a collision
await settingsStorage.set('theme', 'dark', { storage: 'sqlite' });
await userStorage.set('theme', { accent: 'blue' }, { storage: 'sqlite' });

const settingsTheme = await settingsStorage.get('theme', { storage: 'sqlite' });
// 'dark'
const userTheme = await userStorage.get('theme', { storage: 'sqlite' });
// { accent: 'blue' }
```

**Database file naming:** The `database` option becomes the filename on disk
(`database: 'userdata'` → `userdata.db`). The default is `strata_storage`
(→ `strata_storage.db`).

**Identifier validation (v2.7.0):** `database` and `table` are the only values
that cannot be SQL-bound, so they are validated against
`^[A-Za-z_][A-Za-z0-9_]*$` and **rejected** with a clear error if they don't
match — they are no longer silently stripped (which could collapse two distinct
logical stores into one). Every other value (keys, stored values) is a bound
parameter. The native iOS/Android layers apply the same allow-list as
defense-in-depth.

## Configuration

```typescript
new SqliteAdapter({
  // Database file name (without .db extension). Default: 'strata_storage'
  database: 'myapp',

  // Table name inside the database. Default: 'storage'
  table: 'user_data',
})
```

Both options default to `strata_storage` / `storage` when omitted, which
matches the single-store behaviour from v2.5.0 and earlier.

## Expiry & TTL (v2.7.0)

`keys()` and `query()` filter expired rows **in SQL** and return results in a
single native round-trip — there is no per-key `get()` loop, so they stay fast on
large tables. Expired rows are reclaimed in one `DELETE` by `cleanupExpired`
(driven by the automatic TTL tick and by `Strata.cleanupExpired()`), and `get()`
still treats an expired row as a miss.

## `size(true)` (v2.6.0+)

Pass `true` to `size()` to receive a per-column byte breakdown in addition to
the aggregate totals:

```typescript
const sqliteAdapter = new SqliteAdapter();
const storage = defineStorage({
  adapters: [sqliteAdapter],
  defaultStorages: ['sqlite'],
});
await storage.initialize();

// Seed some data
await storage.set('user:1', { name: 'Alice' }, {
  storage: 'sqlite',
  tags: ['user'],
  metadata: { source: 'signup' },
});

// Basic totals (always worked)
const basic = await sqliteAdapter.size();
// { total: 126, count: 1 }

// Detailed breakdown (v2.6.0+)
const detail = await sqliteAdapter.size(true);
// {
//   total: 126,
//   count: 1,
//   detailed: { keys: 8, values: 118, metadata: 30 }
// }
```

`total` is `keys + values` (the `metadata` column is **not** added into `total`).
`detailed.keys` is the byte sum of key strings across all rows; `detailed.values`
covers the serialised value payloads; `detailed.metadata` is the byte sum of the
`metadata` column only (the custom metadata JSON — it does **not** include the
separate timestamp/tags columns).

Before v2.6.0, passing `true` had no effect and returned only `{ total, count }`.

## Platform Implementation

### iOS (SQLite3)

```swift
// Native implementation using SQLite3
import SQLite3

class SQLiteStorage {
    private var db: OpaquePointer?
    
    func open(database: String) {
        sqlite3_open(database, &db)
    }
    
    func execute(query: String) {
        sqlite3_exec(db, query, nil, nil, nil)
    }
}
```

### Android (SQLiteDatabase)

```java
// Native implementation
public class SQLiteStorage extends SQLiteOpenHelper {
    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE storage (...)");
    }
}
```

## Use Cases

### 1. Structured Data Storage

```typescript
class UserDatabase {
  async saveUser(user: User) {
    await storage.set(`user:${user.id}`, user, {
      storage: 'sqlite'
    });
  }
  
  async findUsers(criteria: SearchCriteria) {
    return await storage.query({
      key: { startsWith: 'user:' },
      'value.age': { $gte: criteria.minAge },
      'value.city': criteria.city
    }, { storage: 'sqlite' });
  }
}
```

### 2. Offline Data Sync

```typescript
class OfflineSync {
  async saveForSync(data: SyncData) {
    await storage.set(`sync:${data.id}`, {
      ...data,
      syncStatus: 'pending',
      lastAttempt: null
    }, { storage: 'sqlite' });
  }
  
  async getPendingSync() {
    return await storage.query({
      key: { startsWith: 'sync:' },
      'value.syncStatus': 'pending'
    }, { storage: 'sqlite' });
  }
}
```

### 3. Transaction Support

> ⚠️ **Not atomic.** `transaction()` is a **best-effort sequential batch**, not a
> native SQLite transaction (`capabilities.transactional` is `false`). Operations
> are queued and replayed one-by-one on `commit()`; `rollback()` only discards
> operations that have **not yet** committed — it cannot undo writes that
> `commit()` has already applied. Do not rely on it for all-or-nothing semantics.

```typescript
// Best-effort sequential batch (NOT atomic — see note above)
await storage.transaction(async (tx) => {
  const account = await tx.get('account:123');
  account.balance -= 100;
  
  await tx.set('account:123', account);
  await tx.set('transaction:' + Date.now(), {
    type: 'debit',
    amount: 100,
    account: '123'
  });
}, { storage: 'sqlite' });
```

## Best Practices

1. **Use Indexes**: Create indexes for frequently queried fields
2. **Batch Operations**: Use transactions for multiple operations
3. **Schema Versioning**: Implement migration strategies
4. **Query Optimization**: Use proper SQL queries for performance
5. **Data Normalization**: Structure data appropriately

## See Also

- [Storage Adapters Overview](../README.md)
- [Preferences Adapter](./preferences.md) — for simple key-value storage
- [Query Guide](../../../guides/features/queries.md)
- [Device Verification Guide](../../../guides/platforms/device-verification.md) — v2.6.0 on-device test matrix