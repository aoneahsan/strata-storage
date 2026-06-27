# Query API

Advanced querying and filtering capabilities for stored data.

## Overview

Strata Storage includes a zero-dependency query engine with MongoDB-like operators. A query matches against the **decoded user value** — the exact object you passed to `set()` — using **bare field names** (e.g. `{ price: { $gte: 10 } }`, or a dot path like `{ 'address.city': 'NYC' }` for a nested field).

The single query method is `query(condition, options?)`. It returns an array of `{ key, value }` objects.

> **What is NOT queryable.** `query()` only sees the stored value. The wrapper fields `key`, `tags`, `created`, `updated`, `expires`, and `metadata` are **not** queryable — a condition like `{ tags: { $in: ['work'] } }` or `{ 'value.price': 1 }` matches nothing. To filter by key, use `storage.keys(pattern)`; to act on tagged items, use `storage.clear({ tags: ['work'] })`.

> There is **no** `queryKeys()` or `queryValues()` method. Derive keys/values by mapping over the results: `(await storage.query(...)).map(r => r.key)`.

> Query needs **no configuration** — there is no `query` config block. Just `set()` your data and call `query()`.

## Quick example

```typescript
import { defineStorage } from 'strata-storage';

const storage = defineStorage();

await storage.set('user:1', { name: 'John', age: 30, role: 'admin' });
await storage.set('user:2', { name: 'Jane', age: 25, role: 'user' });
await storage.set('user:3', { name: 'Bob', age: 35, role: 'user' });

// Match against the stored value with bare field names + operators
const results = await storage.query({
  role: 'user',
  age: { $gte: 30 },
});
// → [{ key: 'user:3', value: { name: 'Bob', age: 35, role: 'user' } }]
```

## Storing data

`query()` filters on the fields **inside** the stored value, so put anything you want to filter on into the value object:

```typescript
await storage.set('doc1', { title: 'Meeting Notes', category: 'work', priority: 1 });
await storage.set('doc2', { title: 'Personal Reminder', category: 'personal', priority: 3 });
await storage.set('doc3', { title: 'Project Plan', category: 'work', priority: 2 });
```

> The `set()` `tags` option (`{ tags: ['work'] }`) is still useful, but tagged items are selected via `storage.clear({ tags })`, not `query()`.

## Supported Operators

The query engine supports **only** these operators:

| Operator | Meaning |
|----------|---------|
| `$eq` / `$ne` | Equals / not equals |
| `$gt` / `$gte` / `$lt` / `$lte` | Numeric / string / date comparison |
| `$in` / `$nin` | Value is (not) one of an array; for an array-valued field (e.g. a `roles` array inside the value), matches when the field contains any listed value |
| `$regex` | Regular-expression match on a string field |
| `$exists` | Field is present / absent |
| `$type` | Field is of a JS type (`'string'`, `'number'`, `'array'`, `'date'`, ...) |
| `$and` / `$or` / `$not` | Logical composition of sub-conditions |

> There is **no** `$startsWith`, `$endsWith`, `$contains`, or `$between`. Use `$regex` for prefix (`{ $regex: '^value' }`) or substring (`{ $regex: 'value' }`) matching, and `$gte` + `$lte` for ranges.

## query(condition, options?)

Query data based on a condition:

```typescript
const results = await storage.query({
  category: 'work'
});

console.log(results);
// [
//   { key: 'doc1', value: {...} },
//   { key: 'doc3', value: {...} }
// ]
```

Get only the matching keys or values by mapping the results:

```typescript
const matches = await storage.query({ category: 'work' });
const keys = matches.map(r => r.key);     // ['doc1', 'doc3']
const values = matches.map(r => r.value); // [{...}, {...}]
```

## Query Examples

### Filtering by key (not via `query()`)

`query()` cannot filter by key — `key` is a wrapper field, not part of the stored value. Use `storage.keys(pattern)` to match keys instead:

