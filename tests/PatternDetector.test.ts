import { PatternDetector } from '../src/services/PatternDetector';
import { DataEntry } from '../src/types';

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  describe('Time-based pattern detection', () => {
    it('should detect daily recurring patterns', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago at 10:00
          source: 'discord',
          type: 'task',
          content: { message: 'Daily check' },
        },
        {
          id: '2',
          timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, // 6 days ago at 10:00
          source: 'discord',
          type: 'task',
          content: { message: 'Daily check' },
        },
        {
          id: '3',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago at 10:00
          source: 'discord',
          type: 'task',
          content: { message: 'Daily check' },
        },
        {
          id: '4',
          timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, // 4 days ago at 10:00
          source: 'discord',
          type: 'task',
          content: { message: 'Daily check' },
        },
        {
          id: '5',
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago at 10:00
          source: 'discord',
          type: 'task',
          content: { message: 'Daily check' },
        },
      ];

      const patterns = await detector.detectPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      const timePatterns = patterns.filter((p) => p.type === 'time-based');
      expect(timePatterns.length).toBeGreaterThan(0);
    });

    it('should detect weekly recurring patterns', async () => {
      const now = Date.now();
      const dayOfWeek = new Date(now).getDay();

      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: now - 4 * 7 * 24 * 60 * 60 * 1000, // 4 weeks ago
          source: 'github',
          type: 'commit',
          content: { message: 'Weekly review' },
        },
        {
          id: '2',
          timestamp: now - 3 * 7 * 24 * 60 * 60 * 1000, // 3 weeks ago
          source: 'github',
          type: 'commit',
          content: { message: 'Weekly review' },
        },
        {
          id: '3',
          timestamp: now - 2 * 7 * 24 * 60 * 60 * 1000, // 2 weeks ago
          source: 'github',
          type: 'commit',
          content: { message: 'Weekly review' },
        },
        {
          id: '4',
          timestamp: now - 1 * 7 * 24 * 60 * 60 * 1000, // 1 week ago
          source: 'github',
          type: 'commit',
          content: { message: 'Weekly review' },
        },
      ];

      const patterns = await detector.detectPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Frequency-based pattern detection', () => {
    it('should detect frequently occurring content', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now() - 10 * 60 * 1000,
          source: 'discord',
          type: 'message',
          content: { message: 'Hello world' },
        },
        {
          id: '2',
          timestamp: Date.now() - 20 * 60 * 1000,
          source: 'discord',
          type: 'message',
          content: { message: 'Hello world' },
        },
        {
          id: '3',
          timestamp: Date.now() - 30 * 60 * 1000,
          source: 'discord',
          type: 'message',
          content: { message: 'Hello world' },
        },
        {
          id: '4',
          timestamp: Date.now() - 40 * 60 * 1000,
          source: 'discord',
          type: 'message',
          content: { message: 'Hello world' },
        },
      ];

      const patterns = await detector.detectPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      const freqPatterns = patterns.filter((p) => p.type === 'frequency-based');
      expect(freqPatterns.length).toBeGreaterThan(0);
    });

    it('should calculate confidence score correctly', async () => {
      const entries: DataEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now() - i * 60 * 1000,
        source: 'discord',
        type: 'message',
        content: { message: 'Repeated message' },
      }));

      const patterns = await detector.detectPatterns(entries);

      patterns.forEach((pattern) => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Context-based pattern detection', () => {
    it('should detect similar contexts', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now() - 60 * 1000,
          source: 'obsidian',
          type: 'task',
          content: { action: 'complete', project: 'A' },
        },
        {
          id: '2',
          timestamp: Date.now() - 120 * 1000,
          source: 'obsidian',
          type: 'task',
          content: { action: 'complete', project: 'B' },
        },
        {
          id: '3',
          timestamp: Date.now() - 180 * 1000,
          source: 'obsidian',
          type: 'task',
          content: { action: 'complete', project: 'C' },
        },
        {
          id: '4',
          timestamp: Date.now() - 240 * 1000,
          source: 'obsidian',
          type: 'task',
          content: { action: 'complete', project: 'D' },
        },
      ];

      const patterns = await detector.detectPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      const ctxPatterns = patterns.filter((p) => p.type === 'context-based');
      expect(ctxPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern persistence', () => {
    it('should save and load patterns', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'discord',
          type: 'message',
          content: { message: 'Test' },
        },
      ];

      await detector.detectPatterns(entries);
      const loadedPatterns = await detector.loadPatterns();

      expect(loadedPatterns).toBeDefined();
      expect(Array.isArray(loadedPatterns)).toBe(true);
    });

    it('should retrieve pattern by ID', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'discord',
          type: 'message',
          content: { message: 'Test' },
        },
      ];

      const patterns = await detector.detectPatterns(entries);

      if (patterns.length > 0) {
        const pattern = await detector.getPattern(patterns[0].id);
        expect(pattern).toBeDefined();
        expect(pattern?.id).toBe(patterns[0].id);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle empty entries array', async () => {
      const patterns = await detector.detectPatterns([]);

      expect(patterns).toEqual([]);
    });

    it('should handle entries with invalid timestamps', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: NaN,
          source: 'discord',
          type: 'message',
          content: { message: 'Test' },
        },
      ];

      // Should not throw error
      const patterns = await detector.detectPatterns(entries);
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});
