# Vue Composables Examples

Custom Vue 3 composables for Strata Storage integration.

## Basic Storage Composable

```typescript
import { ref, Ref, watch, onMounted } from 'vue';
import { Strata } from 'strata-storage';

const storage = new Strata();

export function useStorage<T>(
  key: string,
  defaultValue: T,
  options?: { sync?: boolean }
): [Ref<T>, (value: T) => Promise<void>] {
  const data = ref<T>(defaultValue);
  
  // Load initial value
  onMounted(async () => {
    const stored = await storage.get(key);
    if (stored !== null) {
      data.value = stored;
    }
  });
  
  // Update function
  const setData = async (value: T) => {
    data.value = value;
    await storage.set(key, value);
  };
  
  // Optional sync
  if (options?.sync) {
    storage.subscribe((change) => {
      if (change.key === key && change.source === 'remote') {
        data.value = change.newValue;
      }
    });
  }
  
  return [data as Ref<T>, setData];
}
```

## Reactive Storage State

```typescript
import { reactive, toRefs } from 'vue';

export function useStorageState() {
  const state = reactive({
    user: null as User | null,
    preferences: {} as Preferences,
    isLoading: true
  });
  
  const storage = new Strata();
  
  // Initialize
  async function init() {
    state.isLoading = true;
    try {
      const [user, preferences] = await Promise.all([
        storage.get('user'),
        storage.get('preferences')
      ]);
      
      state.user = user;
      state.preferences = preferences || {};
    } finally {
      state.isLoading = false;
    }
  }
  
  // Actions
  async function updateUser(user: User | null) {
    state.user = user;
    await storage.set('user', user);
  }
  
  async function updatePreferences(prefs: Partial<Preferences>) {
    state.preferences = { ...state.preferences, ...prefs };
    await storage.set('preferences', state.preferences);
  }
  
  init();
  
  return {
    ...toRefs(state),
    updateUser,
    updatePreferences
  };
}
```

## Persisted Ref

```typescript
import { ref, watch, Ref, UnwrapRef } from 'vue';

export function usePersistedRef<T>(
  key: string,
  defaultValue: T,
  options?: {
    storage?: string;
    encrypt?: boolean;
    compress?: boolean;
  }
): Ref<UnwrapRef<T>> {
  const storage = new Strata();
  const data = ref<T>(defaultValue);
  
  // Load from storage
  storage.get(key).then(stored => {
    if (stored !== null) {
      data.value = stored;
    }
  });
  
  // Watch for changes
  watch(data, async (newValue) => {
    await storage.set(key, newValue, options);
  }, { deep: true });
  
  return data;
}
```

## Cache Composable

```typescript
import { ref, computed } from 'vue';

export function useCache<T>() {
  const storage = new Strata();
  const cache = ref<Map<string, T>>(new Map());
  const loading = ref<Set<string>>(new Set());
  
  const isLoading = (key: string) => loading.value.has(key);
  
  async function get(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300000
  ): Promise<T> {
    // Check memory cache
    if (cache.value.has(key)) {
      return cache.value.get(key)!;
    }
    
    // Check storage cache
    const stored = await storage.get(key);
    if (stored !== null) {
      cache.value.set(key, stored);
      return stored;
    }
    
    // Fetch new data
    loading.value.add(key);
    try {
      const data = await fetcher();
      cache.value.set(key, data);
      await storage.set(key, data, { ttl });
      return data;
    } finally {
      loading.value.delete(key);
    }
  }
  
  function invalidate(key: string) {
    cache.value.delete(key);
    storage.remove(key);
  }
  
  return {
    get,
    invalidate,
    isLoading,
    cache: computed(() => cache.value)
  };
}
```

## Form Persistence

```typescript
import { ref, watch } from 'vue';
import { debounce } from 'lodash-es';

export function useFormPersistence(formKey: string) {
  const storage = new Strata();
  const formData = ref<any>({});
  const isDirty = ref(false);
  
  // Load saved form data
  onMounted(async () => {
    const saved = await storage.get(formKey);
    if (saved) {
      formData.value = saved;
    }
  });
  
  // Auto-save with debounce
  const saveForm = debounce(async (data: any) => {
    await storage.set(formKey, data);
    isDirty.value = false;
  }, 1000);
  
  watch(formData, (newData) => {
    isDirty.value = true;
    saveForm(newData);
  }, { deep: true });
  
  async function clearForm() {
    formData.value = {};
    isDirty.value = false;
    await storage.remove(formKey);
  }
  
  return {
    formData,
    isDirty,
    clearForm
  };
}
```

## Query Composable

```typescript
import { ref, computed } from 'vue';

export function useStorageQuery() {
  const storage = new Strata();
  const results = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  
  async function query(
    filter: any,
    options?: QueryOptions
  ) {
    loading.value = true;
    error.value = null;
    
    try {
      results.value = await storage.query(filter, options);
    } catch (e) {
      error.value = e as Error;
      results.value = [];
    } finally {
      loading.value = false;
    }
  }
  
  const count = computed(() => results.value.length);
  
  const groupBy = (key: string) => {
    return results.value.reduce((acc, item) => {
      const group = item.value[key];
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  };
  
  return {
    query,
    results: computed(() => results.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    count,
    groupBy
  };
}
```

## Sync State Composable

```typescript
import { ref, onUnmounted } from 'vue';

export function useSyncedState<T>(
  key: string,
  initialValue: T
) {
  const storage = new Strata({ sync: { enabled: true } });
  const state = ref<T>(initialValue);
  const isSyncing = ref(false);
  
  // Load initial value
  storage.get(key).then(stored => {
    if (stored !== null) {
      state.value = stored;
    }
  });
  
  // Subscribe to changes
  const unsubscribe = storage.subscribe((change) => {
    if (change.key === key) {
      isSyncing.value = true;
      state.value = change.newValue;
      setTimeout(() => {
        isSyncing.value = false;
      }, 100);
    }
  });
  
  // Update function
  async function updateState(value: T) {
    state.value = value;
    await storage.set(key, value);
  }
  
  onUnmounted(() => {
    unsubscribe();
  });
  
  return {
    state,
    updateState,
    isSyncing
  };
}
```

## Storage Provider

```typescript
// storage-provider.ts
import { provide, inject, InjectionKey } from 'vue';
import { Strata } from 'strata-storage';

const StorageKey: InjectionKey<Strata> = Symbol('storage');

export function provideStorage(config?: StrataConfig) {
  const storage = new Strata(config);
  provide(StorageKey, storage);
  return storage;
}

export function useStorageProvider() {
  const storage = inject(StorageKey);
  if (!storage) {
    throw new Error('Storage not provided');
  }
  return storage;
}

// App.vue
import { provideStorage } from './storage-provider';

export default {
  setup() {
    provideStorage({
      namespace: 'my-app',
      defaultStorages: ['indexedDB', 'localStorage']
    });
  }
};
```

## See Also

- [Vue Integration](./frameworks/vue.md)
- [React Hooks](./react-hooks.md)
- [Angular Services](./angular-services.md)