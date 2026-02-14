import * as ss from 'simple-statistics';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DataEntry, Statistics, Outlier, Correlation } from '../types';

/**
 * Statistics Analyzer Service
 * Performs statistical analysis on integrated data
 */
export class StatisticsAnalyzer {
  private readonly DATA_PATH = path.join(process.cwd(), 'learning-data');
  private readonly STATISTICS_FILE = path.join(this.DATA_PATH, 'statistics.json');
  private readonly Z_SCORE_THRESHOLD = 3; // Standard deviations

  constructor() {
    this.ensureDataDirectory();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    fs.ensureDirSync(this.DATA_PATH);
  }

  /**
   * Analyze statistics for all metrics
   */
  async analyzeStatistics(entries: DataEntry[]): Promise<Statistics[]> {
    const statistics: Statistics[] = [];

    console.log(`Starting statistical analysis for ${entries.length} entries...`);

    // Group entries by metric type
    const metricGroups = this.groupByMetric(entries);

    metricGroups.forEach((entries, metric) => {
      if (entries.length < 2) return;

      // Extract numeric values
      const values = this.extractNumericValues(entries);

      if (values.length < 2) return;

      // Calculate statistics
      const stats: Statistics = {
        id: `stat-${metric}`,
        metric,
        basic: this.calculateBasicStatistics(values),
        distribution: this.analyzeDistribution(values),
        outliers: this.detectOutliers(values, entries),
        correlations: this.calculateCorrelations(entries),
      };

      statistics.push(stats);
    });

    console.log(`Analyzed statistics for ${statistics.length} metrics`);

    // Save statistics
    await this.saveStatistics(statistics);

    return statistics;
  }

