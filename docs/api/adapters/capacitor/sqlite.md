# SQLite Adapter

SQL database storage for mobile applications.

## Overview

The SQLite adapter provides full SQL database capabilities for structured data storage on mobile platforms.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ✅ Yes |
| Searchable | ✅ Yes (SQL) |
| Iterable | ✅ Yes |
| Capacity | Unlimited |
| Performance | ⚡ Fast |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ✅ Yes |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Store in SQLite
await storage.set('user:123', userData, { 
  storage: 'sqlite' 
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    sqlite: {
      database: 'myapp.db',
      version: 1,
      tables: {
        storage: {
          columns: {
            key: 'TEXT PRIMARY KEY',
            value: 'TEXT',
            metadata: 'TEXT',
            created: 'INTEGER',
            updated: 'INTEGER',
            expires: 'INTEGER'
          },
          indexes: ['created', 'expires']
        }
      }
    }
  }
});
```

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

```typescript
// Full ACID transactions
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
- [Preferences Adapter](./preferences.md) - For simple key-value storage
- [Query Guide](../../../guides/features/queries.md)