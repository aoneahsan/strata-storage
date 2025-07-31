/**
 * React integration for Strata Storage
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Strata } from '@/core/Strata';
import type { StrataConfig, StorageOptions, StorageChange } from '@/types';

// Context
const StrataContext = createContext<Strata | null>(null);

// Provider Props
interface StrataProviderProps {
  children: React.ReactNode;
  config?: StrataConfig;
}

// Provider Component
export function StrataProvider({ children, config }: StrataProviderProps) {
  const [strata] = useState(() => new Strata(config));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    strata.initialize().then(() => setInitialized(true));
    return () => {
      strata.close();
    };
  }, [strata]);

  if (!initialized) {
    return null; // Or loading component
  }

  return <StrataContext.Provider value={strata}>{children}</StrataContext.Provider>;
}

// Core hook
export function useStrata() {
  const strata = useContext(StrataContext);
  if (!strata) {
    throw new Error('useStrata must be used within StrataProvider');
  }
  return strata;
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
  condition: any,
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
