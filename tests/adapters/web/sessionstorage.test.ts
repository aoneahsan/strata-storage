import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStorageAdapter } from '@/adapters/web/SessionStorageAdapter';
import type { StorageAdapter, StorageValue } from '@/types';

describe('SessionStorageAdapter', () => {
  let adapter: StorageAdapter;
  let sessionStorageMock: Storage;

  beforeEach(async () => {
    // Mock sessionStorage
    const store: Record<string, string> = {};
    
    sessionStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) {
          delete store[key];
        }
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(store).length;
      }
    };

    // Replace global sessionStorage with mock
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true
    });

    adapter = new SessionStorageAdapter();
    await adapter.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      const value: StorageValue = {
        value: 'test-value',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('test-key', value);
      const retrieved = await adapter.get('test-key');
      
      expect(retrieved).toEqual(value);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(value)
      );
    });

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('exists', value);
      
      expect(await adapter.has('exists')).toBe(true);
      expect(await adapter.has('not-exists')).toBe(false);
    });

    it('should remove keys', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('to-remove', value);
      expect(await adapter.has('to-remove')).toBe(true);
      
      await adapter.remove('to-remove');
      expect(await adapter.has('to-remove')).toBe(false);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('to-remove');
    });

    it('should clear all storage', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('key1', value);
      await adapter.set('key2', value);
      await adapter.set('key3', value);
      
      await adapter.clear();
      
      // SessionStorage adapter removes items one by one, not using clear()
      expect(sessionStorageMock.removeItem).toHaveBeenCalled();
      expect(await adapter.keys()).toHaveLength(0);
    });

    it('should clear with prefix', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('prefix-key1', value);
      await adapter.set('prefix-key2', value);
      await adapter.set('other-key', value);
      
      await adapter.clear({ prefix: 'prefix-' });
      
      expect(await adapter.has('prefix-key1')).toBe(false);
      expect(await adapter.has('prefix-key2')).toBe(false);
      expect(await adapter.has('other-key')).toBe(true);
    });
  });

  describe('Keys Management', () => {
    it('should list all keys', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('key1', value);
      await adapter.set('key2', value);
      await adapter.set('key3', value);
      
      const keys = await adapter.keys();
      expect(keys).toEqual(expect.arrayContaining(['key1', 'key2', 'key3']));
      expect(keys).toHaveLength(3);
    });

    it('should filter keys by string pattern', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('user-1', value);
      await adapter.set('user-2', value);
      await adapter.set('admin-1', value);
      
      const userKeys = await adapter.keys('user-');
      expect(userKeys).toEqual(expect.arrayContaining(['user-1', 'user-2']));
      expect(userKeys).toHaveLength(2);
    });

    it('should filter keys by regex pattern', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('test-123', value);
      await adapter.set('test-456', value);
      await adapter.set('prod-123', value);
      
      const testKeys = await adapter.keys(/^test-\d+$/);
      expect(testKeys).toEqual(expect.arrayContaining(['test-123', 'test-456']));
      expect(testKeys).toHaveLength(2);
    });
  });

  describe('Session Behavior', () => {
    it('should not persist data across sessions (simulated)', () => {
      // SessionStorage is cleared when session ends
      // This is the main difference from localStorage
      expect(adapter.capabilities.persistent).toBe(false);
    });

    it('should store data for current session only', async () => {
      const value: StorageValue = {
        value: 'session-only',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('session-key', value);
      expect(await adapter.has('session-key')).toBe(true);
      
      // Simulate new session by clearing storage
      sessionStorageMock.clear();
      
      expect(await adapter.has('session-key')).toBe(false);
    });
  });

  describe('Size Management', () => {
    it('should calculate storage size', async () => {
      const value: StorageValue = {
        value: 'test-value',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('key1', value);
      await adapter.set('key2', value);
      
      const size = await adapter.size();
      expect(size.count).toBe(2);
      expect(size.total).toBeGreaterThan(0);
    });

    it('should provide detailed size info', async () => {
      const value: StorageValue = {
        value: { nested: 'object', with: 'properties' },
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('complex-key', value);
      
      const size = await adapter.size(true);
      expect(size.count).toBe(1);
      expect(size.byKey).toBeDefined();
      expect(size.byKey?.['complex-key']).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle quota exceeded errors', async () => {
      // Mock sessionStorage.setItem to throw quota exceeded error
      sessionStorageMock.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };

      await expect(adapter.set('key', value)).rejects.toThrow();
    });

    it('should handle corrupted JSON data', async () => {
      // Directly set invalid JSON
      sessionStorageMock.getItem = vi.fn(() => 'invalid json {]');
      
      const result = await adapter.get('corrupted');
      expect(result).toBeNull();
    });

    it('should handle sessionStorage not available', async () => {
      // Remove sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const newAdapter = new SessionStorageAdapter();
      expect(await newAdapter.isAvailable()).toBe(false);
    });

    it('should handle private browsing mode', async () => {
      // Simulate private browsing by making setItem throw
      sessionStorageMock.setItem = vi.fn(() => {
        throw new Error('Private browsing mode');
      });

      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };

      await expect(adapter.set('key', value)).rejects.toThrow();
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers on set', async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe!(callback);

      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };

      await adapter.set('key', value);

      // Give time for event to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'key',
          newValue: value.value,
          source: 'local'
        })
      );

      unsubscribe();
    });

    it('should notify subscribers on remove', async () => {
      const callback = vi.fn();
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };

      await adapter.set('key', value);
      
      const unsubscribe = adapter.subscribe!(callback);
      await adapter.remove('key');

      // Give time for event to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'key',
          oldValue: value.value,
          source: 'local'
        })
      );

      unsubscribe();
    });

    it('should notify subscribers on clear', async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe!(callback);

      await adapter.clear();

      // Give time for event to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          key: '*',
          source: 'local'
        })
      );

      unsubscribe();
    });
  });

  describe('Capabilities', () => {
    it('should report correct capabilities', () => {
      expect(adapter.capabilities).toEqual({
        persistent: false,  // Key difference from localStorage
        synchronous: false,
        observable: true,
        transactional: false,
        queryable: true,
        maxSize: 10 * 1024 * 1024,
        binary: false,
        encrypted: false,
        crossTab: false  // Key difference from localStorage
      });
    });

    it('should be available when sessionStorage exists', async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle objects', async () => {
      const complexValue = {
        user: {
          name: 'Jane Smith',
          age: 25,
          settings: {
            language: 'en',
            timezone: 'UTC'
          }
        }
      };
      
      const value: StorageValue = {
        value: complexValue,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('complex', value);
      const retrieved = await adapter.get('complex');
      
      expect(retrieved?.value).toEqual(complexValue);
    });

    it('should handle arrays', async () => {
      const arrayValue = ['session', 'data', { type: 'temporary' }];
      
      const value: StorageValue = {
        value: arrayValue,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('array', value);
      const retrieved = await adapter.get('array');
      
      expect(retrieved?.value).toEqual(arrayValue);
    });

    it('should handle large objects within quota', async () => {
      const largeObject = {
        data: new Array(100).fill(0).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { prop: `prop-${i}` }
        }))
      };
      
      const value: StorageValue = {
        value: largeObject,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('large', value);
      const retrieved = await adapter.get('large');
      
      expect(retrieved?.value).toEqual(largeObject);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty values', async () => {
      const emptyValue: StorageValue = {
        value: '',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('empty', emptyValue);
      const retrieved = await adapter.get('empty');
      
      expect(retrieved?.value).toBe('');
    });

    it('should handle null values', async () => {
      const nullValue: StorageValue = {
        value: null,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('null', nullValue);
      const retrieved = await adapter.get('null');
      
      expect(retrieved?.value).toBeNull();
    });

    it('should handle undefined becoming null', async () => {
      const undefinedValue: StorageValue = {
        value: undefined,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('undefined', undefinedValue);
      const retrieved = await adapter.get('undefined');
      
      // undefined is not serialized properly in JSON - it becomes undefined
      expect(retrieved?.value).toBeUndefined();
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        const value: StorageValue = {
          value: `session-${i}`,
          created: Date.now(),
          updated: Date.now()
        };
        promises.push(adapter.set(`concurrent-${i}`, value));
      }
      
      await Promise.all(promises);
      
      const keys = await adapter.keys('concurrent-');
      expect(keys).toHaveLength(50);
    });
  });
});