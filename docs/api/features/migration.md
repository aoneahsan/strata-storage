# Migration API

Data migration and versioning utilities for evolving your storage schema.

## Overview

As your application evolves, you may need to change the structure of stored data. The Migration API provides tools to safely transform data from old formats to new formats, ensuring backward compatibility and smooth updates.

## Configuration

### Enable Migrations

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  migrations: {
    enabled: true,
    version: 3, // Current schema version
    migrations: [
      // Migration definitions
    ]
  }
});

await storage.initialize();
```

## Defining Migrations

### Basic Migration

```typescript
const storage = new Strata({
  migrations: {
    enabled: true,
    version: 2,
    migrations: [
      {
        version: 1,
        up: async (storage) => {
          // Add default theme
          const theme = await storage.get('theme');
          if (!theme) {
            await storage.set('theme', 'light');
          }
        }
      },
      {
        version: 2,
        up: async (storage) => {
          // Rename 'username' to 'user.name'
          const username = await storage.get('username');
          if (username) {
            await storage.set('user', { name: username });
            await storage.remove('username');
          }
        }
      }
    ]
  }
});
```

### Migration with Rollback

```typescript
{
  version: 2,
  up: async (storage) => {
    // Forward migration
    const username = await storage.get('username');
    if (username) {
      await storage.set('user', { name: username });
      await storage.remove('username');
    }
  },
  down: async (storage) => {
    // Rollback migration
    const user = await storage.get('user');
    if (user?.name) {
      await storage.set('username', user.name);
      await storage.remove('user');
    }
  }
}
```

## Migration Methods

### runMigrations()

Manually run all pending migrations:

```typescript
await storage.runMigrations();
```

### rollback(targetVersion)

Rollback to a specific version:

```typescript
// Rollback to version 1
await storage.rollback(1);
```

### getCurrentVersion()

Get current schema version:

```typescript
const version = await storage.getCurrentVersion();
console.log(`Current version: ${version}`);
```

### getPendingMigrations()

Get list of pending migrations:

```typescript
const pending = await storage.getPendingMigrations();
console.log(`${pending.length} migrations pending`);
```

## Real-World Examples

### User Profile Migration

```typescript
// Version 1: Simple username
// Version 2: Full user object
// Version 3: Add user preferences

const storage = new Strata({
  migrations: {
    enabled: true,
    version: 3,
    migrations: [
      {
        version: 1,
        name: 'Initial setup',
        up: async (storage) => {
          // No migration needed for version 1
        }
      },
      {
        version: 2,
        name: 'Migrate to user object',
        up: async (storage) => {
          const username = await storage.get('username');
          const email = await storage.get('email');

          if (username || email) {
            await storage.set('user', {
              username: username || '',
              email: email || '',
              createdAt: Date.now()
            });

            await storage.remove('username');
            await storage.remove('email');
          }
        },
        down: async (storage) => {
          const user = await storage.get('user');
          if (user) {
            await storage.set('username', user.username);
            await storage.set('email', user.email);
            await storage.remove('user');
          }
        }
      },
      {
        version: 3,
        name: 'Add user preferences',
        up: async (storage) => {
          const user = await storage.get('user');
          if (user && !user.preferences) {
            user.preferences = {
              theme: 'light',
              language: 'en',
              notifications: true
            };
            await storage.set('user', user);
          }
        },
        down: async (storage) => {
          const user = await storage.get('user');
          if (user?.preferences) {
            delete user.preferences;
            await storage.set('user', user);
          }
        }
      }
    ]
  }
});
```

### Settings Structure Migration

```typescript
// Migrate from flat settings to nested structure

