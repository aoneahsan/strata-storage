# Query Guide

Guide for using MongoDB-like queries to search and filter data in Strata Storage.

## Overview

Strata Storage provides a powerful query engine that supports complex filtering, similar to MongoDB's query syntax.

> **Important — queries match the value you stored, by bare field name.**
> `storage.query(condition)` evaluates each condition against the **decoded value** you stored,
> using **bare** field names (with dot-notation for nested fields). Do **not** prefix fields with
> `value.` — `{ 'value.age': 18 }` matches nothing.
>
> The record **wrapper** is not the value, so wrapper metadata is **not** queryable: the storage
> **key**, the **tags** passed to `set(key, value, { tags })`, and the `created` / `updated` /
> `expires` timestamps cannot be filtered with `query()`. To select records of a kind, store a
> discriminator field on the value (e.g. `type: 'user'`) and query it; to bulk-operate by tag, use
> `clear({ tags })`. (A property literally named `tags` *on your value* is, of course, queryable as
> `{ tags: ... }`.)

## Quick Start

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Simple query — match fields on the stored value by bare name
const users = await storage.query({
  age: { $gte: 18 }
});

// Complex query
const results = await storage.query({
  $and: [
    { status: 'active' },
    { roles: { $in: ['premium'] } },
    { createdAt: { $gt: new Date('2024-01-01').getTime() } }
  ]
});
```

## Query Syntax

### Basic Queries

```typescript
// Exact match
await storage.query({ name: 'John' });

// Multiple conditions (implicit AND)
await storage.query({
  age: { $gte: 18 },
  city: 'New York'
});
```

### Comparison Operators

```typescript
// Numeric comparisons
await storage.query({ age: { $gt: 18 } });   // Greater than
await storage.query({ age: { $gte: 18 } });  // Greater than or equal
await storage.query({ age: { $lt: 65 } });   // Less than
await storage.query({ age: { $lte: 65 } });  // Less than or equal
await storage.query({ age: { $eq: 25 } });   // Equal
await storage.query({ age: { $ne: 25 } });   // Not equal

// Range query (inclusive lo/hi — combined operators are AND-ed)
await storage.query({
  price: { $gte: 10, $lte: 100 }
});
```

### String Operators

```typescript
// String matching
await storage.query({
  name: { $regex: '^John' },
  email: { $regex: '@example.com$' },
  description: { $regex: 'important' }
});

// Regular expression
await storage.query({
  username: { $regex: /^user_\d+$/ }
});
```

### Array Operators

```typescript
// Array contains ($in matches when the array holds any listed element).
// `tags` here is an array property ON the stored value — not the metadata tags
// passed to set(key, value, { tags }), which query() cannot see.
await storage.query({
  tags: { $in: ['featured'] }
});

// Array contains any
await storage.query({
  tags: { $in: ['premium', 'featured'] }
});

// Array contains all — $and of memberships
await storage.query({
  // $containsAll = every tag present
  $and: [
    { tags: { $in: ['verified'] } },
    { tags: { $in: ['premium'] } }
  ]
});

// Array length is NOT a supported operator — filter on the results client-side:
const withManyItems = (await storage.query({ items: { $exists: true } }))
  .filter((r) => Array.isArray(r.value.items) && r.value.items.length >= 5);
```

### Logical Operators

```typescript
// AND
await storage.query({
  $and: [
    { status: 'active' },
    { age: { $gte: 18 } }
  ]
});

// OR
await storage.query({
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ]
});

// NOT
await storage.query({
  $not: { status: 'deleted' }
});
```

### Date Queries

```typescript
// Date comparisons run against timestamp fields you store ON the value.
// (The wrapper's created / updated / expires timestamps are NOT queryable.)
await storage.query({
  createdAt: { $gt: new Date('2024-01-01').getTime() },
  updatedAt: { $lt: Date.now() - 86400000 } // 24 hours ago
});
```

## Advanced Queries

### Nested Object Queries

```typescript
// Query nested properties
await storage.query({
  'address.city': 'New York',
  'address.zip': { $regex: '^10' }
});

// Complex nested queries ($in checks array membership)
await storage.query({
  orders: {
    $in: [{
      status: 'completed',
      amount: { $gte: 100 }
    }]
  }
});
```

### Filtering by Key

`query()` matches the stored **value**, not the storage **key** — `{ key: { $regex: ... } }`
queries a property literally named `key` on your value (almost never what you want). To select by
key, list keys and filter them yourself, then read the ones you need:

```typescript
// Filter keys by pattern (query() cannot do this)
const userKeys = (await storage.keys()).filter((k) => k.startsWith('user:'));
const users = await Promise.all(userKeys.map((k) => storage.get(k)));

