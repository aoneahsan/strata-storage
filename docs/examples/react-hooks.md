# React Hooks Examples

Examples of using Strata Storage with React hooks integration.

## Setup

```typescript
import { useStrata, StrataProvider } from 'strata-storage/react';

// Wrap your app
function App() {
  return (
    <StrataProvider config={{ namespace: 'my-app' }}>
      <YourApp />
    </StrataProvider>
  );
}
```

## Basic Hook Usage

### useStrata Hook

```typescript
function UserProfile() {
  const storage = useStrata();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    storage.get('current_user').then(setUser);
  }, []);
  
  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    await storage.set('current_user', updated);
    setUser(updated);
  };
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser({ name: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}
```

### useStorageValue Hook

```typescript
function Settings() {
  const [theme, setTheme] = useStorageValue('theme', 'light');
  const [language, setLanguage] = useStorageValue('language', 'en');
  
  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Spanish</option>
      </select>
    </div>
  );
}
```

## Advanced Patterns

### Persistent Form State

```typescript
function ContactForm() {
  const [formData, setFormData] = useStorageValue('contact_form_draft', {
    name: '',
    email: '',
    message: ''
  });
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitForm(formData);
    setFormData({ name: '', email: '', message: '' }); // Clear draft
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="Email"
      />
      <textarea
        value={formData.message}
        onChange={(e) => handleChange('message', e.target.value)}
        placeholder="Message"
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

### Shopping Cart with Sync

```typescript
function useShoppingCart() {
  const storage = useStrata();
  const [cart, setCart] = useState({ items: [], total: 0 });
  
  // Load cart on mount
  useEffect(() => {
    storage.get('shopping_cart').then(data => {
      if (data) setCart(data);
    });
  }, []);
  
  // Subscribe to changes from other tabs
  useEffect(() => {
    const unsubscribe = storage.subscribe((change) => {
      if (change.key === 'shopping_cart' && change.source === 'remote') {
        setCart(change.newValue);
      }
    });
    
    return unsubscribe;
  }, []);
  
  const addItem = async (item) => {
    const updated = {
      items: [...cart.items, item],
      total: cart.total + item.price
    };
    await storage.set('shopping_cart', updated);
    setCart(updated);
  };
  
  const removeItem = async (itemId) => {
    const item = cart.items.find(i => i.id === itemId);
    const updated = {
      items: cart.items.filter(i => i.id !== itemId),
      total: cart.total - (item?.price || 0)
    };
    await storage.set('shopping_cart', updated);
    setCart(updated);
  };
  
  return { cart, addItem, removeItem };
}

// Usage
function ShoppingCart() {
  const { cart, addItem, removeItem } = useShoppingCart();
  
  return (
    <div>
      <h2>Cart ({cart.items.length} items)</h2>
      {cart.items.map(item => (
        <div key={item.id}>
          {item.name} - ${item.price}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <div>Total: ${cart.total}</div>
    </div>
  );
}
```

### Auth State Management

```typescript
function useAuth() {
  const storage = useStrata();
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check auth on mount
    storage.get('auth_token').then(token => {
      setAuth(token ? { token } : null);
      setLoading(false);
    });
    
    // Listen for auth changes
    const unsubscribe = storage.subscribe((change) => {
      if (change.key === 'auth_token') {
        setAuth(change.newValue ? { token: change.newValue } : null);
      }
    });
    
    return unsubscribe;
  }, []);
  
  const login = async (credentials) => {
    const response = await api.login(credentials);
    await storage.set('auth_token', response.token, {
      encrypt: true,
      ttl: 7200000 // 2 hours
    });
    setAuth({ token: response.token });
  };
  
  const logout = async () => {
    await storage.remove('auth_token');
    setAuth(null);
  };
  
  return { auth, loading, login, logout };
}

// Auth Provider
function AuthProvider({ children }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Offline Queue

```typescript
function useOfflineQueue() {
  const storage = useStrata();
  const [queue, setQueue] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Load queue
    storage.get('offline_queue').then(data => {
      if (data) setQueue(data);
    });
    
    // Monitor online status
    const handleOnline = () => {
      setOnline(true);
      processQueue();
    };
    
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const addToQueue = async (action) => {
    const updated = [...queue, { ...action, id: Date.now() }];
    await storage.set('offline_queue', updated);
    setQueue(updated);
    
    if (online) processQueue();
  };
  
  const processQueue = async () => {
    const pending = await storage.get('offline_queue') || [];
    
    for (const action of pending) {
      try {
        await processAction(action);
        // Remove from queue
        const remaining = pending.filter(a => a.id !== action.id);
        await storage.set('offline_queue', remaining);
        setQueue(remaining);
      } catch (error) {
        console.error('Failed to process:', action);
        break; // Stop on first failure
      }
    }
  };
  
  return { addToQueue, queue, online };
}
```

### Query Hook

```typescript
function useStorageQuery(condition, deps = []) {
  const storage = useStrata();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    storage.query(condition)
      .then(setResults)
      .finally(() => setLoading(false));
  }, deps);
  
  return { results, loading };
}

// Usage
function UserList() {
  const [role, setRole] = useState('user');
  const { results: users, loading } = useStorageQuery({
    key: { $startsWith: 'user:' },
    'value.role': role
  }, [role]);
  
  return (
    <div>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="user">Users</option>
        <option value="admin">Admins</option>
      </select>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.key}>{user.value.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Custom Hooks

### usePersistentState

```typescript
function usePersistentState(key, initialValue, options = {}) {
  const storage = useStrata();
  const [state, setState] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  
  // Load initial value
  useEffect(() => {
    storage.get(key).then(value => {
      if (value !== null) setState(value);
      setLoaded(true);
    });
  }, [key]);
  
  // Update storage when state changes
  useEffect(() => {
    if (loaded) {
      storage.set(key, state, options);
    }
  }, [state, loaded]);
  
  return [state, setState, loaded];
}
```

### useEncryptedStorage

```typescript
function useEncryptedStorage(password) {
  const baseStorage = useStrata();
  
  const storage = useMemo(() => ({
    set: (key, value) => baseStorage.set(key, value, { 
      encrypt: true, 
      encryptionPassword: password 
    }),
    get: (key) => baseStorage.get(key, { 
      encryptionPassword: password 
    }),
    remove: (key) => baseStorage.remove(key)
  }), [password]);
  
  return storage;
}
```

## TypeScript Support

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function useTypedStorage<T>(key: string, defaultValue: T) {
  const storage = useStrata();
  const [value, setValue] = useState<T>(defaultValue);
  
  useEffect(() => {
    storage.get<T>(key).then(data => {
      if (data) setValue(data);
    });
  }, [key]);
  
  const updateValue = async (newValue: T) => {
    await storage.set(key, newValue);
    setValue(newValue);
  };
  
  return [value, updateValue] as const;
}

// Usage
const [user, setUser] = useTypedStorage<User>('current_user', {
  id: '',
  name: '',
  email: ''
});
```

## See Also

- [Vue Composables](./vue-composables.md)
- [Angular Services](./angular-services.md)
- [React Integration](./frameworks/react.md)