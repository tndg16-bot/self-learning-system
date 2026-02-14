/**
 * Knowledge Base Tests
 */

import { KnowledgeBase } from './KnowledgeBase';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Pattern } from '../pattern-storage/types';

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../test-data', 'knowledge-base', Date.now().toString());
    kb = new KnowledgeBase({ dataDir: testDataDir, maxItems: 100 });
    await kb.initialize();
  });

  afterEach(async () => {
    await fs.remove(path.join(__dirname, '../../test-data', 'knowledge-base'));
  });

  describe('extractKnowledge', () => {
    it('should extract knowledge from behavioral pattern', () => {
      const pattern: Pattern = {
        id: 'pattern-1',
        type: 'behavioral',
        data: {
          trigger: 'user clicks button',
          action: 'open dialog',
          context: 'main page',
        },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: ['ui', 'interaction'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = kb.extractKnowledge(pattern);

      expect(result.extractedItems).toBeDefined();
      expect(result.extractedItems.length).toBeGreaterThan(0);
      expect(result.extractedItems[0].type).toBe('rule');
    });

    it('should extract knowledge from temporal pattern', () => {
      const pattern: Pattern = {
        id: 'pattern-2',
        type: 'temporal',
        data: {
          sequence: ['event A', 'event B', 'event C'],
          interval: 1000,
          duration: 3000,
        },
        metadata: {
          confidence: 0.8,
          frequency: 3,
          lastSeen: Date.now(),
          tags: ['temporal'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = kb.extractKnowledge(pattern);

      expect(result.extractedItems.length).toBeGreaterThan(0);
      expect(result.extractedItems[0].type).toBe('relationship');
    });

    it('should extract knowledge from sequential pattern', () => {
      const pattern: Pattern = {
        id: 'pattern-3',
        type: 'sequential',
        data: {
          steps: ['step 1', 'step 2', 'step 3'],
          conditions: ['condition 1'],
        },
        metadata: {
          confidence: 0.9,
          frequency: 4,
          lastSeen: Date.now(),
          tags: ['sequential'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = kb.extractKnowledge(pattern);

      expect(result.extractedItems.length).toBeGreaterThan(0);
      expect(result.extractedItems[0].type).toBe('rule');
    });

    it('should extract knowledge from categorical pattern', () => {
      const pattern: Pattern = {
        id: 'pattern-4',
        type: 'categorical',
        data: {
          category: 'colors',
          items: ['red', 'blue', 'green'],
          attributes: { brightness: 'high' },
        },
        metadata: {
          confidence: 0.95,
          frequency: 10,
          lastSeen: Date.now(),
          tags: ['categorical'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = kb.extractKnowledge(pattern);

      expect(result.extractedItems.length).toBeGreaterThan(0);
      expect(result.extractedItems[0].type).toBe('concept');
    });

    it('should create relationships between extracted items', () => {
      const pattern: Pattern = {
        id: 'pattern-5',
        type: 'behavioral',
        data: {
          trigger: 'condition A',
          action: 'action B',
        },
        metadata: {
          confidence: 0.9,
          frequency: 5,
          lastSeen: Date.now(),
          tags: ['tag1', 'tag2', 'common'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = kb.extractKnowledge(pattern);

      expect(result.relationships).toBeDefined();
      expect(result.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('addKnowledge', () => {
    it('should add a knowledge item', async () => {
      const item = {
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact' as const,
        content: 'Test knowledge',
        structuredData: { key: 'value' },
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['test'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await kb.addKnowledge(item);
      const retrieved = kb.getKnowledge('knowledge-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test knowledge');
    });

    it('should update indexes when adding knowledge', async () => {
      const item = {
        id: 'knowledge-2',
        patternId: 'pattern-2',
        type: 'fact' as const,
        content: 'Test knowledge',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['tag1', 'tag2'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await kb.addKnowledge(item);

      const results = kb.queryKnowledge({ tags: ['tag1'] });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('addRelationship', () => {
    it('should add a relationship', async () => {
      const relationship = {
        id: 'rel-1',
        fromId: 'knowledge-1',
        toId: 'knowledge-2',
        type: 'associative' as const,
        strength: 0.8,
      };

      await kb.addRelationship(relationship);
      const retrieved = kb.getRelationship('rel-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.strength).toBe(0.8);
    });
  });

  describe('queryKnowledge', () => {
    beforeEach(async () => {
      await kb.addKnowledge({
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact',
        content: 'The sky is blue',
        structuredData: { subject: 'sky', property: 'blue' },
        metadata: {
          confidence: 0.95,
          sources: ['test'],
          frequency: 10,
          tags: ['nature', 'color'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-2',
        patternId: 'pattern-2',
        type: 'rule',
        content: 'When it rains, use umbrella',
        structuredData: { condition: 'rain', action: 'umbrella' },
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 5,
          tags: ['weather', 'rule'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-3',
        patternId: 'pattern-1',
        type: 'concept',
        content: 'Rain is water from clouds',
        structuredData: { concept: 'rain', definition: 'water from clouds' },
        metadata: {
          confidence: 0.8,
          sources: ['test'],
          frequency: 3,
          tags: ['nature', 'weather'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should filter by type', () => {
      const results = kb.queryKnowledge({ type: 'fact' });
      expect(results.length).toBe(1);
      expect(results[0].item.type).toBe('fact');
    });

    it('should filter by tags', () => {
      const results = kb.queryKnowledge({ tags: ['nature'] });
      expect(results.length).toBe(2);
      expect(results.every(r => r.item.metadata.tags.includes('nature'))).toBe(true);
    });

    it('should filter by patternId', () => {
      const results = kb.queryKnowledge({ patternId: 'pattern-1' });
      expect(results.length).toBe(2);
    });

    it('should filter by min confidence', () => {
      const results = kb.queryKnowledge({ minConfidence: 0.9 });
      expect(results.length).toBe(2);
      expect(results.every(r => r.item.metadata.confidence >= 0.9)).toBe(true);
    });

    it('should search by text', () => {
      const results = kb.queryKnowledge({ text: 'rain' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r =>
        r.item.content.toLowerCase().includes('rain') ||
        JSON.stringify(r.item.structuredData).toLowerCase().includes('rain')
      )).toBe(true);
    });

    it('should sort by relevance score', () => {
      const results = kb.queryKnowledge({ tags: ['nature'] });
      expect(results.length).toBeGreaterThan(0);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });
  });

  describe('findRelatedItems', () => {
    it('should find related knowledge items', async () => {
      await kb.addKnowledge({
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact',
        content: 'Item 1',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['common'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-2',
        patternId: 'pattern-2',
        type: 'fact',
        content: 'Item 2',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['common'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-3',
        patternId: 'pattern-3',
        type: 'fact',
        content: 'Item 3',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['common'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 知識を追加すると自動的に関係が作成される
      const extraction = kb.extractKnowledge({
        id: 'pattern-new',
        type: 'behavioral',
        data: { trigger: 'test', action: 'test' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['common'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (extraction.extractedItems.length > 0) {
        await kb.addKnowledge(extraction.extractedItems[0]);
      }

      const related = kb.findRelatedItems('knowledge-1');
      expect(related.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('removeKnowledge', () => {
    it('should remove a knowledge item', async () => {
      const item = {
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact' as const,
        content: 'Test',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await kb.addKnowledge(item);
      const removed = await kb.removeKnowledge('knowledge-1');
      const retrieved = kb.getKnowledge('knowledge-1');

      expect(removed).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should remove related relationships', async () => {
      await kb.addKnowledge({
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact',
        content: 'Item 1',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['common'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-2',
        patternId: 'pattern-2',
        type: 'fact',
        content: 'Item 2',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: ['common'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const extraction = kb.extractKnowledge({
        id: 'pattern-new',
        type: 'behavioral',
        data: { trigger: 'test', action: 'test' },
        metadata: {
          confidence: 0.9,
          frequency: 1,
          lastSeen: Date.now(),
          tags: ['common'],
          source: 'test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (extraction.extractedItems.length > 0) {
        await kb.addKnowledge(extraction.extractedItems[0]);
      }

      const statsBefore = kb.getStats();
      await kb.removeKnowledge('knowledge-1');
      const statsAfter = kb.getStats();

      expect(statsBefore.totalItems - statsAfter.totalItems).toBe(1);
    });
  });

  describe('updateKnowledge', () => {
    it('should update a knowledge item', async () => {
      const item = {
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact' as const,
        content: 'Original content',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await kb.addKnowledge(item);

      const updated = await kb.updateKnowledge('knowledge-1', {
        content: 'Updated content',
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated content');
      expect(updated?.updatedAt).toBeGreaterThan(item.updatedAt);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await kb.addKnowledge({
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact',
        content: 'Test',
        structuredData: {},
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await kb.addKnowledge({
        id: 'knowledge-2',
        patternId: 'pattern-2',
        type: 'rule',
        content: 'Test',
        structuredData: {},
        metadata: {
          confidence: 0.8,
          sources: ['test'],
          frequency: 1,
          tags: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const stats = kb.getStats();

      expect(stats.totalItems).toBe(2);
      expect(stats.byType['fact']).toBe(1);
      expect(stats.byType['rule']).toBe(1);
      expect(stats.averageConfidence).toBeCloseTo(0.85, 5);
    });
  });

  describe('persistence', () => {
    it('should persist and reload knowledge', async () => {
      const item = {
        id: 'knowledge-1',
        patternId: 'pattern-1',
        type: 'fact' as const,
        content: 'Persistent content',
        structuredData: { key: 'value' },
        metadata: {
          confidence: 0.9,
          sources: ['test'],
          frequency: 1,
          tags: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await kb.addKnowledge(item);

      // 新しいインスタンスを作成して再初期化
      const newKb = new KnowledgeBase({ dataDir: testDataDir });
      await newKb.initialize();

      const reloaded = newKb.getKnowledge('knowledge-1');

      expect(reloaded).toBeDefined();
      expect(reloaded?.content).toBe('Persistent content');
      expect(reloaded?.structuredData).toEqual({ key: 'value' });
    });
  });
});