// Better: store a discriminator field on the value and query it
await storage.set('user:1', { type: 'user', name: 'John', status: 'active' });
const activeUsers = await storage.query({ type: 'user', status: 'active' });
```

### Querying Embedded Metadata

The record wrapper's `metadata` and byte `size` are **not** queryable. If you need to filter on such
attributes, embed them as ordinary fields on the value and query those by bare name:

```typescript
await storage.set('doc:1', {
  source: 'api',
  version: 3,
  payload: { /* ... */ }
});

await storage.query({
  source: 'api',
  version: { $gte: 2 }
});
```

## Query Options

```typescript
// Limit results
const top10 = await storage.query(condition, {
  limit: 10
});

// Skip results (pagination)
const page2 = await storage.query(condition, {
  skip: 20,
  limit: 10
});

// Sort results (sort keys are bare value-field names — the engine reads value.<field>)
const sorted = await storage.query(condition, {
  sort: {
    createdAt: -1, // Descending
    name: 1        // Ascending
  }
});
```

## Real-World Examples

### User Management

```typescript
class UserQuery {
  async findActiveUsers() {
    return await storage.query({
      type: 'user',
      status: 'active',
      lastLogin: {
        $gt: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    });
  }
  
  async findUsersByRole(role: string) {
    return await storage.query({
      type: 'user',
      roles: { $in: [role] }
    });
  }
  
  async findPremiumUsers() {
    return await storage.query({
      type: 'user',
      $or: [
        { subscription: 'premium' },
        { subscription: 'enterprise' }
      ]
    });
  }
}
```

### Product Catalog

```typescript
class ProductQuery {
  async searchProducts(criteria: SearchCriteria) {
    const query: QueryCondition = {
      type: 'product'
    };
    
    if (criteria.category) {
      query.category = criteria.category;
    }
    
    if (criteria.minPrice || criteria.maxPrice) {
      query.price = {
        $gte: criteria.minPrice || 0,
        $lte: criteria.maxPrice || Infinity
      };
    }
    
    if (criteria.inStock) {
      query.stock = { $gt: 0 };
    }
    
    if (criteria.tags?.length) {
      // `tags` is an array property on the product value
      query.tags = { $in: criteria.tags };
    }
    
    return await storage.query(query, {
      sort: { popularity: -1 },
      limit: criteria.limit || 20
    });
  }
}
```

### Analytics & Reporting

```typescript
class Analytics {
  async getDailyStats(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    return await storage.query({
      type: 'event',
      createdAt: { $gte: start.getTime(), $lte: end.getTime() }
    });
  }
  
  async getErrorLogs(severity: string) {
    return await storage.query({
      type: 'log',
      level: severity,
      resolved: false
    }, {
      sort: { createdAt: -1 },
      limit: 100
    });
  }
}
```

## Performance Optimization

### Indexing Strategy

```typescript
// Create indexes for frequently queried fields
const storage = new Strata({
  adapters: {
    indexedDB: {
      stores: {
        data: {
          indexes: [
            { name: 'status', keyPath: 'value.status' },
            { name: 'created', keyPath: 'created' },
            { name: 'tags', keyPath: 'tags', multiEntry: true }
          ]
        }
      }
    }
  }
});
```

### Query Optimization

```typescript
// query() scans every key in the selected storage and matches the decoded value,
// so keep conditions selective and cap the result set with `limit`.

// Good — selective conditions + a limit
await storage.query({
  type: 'user',
  status: 'active'
}, { limit: 50 });

// Costly — matches a large share of records
await storage.query({
  status: 'active'
});
```

### Caching Query Results

```typescript
class CachedQuery {
  private cache = new Map();
  
  async query(condition: QueryCondition, ttl = 60000) {
    const cacheKey = JSON.stringify(condition);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.results;
    }
    
    const results = await storage.query(condition);
    this.cache.set(cacheKey, {
      results,
      expires: Date.now() + ttl
    });
    
    return results;
  }
}
```

## Limitations

1. **No Joins**: Cannot join data across keys
2. **No Aggregation**: No sum, avg, count operations
3. **Memory Constraints**: Large result sets can impact performance
4. **Adapter Support**: Not all adapters support all query features

## Best Practices

1. **Use Key Prefixes**: Filter by key pattern when possible
2. **Limit Results**: Always use limits for large datasets
3. **Index Fields**: Create indexes for frequently queried fields
4. **Cache Results**: Cache query results when appropriate
5. **Test Performance**: Profile queries with large datasets

## See Also

- [API Reference - Query](../../api/features/query.md)
- [Storage Adapters](../../api/adapters/README.md)