const storage = new Strata({
  migrations: {
    enabled: true,
    version: 2,
    migrations: [
      {
        version: 2,
        name: 'Nest settings structure',
        up: async (storage) => {
          // Get all flat settings
          const theme = await storage.get('setting_theme');
          const lang = await storage.get('setting_language');
          const notifications = await storage.get('setting_notifications');

          // Create nested structure
          await storage.set('settings', {
            appearance: {
              theme: theme || 'light'
            },
            locale: {
              language: lang || 'en'
            },
            notifications: {
              enabled: notifications ?? true
            }
          });

          // Remove old flat settings
          await storage.remove('setting_theme');
          await storage.remove('setting_language');
          await storage.remove('setting_notifications');
        },
        down: async (storage) => {
          const settings = await storage.get('settings');

          if (settings) {
            await storage.set('setting_theme', settings.appearance?.theme);
            await storage.set('setting_language', settings.locale?.language);
            await storage.set('setting_notifications', settings.notifications?.enabled);
            await storage.remove('settings');
          }
        }
      }
    ]
  }
});
```

### Data Type Migration

```typescript
// Migrate date strings to timestamps

const storage = new Strata({
  migrations: {
    enabled: true,
    version: 2,
    migrations: [
      {
        version: 2,
        name: 'Convert dates to timestamps',
        up: async (storage) => {
          const keys = await storage.keys();

          for (const key of keys) {
            if (key.startsWith('task:')) {
              const task = await storage.get(key);

              if (task.dueDate && typeof task.dueDate === 'string') {
                task.dueDate = new Date(task.dueDate).getTime();
                await storage.set(key, task);
              }

              if (task.createdAt && typeof task.createdAt === 'string') {
                task.createdAt = new Date(task.createdAt).getTime();
                await storage.set(key, task);
              }
            }
          }
        }
      }
    ]
  }
});
```

### Namespace Migration

```typescript
// Add namespacing to keys

const storage = new Strata({
  migrations: {
    enabled: true,
    version: 2,
    migrations: [
      {
        version: 2,
        name: 'Add namespacing',
        up: async (storage) => {
          const keys = await storage.keys();

          // Map old keys to new namespaced keys
          const keyMapping = {
            'theme': 'app:theme',
            'language': 'app:language',
            'token': 'auth:token',
            'user': 'auth:user'
          };

          for (const [oldKey, newKey] of Object.entries(keyMapping)) {
            const value = await storage.get(oldKey);
            if (value !== null) {
              await storage.set(newKey, value);
              await storage.remove(oldKey);
            }
          }
        },
        down: async (storage) => {
          const keyMapping = {
            'app:theme': 'theme',
            'app:language': 'language',
            'auth:token': 'token',
            'auth:user': 'user'
          };

          for (const [newKey, oldKey] of Object.entries(keyMapping)) {
            const value = await storage.get(newKey);
            if (value !== null) {
              await storage.set(oldKey, value);
              await storage.remove(newKey);
            }
          }
        }
      }
    ]
  }
});
```

### Encryption Migration

```typescript
// Add encryption to existing data

