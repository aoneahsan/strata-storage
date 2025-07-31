import { describe, it, expect, beforeEach } from 'vitest';
import { Strata } from '@/core/Strata';

describe('Strata', () => {
  let storage: Strata;

  beforeEach(async () => {
    storage = new Strata({
      defaultStorages: ['memory'],
    });
    await storage.initialize();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await storage.set('test', 'value');
      const result = await storage.get('test');
      expect(result).toBe('value');
    });

    it('should return null for non-existent key', async () => {
      const result = await storage.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should remove a value', async () => {
      await storage.set('test', 'value');
      await storage.remove('test');
      const result = await storage.get('test');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await storage.set('test', 'value');
      expect(await storage.has('test')).toBe(true);
      expect(await storage.has('nonexistent')).toBe(false);
    });

    it('should clear all values', async () => {
      await storage.set('test1', 'value1');
      await storage.set('test2', 'value2');
      await storage.clear();
      expect(await storage.has('test1')).toBe(false);
      expect(await storage.has('test2')).toBe(false);
    });

    it('should get all keys', async () => {
      await storage.set('test1', 'value1');
      await storage.set('test2', 'value2');
      const keys = await storage.keys();
      expect(keys).toContain('test1');
      expect(keys).toContain('test2');
    });
  });

  describe('TTL Support', () => {
    it('should expire values after TTL', async () => {
      await storage.set('test', 'value', { ttl: 100 }); // 100ms
      expect(await storage.get('test')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await storage.get('test')).toBeNull();
    });

    it('should get TTL for a key', async () => {
      await storage.set('test', 'value', { ttl: 1000 });
      const ttl = await storage.getTTL('test');
      expect(ttl).toBeLessThanOrEqual(1000);
      expect(ttl).toBeGreaterThan(900);
    });

    it('should extend TTL', async () => {
      await storage.set('test', 'value', { ttl: 500 });
      await storage.extendTTL('test', 1000);
      const ttl = await storage.getTTL('test');
      expect(ttl).toBeGreaterThan(1000);
    });

    it('should persist a key', async () => {
      await storage.set('test', 'value', { ttl: 1000 });
      await storage.persist('test');
      const ttl = await storage.getTTL('test');
      expect(ttl).toBeNull();
    });
  });

  describe('Tags and Metadata', () => {
    it('should store values with tags', async () => {
      await storage.set('test1', 'value1', { tags: ['tag1', 'tag2'] });
      await storage.set('test2', 'value2', { tags: ['tag2', 'tag3'] });
      
      const results = await storage.query({ tags: { $in: ['tag2'] } });
      expect(results).toHaveLength(2);
    });

    it('should store values with metadata', async () => {
      const metadata = { userId: 123, category: 'test' };
      await storage.set('test', 'value', { metadata });
      
      const results = await storage.query({ 
        'metadata.category': 'test' 
      });
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('test');
    });
  });

  describe('Query Engine', () => {
    beforeEach(async () => {
      await storage.set('user1', { name: 'Alice', age: 25 });
      await storage.set('user2', { name: 'Bob', age: 30 });
      await storage.set('user3', { name: 'Charlie', age: 35 });
    });

    it('should query with $eq operator', async () => {
      const results = await storage.query({ name: 'Alice' });
      expect(results).toHaveLength(1);
      expect(results[0].value).toEqual({ name: 'Alice', age: 25 });
    });

    it('should query with $gt operator', async () => {
      const results = await storage.query({ age: { $gt: 30 } });
      expect(results).toHaveLength(1);
      expect(results[0].value).toEqual({ name: 'Charlie', age: 35 });
    });

    it('should query with $in operator', async () => {
      const results = await storage.query({ 
        name: { $in: ['Alice', 'Charlie'] } 
      });
      expect(results).toHaveLength(2);
    });

    it('should query with $regex operator', async () => {
      const results = await storage.query({ 
        name: { $regex: '^[AC]' } 
      });
      expect(results).toHaveLength(2);
    });
  });
});