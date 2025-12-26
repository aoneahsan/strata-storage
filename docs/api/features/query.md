# Query API

Advanced querying and filtering capabilities for stored data.

## Overview

Strata Storage includes a powerful query engine that allows you to search and filter stored data using tags, patterns, and custom filters. This is particularly useful for applications that store large amounts of structured data.

## Configuration

Enable query features:

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  query: {
    enabled: true,
    indexTags: true // Enable tag indexing for faster queries
  }
});

await storage.initialize();
```

## Storing Data with Tags

### Add Tags When Storing

```typescript
await storage.set('doc1', { title: 'Meeting Notes', content: '...' }, {
  tags: ['work', 'important', '2024']
});

await storage.set('doc2', { title: 'Personal Reminder', content: '...' }, {
  tags: ['personal', '2024']
});

await storage.set('doc3', { title: 'Project Plan', content: '...' }, {
  tags: ['work', 'project', 'draft']
});
```

### Update Tags

```typescript
// Get current data
const doc = await storage.get('doc1');

// Update with new tags
await storage.set('doc1', doc, {
  tags: ['work', 'important', '2024', 'archived']
});
```

## Query Methods

### query(criteria)

Query data based on criteria:

```typescript
const results = await storage.query({
  tags: { contains: 'work' }
});

console.log(results);
// [
//   { key: 'doc1', value: {...}, tags: ['work', 'important', '2024'] },
//   { key: 'doc3', value: {...}, tags: ['work', 'project', 'draft'] }
// ]
```

### queryKeys(criteria)

Get only the keys matching criteria:

```typescript
const keys = await storage.queryKeys({
  tags: { contains: 'work' }
});

console.log(keys); // ['doc1', 'doc3']
```

### queryValues(criteria)

Get only the values matching criteria:

```typescript
const values = await storage.queryValues({
  tags: { contains: 'work' }
});

console.log(values);
// [
//   { title: 'Meeting Notes', content: '...' },
//   { title: 'Project Plan', content: '...' }
// ]
```

## Query Criteria

### Tag-Based Queries

#### Contains Single Tag

```typescript
// Documents containing 'work' tag
await storage.query({
  tags: { contains: 'work' }
});
```

#### Contains All Tags

```typescript
// Documents containing ALL specified tags
await storage.query({
  tags: { containsAll: ['work', 'important'] }
});
```

#### Contains Any Tags

```typescript
// Documents containing ANY of the specified tags
await storage.query({
  tags: { containsAny: ['work', 'personal'] }
});
```

#### Excludes Tags

```typescript
// Documents NOT containing specified tags
await storage.query({
  tags: { excludes: ['archived', 'draft'] }
});
```

### Pattern-Based Queries

#### Key Pattern Matching

```typescript
// Keys starting with 'user:'
await storage.query({
  keyPattern: '^user:'
});

// Keys ending with ':config'
await storage.query({
  keyPattern: ':config$'
});

// Keys containing 'temp'
await storage.query({
  keyPattern: 'temp'
});
```

#### Value Pattern Matching

```typescript
// Values containing specific text
await storage.query({
  valuePattern: {
    field: 'title',
    pattern: 'Meeting'
  }
});
```

### Custom Filter Functions

```typescript
// Filter using custom function
await storage.query({
  filter: (key, value, tags) => {
    return value.priority > 5 && tags.includes('active');
  }
});
```

### Combined Criteria

```typescript
// Combine multiple criteria
await storage.query({
  tags: { containsAll: ['work', '2024'] },
  keyPattern: '^doc',
  filter: (key, value) => value.status === 'published'
});
```

## Query Options

### Limit Results

```typescript
// Get first 10 results
await storage.query(
  { tags: { contains: 'work' } },
  { limit: 10 }
);
```

### Skip Results (Pagination)

```typescript
// Skip first 20, get next 10
await storage.query(
  { tags: { contains: 'work' } },
  { skip: 20, limit: 10 }
);
```

### Sort Results

```typescript
// Sort by key
await storage.query(
  { tags: { contains: 'work' } },
  { sortBy: 'key', order: 'asc' }
);

