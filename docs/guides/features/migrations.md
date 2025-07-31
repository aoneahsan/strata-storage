# Migrations Guide

Guide for implementing data migrations and schema updates in Strata Storage.

## Overview

Strata Storage provides built-in migration support to handle data schema changes, format updates, and version upgrades safely.

## Quick Start

```typescript
import { Strata, Migration } from 'strata-storage';

// Define migrations
const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_user_roles',
    up: async (storage) => {
      const users = await storage.query({ key: { $startsWith: 'user:' } });
      for (const user of users) {
        await storage.set(user.key, {
          ...user.value,
          roles: ['user'] // Add default role
        });
      }
    }
  }
];

// Initialize with migrations
const storage = new Strata({
  migrations: {
    enabled: true,
    migrations,
    currentVersion: 1
  }
});
```

## Migration Configuration

```typescript
interface MigrationConfig {
  enabled?: boolean;          // Enable migrations
  migrations?: Migration[];   // Migration definitions
  currentVersion?: number;    // Target version
  autoRun?: boolean;         // Run on init (true)
  onProgress?: (progress: MigrationProgress) => void;
}

interface Migration {
  version: number;           // Migration version
  name: string;             // Descriptive name
  up: (storage: Strata) => Promise<void>;    // Upgrade function
  down?: (storage: Strata) => Promise<void>; // Rollback function
}
```

## Writing Migrations

### Basic Migration

```typescript
const migration: Migration = {
  version: 2,
  name: 'add_timestamps',
  up: async (storage) => {
    const keys = await storage.keys();
    const now = Date.now();
    
    for (const key of keys) {
      const value = await storage.get(key);
      if (value && typeof value === 'object') {
        await storage.set(key, {
          ...value,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }
};
```

### Migration with Rollback

```typescript
const migration: Migration = {
  version: 3,
  name: 'restructure_user_data',
  up: async (storage) => {
    const users = await storage.query({ key: { $startsWith: 'user:' } });
    
    for (const user of users) {
      // Old structure: { name, email, phone }
      // New structure: { profile: { name }, contact: { email, phone } }
      await storage.set(user.key, {
        profile: { name: user.value.name },
        contact: { 
          email: user.value.email,
          phone: user.value.phone 
        }
      });
    }
  },
  down: async (storage) => {
    const users = await storage.query({ key: { $startsWith: 'user:' } });
    
    for (const user of users) {
      // Revert to old structure
      await storage.set(user.key, {
        name: user.value.profile?.name,
        email: user.value.contact?.email,
        phone: user.value.contact?.phone
      });
    }
  }
};
```

## Migration Strategies

### 1. Schema Updates

```typescript
class SchemaUpdates {
  migrations: Migration[] = [
    {
      version: 1,
      name: 'initial_schema',
      up: async (storage) => {
        // Set initial schema version
        await storage.set('_schema_version', { version: 1 });
      }
    },
    {
      version: 2,
      name: 'add_user_preferences',
      up: async (storage) => {
        const users = await storage.query({ key: { $startsWith: 'user:' } });
        
        for (const user of users) {
          await storage.set(user.key, {
            ...user.value,
            preferences: {
              theme: 'light',
              notifications: true,
              language: 'en'
            }
          });
        }
      }
    }
  ];
}
```

### 2. Data Format Changes

```typescript
const formatMigrations: Migration[] = [
  {
    version: 4,
    name: 'convert_dates_to_iso',
    up: async (storage) => {
      const items = await storage.query({
        created: { $exists: true }
      });
      
      for (const item of items) {
        await storage.set(item.key, {
          ...item.value,
          created: new Date(item.value.created).toISOString(),
          updated: new Date(item.value.updated).toISOString()
        });
      }
    }
  },
  {
    version: 5,
    name: 'normalize_phone_numbers',
    up: async (storage) => {
      const users = await storage.query({ 
        'value.phone': { $exists: true } 
      });
      
      for (const user of users) {
        const normalized = user.value.phone
          .replace(/[^\d+]/g, '') // Remove non-digits except +
          .replace(/^00/, '+');   // Convert 00 to +
          
        await storage.set(user.key, {
          ...user.value,
          phone: normalized
        });
      }
    }
  }
];
```

### 3. Storage Adapter Migration