const storage = new Strata({
  encryption: {
    enabled: true,
    password: 'secure-key'
  },
  migrations: {
    enabled: true,
    version: 2,
    migrations: [
      {
        version: 2,
        name: 'Encrypt sensitive data',
        up: async (storage) => {
          const sensitiveKeys = ['password', 'creditCard', 'ssn', 'apiKey'];

          for (const key of sensitiveKeys) {
            const value = await storage.get(key);
            if (value !== null) {
              // Re-set with encryption
              await storage.set(key, value, { encrypt: true });
            }
          }
        }
      }
    ]
  }
});
```

## Advanced Usage

### Conditional Migrations

Run migrations based on conditions:

```typescript
{
  version: 3,
  name: 'Optional feature migration',
  condition: async (storage) => {
    // Only run if feature is enabled
    const settings = await storage.get('settings');
    return settings?.features?.newFeature === true;
  },
  up: async (storage) => {
    // Migration code
  }
}
```

### Batch Migrations

Migrate multiple items efficiently:

```typescript
{
  version: 2,
  name: 'Batch update tasks',
  up: async (storage) => {
    const keys = await storage.keys();
    const taskKeys = keys.filter(k => k.startsWith('task:'));

    // Batch read
    const tasks = await storage.getBatch(taskKeys);

    // Transform
    const updates = Object.entries(tasks).map(([key, task]) => ({
      key,
      value: {
        ...task,
        status: task.completed ? 'done' : 'pending',
        updatedAt: Date.now()
      }
    }));

    // Batch write
    await storage.setBatch(updates);
  }
}
```

### Migration with Validation

```typescript
{
  version: 2,
  name: 'Migrate and validate',
  up: async (storage) => {
    const user = await storage.get('user');

    // Validate before migration
    if (!user?.email) {
      throw new Error('Cannot migrate: user email is required');
    }

    // Transform
    const newUser = {
      ...user,
      email: user.email.toLowerCase(),
      emailVerified: false
    };

    // Validate after migration
    if (!isValidEmail(newUser.email)) {
      throw new Error('Migration failed: invalid email format');
    }

    await storage.set('user', newUser);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Progressive Migration

Migrate data lazily as it's accessed:

```typescript
class LazyMigrationStorage {
  private storage: Strata;
  private currentVersion = 2;

  constructor() {
    this.storage = new Strata();
  }

  async init() {
    await this.storage.initialize();
  }

  async get(key: string) {
    let value = await this.storage.get(key);

    if (value !== null) {
      // Check if data needs migration
      const version = value.__version || 1;

      if (version < this.currentVersion) {
        value = await this.migrateValue(key, value, version);
      }
    }

    return value;
  }

  private async migrateValue(key: string, value: any, fromVersion: number) {
    // Apply migrations one by one
    let migrated = value;

    if (fromVersion < 2) {
      // Migration to v2
      migrated = {
        ...migrated,
        createdAt: migrated.createdAt || Date.now()
      };
    }

    // Add version tag
    migrated.__version = this.currentVersion;

    // Save migrated value
    await this.storage.set(key, migrated);

    return migrated;
  }
}
```

## Migration Strategies

### 1. Eager Migration

Run all migrations on initialization (default):

```typescript
const storage = new Strata({
  migrations: {
    enabled: true,
    strategy: 'eager', // Run on init
    version: 3,
    migrations: [...]
  }
});

await storage.initialize(); // Migrations run here
```

### 2. Lazy Migration

Migrate data when accessed:

```typescript
const storage = new Strata({
  migrations: {
    enabled: true,
    strategy: 'lazy', // Migrate on access
    version: 3,
    migrations: [...]
  }
});
```

### 3. Manual Migration

Control when migrations run:

```typescript
const storage = new Strata({
  migrations: {
    enabled: true,
    strategy: 'manual',
    version: 3,
    migrations: [...]
  }
});

await storage.initialize();

// Run migrations when ready
await storage.runMigrations();
```

## API Reference

### MigrationConfig Interface

```typescript
interface MigrationConfig {
  enabled: boolean;
  version: number;
  strategy?: 'eager' | 'lazy' | 'manual';
  migrations: Migration[];
  onMigrationStart?: (migration: Migration) => void;
  onMigrationComplete?: (migration: Migration) => void;
  onMigrationError?: (migration: Migration, error: Error) => void;
}
```

### Migration Interface

```typescript
interface Migration {
  version: number;
  name?: string;
  up: (storage: Strata) => Promise<void>;
  down?: (storage: Strata) => Promise<void>;
  condition?: (storage: Strata) => Promise<boolean>;
}
```

## Best Practices

1. **Version Sequentially**: Start at 1, increment by 1
2. **Test Migrations**: Test both up and down migrations
3. **Backup Data**: Backup before running migrations
4. **Provide Rollback**: Always implement `down` migration
5. **Validate Data**: Validate before and after migration
6. **Log Progress**: Use migration callbacks for logging
7. **Handle Errors**: Catch and handle migration errors
8. **Document Changes**: Add `name` to describe migration

## Error Handling

```typescript
const storage = new Strata({
  migrations: {
    enabled: true,
    version: 2,
    migrations: [...],
    onMigrationError: (migration, error) => {
      console.error(`Migration ${migration.version} failed:`, error);
      // Alert user or log to service
    }
  }
});

try {
  await storage.initialize();
} catch (error) {
  console.error('Migration failed:', error);
  // Rollback or restore from backup
}
```

## See Also

- [Query API](./query.md)
- [Encryption API](./encryption.md)
- [TTL API](./ttl.md)
