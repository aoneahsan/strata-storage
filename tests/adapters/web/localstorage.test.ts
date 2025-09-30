import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageAdapter } from '@/adapters/web/LocalStorageAdapter';
import type { StorageAdapter, StorageValue } from '@/types';

describe('LocalStorageAdapter', () => {
  let adapter: StorageAdapter;
  let localStorageMock: Storage;

  beforeEach(async () => {
    // Mock localStorage
    const store: Record<string, string> = {};
    
    localStorageMock = {
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

    // Replace global localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    adapter = new LocalStorageAdapter();
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
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
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
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('to-remove');
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
      
      // LocalStorage adapter removes items one by one, not using clear()
      expect(localStorageMock.removeItem).toHaveBeenCalled();
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
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem = vi.fn(() => {
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
      localStorageMock.getItem = vi.fn(() => 'invalid json {]');
      
      const result = await adapter.get('corrupted');
      expect(result).toBeNull();
    });

    it('should handle localStorage not available', async () => {
      // Remove localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const newAdapter = new LocalStorageAdapter();
      expect(await newAdapter.isAvailable()).toBe(false);
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

    it('should handle multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = adapter.subscribe!(callback1);
      const unsub2 = adapter.subscribe!(callback2);

      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now()
      };

      await adapter.set('key', value);

      // Give time for events to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  describe('Capabilities', () => {
    it('should report correct capabilities', () => {
      expect(adapter.capabilities).toEqual({
        persistent: true,
        synchronous: false,
        observable: true,
        transactional: false,
        queryable: true,
        maxSize: 10 * 1024 * 1024,
        binary: false,
        encrypted: false,
        crossTab: true
      });
    });

    it('should be available when localStorage exists', async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle objects', async () => {
      const complexValue = {
        user: {
          name: 'John Doe',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true
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
      const arrayValue = [1, 2, 3, { nested: 'object' }, ['nested', 'array']];
      
      const value: StorageValue = {
        value: arrayValue,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('array', value);
      const retrieved = await adapter.get('array');
      
      expect(retrieved?.value).toEqual(arrayValue);
    });

    it('should handle dates', async () => {
      const dateValue = new Date('2024-01-01');
      
      const value: StorageValue = {
        value: dateValue.toISOString(),
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('date', value);
      const retrieved = await adapter.get('date');
      
      expect(retrieved?.value).toBe(dateValue.toISOString());
    });

    it('should handle special characters', async () => {
      const specialValue = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      
      const value: StorageValue = {
        value: specialValue,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('special', value);
      const retrieved = await adapter.get('special');
      
      expect(retrieved?.value).toBe(specialValue);
    });

    it('should handle unicode characters', async () => {
      const unicodeValue = '🎉 Unicode: 你好世界 مرحبا بالعالم';
      
      const value: StorageValue = {
        value: unicodeValue,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('unicode', value);
      const retrieved = await adapter.get('unicode');
      
      expect(retrieved?.value).toBe(unicodeValue);
    });
  });
});