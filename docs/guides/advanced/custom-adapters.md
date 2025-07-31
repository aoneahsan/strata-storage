# Custom Storage Adapters Guide

Learn how to create custom storage adapters for Strata Storage.

## Overview

Strata Storage allows you to create custom adapters for any storage backend by extending the `BaseAdapter` class.

## Basic Adapter Structure

```typescript
import { BaseAdapter } from 'strata-storage';
import type { StorageAdapter, StorageValue } from 'strata-storage';

export class CustomAdapter extends BaseAdapter implements StorageAdapter {
  readonly name = 'custom';
  readonly type = 'custom' as const;
  
  async initialize(): Promise<void> {
    await super.initialize();
    // Custom initialization
  }
  
  async get<T>(key: string): Promise<StorageValue<T> | null> {
    // Implementation
  }
  
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    // Implementation
  }
  
  async remove(key: string): Promise<void> {
    // Implementation
  }
  
  async clear(): Promise<void> {
    // Implementation
  }
  
  async keys(pattern?: string | RegExp): Promise<string[]> {
    // Implementation
  }
}
```

## Example: Redis Adapter

```typescript
import { BaseAdapter } from 'strata-storage';
import type { StorageValue, StorageOptions } from 'strata-storage';

export class RedisAdapter extends BaseAdapter {
  readonly name = 'redis';
  readonly type = 'redis' as const;
  private client: any; // Redis client
  
  constructor(private config: RedisConfig) {
    super();
  }
  
  async initialize(): Promise<void> {
    await super.initialize();
    this.client = await createRedisClient(this.config);
  }
  
  async get<T>(key: string): Promise<StorageValue<T> | null> {
    const data = await this.client.get(this.prefixKey(key));
    if (!data) return null;
    
    return JSON.parse(data);
  }
  
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    const wrapped = this.wrapValue(value);
    
    if (options?.ttl) {
      await this.client.setex(
        prefixedKey,
        Math.ceil(options.ttl / 1000),
        JSON.stringify(wrapped)
      );
    } else {
      await this.client.set(prefixedKey, JSON.stringify(wrapped));
    }
  }
  
  async remove(key: string): Promise<void> {
    await this.client.del(this.prefixKey(key));
  }
  
  async clear(): Promise<void> {
    const keys = await this.keys();
    if (keys.length > 0) {
      await this.client.del(...keys.map(k => this.prefixKey(k)));
    }
  }
  
  async keys(pattern?: string | RegExp): Promise<string[]> {
    const allKeys = await this.client.keys(this.prefixKey('*'));
    return this.filterKeys(allKeys, pattern);
  }
}
```

## Registering Custom Adapters

```typescript
import { Strata } from 'strata-storage';
import { RedisAdapter } from './RedisAdapter';

const storage = new Strata({
  adapters: {
    redis: new RedisAdapter({
      host: 'localhost',
      port: 6379
    })
  },
  defaultStorages: ['redis', 'localStorage']
});
```

## Advanced Features

### Transaction Support

```typescript
class TransactionalAdapter extends BaseAdapter {
  async transaction<T>(fn: (trx: Transaction) => Promise<T>): Promise<T> {
    const trx = this.createTransaction();
    try {
      const result = await fn(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
  
  private createTransaction(): Transaction {
    // Implementation
  }
}
```

### Query Support

```typescript
class QueryableAdapter extends BaseAdapter {
  async query(condition: QueryCondition): Promise<StorageValue[]> {
    const allItems = await this.getAllItems();
    return allItems.filter(item => 
      this.queryEngine.matches(item, condition)
    );
  }
}
```

## Best Practices

1. **Error Handling**: Always wrap operations in try-catch
2. **Key Prefixing**: Use namespace prefixes to avoid collisions
3. **Type Safety**: Implement proper TypeScript types
4. **Performance**: Implement efficient key filtering
5. **Cleanup**: Properly close connections in destroy()

## Testing Custom Adapters

```typescript
import { testAdapter } from 'strata-storage/testing';
import { CustomAdapter } from './CustomAdapter';

describe('CustomAdapter', () => {
  testAdapter(() => new CustomAdapter());
});
```

## See Also

- [BaseAdapter API](../../api/core/base-adapter.md)
- [Storage Adapters](../../api/adapters/)
- [Type Definitions](../../api/types/)