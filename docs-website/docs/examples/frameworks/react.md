# React Framework Examples

Examples of using Strata Storage with React applications.

## Installation

```bash
yarn add strata-storage
```

`react` is an optional peer dependency (`>= 19.2.3`) — install it as you normally would.

## Provider-Free Usage (recommended, 2.5.0+)

The simplest pattern needs no `<StrataProvider>`. Create one instance with `defineStorage()` and bind the hooks to it with `createStrataHooks()` at module scope, then use them anywhere.

```tsx
// storage.ts
import { defineStorage } from 'strata-storage';
import { createStrataHooks } from 'strata-storage/react';

export const storage = defineStorage({ defaultStorages: ['indexedDB', 'localStorage'] });
export const { useStorage, useStorageQuery, useStorageTTL } = createStrataHooks(storage);
```

`createStrataHooks(instance)` returns three hooks:

- `useStorage<T>(key, defaultValue?, options?)` → `[value, setValue, loading]`. `setValue(null)` removes the key. Re-renders on cross-tab/other changes to that key.
- `useStorageQuery<T>(condition, options?)` → `{ data, loading, refetch }`.
- `useStorageTTL(key, options?)` → `{ ttl, extendTTL, persist }` where `ttl` is milliseconds remaining (or `null`).

```tsx
// Settings.tsx
import { useStorage } from './storage';

function Settings() {
  const [theme, setTheme, loading] = useStorage<string>('theme', 'light');

  if (loading) return <p>Loading…</p>;

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Theme: {theme}
    </button>
  );
}
```

You can also call the operations on the instance directly — it works immediately, no `initialize()` required:

```tsx
import { storage } from './storage';

await storage.set('lastSeen', Date.now());
const lastSeen = await storage.get<number>('lastSeen');
```

## Provider-Based Setup (classic)

The Provider style still works. As of `2.5.0`, `<StrataProvider>` accepts an `instance` prop so it can wrap an instance you created yourself; pass `config` instead to let it build one. Components then read the instance from context via the exported `useStorage`, `useStorageQuery`, `useStorageTTL`, and `useStrata` hooks.

```tsx
import React from 'react';
import { StrataProvider } from 'strata-storage/react';
import { storage } from './storage';

function App() {
  return (
    // Wrap an existing instance…
    <StrataProvider instance={storage}>
      <YourApp />
    </StrataProvider>
  );
}

// …or let the Provider create one from config:
// <StrataProvider config={{ defaultStorages: ['indexedDB', 'localStorage'] }}> … </StrataProvider>
```

When created from `config`, the Provider initializes the instance and closes it on unmount; when given an `instance`, it never closes a caller-owned instance. `useStrata()` throws if called outside a Provider — for provider-free code, use `createStrataHooks()` instead.

## Hook Examples

### useStrata Hook

```tsx
import { useStrata } from 'strata-storage/react';

function MyComponent() {
  const storage = useStrata();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Load data on mount
    storage.get('my-data').then(setData);
  }, [storage]);

  const saveData = async (newData) => {
    await storage.set('my-data', newData);
    setData(newData);
  };

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => saveData({ updated: Date.now() })}>
        Update Data
      </button>
    </div>
  );
}
```

### useStorage Hook

`useStorage<T>(key, defaultValue?, options?)` returns `[value, setValue, loading]`. `value` is always `T | null` (null while the first read resolves, even when a `defaultValue` is passed), so guard on `loading` and fall back to the default in the markup.

```tsx
import { useStorage } from './storage';

function Settings() {
  const [theme, setTheme, loadingTheme] = useStorage<string>('theme', 'light');
  const [language, setLanguage, loadingLang] = useStorage<string>('language', 'en');
  const [notifications, setNotifications, loadingNotif] = useStorage<boolean>('notifications', true);

  if (loadingTheme || loadingLang || loadingNotif) return <p>Loading…</p>;

  return (
    <div>
      <label>
        Theme:
        <select value={theme ?? 'light'} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </label>

      <label>
        Language:
        <select value={language ?? 'en'} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={notifications ?? true}
          onChange={(e) => setNotifications(e.target.checked)}
        />
        Enable Notifications
      </label>
    </div>
  );
}
```

