/**
 * Phase 3 Integration Tests
 */

import { MemoryStorageSystem } from './index';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('MemoryStorageSystem (Phase 3 Integration)', () => {
  let system: MemoryStorageSystem;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../test-data', 'phase3', Date.now().toString());
    system = new MemoryStorageSystem({
      patternDataDir: path.join(testDataDir, 'patterns'),
      knowledgeDataDir: path.join(testDataDir, 'knowledge'),
    });
    await system.initialize();
  });

  afterEach(async () => {
    await system.shutdown();
    await fs.remove(path.join(__dirname, '../../test-data', 'phase3'));
  });

  describe('initialization', () => {
    it('should initialize all components', async () => {
      const stats = system.getStats();

      expect(stats.patterns).toBeDefined();
      expect(stats.model).toBeDefined();
      expect(stats.knowledge).toBeDefined();
    });
  });

  describe('addPattern', () => {
    it('should add pattern and extract knowledge', async () => {
      const pattern = {
        type: 'behavioral',
        data: {
          trigger: 'user clicks submit',
          action: 'submit form',
        },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['ui', 'interaction'],
          source: 'test',
        },
      };

      await system.addPattern(pattern);

      const patternResults = await system.searchPatterns({ type: 'behavioral' });
      expect(patternResults.length).toBeGreaterThan(0);

      const knowledgeResults = system.searchKnowledge({ type: 'rule' });
      expect(knowledgeResults.length).toBeGreaterThan(0);
    });

    it('should handle multiple patterns', async () => {
      const patterns = [
        {
          type: 'behavioral',
          data: { trigger: 'A', action: 'B' },
          metadata: {
            confidence: 0.9,
            frequency: 1,
            lastSeen: Date.now(),
            tags: ['test'],
            source: 'test',
          },
        },
        {
          type: 'temporal',
          data: {
            sequence: ['event 1', 'event 2'],
            interval: 1000,
          },
          metadata: {
            confidence: 0.8,
            frequency: 1,
            lastSeen: Date.now(),
            tags: ['test'],
            source: 'test',
          },
        },
        {
          type: 'categorical',
          data: {
            category: 'fruit',
            items: ['apple', 'banana'],
          },
          metadata: {
            confidence: 0.95,
            frequency: 1,
            lastSeen: Date.now(),
            tags: ['test'],
            source: 'test',
          },
        },
      ];

      for (const pattern of patterns) {
        await system.addPattern(pattern);
      }

      const stats = system.getStats();
      expect(stats.patterns.totalPatterns).toBe(3);
      expect(stats.knowledge.totalItems).toBeGreaterThan(0);
    });
  });

  describe('searchPatterns', () => {
    beforeEach(async () => {
      await system.addPattern({
        type: 'behavioral',
        data: { trigger: 'test', action: 'action' },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: ['high-priority'],
          source: 'test',
        },
      });

      await system.addPattern({
        type: 'temporal',
        data: { sequence: ['a', 'b'] },
        metadata: {
          confidence: 0.7,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['low-priority'],
          source: 'test',
        },
      });
    });

    it('should filter by type', async () => {
      const results = await system.searchPatterns({ type: 'behavioral' });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('behavioral');
    });

    it('should filter by tags', async () => {
      const results = await system.searchPatterns({ tags: ['high-priority'] });
      expect(results.length).toBe(1);
    });

    it('should filter by min confidence', async () => {
      const results = await system.searchPatterns({ minConfidence: 0.8 });
      expect(results.length).toBe(1);
    });
  });

  describe('searchKnowledge', () => {
    beforeEach(async () => {
      await system.addPattern({
        type: 'behavioral',
        data: { trigger: 'rain', action: 'use umbrella' },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: ['weather'],
          source: 'test',
        },
      });
    });

    it('should search knowledge by text', () => {
      const results = system.searchKnowledge({ text: 'rain' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search knowledge by tags', () => {
      const results = system.searchKnowledge({ tags: ['weather'] });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('classifyPattern', () => {
    beforeEach(async () => {
      // 複数のパターンを追加して学習させる
      await system.addPattern({
        type: 'behavioral',
        data: { trigger: 'click', action: 'open' },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });

      await system.addPattern({
        type: 'temporal',
        data: { sequence: ['a', 'b', 'c'] },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });

      await system.addPattern({
        type: 'categorical',
        data: { category: 'type1', items: ['a', 'b'] },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });
    });

    it('should classify a new pattern', async () => {
      const testPattern = {
        id: 'test-pattern',
        type: 'unknown',
        data: { trigger: 'test', action: 'test2' },
        metadata: {
          confidence: 0.5,
          frequency: 1,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await system.classifyPattern(testPattern);

      expect(result).toBeDefined();
      expect(result.predictedLabel).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return stats from all components', async () => {
      await system.addPattern({
        type: 'behavioral',
        data: { test: 'value' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: [],
          source: 'test',
        },
      });

      const stats = system.getStats();

      expect(stats.patterns.totalPatterns).toBeGreaterThan(0);
      expect(stats.model.isInitialized).toBe(true);
      expect(stats.knowledge.totalItems).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('should persist data across restarts', async () => {
      await system.addPattern({
        type: 'behavioral',
        data: { persistent: 'data' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['persistent'],
          source: 'test',
        },
      });

      const statsBefore = system.getStats();
      const patternCountBefore = statsBefore.patterns.totalPatterns;

      await system.shutdown();

      // 新しいシステムを作成して再初期化
      const newSystem = new MemoryStorageSystem({
        patternDataDir: path.join(testDataDir, 'patterns'),
        knowledgeDataDir: path.join(testDataDir, 'knowledge'),
      });
      await newSystem.initialize();

      const statsAfter = newSystem.getStats();

      expect(statsAfter.patterns.totalPatterns).toBe(patternCountBefore);

      await newSystem.shutdown();
    });
  });
});
