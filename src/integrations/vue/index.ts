/**
 * Vue 3 integration for Strata Storage
 */

import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import type { Ref, ComputedRef, InjectionKey, App } from 'vue';
import { Strata } from '@/core/Strata';
import { registerWebAdapters } from '@/index';
import type { StrataConfig, StorageOptions, StorageChange, QueryCondition } from '@/types';
import { ValidationError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Injection key
const StrataKey: InjectionKey<Strata> = Symbol('strata');

// Plugin installation
export const StrataPlugin = {
  install(app: App, config?: StrataConfig) {
    // Register the standard web adapters so the classic plugin path works
    // without the caller having to register adapters.
    const strata = registerWebAdapters(new Strata(config));

    // Initialize asynchronously
    strata.initialize().catch(logger.error);

    // Provide globally
    app.provide(StrataKey, strata);

    // Add global properties
    app.config.globalProperties.$strata = strata;

    // Clean up on app unmount
    app.unmount = new Proxy(app.unmount, {
      apply(target, thisArg, argList) {
        strata.close();
        return Reflect.apply(target, thisArg, argList);
      },
    });
  },
};

// Composition API

/**
 * Use Strata instance
 */
export function useStrata(instance?: Strata): Strata {
  if (instance) return instance;
  const strata = inject(StrataKey);
  if (!strata) {
    throw new ValidationError(
      'Strata not provided. Install the plugin (app.use(StrataPlugin)) or, for ' +
        'provider-free usage, pass an instance or use createStrataComposables(instance).',
      { required: 'app.use(StrataPlugin, { config })' },
    );
  }
  return strata;
}

/**
 * Storage composable with reactive state
 */
export function useStorage<T = unknown>(
  key: string,
  defaultValue?: T,
  options?: StorageOptions,
  instance?: Strata,
): {
  value: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
  update: (value: T | null, options?: StorageOptions) => Promise<void>;
  remove: () => Promise<void>;
} {
  const strata = useStrata(instance);
  const value = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  // Load initial value
  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      const result = await strata.get<T>(key, options);
      value.value = result ?? defaultValue ?? null;
    } catch (e) {
      error.value = e as Error;
      value.value = defaultValue ?? null;
    } finally {
      loading.value = false;
    }
  };

  // Update value
  const update = async (newValue: T | null, updateOptions?: StorageOptions) => {
    loading.value = true;
    error.value = null;
    try {
      if (newValue === null) {
        await strata.remove(key, updateOptions ?? options);
      } else {
        await strata.set(key, newValue, updateOptions ?? options);
      }
      value.value = newValue;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  // Remove value
  const remove = async () => {
    await update(null);
  };

  // Subscribe to changes
  onMounted(() => {
    refresh();

    const unsubscribe = strata.subscribe((change: StorageChange) => {
      if (change.key === key) {
        void refresh();
      }
    }, options);

    onUnmounted(unsubscribe);
  });

  return {
    value,
    loading,
    error,
    refresh,
    update,
    remove,
  };
}

/**
 * Query composable
 */
export function useStorageQuery<T = unknown>(
  condition: QueryCondition,
  options?: StorageOptions,
  instance?: Strata,
): {
  data: Ref<Array<{ key: string; value: T }>>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
} {
  const strata = useStrata(instance);
  const data = ref<Array<{ key: string; value: T }>>([]) as Ref<Array<{ key: string; value: T }>>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  const refetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      const results = await strata.query<T>(condition, options);
      data.value = results;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  // Watch for condition changes
  watch(
    () => JSON.stringify(condition),
    () => refetch(),
    { immediate: true },
  );

  // Subscribe to any storage changes
  onMounted(() => {
    const unsubscribe = strata.subscribe(() => {
      refetch();
    }, options);

    onUnmounted(unsubscribe);
  });

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * TTL composable
 */
export function useStorageTTL(
  key: string,
  options?: StorageOptions,
  instance?: Strata,
): {
  ttl: ComputedRef<string | null>;
  milliseconds: Ref<number | null>;
  extendTTL: (extension: number) => Promise<void>;
  persist: () => Promise<void>;
} {
  const strata = useStrata(instance);
  const milliseconds = ref<number | null>(null);
  let intervalId: ReturnType<typeof setInterval>;

  const ttl = computed(() => {
    if (milliseconds.value === null || milliseconds.value <= 0) {
      return null;
    }
    return formatTTL(milliseconds.value);
  });

  const updateTTL = async () => {
    try {
      const remaining = await strata.getTTL(key, options);
      milliseconds.value = remaining;
    } catch {
      milliseconds.value = null;
    }
  };

  const extendTTL = async (extension: number) => {
    await strata.extendTTL(key, extension, options);
    await updateTTL();
  };

  const persist = async () => {
    await strata.persist(key, options);
    milliseconds.value = null;
  };

  onMounted(() => {
    updateTTL();
    intervalId = setInterval(updateTTL, 1000);
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return {
    ttl,
    milliseconds,
    extendTTL,
    persist,
  };
}

/**
 * Storage size composable
 */
export function useStorageSize(
  autoRefresh = false,
  refreshInterval = 5000,
  instance?: Strata,
): {
  size: Ref<number>;
  count: Ref<number>;
  formatted: ComputedRef<string>;
  refresh: () => Promise<void>;
} {
  const strata = useStrata(instance);
  const size = ref(0);
  const count = ref(0);
  let intervalId: ReturnType<typeof setInterval>;

  const formatted = computed(() => formatBytes(size.value));

  const refresh = async () => {
    const info = await strata.size();
    size.value = info.total;
    count.value = info.count;
  };

  onMounted(() => {
    refresh();
    if (autoRefresh) {
      intervalId = setInterval(refresh, refreshInterval);
    }
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return {
    size,
    count,
    formatted,
    refresh,
  };
}

/**
 * Bind the Strata composables to a specific instance — the provider-free,
 * no-plugin pattern. Use the returned composables in any component's setup()
 * without installing StrataPlugin.
 *
 * @example
 * ```ts
 * import { defineStorage } from 'strata-storage';
 * import { createStrataComposables } from 'strata-storage/vue';
 * const storage = defineStorage();
 * export const { useStorage } = createStrataComposables(storage);
 * ```
 */
export function createStrataComposables(strata: Strata) {
  return {
    useStorage: <T = unknown>(key: string, defaultValue?: T, options?: StorageOptions) =>
      useStorage<T>(key, defaultValue, options, strata),
    useStorageQuery: <T = unknown>(condition: QueryCondition, options?: StorageOptions) =>
      useStorageQuery<T>(condition, options, strata),
    useStorageTTL: (key: string, options?: StorageOptions) => useStorageTTL(key, options, strata),
    useStorageSize: (autoRefresh?: boolean, refreshInterval?: number) =>
      useStorageSize(autoRefresh, refreshInterval, strata),
  };
}

// Helper functions
function formatTTL(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Re-export types
export type { Strata, StrataConfig, StorageOptions };