### Lists & Objects (useStorage)

```tsx
import { useState } from 'react';
import { useStorage } from './storage';

interface Todo { id: number; text: string; completed: boolean }

function TodoList() {
  const [todos, setTodos, loading] = useStorage<Todo[]>('todos', []);
  const [input, setInput] = useState('');

  if (loading || todos === null) return <p>Loading…</p>;

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: input,
        completed: false
      }]);
      setInput('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo}>Add Todo</button>
      </div>
      
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{
              textDecoration: todo.completed ? 'line-through' : 'none'
            }}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Advanced Patterns

### Encrypted Storage

There is no dedicated encryption hook — pass the encryption options (`encrypt`, `encryptionPassword`) per call on the instance.

```tsx
import { useState } from 'react';
import { storage } from './storage';

function SecureData() {
  const [data, setData] = useState(null);
  const [pwd, setPwd] = useState('');

  const unlock = async () => {
    const secureData = await storage.get('secure-data', { encryptionPassword: pwd });
    setData(secureData);
  };

  const saveSecure = async (value) => {
    await storage.set('secure-data', value, { encrypt: true, encryptionPassword: pwd });
    setData(value);
  };

  return (
    <div>
      {!data ? (
        <div>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Enter password"
          />
          <button onClick={unlock}>Unlock</button>
        </div>
      ) : (
        <div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <button onClick={() => saveSecure({ 
            secret: 'Updated at ' + new Date().toISOString() 
          })}>
            Update Secure Data
          </button>
        </div>
      )}
    </div>
  );
}
```

### Query Hook

`useStorageQuery<T>(condition, options?)` returns `{ data, loading, refetch }` and re-runs automatically when storage changes. The condition matches the **decoded value** by bare field names (no `value.` prefix; the key is not part of the condition).

```tsx
import { useState } from 'react';
import { useStorageQuery } from './storage';

interface User { name: string; email: string; role: string }