  /**
   * Calculate basic statistics
   */
  private calculateBasicStatistics(values: number[]): {
    mean: number;
    median: number;
    mode?: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    range: number;
  } {
    try {
      const mean = ss.mean(values);
      const median = ss.median(values);
      const mode = ss.mode(values);
      const standardDeviation = ss.standardDeviation(values);
      const variance = ss.variance(values);
      const min = ss.min(values);
      const max = ss.max(values);
      const range = max - min;

      return {
        mean,
        median,
        // @ts-ignore - mode type may vary in simple-statistics
        mode: (mode as any).length > 0 ? (mode as any)[0] : undefined,
        standardDeviation,
        variance,
        min,
        max,
        range,
      };
    } catch (error) {
      console.error('Error calculating basic statistics:', error);
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        min: 0,
        max: 0,
        range: 0,
      };
    }
  }

  /**
   * Analyze distribution
   */
  private analyzeDistribution(values: number[]): {
    skewness: number;
    kurtosis: number;
    quartiles: {
      q1: number;
      q2: number;
      q3: number;
    };
  } {
    try {
      const sorted = [...values].sort((a, b) => a - b);
      const mean = ss.mean(values);

      // Calculate skewness
      const skewness = ss.sampleSkewness(values);

      // Calculate kurtosis
      const kurtosis = ss.sampleKurtosis(values);

      // Calculate quartiles
      const q1 = ss.quantile(sorted, 0.25);
      const q2 = ss.quantile(sorted, 0.5);
      const q3 = ss.quantile(sorted, 0.75);

      return {
        skewness,
        kurtosis,
        quartiles: { q1, q2, q3 },
      };
    } catch (error) {
      console.error('Error analyzing distribution:', error);
      return {
        skewness: 0,
        kurtosis: 0,
        quartiles: { q1: 0, q2: 0, q3: 0 },
      };
    }
  }

  /**
   * Detect outliers using Z-score method
   */
  private detectOutliers(values: number[], entries: DataEntry[]): Outlier[] {
    const outliers: Outlier[] = [];

    try {
      const mean = ss.mean(values);
      const standardDeviation = ss.standardDeviation(values);

      if (standardDeviation === 0) return outliers;

      values.forEach((value, index) => {
        const zScore = Math.abs((value - mean) / standardDeviation);

        if (zScore > this.Z_SCORE_THRESHOLD) {
          const outlier: Outlier = {
            value,
            index,
            type: value > mean ? 'high' : 'low',
            zScore,
            timestamp: entries[index]?.timestamp,
          };

          outliers.push(outlier);
        }
      });
    } catch (error) {
      console.error('Error detecting outliers:', error);
    }

    return outliers;
  }

  /**
   * Calculate correlations between metrics
   */
  private calculateCorrelations(entries: DataEntry[]): Correlation[] {
    const correlations: Correlation[] = [];

    try {
      // Extract all numeric fields from entries
      const metricValues = this.extractAllNumericMetrics(entries);

      const metrics = Array.from(metricValues.keys());

      // Calculate pairwise correlations
      for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) {
          const metric1 = metrics[i];
          const metric2 = metrics[j];

          const values1 = metricValues.get(metric1) || [];
          const values2 = metricValues.get(metric2) || [];

          if (values1.length >= 2 && values2.length >= 2) {
            const correlation = this.calculateCorrelation(values1, values2);

            if (correlation !== null) {
              const significance = this.calculateSignificance(
                Math.abs(correlation),
                values1.length
              );

              correlations.push({
                metric1,
                metric2,
                correlation,
                significance,
                strength: this.getCorrelationStrength(Math.abs(correlation)),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calculating correlations:', error);
    }

    return correlations;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(
    values1: number[],
    values2: number[]
  ): number | null {
    try {
      if (values1.length !== values2.length || values1.length < 2) {
        return null;
      }

      return ss.sampleCorrelation(values1, values2);
    } catch (error) {
      console.error('Error calculating correlation:', error);
      return null;
    }
  }

  /**
   * Calculate significance (p-value approximation)
   */
  private calculateSignificance(correlation: number, sampleSize: number): number {
    if (sampleSize < 3) return 1;

    try {
      // t-statistic
      const t = (correlation * Math.sqrt(sampleSize - 2)) / Math.sqrt(1 - correlation * correlation);

      // Approximate p-value (two-tailed)
      const pValue = 2 * (1 - this.tCumulativeDistribution(t, sampleSize - 2));

      return pValue;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Approximate t-distribution cumulative distribution function
   */
  private tCumulativeDistribution(t: number, degreesOfFreedom: number): number {
    // Simplified approximation
    // In production, use a proper statistical library
    if (degreesOfFreedom < 1) return 0.5;

    const x = degreesOfFreedom / (degreesOfFreedom + t * t);
    const a = degreesOfFreedom / 2;

    // Simplified beta function approximation
    if (a > 100) {
      // Normal approximation for large degrees of freedom
      return 0.5 * (1 + this.errorFunction(t / Math.sqrt(2)));
    }

    // For smaller degrees, use incomplete beta function approximation
    return this.incompleteBetaFunction(0.5 * degreesOfFreedom, 0.5, x);
  }

  /**
   * Error function approximation
   */
  private errorFunction(x: number): number {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Incomplete beta function approximation
   */
  private incompleteBetaFunction(a: number, b: number, x: number): number {
    // Simplified continued fraction approximation
    if (x === 0) return 0;
    if (x === 1) return 1;

    const maxIterations = 100;
    const epsilon = 1e-10;

    let result = 1.0;
    let numerator = 1.0;
    let denominator = 1.0;

    const m = Math.floor((a + b) / 2);

    for (let n = 0; n <= maxIterations; n++) {
      let term: number;

      if (n % 2 === 0) {
        const i = n / 2;
        term =
          (i * (b - i) * x) /
          ((a + 2 * i - 1) * (a + 2 * i));
      } else {
        const i = (n - 1) / 2;
        term =
          -((a + i) * (a + b + i) * x) /
          ((a + 2 * i) * (a + 2 * i + 1));
      }

      numerator += term;
      denominator += term * x;

      if (Math.abs(term) < epsilon) {
        break;
      }
    }

    return x ** a * (1 - x) ** b * (numerator / denominator) / a;
  }

  /**
   * Get correlation strength label
   */
  private getCorrelationStrength(correlation: number): 'none' | 'weak' | 'moderate' | 'strong' {
    if (correlation < 0.1) return 'none';
    if (correlation < 0.3) return 'weak';
    if (correlation < 0.7) return 'moderate';
    return 'strong';
  }

  /**
   * Extract numeric values from entries
   */
  private extractNumericValues(entries: DataEntry[]): number[] {
    const values: number[] = [];

    entries.forEach((entry) => {
      if (entry.content && typeof entry.content === 'object') {
        // Look for numeric fields
        const numericFields = ['value', 'count', 'score', 'duration', 'size', 'length'];

        for (const field of numericFields) {
          if (field in entry.content) {
            const value = Number(entry.content[field]);
            if (!isNaN(value)) {
              values.push(value);
              break;
            }
          }
        }
      }

      // If no numeric field found, use 1 as a count
      if (values.length < entries.length) {
        values.push(1);
      }
    });

    return values;
  }

  /**
   * Extract all numeric metrics from entries
   */
  private extractAllNumericMetrics(
    entries: DataEntry[]
  ): Map<string, number[]> {
    const metricValues = new Map<string, number[]>();

    entries.forEach((entry) => {
      if (entry.content && typeof entry.content === 'object') {
        Object.entries(entry.content).forEach(([key, value]) => {
          const numericValue = Number(value);
          if (!isNaN(numericValue)) {
            if (!metricValues.has(key)) {
              metricValues.set(key, []);
            }
            metricValues.get(key)!.push(numericValue);
          }
        });
      }

      // Add timestamp as a metric
      if (!metricValues.has('timestamp')) {
        metricValues.set('timestamp', []);
      }
      metricValues.get('timestamp')!.push(entry.timestamp);
    });

    return metricValues;
  }

  /**
   * Group entries by metric
   */
  private groupByMetric(entries: DataEntry[]): Map<string, DataEntry[]> {
    const groups = new Map<string, DataEntry[]>();

    entries.forEach((entry) => {
      const metric = entry.type || 'unknown';

      if (!groups.has(metric)) {
        groups.set(metric, []);
      }
      groups.get(metric)!.push(entry);
    });

    return groups;
  }

  /**
   * Save statistics to file
   */
  private async saveStatistics(statistics: Statistics[]): Promise<void> {
    try {
      await fs.writeJson(this.STATISTICS_FILE, statistics, { spaces: 2 });
      console.log(`Saved ${statistics.length} statistics to ${this.STATISTICS_FILE}`);
    } catch (error) {
      console.error('Error saving statistics:', error);
      throw error;
    }
  }

  /**
   * Load statistics from file
   */
  async loadStatistics(): Promise<Statistics[]> {
    try {
      if (await fs.pathExists(this.STATISTICS_FILE)) {
        const statistics = await fs.readJson(this.STATISTICS_FILE);
        return statistics;
      }
      return [];
    } catch (error) {
      console.error('Error loading statistics:', error);
      return [];
    }
  }

  /**
   * Get statistics by metric
   */
  async getStatistics(metric: string): Promise<Statistics | null> {
    const statistics = await this.loadStatistics();
    return statistics.find((s) => s.metric === metric) || null;
  }
}
