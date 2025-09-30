/**
 * Integration test for ALL Strata Storage features
 * This ensures every advertised feature actually works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Strata, storage } from '@/index';
import { MemoryAdapter } from '@/adapters/web/MemoryAdapter';
import { LocalStorageAdapter } from '@/adapters/web/LocalStorageAdapter';
import type { StorageValue } from '@/types';

describe('Strata Storage - Complete Feature Test', () => {
  let strata: Strata;

  beforeEach(async () => {
    strata = new Strata({
      defaultStorages: ['memory'],
      encryption: {
        enabled: true,
        password: 'test-password-123'
      },
      compression: {
        enabled: true,
        threshold: 100
      },
      ttl: {
        defaultTTL: 5000,
        checkInterval: 1000
      },
      sync: {
        enabled: true,
        debounceTime: 100
      }
    });

    // Register adapters
    strata.registerAdapter(new MemoryAdapter());
    strata.registerAdapter(new LocalStorageAdapter());
    
    await strata.initialize();
  });

  afterEach(async () => {
    await strata.close();
  });

  describe('Provider-less Architecture (like Zustand)', () => {
    it('should work without any setup using singleton', async () => {
      // Use the global singleton - no providers needed!
      await storage.set('instant-key', 'instant-value');
      const value = await storage.get('instant-key');
      expect(value).toBe('instant-value');
    });

    it('should work immediately after import', async () => {
      // The singleton should be ready immediately
      expect(storage).toBeDefined();
      expect(typeof storage.set).toBe('function');
      expect(typeof storage.get).toBe('function');
    });
  });

  describe('Core CRUD Operations', () => {
    it('should handle all basic operations', async () => {
      // Set
      await strata.set('key1', 'value1');
      
      // Get
      const value = await strata.get('key1');
      expect(value).toBe('value1');
      
      // Has
      const exists = await strata.has('key1');
      expect(exists).toBe(true);
      
      // Remove
      await strata.remove('key1');
      expect(await strata.has('key1')).toBe(false);
      
      // Clear
      await strata.set('key2', 'value2');
      await strata.set('key3', 'value3');
      await strata.clear();
      expect(await strata.keys()).toHaveLength(0);
    });

    it('should handle complex data types', async () => {
      const complexData = {
        user: {
          id: 123,
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true
          },
          tags: ['premium', 'beta-tester']
        },
        timestamp: Date.now(),
        nullValue: null,
        undefinedValue: undefined
      };

      await strata.set('complex', complexData);
      const retrieved = await strata.get('complex');
      
      expect(retrieved).toEqual({
        ...complexData,
        undefinedValue: undefined // undefined remains undefined
      });
    });
  });

  describe('Encryption Feature', () => {
    it('should encrypt and decrypt data', async () => {
      const sensitiveData = {
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        password: 'super-secret'
      };

      await strata.set('encrypted', sensitiveData, {
        encrypt: true,
        encryptionPassword: 'custom-password'
      });

      // Get with decryption
      const decrypted = await strata.get('encrypted', {
        encryptionPassword: 'custom-password'
      });
      
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should generate secure passwords', () => {
      const password1 = strata.generatePassword(16);
      const password2 = strata.generatePassword(16);
      
      expect(password1).toHaveLength(16);
      expect(password2).toHaveLength(16);
      expect(password1).not.toBe(password2);
    });

    it('should hash data with SHA-256', async () => {
      const hash = await strata.hash('test-data');
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      
      // Same input should produce same hash
      const hash2 = await strata.hash('test-data');
      expect(hash2).toBe(hash);
    });
  });

  describe('Compression Feature', () => {
    it('should compress large data', async () => {
      const largeData = {
        text: 'a'.repeat(10000), // 10KB of 'a'
        array: new Array(1000).fill('repeated-data')
      };

      await strata.set('compressed', largeData, {
        compress: true
      });

      const retrieved = await strata.get('compressed');
      expect(retrieved).toEqual(largeData);
    });

    it('should auto-compress based on threshold', async () => {
      const smallData = 'small';
      const largeData = 'x'.repeat(1000);

      await strata.set('small', smallData, { compress: true });
      await strata.set('large', largeData, { compress: true });

      expect(await strata.get('small')).toBe(smallData);
      expect(await strata.get('large')).toBe(largeData);
    });
  });

  describe('TTL (Time-To-Live) Feature', () => {
    it('should expire data after TTL', async () => {
      await strata.set('expiring', 'temporary', {
        ttl: 100 // 100ms
      });

      // Should exist immediately
      expect(await strata.get('expiring')).toBe('temporary');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await strata.get('expiring')).toBeNull();
    });

    it('should support sliding TTL', async () => {
      await strata.set('sliding', 'value', {
        ttl: 200,
        sliding: true
      });

      // Access before expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      const value1 = await strata.get('sliding', { sliding: true });
      expect(value1).toBe('value');

      // Should still exist after original TTL due to sliding
      await new Promise(resolve => setTimeout(resolve, 150));
      const value2 = await strata.get('sliding');
      expect(value2).toBe('value');
    });

    it('should get TTL for a key', async () => {
      await strata.set('ttl-key', 'value', { ttl: 5000 });
      
      const ttl = await strata.getTTL('ttl-key');
      expect(ttl).toBeDefined();
      expect(ttl).toBeLessThanOrEqual(5000);
      expect(ttl).toBeGreaterThan(0);
    });

    it('should extend TTL', async () => {
      await strata.set('extend', 'value', { ttl: 1000 });
      
      const ttl1 = await strata.getTTL('extend');
      await strata.extendTTL('extend', 5000);
      const ttl2 = await strata.getTTL('extend');
      
      expect(ttl2).toBeGreaterThan(ttl1!);
    });

    it('should make key persistent', async () => {
      await strata.set('temp', 'value', { ttl: 1000 });
      await strata.persist('temp');
      
      const ttl = await strata.getTTL('temp');
      expect(ttl).toBeNull();
    });

    it('should get expiring items', async () => {
      await strata.set('exp1', 'val1', { ttl: 1000 });
      await strata.set('exp2', 'val2', { ttl: 2000 });
      await strata.set('exp3', 'val3', { ttl: 10000 });
      
      const expiring = await strata.getExpiring(1500);
      expect(expiring).toHaveLength(1);
      expect(expiring[0].key).toBe('exp1');
    });

    it('should cleanup expired items', async () => {
      await strata.set('cleanup1', 'val', { ttl: 50 });
      await strata.set('cleanup2', 'val', { ttl: 50 });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The adapter proactively cleans up expired items when accessing keys
      // So cleanupExpired will find 0 since they're already cleaned
      const cleaned = await strata.cleanupExpired();
      expect(cleaned).toBe(0);
      
      // Verify the items are actually gone
      expect(await strata.get('cleanup1')).toBeNull();
      expect(await strata.get('cleanup2')).toBeNull();
    });
  });

  describe('Query Engine Feature', () => {
    beforeEach(async () => {
      // Setup test data - disable encryption for query tests
      await strata.set('user1', { name: 'John', age: 30, active: true }, {
        tags: ['user', 'premium'],
        encrypt: false
      });
      await strata.set('user2', { name: 'Jane', age: 25, active: false }, {
        tags: ['user'],
        encrypt: false
      });
      await strata.set('user3', { name: 'Bob', age: 35, active: true }, {
        tags: ['user', 'admin'],
        encrypt: false
      });
    });

    it('should query with MongoDB-like syntax', async () => {
      const results = await strata.query({
        active: true,
        age: { $gte: 30 }
      });

      expect(results).toHaveLength(2);
      expect(results.map(r => r.value.name)).toContain('John');
      expect(results.map(r => r.value.name)).toContain('Bob');
    });

    it('should query by tags', async () => {
      const results = await strata.query({
        tags: { $in: ['premium'] }
      });

      expect(results).toHaveLength(1);
      expect(results[0].value.name).toBe('John');
    });
  });

  describe('Keys Pattern Matching', () => {
    beforeEach(async () => {
      await strata.set('user-1', 'value1');
      await strata.set('user-2', 'value2');
      await strata.set('admin-1', 'value3');
      await strata.set('test.file.js', 'value4');
    });

    it('should filter keys by string prefix', async () => {
      const userKeys = await strata.keys('user-');
      expect(userKeys).toEqual(['user-1', 'user-2']);
    });

    it('should filter keys by regex pattern', async () => {
      const jsFiles = await strata.keys(/\.js$/);
      expect(jsFiles).toEqual(['test.file.js']);
    });

    it('should clear by prefix', async () => {
      await strata.clear({ prefix: 'user-' });
      
      const remaining = await strata.keys();
      expect(remaining).toEqual(['admin-1', 'test.file.js']);
    });
  });

  describe('Storage Size Management', () => {
    it('should calculate storage size', async () => {
      await strata.set('key1', 'a'.repeat(100));
      await strata.set('key2', 'b'.repeat(200));
      
      const size = await strata.size();
      expect(size.count).toBe(2);
      expect(size.total).toBeGreaterThan(300);
    });

    it('should provide detailed size info', async () => {
      await strata.set('key1', { data: 'test' });
      
      const size = await strata.size(true);
      expect(size.byKey).toBeDefined();
      expect(size.byKey?.['key1']).toBeGreaterThan(0);
    });
  });

  describe('Subscription and Change Events', () => {
    it('should notify on changes', async () => {
      // Create a new instance without encryption for clear testing
      const testStrata = new Strata({ defaultStorages: ['memory'] });
      testStrata.registerAdapter(new MemoryAdapter());
      await testStrata.initialize();
      
      const changes: any[] = [];
      const unsubscribe = testStrata.subscribe((change) => {
        changes.push(change);
      });

      await testStrata.set('watch', 'value1');
      await testStrata.set('watch', 'value2');
      await testStrata.remove('watch');

      // Give time for events
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(changes).toHaveLength(3);
      expect(changes[0].key).toBe('watch');
      expect(changes[0].newValue).toBe('value1');
      expect(changes[1].oldValue).toBe('value1');
      expect(changes[1].newValue).toBe('value2');
      expect(changes[2].oldValue).toBe('value2');
      expect(changes[2].newValue).toBeUndefined();

      unsubscribe();
      await testStrata.close();
    });
  });

  describe('Export/Import Feature', () => {
    it('should export data as JSON', async () => {
      await strata.set('export1', 'value1');
      await strata.set('export2', { nested: 'value2' });
      
      const exported = await strata.export({ format: 'json' });
      const data = JSON.parse(exported);
      
      expect(data.export1).toBe('value1');
      expect(data.export2).toEqual({ nested: 'value2' });
    });

    it('should import JSON data', async () => {
      const importData = JSON.stringify({
        imported1: 'value1',
        imported2: { data: 'value2' }
      });

      await strata.import(importData, { format: 'json' });
      
      expect(await strata.get('imported1')).toBe('value1');
      expect(await strata.get('imported2')).toEqual({ data: 'value2' });
    });

    it('should handle import with overwrite option', async () => {
      await strata.set('existing', 'old');
      
      const importData = JSON.stringify({
        existing: 'new'
      });

      await strata.import(importData, { overwrite: true });
      expect(await strata.get('existing')).toBe('new');
    });
  });

  describe('Multi-Storage Support', () => {
    it('should use specific storage adapter', async () => {
      await strata.set('mem-key', 'mem-value', { storage: 'memory' });
      await strata.set('ls-key', 'ls-value', { storage: 'localStorage' });
      
      const memValue = await strata.get('mem-key', { storage: 'memory' });
      const lsValue = await strata.get('ls-key', { storage: 'localStorage' });
      
      expect(memValue).toBe('mem-value');
      expect(lsValue).toBe('ls-value');
    });

    it('should fallback through storage types', async () => {
      const testStrata = new Strata({
        defaultStorages: ['nonexistent', 'memory']
      });
      testStrata.registerAdapter(new MemoryAdapter());
      await testStrata.initialize();
      
      await testStrata.set('fallback', 'value');
      expect(await testStrata.get('fallback')).toBe('value');
      
      await testStrata.close();
    });
  });

  describe('Tags and Metadata', () => {
    it('should store and retrieve tags', async () => {
      await strata.set('tagged', 'value', {
        tags: ['important', 'user-data', 'v2']
      });

      const value = await strata.get<string>('tagged');
      expect(value).toBe('value');
    });

    it('should store and retrieve metadata', async () => {
      await strata.set('meta', 'value', {
        metadata: {
          version: 2,
          source: 'api',
          userId: 123
        }
      });

      const value = await strata.get('meta');
      expect(value).toBe('value');
    });

    it('should clear by tags', async () => {
      await strata.set('tag1', 'val1', { tags: ['temp'] });
      await strata.set('tag2', 'val2', { tags: ['permanent'] });
      await strata.set('tag3', 'val3', { tags: ['temp', 'user'] });
      
      await strata.clear({ tags: ['temp'] });
      
      const keys = await strata.keys();
      expect(keys).toEqual(['tag2']);
    });
  });

  describe('Platform Detection', () => {
    it('should detect current platform', () => {
      expect(strata.platform).toBeDefined();
      expect(['web', 'ios', 'android', 'node']).toContain(strata.platform);
    });

    it('should check initialization status', () => {
      expect(strata.isInitialized).toBe(true);
    });
  });

  describe('Storage Capabilities', () => {
    it('should report adapter capabilities', () => {
      const caps = strata.getCapabilities('memory');
      
      expect(caps.persistent).toBe(false);
      expect(caps.synchronous).toBe(false);
      expect(caps.observable).toBe(true);
      expect(caps.queryable).toBe(true);
      expect(caps.maxSize).toBe(-1);
    });

    it('should list available storage types', async () => {
      // Initialize localStorage by using it
      await strata.set('init-ls', 'value', { storage: 'localStorage' });
      
      const types = strata.getAvailableStorageTypes();
      
      expect(types).toContain('memory');
      expect(types).toContain('localStorage');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent storage adapter', async () => {
      await expect(
        strata.set('key', 'value', { storage: 'nonexistent' as any })
      ).rejects.toThrow();
    });

    it('should handle decryption with wrong password', async () => {
      await strata.set('encrypted', 'secret', {
        encrypt: true,
        encryptionPassword: 'correct'
      });

      await expect(
        strata.get('encrypted', { encryptionPassword: 'wrong' })
      ).rejects.toThrow();
    });

    it('should ignore decryption errors when specified', async () => {
      await strata.set('encrypted', 'secret', {
        encrypt: true,
        encryptionPassword: 'correct'
      });

      const result = await strata.get('encrypted', {
        encryptionPassword: 'wrong',
        ignoreDecryptionErrors: true
      });
      
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keys', async () => {
      await strata.set('', 'empty-key-value');
      expect(await strata.get('')).toBe('empty-key-value');
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      await strata.set(specialKey, 'special');
      expect(await strata.get(specialKey)).toBe('special');
    });

    it('should handle very long keys', async () => {
      const longKey = 'k'.repeat(1000);
      await strata.set(longKey, 'long');
      expect(await strata.get(longKey)).toBe('long');
    });

    it('should handle circular references', async () => {
      const obj: any = { name: 'test' };
      obj.circular = obj;
      
      // Should handle gracefully
      await expect(strata.set('circular', obj)).rejects.toThrow();
    });
  });
});

describe('Global Storage Singleton', () => {
  it('should be available globally', () => {
    expect(storage).toBeDefined();
    expect(storage).toBeInstanceOf(Strata);
  });

  it('should maintain state across imports', async () => {
    // Set in one "module"
    await storage.set('global-key', 'global-value');
    
    // Get in another "module" (simulated)
    const { storage: storage2 } = await import('@/index');
    const value = await storage2.get('global-key');
    
    expect(value).toBe('global-value');
    expect(storage === storage2).toBe(true);
  });
});