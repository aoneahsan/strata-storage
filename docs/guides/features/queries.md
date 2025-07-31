# Query Guide

Guide for using MongoDB-like queries to search and filter data in Strata Storage.

## Overview

Strata Storage provides a powerful query engine that supports complex filtering, similar to MongoDB's query syntax.

## Quick Start

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Simple query
const users = await storage.query({
  'value.age': { $gte: 18 }
});

// Complex query
const results = await storage.query({
  $and: [
    { 'value.status': 'active' },
    { tags: { $contains: 'premium' } },
    { created: { $after: new Date('2024-01-01') } }
  ]
});
```

## Query Syntax

### Basic Queries

```typescript
// Exact match
await storage.query({ 'value.name': 'John' });

// Multiple conditions (implicit AND)
await storage.query({
  'value.age': { $gte: 18 },
  'value.city': 'New York'
});
```

### Comparison Operators

```typescript
// Numeric comparisons
await storage.query({
  'value.age': { $gt: 18 },      // Greater than
  'value.age': { $gte: 18 },     // Greater than or equal
  'value.age': { $lt: 65 },      // Less than
  'value.age': { $lte: 65 },     // Less than or equal
  'value.age': { $eq: 25 },      // Equal
  'value.age': { $ne: 25 }       // Not equal
});

// Range query
await storage.query({
  'value.price': { $between: [10, 100] }
});
```

### String Operators

```typescript
// String matching
await storage.query({
  'value.name': { $startsWith: 'John' },
  'value.email': { $endsWith: '@example.com' },
  'value.description': { $contains: 'important' }
});

// Regular expression
await storage.query({
  'value.username': { $matches: /^user_\d+$/ }
});
```

### Array Operators

```typescript
// Array contains
await storage.query({
  tags: { $contains: 'featured' }
});

// Array contains any
await storage.query({
  tags: { $containsAny: ['premium', 'featured'] }
});

// Array contains all
await storage.query({
  tags: { $containsAll: ['verified', 'premium'] }
});

// Array length
await storage.query({
  'value.items': { $length: { $gte: 5 } }
});
```

### Logical Operators

```typescript
// AND
await storage.query({
  $and: [
    { 'value.status': 'active' },
    { 'value.age': { $gte: 18 } }
  ]
});

// OR
await storage.query({
  $or: [
    { 'value.role': 'admin' },
    { 'value.role': 'moderator' }
  ]
});

// NOT
await storage.query({
  $not: { 'value.status': 'deleted' }
});
```

### Date Queries

```typescript
// Date comparisons
await storage.query({
  created: { $after: new Date('2024-01-01') },
  updated: { $before: Date.now() - 86400000 }, // 24 hours ago
  expires: { $between: [new Date(), new Date('2024-12-31')] }
});
```

## Advanced Queries

### Nested Object Queries

```typescript
// Query nested properties
await storage.query({
  'value.address.city': 'New York',
  'value.address.zip': { $startsWith: '10' }
});

// Complex nested queries
await storage.query({
  'value.orders': {
    $contains: {
      status: 'completed',
      amount: { $gte: 100 }
    }
  }
});
```

### Key Pattern Matching

```typescript
// Query by key pattern
await storage.query({
  key: { $startsWith: 'user:' }
});

// Regex key matching
await storage.query({
  key: { $matches: /^order_\d{8}$/ }
});
```

### Metadata Queries

```typescript
// Query by metadata
await storage.query({
  metadata: {
    source: 'api',
    version: { $gte: 2 }
  }
});

// Query by size
await storage.query({
  size: { $lte: 1024 * 1024 } // Less than 1MB
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

// Sort results
const sorted = await storage.query(condition, {
  sort: {
    'value.created': -1, // Descending
    'value.name': 1      // Ascending
  }
});
```

## Real-World Examples

### User Management

```typescript
class UserQuery {
  async findActiveUsers() {
    return await storage.query({
      key: { $startsWith: 'user:' },
      'value.status': 'active',
      'value.lastLogin': { 
        $after: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    });
  }
  
  async findUsersByRole(role: string) {
    return await storage.query({
      key: { $startsWith: 'user:' },
      'value.roles': { $contains: role }
    });
  }
  
  async findPremiumUsers() {
    return await storage.query({
      key: { $startsWith: 'user:' },
      $or: [
        { 'value.subscription': 'premium' },
        { 'value.subscription': 'enterprise' }
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
      key: { $startsWith: 'product:' }
    };
    
    if (criteria.category) {
      query['value.category'] = criteria.category;
    }
    
    if (criteria.minPrice || criteria.maxPrice) {
      query['value.price'] = {
        $gte: criteria.minPrice || 0,
        $lte: criteria.maxPrice || Infinity
      };
    }
    
    if (criteria.inStock) {
      query['value.stock'] = { $gt: 0 };
    }
    
    if (criteria.tags?.length) {
      query.tags = { $containsAny: criteria.tags };
    }
    
    return await storage.query(query, {
      sort: { 'value.popularity': -1 },
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
      key: { $startsWith: 'event:' },
      created: { $between: [start, end] }
    });
  }
  
  async getErrorLogs(severity: string) {
    return await storage.query({
      key: { $startsWith: 'log:' },
      'value.level': severity,
      'value.resolved': false
    }, {
      sort: { created: -1 },
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
// Use specific queries
// Good - specific key prefix
await storage.query({
  key: { $startsWith: 'user:' },
  'value.status': 'active'
});

// Bad - scans all items
await storage.query({
  'value.status': 'active'
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
- [Storage Adapters](../../api/adapters/)
- [Performance Guide](../performance.md)