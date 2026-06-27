# Query Examples

Examples of using MongoDB-like queries in Strata Storage.

## Basic Queries

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Find all users (query() matches the stored value by bare field name, not the
// storage key — store a discriminator like `type` on the value and query it)
const users = await storage.query({
  type: 'user'
});

// Find active users
const activeUsers = await storage.query({
  type: 'user',
  status: 'active'
});
```

## Comparison Operators

```typescript
// Numeric comparisons
const adults = await storage.query({
  type: 'user',
  age: { $gte: 18 }
});

const priceRange = await storage.query({
  type: 'product',
  price: { $gte: 10, $lte: 100 }
});

// String comparisons
const johnsons = await storage.query({
  lastName: { $regex: '^John' }
});
```

## Complex Queries

```typescript
// AND condition
const premiumActiveUsers = await storage.query({
  $and: [
    { type: 'user' },
    { status: 'active' },
    { subscription: 'premium' }
  ]
});

// OR condition
const adminsOrMods = await storage.query({
  type: 'user',
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ]
});

// Nested conditions
const complexQuery = await storage.query({
  $and: [
    { type: 'order' },
    { status: 'completed' },
    {
      $or: [
        { total: { $gte: 1000 } },
        { priority: 'high' }
      ]
    }
  ]
});
```

## Array Queries

```typescript
// Array contains ($in matches when the array holds any listed element).
// `tags` here is an array property ON the post value.
const taggedPosts = await storage.query({
  type: 'post',
  tags: { $in: ['javascript'] }
});

// Array contains any
const multiTagged = await storage.query({
  tags: { $in: ['react', 'vue', 'angular'] }
});

// Array contains all — $and of memberships
const requiredTags = await storage.query({
  // $containsAll = every tag present
  $and: [
    { tags: { $in: ['verified'] } },
    { tags: { $in: ['featured'] } }
  ]
});
```

## Date Queries

```typescript
// Recent items (createdAt is a timestamp field on the stored value)
const recent = await storage.query({
  createdAt: { 
    $gt: Date.now() - 86400000 // Last 24 hours
  }
});

// Date range (inclusive — combined operators are AND-ed)
const thisMonth = await storage.query({
  date: {
    $gte: new Date('2024-01-01'),
    $lte: new Date('2024-01-31')
  }
});
```

## Query with Options

```typescript
// Pagination
const page2 = await storage.query({
  type: 'user'
}, {
  skip: 20,
  limit: 20
});

// Sorting (sort keys are bare value-field names)
const sortedProducts = await storage.query({
  type: 'product'
}, {
  sort: {
    price: -1,    // Descending
    name: 1       // Ascending
  }
});

// Select specific fields (bare value-field names)
const userNames = await storage.query({
  type: 'user'
}, {
  select: ['name', 'email']
});
```

## Real-World Examples

### User Search

```typescript
async function searchUsers(criteria: SearchCriteria) {
  const query: any = { type: 'user' };
  
  if (criteria.name) {
    query.name = { 
      $regex: new RegExp(criteria.name, 'i') 
    };
  }
  
  if (criteria.minAge || criteria.maxAge) {
    query.age = {};
    if (criteria.minAge) query.age.$gte = criteria.minAge;
    if (criteria.maxAge) query.age.$lte = criteria.maxAge;
  }
  
  if (criteria.roles?.length) {
    query.role = { $in: criteria.roles };
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
    type: 'event',
    timestamp: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  });
  
  // Group by category
  const grouped = events.reduce((acc, event) => {
    const category = event.value.category;
    acc[category] = (acc[category] || 0) + 1;
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

// Narrow the scan with selective value-field conditions
const orders = await storage.query({
  type: 'order',
  year: 2024,
  status: 'pending'
});
```

## See Also

- [Query Guide](../guides/features/queries.md)
- [API Reference](../api/core/strata.md)
- [Performance Optimization](./performance.md)