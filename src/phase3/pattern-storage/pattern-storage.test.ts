/**
 * Pattern Storage Tests
 */

import { PatternStorage } from './PatternStorage';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('PatternStorage', () => {
  let storage: PatternStorage;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../test-data', 'pattern-storage', Date.now().toString());
    storage = new PatternStorage({ dataDir: testDataDir });
    await storage.initialize();
  });

  afterEach(async () => {
    await fs.remove(path.join(__dirname, '../../test-data', 'pattern-storage'));
  });

  describe('savePattern', () => {
    it('should save a pattern and generate an ID', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);

      expect(saved).toBeDefined();
      expect(saved.id).toBeDefined();
      expect(saved.createdAt).toBeGreaterThan(0);
      expect(saved.updatedAt).toBeGreaterThan(0);
      expect(saved.expiresAt).toBeDefined();
    });

    it('should create a new pattern file', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      await storage.savePattern(pattern);
      const saved = await storage.getPattern(pattern.id);

      expect(saved).toBeDefined();
      expect(saved?.data).toEqual(pattern.data);
    });
  });

  describe('getPattern', () => {
    it('should return null for non-existent pattern', async () => {
      const result = await storage.getPattern('non-existent');
      expect(result).toBeNull();
    });

    it('should retrieve a saved pattern', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);
      const retrieved = await storage.getPattern(saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toEqual(pattern.data);
    });

    it('should return null for expired patterns', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
        expiresAt: Date.now() - 1000,
      };

      const saved = await storage.savePattern(pattern);
      const retrieved = await storage.getPattern(saved.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('updatePattern', () => {
    it('should update a pattern', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);
      const updated = await storage.updatePattern(saved.id, {
        data: { key: 'updated' },
      });

      expect(updated).toBeDefined();
      expect(updated?.data).toEqual({ key: 'updated' });
      expect(updated?.updatedAt).toBeGreaterThan(saved.updatedAt);
    });

    it('should create a version before updating', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);
      await storage.updatePattern(saved.id, {
        data: { key: 'updated' },
      });

      const versions = await storage.getPatternVersions(saved.id);
      expect(versions.length).toBe(1);
      expect(versions[0].data).toEqual(pattern.data);
    });
  });

  describe('deletePattern', () => {
    it('should delete a pattern', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);
      const deleted = await storage.deletePattern(saved.id);
      const retrieved = await storage.getPattern(saved.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent pattern', async () => {
      const deleted = await storage.deletePattern('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('queryPatterns', () => {
    beforeEach(async () => {
      await storage.savePattern({
        type: 'type1',
        data: { value: 1 },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: ['tag1', 'tag2'],
          source: 'test',
        },
      });

      await storage.savePattern({
        type: 'type2',
        data: { value: 2 },
        metadata: {
          confidence: 0.7,
          frequency: 3,
          lastSeen: Date.now(),
          tags: ['tag2', 'tag3'],
          source: 'test',
        },
      });

      await storage.savePattern({
        type: 'type1',
        data: { value: 3 },
        metadata: {
          confidence: 0.5,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['tag1'],
          source: 'test',
        },
      });
    });

    it('should filter by type', async () => {
      const results = await storage.queryPatterns({ type: 'type1' });
      expect(results.length).toBe(2);
      expect(results.every(r => r.type === 'type1')).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await storage.queryPatterns({ tags: ['tag2'] });
      expect(results.length).toBe(2);
    });

    it('should filter by min confidence', async () => {
      const results = await storage.queryPatterns({ minConfidence: 0.8 });
      expect(results.length).toBe(1);
      expect(results[0].metadata.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should filter by min frequency', async () => {
      const results = await storage.queryPatterns({ minFrequency: 3 });
      expect(results.length).toBe(2);
      expect(results.every(r => r.metadata.frequency >= 3)).toBe(true);
    });
  });

  describe('version management', () => {
    it('should create versions on update', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value1' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);

      await storage.updatePattern(saved.id, { data: { key: 'value2' } });
      await storage.updatePattern(saved.id, { data: { key: 'value3' } });

      const versions = await storage.getPatternVersions(saved.id);
      expect(versions.length).toBe(2);
    });

    it('should restore from version', async () => {
      const pattern = {
        type: 'test',
        data: { key: 'value1' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['test'],
          source: 'test',
        },
      };

      const saved = await storage.savePattern(pattern);
      await storage.updatePattern(saved.id, { data: { key: 'value2' } });

      const restored = await storage.restorePattern(saved.id, 1);
      expect(restored?.data).toEqual({ key: 'value1' });
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await storage.savePattern({
        type: 'type1',
        data: {},
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });

      await storage.savePattern({
        type: 'type2',
        data: {},
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });

      const stats = storage.getStats();
      expect(stats.totalPatterns).toBe(2);
      expect(stats.totalVersions).toBe(0);
      expect(stats.byType['type1']).toBe(1);
      expect(stats.byType['type2']).toBe(1);
    });
  });
});