// Sort by custom field
await storage.query(
  { tags: { contains: 'work' } },
  {
    sortBy: (a, b) => a.value.priority - b.value.priority,
    order: 'desc'
  }
);
```

## Real-World Examples

### Document Management System

```typescript
class DocumentStore {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      query: { enabled: true, indexTags: true }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async saveDocument(id: string, doc: any, tags: string[]) {
    await this.storage.set(`doc:${id}`, doc, { tags });
  }

  async findByTag(tag: string) {
    return await this.storage.query({
      tags: { contains: tag },
      keyPattern: '^doc:'
    });
  }

  async findWorkDocuments() {
    return await this.storage.query({
      tags: { contains: 'work' },
      keyPattern: '^doc:'
    }, {
      sortBy: (a, b) => b.value.createdAt - a.value.createdAt
    });
  }

  async findDrafts() {
    return await this.storage.query({
      tags: { contains: 'draft' }
    });
  }

  async searchByTitle(query: string) {
    return await this.storage.query({
      filter: (key, value) => {
        return value.title?.toLowerCase().includes(query.toLowerCase());
      }
    });
  }
}

// Usage
const docs = new DocumentStore();
await docs.init();

await docs.saveDocument('1', {
  title: 'Q1 Report',
  content: '...',
  createdAt: Date.now()
}, ['work', 'report', '2024']);

const workDocs = await docs.findWorkDocuments();
const results = await docs.searchByTitle('report');
```

### Task Manager

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  priority: number;
  dueDate: number;
}

class TaskManager {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      query: { enabled: true }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async addTask(task: Task, tags: string[]) {
    await this.storage.set(`task:${task.id}`, task, { tags });
  }

  async getTasksByStatus(status: Task['status']) {
    return await this.storage.query({
      keyPattern: '^task:',
      filter: (key, value) => value.status === status
    });
  }

  async getHighPriorityTasks() {
    return await this.storage.query({
      keyPattern: '^task:',
      filter: (key, value) => value.priority >= 8
    }, {
      sortBy: (a, b) => b.value.priority - a.value.priority
    });
  }

  async getOverdueTasks() {
    const now = Date.now();
    return await this.storage.query({
      keyPattern: '^task:',
      filter: (key, value) => {
        return value.dueDate < now && value.status !== 'done';
      }
    });
  }

  async getTasksByProject(projectId: string) {
    return await this.storage.query({
      tags: { contains: `project:${projectId}` }
    });
  }
}

// Usage
const tasks = new TaskManager();
await tasks.init();

await tasks.addTask({
  id: '1',
  title: 'Fix bug',
  description: '...',
  status: 'todo',
  priority: 9,
  dueDate: Date.now() + 86400000
}, ['urgent', 'project:alpha']);

const urgent = await tasks.getHighPriorityTasks();
const overdue = await tasks.getOverdueTasks();
```

### User Preferences System

```typescript
class PreferencesManager {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      query: { enabled: true }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async setPreference(userId: string, category: string, key: string, value: any) {
    await this.storage.set(`pref:${userId}:${category}:${key}`, value, {
      tags: [userId, category]
    });
  }

  async getUserPreferences(userId: string) {
    return await this.storage.query({
      tags: { contains: userId },
      keyPattern: `^pref:${userId}:`
    });
  }

  async getCategoryPreferences(userId: string, category: string) {
    return await this.storage.query({
      tags: { containsAll: [userId, category] },
      keyPattern: `^pref:${userId}:${category}:`
    });
  }

  async resetCategoryPreferences(userId: string, category: string) {
    const prefs = await this.getCategoryPreferences(userId, category);
    for (const pref of prefs) {
      await this.storage.remove(pref.key);
    }
  }
}

// Usage
const prefs = new PreferencesManager();
await prefs.init();

await prefs.setPreference('user123', 'ui', 'theme', 'dark');
await prefs.setPreference('user123', 'ui', 'language', 'en');
await prefs.setPreference('user123', 'notifications', 'email', true);

const uiPrefs = await prefs.getCategoryPreferences('user123', 'ui');
```