function UserList() {
  const [role, setRole] = useState('user');
  const { data: users, loading } = useStorageQuery<User>({ role });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="user">Users</option>
        <option value="admin">Admins</option>
        <option value="moderator">Moderators</option>
      </select>

      <ul>
        {users.map(({ key, value }) => (
          <li key={key}>
            {value.name} ({value.email}) - {value.role}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Cross-Tab Sync

There is no separate sync hook — `useStorage` already re-renders when the key changes in another tab. Cross-tab updates for the web adapters arrive as `source: 'remote'` and the hook re-reads automatically.

```tsx
import { useStorage } from './storage';

interface Counter { count: number; lastUpdated: string | null }

function SyncedComponent() {
  const [value, setValue, loading] = useStorage<Counter>('shared-state', {
    count: 0,
    lastUpdated: null
  });

  if (loading || value === null) return <p>Loading…</p>;

  const increment = () => {
    setValue({
      count: value.count + 1,
      lastUpdated: new Date().toISOString()
    });
  };

  return (
    <div>
      <h3>Count: {value.count}</h3>
      <p>Last Updated: {value.lastUpdated || 'Never'}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Form Persistence

A draft form auto-persists by storing the whole values object under one key with `useStorage`.

```tsx
import { useStorage } from './storage';

interface ContactValues { name?: string; email?: string; message?: string }

function ContactForm() {
  const [values, setValues, loading] = useStorage<ContactValues>('contact-form', {});

  if (loading || values === null) return <p>Loading…</p>;

  const isDirty = Object.keys(values).length > 0;
  const updateValue = (field: keyof ContactValues, value: string) =>
    setValues({ ...values, [field]: value });
  const clearForm = () => setValues({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Submit form
    await submitForm(values);
    await clearForm();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name || ''}
        onChange={(e) => updateValue('name', e.target.value)}
        placeholder="Name"
      />
      
      <input
        name="email"
        type="email"
        value={values.email || ''}
        onChange={(e) => updateValue('email', e.target.value)}
        placeholder="Email"
      />
      
      <textarea
        name="message"
        value={values.message || ''}
        onChange={(e) => updateValue('message', e.target.value)}
        placeholder="Message"
        rows={5}
      />
      
      <div>
        <button type="submit">Submit</button>
        {isDirty && (
          <button type="button" onClick={clearForm}>
            Clear Draft
          </button>
        )}
      </div>
      
      {isDirty && <p>Draft saved automatically</p>}
    </form>
  );
}
```

## Sharing State Across Components

You don't need a separate context — any components that read the same key with `useStorage` stay in sync, because Strata broadcasts changes to every bound hook.

```tsx
import { useStorage } from './storage';

interface UserData {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

const DEFAULT_USER: UserData = {
  id: '',
  name: '',
  email: '',
  preferences: { theme: 'light', notifications: true },
};

function UserProfile() {
  const [user, setUser, loading] = useStorage<UserData>('user-data', DEFAULT_USER);

  if (loading || user === null) return <p>Loading…</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>

      <button onClick={() => setUser({
        ...user,
        preferences: {
          ...user.preferences,
          theme: user.preferences.theme === 'light' ? 'dark' : 'light'
        }
      })}>
        Toggle Theme
      </button>
    </div>
  );
}
```

## Performance Optimization

There are no `useStorageMemo`/`useStorageCallback` hooks — combine `useStorage` with React's built-in `useMemo`/`useCallback`.

```tsx
import { useMemo, useCallback } from 'react';
import { useStorage, storage } from './storage';

function OptimizedComponent() {
  const [rawData, , loading] = useStorage<number[]>('large-dataset', []);

  // Re-compute only when the stored dataset changes.
  const processedData = useMemo(
    () => (rawData ? processData(rawData) : null),
    [rawData],
  );

  // A stable callback that appends to a stored list.
  const addDataPoint = useCallback(async (point: number) => {
    const current = (await storage.get<number[]>('data')) ?? [];
    await storage.set('data', [...current, point]);
  }, []);

  return (
    <div>
      {!loading && processedData && (
        <DataVisualization data={processedData} />
      )}
      <button onClick={() => addDataPoint(Date.now())}>
        Add Data Point
      </button>
    </div>
  );
}
```

## Testing

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { defineStorage } from 'strata-storage';
import { createStrataHooks } from 'strata-storage/react';

describe('useStorage', () => {
  const storage = defineStorage({ namespace: 'test' });
  const { useStorage } = createStrataHooks(storage);

  it('should persist value', async () => {
    const { result } = renderHook(() => useStorage<string>('test-key', 'initial'));

    // value is null while the first read resolves (result.current[2] === loading)
    await waitFor(() => expect(result.current[2]).toBe(false));
    expect(result.current[0]).toBe('initial');

    await act(async () => {
      await result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
  });
});
```

## Best Practices

1. **Pick one wiring style**: provider-free `createStrataHooks(instance)` (recommended, 2.5.0+) **or** wrap your tree in `<StrataProvider>` — you don't need both.
2. **Handle Loading States**: hooks return `null` until the first read resolves — guard on `loading` and null-check before use.
3. **Error Boundaries**: Wrap storage operations in error boundaries
4. **Type Safety**: Use TypeScript for better type inference
5. **Cleanup**: Provider-bound hooks unsubscribe automatically; clean up any manual `subscribe()` calls in `useEffect` cleanup

## See Also

- [React Hooks Example](../react-hooks.md)
- [Vue Examples](./vue.md)
- [Angular Examples](./angular.md)
- [Basic Usage](../basic-usage.md)