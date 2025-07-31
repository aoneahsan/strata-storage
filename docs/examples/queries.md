# Query Examples

Examples of using MongoDB-like queries in Strata Storage.

## Basic Queries

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Find all users
const users = await storage.query({
  key: { $startsWith: 'user:' }
});

// Find active users
const activeUsers = await storage.query({
  key: { $startsWith: 'user:' },
  'value.status': 'active'
});
```

## Comparison Operators

```typescript
// Numeric comparisons
const adults = await storage.query({
  key: { $startsWith: 'user:' },
  'value.age': { $gte: 18 }
});

const priceRange = await storage.query({
  key: { $startsWith: 'product:' },
  'value.price': { $between: [10, 100] }
});

// String comparisons
const johnsons = await storage.query({
  'value.lastName': { $startsWith: 'John' }
});
```

## Complex Queries

```typescript
// AND condition
const premiumActiveUsers = await storage.query({
  $and: [
    { key: { $startsWith: 'user:' } },
    { 'value.status': 'active' },
    { 'value.subscription': 'premium' }
  ]
});

// OR condition
const adminsOrMods = await storage.query({
  key: { $startsWith: 'user:' },
  $or: [
    { 'value.role': 'admin' },
    { 'value.role': 'moderator' }
  ]
});

// Nested conditions
const complexQuery = await storage.query({
  $and: [
    { key: { $startsWith: 'order:' } },
    { 'value.status': 'completed' },
    {
      $or: [
        { 'value.total': { $gte: 1000 } },
        { 'value.priority': 'high' }
      ]
    }
  ]
});
```

## Array Queries

```typescript
// Array contains
const taggedPosts = await storage.query({
  key: { $startsWith: 'post:' },
  'value.tags': { $contains: 'javascript' }
});

// Array contains any
const multiTagged = await storage.query({
  'value.tags': { $containsAny: ['react', 'vue', 'angular'] }
});

// Array contains all
const requiredTags = await storage.query({
  'value.tags': { $containsAll: ['verified', 'featured'] }
});
```

## Date Queries

```typescript
// Recent items
const recent = await storage.query({
  'value.created': { 
    $after: Date.now() - 86400000 // Last 24 hours
  }
});

// Date range
const thisMonth = await storage.query({
  'value.date': {
    $between: [
      new Date('2024-01-01'),
      new Date('2024-01-31')
    ]
  }
});
```

## Query with Options

```typescript
// Pagination
const page2 = await storage.query({
  key: { $startsWith: 'user:' }
}, {
  skip: 20,
  limit: 20
});

// Sorting
const sortedProducts = await storage.query({
  key: { $startsWith: 'product:' }
}, {
  sort: {
    'value.price': -1,    // Descending
    'value.name': 1       // Ascending
  }
});

// Select specific fields
const userNames = await storage.query({
  key: { $startsWith: 'user:' }
}, {
  select: ['value.name', 'value.email']
});
```

## Real-World Examples

### User Search

```typescript
async function searchUsers(criteria: SearchCriteria) {
  const query: any = { key: { $startsWith: 'user:' } };
  
  if (criteria.name) {
    query['value.name'] = { 
      $matches: new RegExp(criteria.name, 'i') 
    };
  }
  
  if (criteria.minAge || criteria.maxAge) {
    query['value.age'] = {};
    if (criteria.minAge) query['value.age'].$gte = criteria.minAge;
    if (criteria.maxAge) query['value.age'].$lte = criteria.maxAge;
  }
  
  if (criteria.roles?.length) {
    query['value.role'] = { $in: criteria.roles };
  }
  
  return await storage.query(query, {
    limit: criteria.limit || 50
  });
}
```

### Analytics Queries

```typescript
async function getAnalytics(dateRange: DateRange) {
  // Get events in date range
  const events = await storage.query({
    key: { $startsWith: 'event:' },
    'value.timestamp': {
      $between: [dateRange.start, dateRange.end]
    }
  });
  
  // Group by type
  const grouped = events.reduce((acc, event) => {
    const type = event.value.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return grouped;
}
```

## Performance Tips

```typescript
// Use indexes for better performance
const storage = new Strata({
  adapters: {
    indexedDB: {
      indexes: [
        { name: 'status', keyPath: 'value.status' },
        { name: 'created', keyPath: 'value.created' }
      ]
    }
  }
});

// Use key prefixes to narrow search
const orders = await storage.query({
  key: { $startsWith: 'order:2024:' }, // Year prefix
  'value.status': 'pending'
});
```

## See Also

- [Query Guide](../guides/features/queries.md)
- [API Reference](../api/core/strata.md)
- [Performance Optimization](./performance.md)