import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from '@/adapters/web/MemoryAdapter';
import type { StorageAdapter, StorageValue } from '@/types';

describe('MemoryAdapter', () => {
  let adapter: StorageAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.initialize();
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
      
      expect(await adapter.has('key1')).toBe(false);
      expect(await adapter.has('key2')).toBe(false);
      expect(await adapter.has('key3')).toBe(false);
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

    it('should handle null and undefined', async () => {
      const nullValue: StorageValue = {
        value: null,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('null-key', nullValue);
      const retrieved = await adapter.get('null-key');
      
      expect(retrieved?.value).toBeNull();
    });

    it('should handle numbers', async () => {
      const numberValue: StorageValue = {
        value: 42.5,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('number', numberValue);
      const retrieved = await adapter.get('number');
      
      expect(retrieved?.value).toBe(42.5);
    });

    it('should handle booleans', async () => {
      const boolValue: StorageValue = {
        value: true,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('bool', boolValue);
      const retrieved = await adapter.get('bool');
      
      expect(retrieved?.value).toBe(true);
    });
  });

  describe('Metadata and Tags', () => {
    it('should store metadata', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now(),
        metadata: {
          version: 1,
          source: 'api'
        }
      };
      
      await adapter.set('meta-key', value);
      const retrieved = await adapter.get('meta-key');
      
      expect(retrieved?.metadata).toEqual({
        version: 1,
        source: 'api'
      });
    });

    it('should store tags', async () => {
      const value: StorageValue = {
        value: 'test',
        created: Date.now(),
        updated: Date.now(),
        tags: ['important', 'user-data']
      };
      
      await adapter.set('tagged', value);
      const retrieved = await adapter.get('tagged');
      
      expect(retrieved?.tags).toEqual(['important', 'user-data']);
    });
  });

  describe('Capabilities', () => {
    it('should report correct capabilities', () => {
      expect(adapter.capabilities).toEqual({
        persistent: false,
        synchronous: false,
        observable: true,
        transactional: false,
        queryable: true,
        maxSize: -1,
        binary: true,
        encrypted: false,
        crossTab: false
      });
    });

    it('should always be available', async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', async () => {
      const value: StorageValue = {
        value: 'empty-key-value',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('', value);
      const retrieved = await adapter.get('');
      
      expect(retrieved?.value).toBe('empty-key-value');
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      const value: StorageValue = {
        value: 'long-key-value',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set(longKey, value);
      const retrieved = await adapter.get(longKey);
      
      expect(retrieved?.value).toBe('long-key-value');
    });

    it('should handle large values', async () => {
      const largeArray = new Array(10000).fill('data');
      const value: StorageValue = {
        value: largeArray,
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set('large', value);
      const retrieved = await adapter.get('large');
      
      expect(retrieved?.value).toEqual(largeArray);
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const value: StorageValue = {
        value: 'special',
        created: Date.now(),
        updated: Date.now()
      };
      
      await adapter.set(specialKey, value);
      const retrieved = await adapter.get(specialKey);
      
      expect(retrieved?.value).toBe('special');
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        const value: StorageValue = {
          value: i,
          created: Date.now(),
          updated: Date.now()
        };
        promises.push(adapter.set(`concurrent-${i}`, value));
      }
      
      await Promise.all(promises);
      
      const keys = await adapter.keys('concurrent-');
      expect(keys).toHaveLength(100);
    });
  });
});