```typescript
// Keys starting with 'user:'
await storage.keys('user:');

// Keys matching a RegExp
await storage.keys(/^user:.*$/);
```

### Match value fields

Use bare field names; for a nested field use a dot path from the value root (e.g. `'address.city'`).

```typescript
// Price between 10 and 100 (ranges use $gte + $lte)
await storage.query({
  price: { $gte: 10, $lte: 100 }
});

// Substring match on a value field (substring matching uses $regex)
await storage.query({
  title: { $regex: 'Meeting' }
});

// Field presence and type
await storage.query({
  email: { $exists: true, $type: 'string' }
});

// Nested field
await storage.query({
  'address.city': 'NYC'
});
```

### Logical composition

```typescript
// AND across value fields
await storage.query({
  $and: [
    { category: 'work' },
    { priority: { $lte: 2 } }
  ]
});

// OR
await storage.query({
  $or: [
    { category: 'work' },
    { category: 'project' }
  ]
});

// NOT
await storage.query({
  $not: { category: 'archived' }
});
```

> **Tags are not queryable.** A condition on `tags` matches nothing. To act on tagged items use `storage.clear({ tags: ['work'] })`.

### Combine criteria

```typescript
// Multiple value fields are ANDed together
await storage.query({
  status: 'published',
  category: 'work'
});
```

## Query Options

`query()` accepts an optional second argument for sorting, pagination, and projection. Use **bare value field names** everywhere (the engine resolves them against the stored value).

```typescript
interface QueryOptions {
  sort?: string | Record<string, 1 | -1>; // bare value field(s); 1 = asc, -1 = desc
  skip?: number;                          // skip N results (pagination)
  limit?: number;                         // cap result count
  select?: string[];                      // project only these value fields
}
// `storage?: StorageType` (from StorageOptions) is also accepted to restrict the query to one backend.
```

```typescript
// Page 2 of work docs, highest priority first, only the title field
await storage.query(
  { category: 'work' },
  { sort: { priority: -1 }, skip: 20, limit: 10, select: ['title'] }
);
```

## Real-World Example

```typescript
import { defineStorage, type Strata } from 'strata-storage';

interface Doc {
  title: string;
  category: string;
  createdAt: number;
}

class DocumentStore {
  private storage: Strata = defineStorage();

  async saveDocument(id: string, doc: Doc) {
    // Put filterable fields inside the value
    await this.storage.set(`doc:${id}`, doc);
  }

  async findByCategory(category: string) {
    return this.storage.query<Doc>({ category });
  }

  async findWorkDocuments() {
    return this.storage.query<Doc>(
      { category: 'work' },
      { sort: { createdAt: -1 } }
    );
  }

  async searchByTitle(term: string) {
    // Substring matching uses $regex
    return this.storage.query<Doc>({
      title: { $regex: term }
    });
  }
}

// Usage
const docs = new DocumentStore();
await docs.saveDocument('1', { title: 'Plan', category: 'work', createdAt: Date.now() });
const work = await docs.findWorkDocuments();
```

## Performance

- `query()` reads and decodes every key in the target adapter, then filters in memory — there is no index.
- Narrow the working set first: pick one backend with `{ storage }`, or pre-filter keys with `storage.keys(pattern)`.
- Use `limit` / `skip` to paginate large result sets.

## API Reference

```typescript
// Each field maps to a literal value or an operators object.
type QueryCondition = {
  [field: string]: unknown | QueryOperators;
};

interface QueryOperators {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number | string;
  $gte?: number | string;
  $lt?: number | string;
  $lte?: number | string;
  $in?: unknown[];
  $nin?: unknown[];
  $regex?: string | RegExp;
  $exists?: boolean;
  $type?: string;
  $and?: QueryCondition[];
  $or?: QueryCondition[];
  $not?: QueryCondition;
}

// query() resolves to:
type QueryResult<T> = Array<{ key: string; value: T }>;
```

## See Also

- [TTL API](./ttl.md)
- [Sync API](./sync.md)
- [Migration API](./migration.md)