```typescript
const adapterMigration: Migration = {
  version: 6,
  name: 'migrate_to_indexeddb',
  up: async (storage) => {
    // Read all data from localStorage
    const localData = await storage.query({}, {
      storage: 'localStorage'
    });
    
    // Write to IndexedDB
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

## Progress Tracking

```typescript
const storage = new Strata({
  migrations: {
    migrations,
    onProgress: (progress) => {
      console.log(`Migration ${progress.current}/${progress.total}`);
      console.log(`Running: ${progress.migrationName}`);
      console.log(`Progress: ${progress.percentage}%`);
    }
  }
});

// Manual progress tracking
storage.on('migration:start', (event) => {
  console.log('Starting migrations...');
});

storage.on('migration:complete', (event) => {
  console.log('Migrations completed!');
});
```

## Error Handling

```typescript
const storage = new Strata({
  migrations: {
    migrations,
    onError: async (error, migration) => {
      console.error(`Migration ${migration.name} failed:`, error);
      
      // Attempt rollback
      if (migration.down) {
        try {
          await migration.down(storage);
          console.log('Rollback successful');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
    }
  }
});
```

## Testing Migrations

```typescript
class MigrationTester {
  async testMigration(migration: Migration) {
    // Create test storage
    const testStorage = new Strata({
      namespace: 'test_migration'
    });
    
    // Add test data
    await this.seedTestData(testStorage);
    
    // Run migration
    await migration.up(testStorage);
    
    // Verify results
    await this.verifyMigration(testStorage, migration);
    
    // Test rollback if available
    if (migration.down) {
      await migration.down(testStorage);
      await this.verifyRollback(testStorage, migration);
    }
    
    // Cleanup
    await testStorage.clear();
  }
}
```

## Best Practices

### 1. Incremental Migrations

```typescript
// Good: Small, focused migrations
const migrations = [
  { version: 1, name: 'add_created_date', up: async () => {} },
  { version: 2, name: 'add_updated_date', up: async () => {} },
  { version: 3, name: 'add_user_roles', up: async () => {} }
];

// Bad: Large, complex migration
const badMigration = {
  version: 1,
  name: 'restructure_everything',
  up: async () => {
    // Too many changes in one migration
  }
};
```

### 2. Backup Before Migration

```typescript
class SafeMigration {
  async runWithBackup(storage: Strata, migrations: Migration[]) {
    // Create backup
    const backup = await this.createBackup(storage);
    
    try {
      // Run migrations
      await storage.runMigrations(migrations);
    } catch (error) {
      // Restore from backup
      await this.restoreBackup(storage, backup);
      throw error;
    }
  }
  
  async createBackup(storage: Strata) {
    const data = await storage.export();
    await storage.set('_backup_' + Date.now(), data);
    return data;
  }
}
```

### 3. Version Checks

```typescript
const storage = new Strata({
  migrations: {
    migrations,
    beforeMigration: async (storage, targetVersion) => {
      const currentVersion = await storage.get('_version') || 0;
      
      if (targetVersion < currentVersion) {
        throw new Error('Cannot downgrade from v' + currentVersion);
      }
      
      return true;
    }
  }
});
```

## Migration Patterns

### Lazy Migration

```typescript
// Migrate data on access
class LazyMigration {
  async get(key: string) {
    const value = await storage.get(key);
    
    if (value && !value._migrated) {
      const migrated = await this.migrateItem(value);
      await storage.set(key, { ...migrated, _migrated: true });
      return migrated;
    }
    
    return value;
  }
}
```

### Batch Migration

```typescript
// Process in batches to avoid memory issues
async function batchMigration(storage: Strata) {
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const batch = await storage.query({}, {
      limit: batchSize,
      skip: offset
    });
    
    if (batch.length === 0) break;
    
    for (const item of batch) {
      await migrateItem(item);
    }
    
    offset += batchSize;
    
    // Progress update
    console.log(`Migrated ${offset} items`);
  }
}
```

## Troubleshooting

### Migration Not Running

```typescript
// Debug migrations
const storage = new Strata({
  migrations: {
    migrations,
    debug: true
  },
  onLog: (level, msg) => {
    if (msg.includes('migration')) {
      console.log('[Migration]', msg);
    }
  }
});
```

### Data Corruption

```typescript
// Add validation to migrations
const migration: Migration = {
  version: 7,
  name: 'validate_and_fix',
  up: async (storage) => {
    const items = await storage.query({});
    
    for (const item of items) {
      if (!this.isValid(item.value)) {
        const fixed = this.fixData(item.value);
        await storage.set(item.key, fixed);
      }
    }
  }
};
```

## See Also

- [API Reference - Migrations](../../api/features/migrations.md)
- [Configuration Guide](../configuration.md)
- [Best Practices](../best-practices.md)