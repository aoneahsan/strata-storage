import { useState, useEffect, useCallback, useRef } from 'react';
import { Strata } from 'strata-storage';
import type { StrataConfig, StorageChange } from 'strata-storage';

let storageInstance: Strata | null = null;

export function getStorage(): Strata {
  if (!storageInstance) {
    storageInstance = new Strata({
      sync: { enabled: true },
    } as StrataConfig);
  }
  return storageInstance;
}

export function useStorageInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const storage = getStorage();
        await storage.initialize();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize storage'));
      }
    };
    init();
  }, []);

  return { isReady, error, storage: isReady ? getStorage() : null };
}

export function useStorageValue<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const storage = getStorage();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    try {
      const stored = await storage.get<T>(key);
      setValue(stored ?? defaultValue);
    } catch {
      setValue(defaultValue);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();

    unsubscribeRef.current = storage.subscribe((change: StorageChange) => {
      if (change.key === key) {
        setValue((change.newValue as T) ?? defaultValue);
      }
    });

    return () => {
      unsubscribeRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    async (newValue: T) => {
      await storage.set(key, newValue);
      setValue(newValue);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  const remove = useCallback(async () => {
    await storage.remove(key);
    setValue(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, set, remove, loading };
}

export function useStorageSubscription(callback: (change: StorageChange) => void) {
  const storage = getStorage();

  useEffect(() => {
    const unsubscribe = storage.subscribe(callback);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
