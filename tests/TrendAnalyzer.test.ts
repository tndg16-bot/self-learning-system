import { TrendAnalyzer } from '../src/services/TrendAnalyzer';
import { DataEntry } from '../src/types';

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
  });

  describe('Time series trend analysis', () => {
    it('should detect upward trends', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        { id: '1', timestamp: now - 4000, source: 'github', type: 'commits', content: { value: 10 } },
        { id: '2', timestamp: now - 3000, source: 'github', type: 'commits', content: { value: 20 } },
        { id: '3', timestamp: now - 2000, source: 'github', type: 'commits', content: { value: 30 } },
        { id: '4', timestamp: now - 1000, source: 'github', type: 'commits', content: { value: 40 } },
        { id: '5', timestamp: now, source: 'github', type: 'commits', content: { value: 50 } },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(trends.length).toBeGreaterThan(0);
      const upTrends = trends.filter((t) => t.direction === 'up');
      expect(upTrends.length).toBeGreaterThan(0);
    });

    it('should detect downward trends', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        { id: '1', timestamp: now - 4000, source: 'github', type: 'errors', content: { value: 50 } },
        { id: '2', timestamp: now - 3000, source: 'github', type: 'errors', content: { value: 40 } },
        { id: '3', timestamp: now - 2000, source: 'github', type: 'errors', content: { value: 30 } },
        { id: '4', timestamp: now - 1000, source: 'github', type: 'errors', content: { value: 20 } },
        { id: '5', timestamp: now, source: 'github', type: 'errors', content: { value: 10 } },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(trends.length).toBeGreaterThan(0);
      const downTrends = trends.filter((t) => t.direction === 'down');
      expect(downTrends.length).toBeGreaterThan(0);
    });

    it('should detect stable trends', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        { id: '1', timestamp: now - 4000, source: 'github', type: 'stable', content: { value: 100 } },
        { id: '2', timestamp: now - 3000, source: 'github', type: 'stable', content: { value: 100 } },
        { id: '3', timestamp: now - 2000, source: 'github', type: 'stable', content: { value: 100 } },
        { id: '4', timestamp: now - 1000, source: 'github', type: 'stable', content: { value: 100 } },
        { id: '5', timestamp: now, source: 'github', type: 'stable', content: { value: 100 } },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(trends.length).toBeGreaterThan(0);
      const stableTrends = trends.filter((t) => t.direction === 'stable');
      expect(stableTrends.length).toBeGreaterThan(0);
    });

    it('should calculate confidence scores', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        { id: '1', timestamp: now - 4000, source: 'github', type: 'test', content: { value: 10 } },
        { id: '2', timestamp: now - 3000, source: 'github', type: 'test', content: { value: 20 } },
        { id: '3', timestamp: now - 2000, source: 'github', type: 'test', content: { value: 30 } },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      trends.forEach((trend) => {
        expect(trend.confidence).toBeGreaterThanOrEqual(0);
        expect(trend.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Project progress trend analysis', () => {
    it('should analyze project completion progress', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: now - 7 * 24 * 60 * 60 * 1000,
          source: 'github',
          type: 'issue',
          content: { project: 'my-project', state: 'open' },
        },
        {
          id: '2',
          timestamp: now - 5 * 24 * 60 * 60 * 1000,
          source: 'github',
          type: 'issue',
          content: { project: 'my-project', state: 'closed' },
        },
        {
          id: '3',
          timestamp: now - 3 * 24 * 60 * 60 * 1000,
          source: 'github',
          type: 'issue',
          content: { project: 'my-project', state: 'open' },
        },
        {
          id: '4',
          timestamp: now - 1 * 24 * 60 * 60 * 1000,
          source: 'github',
          type: 'issue',
          content: { project: 'my-project', state: 'closed' },
        },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(trends.length).toBeGreaterThan(0);
      const projectTrends = trends.filter((t) => t.type === 'project-progress');
      expect(projectTrends.length).toBeGreaterThan(0);
    });

    it('should calculate velocity metrics', async () => {
      const now = Date.now();
      const entries: DataEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        timestamp: now - (10 - i) * 24 * 60 * 60 * 1000,
        source: 'github',
        type: 'issue',
        content: { project: 'test-project', state: i % 2 === 0 ? 'closed' : 'open' },
      }));

      const trends = await analyzer.analyzeTrends(entries);

      const projectTrends = trends.filter(
        (t): t is any => t.type === 'project-progress'
      );

      if (projectTrends.length > 0) {
        const trend = projectTrends[0];
        expect(trend.velocity).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('User behavior trend analysis', () => {
    it('should analyze user behavior patterns', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: now - 4000,
          source: 'discord',
          type: 'message',
          content: { userId: 'user1', message: 'Hello' },
        },
        {
          id: '2',
          timestamp: now - 3000,
          source: 'discord',
          type: 'message',
          content: { userId: 'user1', message: 'World' },
        },
        {
          id: '3',
          timestamp: now - 2000,
          source: 'discord',
          type: 'message',
          content: { userId: 'user1', message: 'Test' },
        },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(trends.length).toBeGreaterThan(0);
      const behaviorTrends = trends.filter((t) => t.type === 'user-behavior');
      expect(behaviorTrends.length).toBeGreaterThan(0);
    });

    it('should calculate behavior frequency', async () => {
      const now = Date.now();
      const entries: DataEntry[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        timestamp: now - (5 - i) * 60 * 1000,
        source: 'discord',
        type: 'message',
        content: { userId: 'user1', message: 'Message' },
      }));

      const trends = await analyzer.analyzeTrends(entries);

      const behaviorTrends = trends.filter(
        (t): t is any => t.type === 'user-behavior'
      );

      if (behaviorTrends.length > 0) {
        const trend = behaviorTrends[0];
        expect(trend.frequency).toBeGreaterThan(0);
      }
    });
  });

  describe('Statistical metrics calculation', () => {
    it('should calculate basic statistical metrics', () => {
      const values = [1, 2, 3, 4, 5];
      const metrics = analyzer.calculateStatisticalMetrics(values);

      expect(metrics.mean).toBe(3);
      expect(metrics.median).toBe(3);
      expect(metrics.standardDeviation).toBeCloseTo(1.5811, 3);
      expect(metrics.variance).toBeCloseTo(2.5, 3);
      expect(metrics.min).toBe(1);
      expect(metrics.max).toBe(5);
      expect(metrics.range).toBe(4);
    });

    it('should handle empty arrays', () => {
      const metrics = analyzer.calculateStatisticalMetrics([]);

      expect(metrics.mean).toBe(0);
      expect(metrics.median).toBe(0);
      expect(metrics.standardDeviation).toBe(0);
      expect(metrics.variance).toBe(0);
      expect(metrics.min).toBe(0);
      expect(metrics.max).toBe(0);
      expect(metrics.range).toBe(0);
    });

    it('should handle single value arrays', () => {
      const metrics = analyzer.calculateStatisticalMetrics([42]);

      expect(metrics.mean).toBe(42);
      expect(metrics.median).toBe(42);
      expect(metrics.min).toBe(42);
      expect(metrics.max).toBe(42);
      expect(metrics.range).toBe(0);
    });
  });

  describe('Trend persistence', () => {
    it('should save and load trends', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'github',
          type: 'test',
          content: { value: 10 },
        },
      ];

      await analyzer.analyzeTrends(entries);
      const loadedTrends = await analyzer.loadTrends();

      expect(loadedTrends).toBeDefined();
      expect(Array.isArray(loadedTrends)).toBe(true);
    });

    it('should retrieve trend by ID', async () => {
      const now = Date.now();
      const entries: DataEntry[] = [
        { id: '1', timestamp: now, source: 'github', type: 'test', content: { value: 10 } },
        { id: '2', timestamp: now - 1000, source: 'github', type: 'test', content: { value: 20 } },
        { id: '3', timestamp: now - 2000, source: 'github', type: 'test', content: { value: 30 } },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      if (trends.length > 0) {
        const trend = await analyzer.getTrend(trends[0].id);
        expect(trend).toBeDefined();
        expect(trend?.id).toBe(trends[0].id);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle empty entries array', async () => {
      const trends = await analyzer.analyzeTrends([]);

      expect(trends).toEqual([]);
    });

    it('should handle entries with insufficient data', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'github',
          type: 'test',
          content: { value: 10 },
        },
      ];

      const trends = await analyzer.analyzeTrends(entries);

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should handle invalid values gracefully', () => {
      const values = [1, NaN, 3, Infinity, 5];
      const metrics = analyzer.calculateStatisticalMetrics(values);

      expect(metrics).toBeDefined();
      expect(typeof metrics.mean).toBe('number');
    });
  });
});
