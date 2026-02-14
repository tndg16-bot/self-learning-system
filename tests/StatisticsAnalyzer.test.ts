import { StatisticsAnalyzer } from '../src/services/StatisticsAnalyzer';
import { DataEntry } from '../src/types';

describe('StatisticsAnalyzer', () => {
  let analyzer: StatisticsAnalyzer;

  beforeEach(() => {
    analyzer = new StatisticsAnalyzer();
  });

  describe('Basic statistics calculation', () => {
    it('should calculate mean correctly', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 20 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 30 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.basic.mean).toBe(20);
    });

    it('should calculate median correctly', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 20 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 30 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 40 } },
        { id: '5', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 50 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.basic.median).toBe(30);
    });

    it('should calculate standard deviation correctly', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 2 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 4 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 4 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 4 } },
        { id: '5', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 5 } },
        { id: '6', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 5 } },
        { id: '7', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 7 } },
        { id: '8', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 9 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.basic.standardDeviation).toBeCloseTo(2.1381, 3);
    });

    it('should calculate min, max, and range correctly', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 1 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 5 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.basic.min).toBe(1);
      expect(stat.basic.max).toBe(10);
      expect(stat.basic.range).toBe(9);
    });
  });

  describe('Distribution analysis', () => {
    it('should calculate quartiles correctly', async () => {
      const entries: DataEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now() - i * 1000,
        source: 'test',
        type: 'metric',
        content: { value: i + 1 },
      }));

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.distribution.quartiles.q1).toBeCloseTo(5.25, 2);
      expect(stat.distribution.quartiles.q2).toBeCloseTo(10.5, 2);
      expect(stat.distribution.quartiles.q3).toBeCloseTo(15.75, 2);
    });

    it('should calculate skewness for asymmetric distribution', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 1 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 1 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 1 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(typeof stat.distribution.skewness).toBe('number');
    });

    it('should calculate kurtosis', async () => {
      const entries: DataEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now() - i * 1000,
        source: 'test',
        type: 'metric',
        content: { value: i + 1 },
      }));

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(typeof stat.distribution.kurtosis).toBe('number');
    });
  });

  describe('Outlier detection', () => {
    it('should detect high outliers', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 11 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 100 } }, // Outlier
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      const highOutliers = stat.outliers.filter((o) => o.type === 'high');
      expect(highOutliers.length).toBeGreaterThan(0);
    });

    it('should detect low outliers', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 100 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 101 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 100 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: -100 } }, // Outlier
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      const lowOutliers = stat.outliers.filter((o) => o.type === 'low');
      expect(lowOutliers.length).toBeGreaterThan(0);
    });

    it('should not detect outliers in normal distribution', async () => {
      const entries: DataEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now() - i * 1000,
        source: 'test',
        type: 'metric',
        content: { value: 10 + i },
      }));

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];
      expect(stat.outliers.length).toBe(0);
    });

    it('should calculate z-scores for outliers', async () => {
      const entries: DataEntry[] = [
        { id: '1', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '2', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '3', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 10 } },
        { id: '4', timestamp: Date.now(), source: 'test', type: 'metric', content: { value: 100 } },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];

      stat.outliers.forEach((outlier) => {
        expect(outlier.zScore).toBeGreaterThan(3);
        expect(outlier.type).toBeDefined();
        expect(outlier.value).toBeDefined();
      });
    });
  });

  describe('Correlation analysis', () => {
    it('should detect strong positive correlation', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 1, y: 2 },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 2, y: 4 },
        },
        {
          id: '3',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 3, y: 6 },
        },
        {
          id: '4',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 4, y: 8 },
        },
        {
          id: '5',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 5, y: 10 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];

      const xyCorrelation = stat.correlations.find(
        (c) => c.metric1 === 'x' && c.metric2 === 'y'
      );

      expect(xyCorrelation).toBeDefined();
      expect(xyCorrelation?.correlation).toBeCloseTo(1, 1);
      expect(xyCorrelation?.strength).toBe('strong');
    });

    it('should detect strong negative correlation', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 1, y: 10 },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 2, y: 8 },
        },
        {
          id: '3',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 3, y: 6 },
        },
        {
          id: '4',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 4, y: 4 },
        },
        {
          id: '5',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 5, y: 2 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];

      const xyCorrelation = stat.correlations.find(
        (c) => c.metric1 === 'x' && c.metric2 === 'y'
      );

      expect(xyCorrelation).toBeDefined();
      expect(xyCorrelation?.correlation).toBeCloseTo(-1, 1);
      expect(xyCorrelation?.strength).toBe('strong');
    });

    it('should classify correlation strength correctly', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 1, y: 1.05 },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 2, y: 2.1 },
        },
        {
          id: '3',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { x: 3, y: 3.15 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(statistics.length).toBeGreaterThan(0);
      const stat = statistics[0];

      stat.correlations.forEach((correlation) => {
        expect(['none', 'weak', 'moderate', 'strong']).toContain(correlation.strength);
      });
    });
  });

  describe('Statistics persistence', () => {
    it('should save and load statistics', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 10 },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
        content: { value: 20 },
        },
        {
          id: '3',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 30 },
        },
      ];

      await analyzer.analyzeStatistics(entries);
      const loadedStatistics = await analyzer.loadStatistics();

      expect(loadedStatistics).toBeDefined();
      expect(Array.isArray(loadedStatistics)).toBe(true);
    });

    it('should retrieve statistics by metric', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 10 },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 20 },
        },
        {
          id: '3',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 30 },
        },
      ];

      await analyzer.analyzeStatistics(entries);
      const stat = await analyzer.getStatistics('metric');

      expect(stat).toBeDefined();
      expect(stat?.metric).toBe('metric');
    });
  });

  describe('Error handling', () => {
    it('should handle empty entries array', async () => {
      const statistics = await analyzer.analyzeStatistics([]);

      expect(statistics).toEqual([]);
    });

    it('should handle entries with insufficient data', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 10 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(Array.isArray(statistics)).toBe(true);
    });

    it('should handle non-numeric values gracefully', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 'not a number' },
        },
        {
          id: '2',
          timestamp: Date.now(),
          source: 'test',
          type: 'metric',
          content: { value: 10 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(Array.isArray(statistics)).toBe(true);
    });

    it('should handle invalid timestamps', async () => {
      const entries: DataEntry[] = [
        {
          id: '1',
          timestamp: NaN,
          source: 'test',
          type: 'metric',
          content: { value: 10 },
        },
      ];

      const statistics = await analyzer.analyzeStatistics(entries);

      expect(Array.isArray(statistics)).toBe(true);
    });
  });
});
