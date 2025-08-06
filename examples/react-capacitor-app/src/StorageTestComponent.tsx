import React, { useState, useEffect } from 'react';
import { Strata, storage, MemoryAdapter, LocalStorageAdapter, SessionStorageAdapter, IndexedDBAdapter, CacheAdapter, CookieAdapter } from 'strata-storage';
import './StorageTest.css';

interface TestResult {
  adapter: string;
  status: 'testing' | 'success' | 'error';
  message?: string;
  operations?: {
    set?: boolean;
    get?: boolean;
    remove?: boolean;
    clear?: boolean;
    keys?: boolean;
    size?: boolean;
    subscribe?: boolean;
    query?: boolean;
  };
}

const StorageTestComponent: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customStorage, setCustomStorage] = useState<Strata | null>(null);

  // Initialize storage
  useEffect(() => {
    const initStorage = async () => {
      try {
        // First ensure the singleton is initialized
        if (!storage.isInitialized) {
          await storage.initialize();
        }
        setIsInitialized(true);

        // Create a custom instance with all adapters
        const custom = new Strata({
          defaultStorages: ['memory', 'localStorage', 'sessionStorage', 'indexedDB', 'cache', 'cookies'],
        });

        // Register all adapters
        custom.registerAdapter(new MemoryAdapter());
        custom.registerAdapter(new LocalStorageAdapter());
        custom.registerAdapter(new SessionStorageAdapter());
        custom.registerAdapter(new IndexedDBAdapter());
        custom.registerAdapter(new CacheAdapter());
        custom.registerAdapter(new CookieAdapter());

        await custom.initialize();
        setCustomStorage(custom);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Storage initialization error:', err);
      }
    };

    initStorage();
  }, []);

  const testAdapter = async (adapterName: string) => {
    if (!customStorage) return;

    const result: TestResult = {
      adapter: adapterName,
      status: 'testing',
      operations: {},
    };

    setResults(prev => [...prev.filter(r => r.adapter !== adapterName), result]);

    try {
      const testKey = `test-${adapterName}-${Date.now()}`;
      const testValue = { message: 'Hello from Strata Storage!', timestamp: Date.now() };

      // Test set
      try {
        await customStorage.set(testKey, testValue, { storage: adapterName as any });
        result.operations!.set = true;
      } catch (err) {
        console.error(`${adapterName} set error:`, err);
        result.operations!.set = false;
      }

      // Test get
      try {
        const retrieved = await customStorage.get<typeof testValue>(testKey, { storage: adapterName as any });
        result.operations!.get = retrieved?.message === testValue.message;
      } catch (err) {
        console.error(`${adapterName} get error:`, err);
        result.operations!.get = false;
      }

      // Test keys
      try {
        const keys = await customStorage.keys(undefined, { storage: adapterName as any });
        result.operations!.keys = Array.isArray(keys);
      } catch (err) {
        console.error(`${adapterName} keys error:`, err);
        result.operations!.keys = false;
      }

      // Test size
      try {
        const size = await customStorage.size();
        result.operations!.size = typeof size.total === 'number';
      } catch (err) {
        console.error(`${adapterName} size error:`, err);
        result.operations!.size = false;
      }

      // Test subscribe (if supported)
      try {
        const unsubscribe = customStorage.subscribe(
          (change: any) => console.log(`${adapterName} change:`, change),
          { storage: adapterName as any }
        );
        unsubscribe();
        result.operations!.subscribe = true;
      } catch (err) {
        result.operations!.subscribe = false;
      }

      // Test query (if supported)
      try {
        await customStorage.query({ message: 'Hello from Strata Storage!' }, { storage: adapterName as any });
        result.operations!.query = true;
      } catch (err) {
        result.operations!.query = false;
      }

      // Test remove
      try {
        await customStorage.remove(testKey, { storage: adapterName as any });
        result.operations!.remove = true;
      } catch (err) {
        console.error(`${adapterName} remove error:`, err);
        result.operations!.remove = false;
      }

      // Test clear
      try {
        await customStorage.clear({ storage: adapterName as any });
        result.operations!.clear = true;
      } catch (err) {
        console.error(`${adapterName} clear error:`, err);
        result.operations!.clear = false;
      }

      result.status = 'success';
      result.message = 'All tests completed';
    } catch (err) {
      result.status = 'error';
      result.message = err instanceof Error ? err.message : String(err);
    }

    setResults(prev => prev.map(r => r.adapter === adapterName ? result : r));
  };

  const testAllAdapters = async () => {
    const adapters = ['memory', 'localStorage', 'sessionStorage', 'indexedDB', 'cache', 'cookies'];
    for (const adapter of adapters) {
      await testAdapter(adapter);
    }
  };

  const testSingletonStorage = async () => {
    try {
      // Test the singleton storage instance
      await storage.set('singleton-test', { value: 'Testing singleton' });
      const value = await storage.get('singleton-test');
      console.log('Singleton test:', value);
      await storage.remove('singleton-test');
      setError(null);
    } catch (err) {
      setError(`Singleton error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (error) {
    return (
      <div className="storage-test error">
        <h2>Storage Initialization Error</h2>
        <pre>{error}</pre>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="storage-test loading">
        <h2>Initializing Strata Storage...</h2>
      </div>
    );
  }

  return (
    <div className="storage-test">
      <h1>Strata Storage Test Suite</h1>
      
      <div className="actions">
        <button onClick={testAllAdapters}>Test All Adapters</button>
        <button onClick={testSingletonStorage}>Test Singleton</button>
        <button onClick={() => setResults([])}>Clear Results</button>
      </div>

      <div className="adapters-grid">
        {['memory', 'localStorage', 'sessionStorage', 'indexedDB', 'cache', 'cookies'].map(adapter => (
          <div key={adapter} className="adapter-card">
            <h3>{adapter}</h3>
            <button onClick={() => testAdapter(adapter)}>Test {adapter}</button>
            {results.find(r => r.adapter === adapter) && (
              <div className={`result ${results.find(r => r.adapter === adapter)?.status}`}>
                <p>Status: {results.find(r => r.adapter === adapter)?.status}</p>
                {results.find(r => r.adapter === adapter)?.operations && (
                  <ul>
                    {Object.entries(results.find(r => r.adapter === adapter)!.operations!).map(([op, success]) => (
                      <li key={op} className={success ? 'success' : 'error'}>
                        {op}: {success ? '✓' : '✗'}
                      </li>
                    ))}
                  </ul>
                )}
                {results.find(r => r.adapter === adapter)?.message && (
                  <p className="message">{results.find(r => r.adapter === adapter)?.message}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorageTestComponent;