# Migration Examples

Examples of implementing data migrations in Strata Storage.

## Basic Migration

```typescript
import { Strata, Migration } from 'strata-storage';

const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_created_date',
    up: async (storage) => {
      const keys = await storage.keys();
      const now = Date.now();
      
      for (const key of keys) {
        const value = await storage.get(key);
        if (value && !value.created) {
          await storage.set(key, { ...value, created: now });
        }
      }
    }
  }
];

const storage = new Strata({
  migrations: {
    migrations,
    currentVersion: 1
  }
});
```

## Migration with Rollback

```typescript
const migration: Migration = {
  version: 2,
  name: 'restructure_user_data',
  up: async (storage) => {
    const users = await storage.query({ key: { $startsWith: 'user:' } });
    
    for (const user of users) {
      const oldData = user.value;
      const newData = {
        profile: {
          name: oldData.name,
          avatar: oldData.avatar
        },
        contact: {
          email: oldData.email,
          phone: oldData.phone
        },
        settings: oldData.settings || {}
      };
      
      await storage.set(user.key, newData);
    }
  },
  down: async (storage) => {
    const users = await storage.query({ key: { $startsWith: 'user:' } });
    
    for (const user of users) {
      const newData = user.value;
      const oldData = {
        name: newData.profile?.name,
        avatar: newData.profile?.avatar,
        email: newData.contact?.email,
        phone: newData.contact?.phone,
        settings: newData.settings
      };
      
      await storage.set(user.key, oldData);
    }
  }
};
```

## Progressive Migration

```typescript
class ProgressiveMigration {
  migrations: Migration[] = [
    {
      version: 1,
      name: 'add_user_roles',
      up: async (storage) => {
        await this.migrateInBatches(storage, async (batch) => {
          for (const item of batch) {
            if (item.key.startsWith('user:')) {
              await storage.set(item.key, {
                ...item.value,
                roles: ['user']
              });
            }
          }
        });
      }
    }
  ];
  
  async migrateInBatches(
    storage: Strata,
    processor: (batch: any[]) => Promise<void>,
    batchSize = 100
  ) {
    let offset = 0;
    
    while (true) {
      const batch = await storage.query({}, {
        skip: offset,
        limit: batchSize
      });
      
      if (batch.length === 0) break;
      
      await processor(batch);
      offset += batchSize;
      
      // Progress callback
      console.log(`Migrated ${offset} items`);
    }
  }
}
```

## Conditional Migration

```typescript
const migrations: Migration[] = [
  {
    version: 3,
    name: 'fix_corrupted_data',
    up: async (storage) => {
      const items = await storage.query({});
      
      for (const item of items) {
        if (this.isCorrupted(item.value)) {
          const fixed = this.fixData(item.value);
          await storage.set(item.key, fixed);
          console.log(`Fixed corrupted data: ${item.key}`);
        }
      }
    }
  }
];

function isCorrupted(data: any): boolean {
  // Check for corruption
  return !data || typeof data !== 'object' || !data.id;
}

function fixData(data: any): any {
  return {
    ...data,
    id: data.id || generateId(),
    repaired: true,
    repairedAt: Date.now()
  };
}
```

## Storage Type Migration

```typescript
const storageTypeMigration: Migration = {
  version: 4,
  name: 'migrate_to_indexeddb',
  up: async (storage) => {
    // Get all data from localStorage
    const localData = await storage.query({}, {
      storage: 'localStorage'
    });
    
    console.log(`Migrating ${localData.length} items to IndexedDB`);
    
    // Move to IndexedDB
    for (const item of localData) {
      await storage.set(item.key, item.value, {
        storage: 'indexedDB'
      });
      
      // Remove from localStorage
      await storage.remove(item.key, {
        storage: 'localStorage'
      });
    }
  }
};
```

## Data Format Migration

```typescript
const formatMigrations: Migration[] = [
  {
    version: 5,
    name: 'convert_timestamps',
    up: async (storage) => {
      const items = await storage.query({
        $or: [
          { 'value.created': { $type: 'number' } },
          { 'value.updated': { $type: 'number' } }
        ]
      });
      
      for (const item of items) {
        const updated = { ...item.value };
        
        if (typeof updated.created === 'number') {
          updated.created = new Date(updated.created).toISOString();
        }
        if (typeof updated.updated === 'number') {
          updated.updated = new Date(updated.updated).toISOString();
        }
        
        await storage.set(item.key, updated);
      }
    }
  }
];
```

## Safe Migration Pattern

```typescript
class SafeMigration {
  async runMigration(storage: Strata, migration: Migration) {
    const backupKey = `_backup_v${migration.version}`;
    
    try {
      // Create backup
      const allData = await storage.export();
      await storage.set(backupKey, allData);
      
      // Run migration
      await migration.up(storage);
      
      // Verify migration
      await this.verifyMigration(storage, migration);
      
      // Clean up backup after success
      await storage.remove(backupKey);
      
    } catch (error) {
      console.error(`Migration ${migration.name} failed:`, error);
      
      // Restore from backup
      const backup = await storage.get(backupKey);
      if (backup) {
        await storage.import(backup);
      }
      
      throw error;
    }
  }
  
  async verifyMigration(storage: Strata, migration: Migration) {
    // Add verification logic
    console.log(`Verified migration: ${migration.name}`);
  }
}
```

## See Also

- [Migration Guide](../guides/features/migrations.md)
- [Data Sync](./data-sync.md)
- [Configuration](./configuration.md)