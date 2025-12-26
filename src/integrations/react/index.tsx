/**
 * React integration for Strata Storage
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactElement,
} from 'react';
import { Strata } from '@/core/Strata';
import type { StrataConfig, StorageOptions, StorageChange, QueryCondition } from '@/types';
import { ValidationError } from '@/utils/errors';

// Context
interface StrataContextValue {
  strata: Strata | null;
  initialized: boolean;
}

const StrataContext = createContext<StrataContextValue>({
  strata: null,
  initialized: false,
});

// Provider Props
interface StrataProviderProps {
  children: React.ReactNode;
  config?: StrataConfig;
  loadingComponent?: React.ReactNode;
  fallback?: React.ReactNode;
}

// Provider Component
export function StrataProvider({
  children,
  config,
  loadingComponent,
  fallback,
}: StrataProviderProps) {
  const [strata] = useState(() => new Strata(config));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    strata.initialize().then(() => setInitialized(true));
    return () => {
      strata.close();
    };
  }, [strata]);

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

// Core hook
export function useStrata() {
  const { strata, initialized } = useContext(StrataContext);
  if (!initialized || !strata) {
    throw new ValidationError(
      'useStrata hook must be used within StrataProvider and wait for initialization',
      {
        hook: 'useStrata',
        requiredProvider: 'StrataProvider',
      },
    );
  }
  return strata;
}

// Hook to check initialization status
export function useStrataInitialized(): boolean {
  const { initialized } = useContext(StrataContext);
  return initialized;
}

// Storage hook with real-time updates
export function useStorage<T = unknown>(
  key: string,
  defaultValue?: T,
  options?: StorageOptions,
): [T | null, (value: T | null, options?: StorageOptions) => Promise<void>, boolean] {
  const strata = useStrata();
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial value
  useEffect(() => {
    strata.get<T>(key, options).then((val) => {
      setValue(val ?? defaultValue ?? null);
      setLoading(false);
    });
  }, [key, strata, options, defaultValue]);

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = strata.subscribe((change: StorageChange) => {
      if (change.key === key) {
        setValue(change.newValue as T);
      }
    }, options);

    return unsubscribe;
  }, [key, strata, options]);

  // Update function
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

// Query hook
export function useStorageQuery<T = unknown>(
  condition: QueryCondition,
  options?: StorageOptions,
): { data: Array<{ key: string; value: T }>; loading: boolean; refetch: () => Promise<void> } {
  const strata = useStrata();
  const [data, setData] = useState<Array<{ key: string; value: T }>>([]);
  const [loading, setLoading] = useState(true);

  const conditionKey = useMemo(() => JSON.stringify(condition), [condition]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const results = await strata.query<T>(condition, options);
      setData(results);
    } finally {
      setLoading(false);
    }
  }, [strata, condition, options]);

  // Initial fetch
  useEffect(() => {
    fetch();
  }, [conditionKey, fetch]);

  // Subscribe to any changes and refetch
  useEffect(() => {
    const unsubscribe = strata.subscribe(() => {
      fetch();
    }, options);

    return unsubscribe;
  }, [strata, fetch, options]);

  return { data, loading, refetch: fetch };
}

// TTL hook
export function useStorageTTL(key: string, options?: StorageOptions) {
  const strata = useStrata();
  const [ttl, setTTL] = useState<number | null>(null);

  useEffect(() => {
    const checkTTL = async () => {
      const remaining = await strata.getTTL(key, options);
      setTTL(remaining);
    };

    checkTTL();
    const interval = setInterval(checkTTL, 1000); // Update every second

    return () => clearInterval(interval);
  }, [key, strata, options]);

  const extendTTL = useCallback(
    async (extension: number) => {
      await strata.extendTTL(key, extension, options);
      const newTTL = await strata.getTTL(key, options);
      setTTL(newTTL);
    },
    [key, strata, options],
  );

  const persist = useCallback(async () => {
    await strata.persist(key, options);
    setTTL(null);
  }, [key, strata, options]);

  return { ttl, extendTTL, persist };
}
