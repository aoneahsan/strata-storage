# React Framework Examples

Comprehensive examples of using Strata Storage with React applications.

## Installation

```bash
npm install strata-storage
# or
yarn add strata-storage
```

## Basic Setup

```tsx
import React from 'react';
import { StrataProvider } from 'strata-storage/react';

function App() {
  return (
    <StrataProvider config={{
      namespace: 'my-app',
      defaultStorages: ['indexedDB', 'localStorage']
    }}>
      <YourApp />
    </StrataProvider>
  );
}
```

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

### useStorageValue Hook

```tsx
import { useStorageValue } from 'strata-storage/react';

function Settings() {
  const [theme, setTheme] = useStorageValue('theme', 'light');
  const [language, setLanguage] = useStorageValue('language', 'en');
  const [notifications, setNotifications] = useStorageValue('notifications', true);

  return (
    <div>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </label>

      <label>
        Language:
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
        />
        Enable Notifications
      </label>
    </div>
  );
}
```

### useStorageState Hook

```tsx
import { useStorageState } from 'strata-storage/react';

function TodoList() {
  const [todos, setTodos] = useStorageState('todos', []);
  const [input, setInput] = useState('');

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

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
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

### Encrypted Storage Hook

```tsx
import { useEncryptedStorage } from 'strata-storage/react';

function SecureData() {
  const { storage, setPassword } = useEncryptedStorage();
  const [data, setData] = useState(null);
  const [pwd, setPwd] = useState('');

  const unlock = async () => {
    setPassword(pwd);
    const secureData = await storage.get('secure-data');
    setData(secureData);
  };

  const saveSecure = async (value) => {
    await storage.set('secure-data', value);
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

```tsx
import { useStorageQuery } from 'strata-storage/react';

function UserList() {
  const [filter, setFilter] = useState({ role: 'user' });
  const { data: users, loading, error } = useStorageQuery({
    key: { $startsWith: 'user:' },
    'value.role': filter.role
  }, [filter]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <select onChange={(e) => setFilter({ role: e.target.value })}>
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

### Sync Hook

```tsx
import { useStorageSync } from 'strata-storage/react';

function SyncedComponent() {
  const { value, setValue, synced, lastSync } = useStorageSync('shared-state', {
    count: 0,
    lastUpdated: null
  });

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
      <p>Sync Status: {synced ? '✅ Synced' : '⏳ Syncing'}</p>
      <p>Last Sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Form Persistence

```tsx
import { useFormPersistence } from 'strata-storage/react';

function ContactForm() {
  const { values, updateValue, clearForm, isDirty } = useFormPersistence('contact-form');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Submit form
    await submitForm(values);
    clearForm();
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

## Context Pattern

```tsx
// Create a typed context
import { createStorageContext } from 'strata-storage/react';

interface UserData {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

const UserContext = createStorageContext<UserData>('user-data');

// Provider component
function UserProvider({ children }) {
  return (
    <UserContext.Provider defaultValue={{
      id: '',
      name: '',
      email: '',
      preferences: {
        theme: 'light',
        notifications: true
      }
    }}>
      {children}
    </UserContext.Provider>
  );
}

// Consumer component
function UserProfile() {
  const { value: user, updateValue } = UserContext.useContext();

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      
      <button onClick={() => updateValue({
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

```tsx
import { useStorageMemo, useStorageCallback } from 'strata-storage/react';

function OptimizedComponent() {
  const storage = useStrata();
  
  // Memoize expensive computations based on storage data
  const processedData = useStorageMemo(
    async () => {
      const rawData = await storage.get('large-dataset');
      return processData(rawData); // Expensive operation
    },
    ['large-dataset'], // Re-compute when this key changes
    null // Default value
  );

  // Memoize callbacks that depend on storage
  const updateData = useStorageCallback(
    async (newData) => {
      const current = await storage.get('data') || [];
      await storage.set('data', [...current, newData]);
    },
    [] // Dependencies
  );

  return (
    <div>
      {processedData && (
        <DataVisualization data={processedData} />
      )}
      <button onClick={() => updateData({ timestamp: Date.now() })}>
        Add Data Point
      </button>
    </div>
  );
}
```

## Testing

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { StrataProvider, useStorageValue } from 'strata-storage/react';

describe('useStorageValue', () => {
  const wrapper = ({ children }) => (
    <StrataProvider config={{ namespace: 'test' }}>
      {children}
    </StrataProvider>
  );

  it('should persist value', async () => {
    const { result } = renderHook(
      () => useStorageValue('test-key', 'initial'),
      { wrapper }
    );

    expect(result.current[0]).toBe('initial');

    await act(async () => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
  });
});
```

## Best Practices

1. **Use the Provider**: Always wrap your app with `StrataProvider`
2. **Handle Loading States**: Storage operations are asynchronous
3. **Error Boundaries**: Wrap storage operations in error boundaries
4. **Type Safety**: Use TypeScript for better type inference
5. **Cleanup**: Unsubscribe from storage events in useEffect cleanup

## See Also

- [React Hooks API](../../api/integrations/react.md)
- [Vue Examples](./vue.md)
- [Angular Examples](./angular.md)
- [Basic Usage](../basic-usage.md)