### Analytics & Logging

```typescript
interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

class LogStore {
  private storage: Strata;

  constructor() {
    this.storage = new Strata({
      query: { enabled: true, indexTags: true }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async log(entry: LogEntry) {
    const id = `${entry.timestamp}-${Math.random()}`;
    await this.storage.set(`log:${id}`, entry, {
      tags: [entry.level, new Date(entry.timestamp).toISOString().split('T')[0]],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  async getLogsByLevel(level: LogEntry['level']) {
    return await this.storage.query({
      tags: { contains: level },
      keyPattern: '^log:'
    }, {
      sortBy: (a, b) => b.value.timestamp - a.value.timestamp
    });
  }

  async getLogsByDate(date: string) {
    return await this.storage.query({
      tags: { contains: date },
      keyPattern: '^log:'
    });
  }

  async getRecentErrors(limit = 10) {
    return await this.storage.query({
      tags: { contains: 'error' }
    }, {
      limit,
      sortBy: (a, b) => b.value.timestamp - a.value.timestamp
    });
  }

  async searchLogs(query: string) {
    return await this.storage.query({
      keyPattern: '^log:',
      filter: (key, value) => {
        return value.message.toLowerCase().includes(query.toLowerCase());
      }
    });
  }
}

// Usage
const logs = new LogStore();
await logs.init();

await logs.log({
  timestamp: Date.now(),
  level: 'error',
  message: 'Database connection failed',
  metadata: { code: 'ECONNREFUSED' }
});

const errors = await logs.getRecentErrors(10);
const todayLogs = await logs.getLogsByDate('2024-12-26');
```

## Performance Optimization

### Enable Tag Indexing

```typescript
const storage = new Strata({
  query: {
    enabled: true,
    indexTags: true // Build index for faster tag queries
  }
});
```

### Use Specific Queries

```typescript
// ❌ SLOW - Queries all data
await storage.query({
  filter: (key, value) => value.category === 'work'
});

// ✅ FAST - Uses tag index
await storage.query({
  tags: { contains: 'work' }
});
```

### Limit Results

```typescript
// Get only what you need
await storage.query(
  { tags: { contains: 'work' } },
  { limit: 20 }
);
```

## API Reference

### QueryCriteria Interface

```typescript
interface QueryCriteria {
  tags?: {
    contains?: string;
    containsAll?: string[];
    containsAny?: string[];
    excludes?: string | string[];
  };
  keyPattern?: string | RegExp;
  valuePattern?: {
    field: string;
    pattern: string | RegExp;
  };
  filter?: (key: string, value: any, tags?: string[]) => boolean;
}
```

### QueryOptions Interface

```typescript
interface QueryOptions {
  limit?: number;
  skip?: number;
  sortBy?: 'key' | 'value' | ((a: QueryResult, b: QueryResult) => number);
  order?: 'asc' | 'desc';
}
```

### QueryResult Interface

```typescript
interface QueryResult {
  key: string;
  value: any;
  tags?: string[];
  metadata?: {
    createdAt: number;
    updatedAt: number;
    size: number;
  };
}
```

## Best Practices

1. **Use Tag Indexing**: Enable for better query performance
2. **Limit Results**: Always use pagination for large datasets
3. **Prefer Tags Over Filters**: Tag queries are faster
4. **Use Specific Patterns**: More specific = faster queries
5. **Clean Up Old Data**: Use TTL to auto-remove old entries

## See Also

- [TTL API](./ttl.md)
- [Sync API](./sync.md)
- [Migration API](./migration.md)
