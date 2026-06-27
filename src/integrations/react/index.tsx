/**
 * React integration for Strata Storage.
 *
 * Two usage styles, both fully supported:
 *
 * 1. No-provider (Zustand-style, recommended): create an instance anywhere and
 *    bind hooks to it with `createStrataHooks` — no Provider required.
 *
 *    ```tsx
 *    import { defineStorage } from 'strata-storage';
 *    import { createStrataHooks } from 'strata-storage/react';
 *    const storage = defineStorage();
 *    export const { useStorage } = createStrataHooks(storage);
 *    ```
 *
 * 2. Provider-based (classic): wrap the tree in <StrataProvider> and call the
 *    exported hooks, which read the instance from context.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Strata } from '@/core/Strata';
import { registerWebAdapters } from '@/index';
import type { StrataConfig, StorageOptions, StorageChange, QueryCondition } from '@/types';
import { ValidationError } from '@/utils/errors';

// ---------------------------------------------------------------------------
// Shared hook implementations (the Strata instance is passed in explicitly).
// Both the no-provider hooks and the Provider-based hooks delegate here, so the
// logic lives in exactly one place.
// ---------------------------------------------------------------------------

function useStorageImpl<T = unknown>(
  strata: Strata,
  key: string,
  defaultValue?: T,
  options?: StorageOptions,
): [T | null, (value: T | null, options?: StorageOptions) => Promise<void>, boolean] {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the initial value.
  useEffect(() => {
    let active = true;
    strata.get<T>(key, options).then((val) => {
      if (!active) return;
      setValue(val ?? defaultValue ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [key, strata, options, defaultValue]);

  // Subscribe to changes for this key.
  useEffect(() => {
    let active = true;
    const unsubscribe = strata.subscribe((change: StorageChange) => {
      if (change.key === key) {
        void strata.get<T>(key, options).then((val) => {
          if (active) setValue(val ?? defaultValue ?? null);
        });
      }
    }, options);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, strata, options, defaultValue]);

  const updateValue = useCallback(
    async (newValue: T | null, updateOptions?: StorageOptions) => {
      if (newValue === null) {
        await strata.remove(key, updateOptions ?? options);
      } else {
        await strata.set(key, newValue, updateOptions ?? options);
      }
      setValue(newValue);
    },
    [key, strata, options],
  );

  return [value, updateValue, loading];
}

function useStorageQueryImpl<T = unknown>(
  strata: Strata,
  condition: QueryCondition,
  options?: StorageOptions,
): { data: Array<{ key: string; value: T }>; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<Array<{ key: string; value: T }>>([]);
  const [loading, setLoading] = useState(true);
  const conditionKey = useMemo(() => JSON.stringify(condition), [condition]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setData(await strata.query<T>(condition, options));
    } finally {
      setLoading(false);
    }
  }, [strata, condition, options]);

  useEffect(() => {
    void refetch();
  }, [conditionKey, refetch]);

  useEffect(() => {
    return strata.subscribe(() => {
      void refetch();
    }, options);
  }, [strata, refetch, options]);

  return { data, loading, refetch };
}

function useStorageTTLImpl(strata: Strata, key: string, options?: StorageOptions) {
  const [ttl, setTTL] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const checkTTL = async () => {
      const remaining = await strata.getTTL(key, options);
      if (active) setTTL(remaining);
    };
    void checkTTL();
    const interval = setInterval(() => void checkTTL(), 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [key, strata, options]);

  const extendTTL = useCallback(
    async (extension: number) => {
      await strata.extendTTL(key, extension, options);
      setTTL(await strata.getTTL(key, options));
    },
    [key, strata, options],
  );

  const persist = useCallback(async () => {
    await strata.persist(key, options);
    setTTL(null);
  }, [key, strata, options]);

  return { ttl, extendTTL, persist };
}

// ---------------------------------------------------------------------------
// No-provider API — bind the hooks to an explicit instance (Zustand-style).
// ---------------------------------------------------------------------------

/**
 * Bind the Strata hooks to a specific instance — the framework-agnostic,
 * no-Provider pattern (mirrors Zustand's `create`). Call once at module scope
 * and use the returned hooks in any component, no Provider needed.
 *
 * @example
 * ```tsx
 * const storage = defineStorage();
 * export const { useStorage, useStorageQuery, useStorageTTL } =
 *   createStrataHooks(storage);
 * ```
 */
export function createStrataHooks(strata: Strata) {
  function useStorage<T = unknown>(key: string, defaultValue?: T, options?: StorageOptions) {
    return useStorageImpl<T>(strata, key, defaultValue, options);
  }
  function useStorageQuery<T = unknown>(condition: QueryCondition, options?: StorageOptions) {
    return useStorageQueryImpl<T>(strata, condition, options);
  }
  function useStorageTTL(key: string, options?: StorageOptions) {
    return useStorageTTLImpl(strata, key, options);
  }
  return { useStorage, useStorageQuery, useStorageTTL };
}

// ---------------------------------------------------------------------------
// Provider-based API (classic).
// ---------------------------------------------------------------------------

interface StrataContextValue {
  strata: Strata | null;
  initialized: boolean;
}

const StrataContext = createContext<StrataContextValue>({
  strata: null,
  initialized: false,
});

interface StrataProviderProps {
  children: React.ReactNode;
  config?: StrataConfig;
  /** Provide an existing instance instead of creating one from `config`. */
  instance?: Strata;
  loadingComponent?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StrataProvider({
  children,
  config,
  instance,
  loadingComponent,
  fallback,
}: StrataProviderProps) {
  // A caller-provided instance is used as-is; otherwise build one WITH the
  // standard web adapters registered, so the classic Provider path works without
  // the caller having to register adapters (avoids "No available storage adapters").
  const [strata] = useState(() => instance ?? registerWebAdapters(new Strata(config)));
  const [initialized, setInitialized] = useState(strata.isInitialized);

  useEffect(() => {
    let active = true;
    strata.initialize().then(() => {
      if (active) setInitialized(true);
    });
    return () => {
      active = false;
      // Only close instances this provider created — never a caller-owned one.
      if (!instance) {
        void strata.close();
      }
    };
  }, [strata, instance]);

  const value = useMemo(
    () => ({
      strata: initialized ? strata : null,
      initialized,
    }),
    [strata, initialized],
  );

  if (!initialized && (loadingComponent || fallback)) {
    return (loadingComponent ?? fallback) as React.ReactElement;
  }

  return <StrataContext.Provider value={value}>{children}</StrataContext.Provider>;
}

export function useStrata(): Strata {
  const { strata, initialized } = useContext(StrataContext);
  if (!initialized || !strata) {
    throw new ValidationError(
      'useStrata must be used within <StrataProvider>. For provider-free usage, ' +
        'create an instance with defineStorage() and bind hooks via createStrataHooks(instance).',
      {
        hook: 'useStrata',
        requiredProvider: 'StrataProvider',
      },
    );
  }
  return strata;
}

export function useStrataInitialized(): boolean {
  return useContext(StrataContext).initialized;
}

export function useStorage<T = unknown>(
  key: string,
  defaultValue?: T,
  options?: StorageOptions,
): [T | null, (value: T | null, options?: StorageOptions) => Promise<void>, boolean] {
  return useStorageImpl<T>(useStrata(), key, defaultValue, options);
}

export function useStorageQuery<T = unknown>(condition: QueryCondition, options?: StorageOptions) {
  return useStorageQueryImpl<T>(useStrata(), condition, options);
}

export function useStorageTTL(key: string, options?: StorageOptions) {
  return useStorageTTLImpl(useStrata(), key, options);
}
