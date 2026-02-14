import moment from 'moment-timezone';
import * as ss from 'simple-statistics';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DataEntry,
  Trend,
  TimeSeriesTrend,
  ProjectProgressTrend,
  UserBehaviorTrend,
} from '../types';

/**
 * Trend Analyzer Service
 * Analyzes trends and tendencies in integrated data
 */
export class TrendAnalyzer {
  private readonly DATA_PATH = path.join(process.cwd(), 'learning-data');
  private readonly TRENDS_FILE = path.join(this.DATA_PATH, 'trends.json');
  private readonly MIN_CONFIDENCE = 0.5;

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
   * Analyze all types of trends
   */
  async analyzeTrends(entries: DataEntry[]): Promise<Trend[]> {
    const trends: Trend[] = [];

    console.log(`Starting trend analysis for ${entries.length} entries...`);

    // Analyze time series trends
    const timeSeriesTrends = this.analyzeTimeSeriesTrends(entries);
    trends.push(...timeSeriesTrends);
    console.log(`Found ${timeSeriesTrends.length} time series trends`);

    // Analyze project progress trends
    const projectTrends = this.analyzeProjectProgressTrends(entries);
    trends.push(...projectTrends);
    console.log(`Found ${projectTrends.length} project progress trends`);

    // Analyze user behavior trends
    const behaviorTrends = this.analyzeUserBehaviorTrends(entries);
    trends.push(...behaviorTrends);
    console.log(`Found ${behaviorTrends.length} user behavior trends`);

    // Filter by confidence threshold
    const highConfidenceTrends = trends.filter(
      (t) => t.confidence >= this.MIN_CONFIDENCE
    );

    console.log(`Total high-confidence trends: ${highConfidenceTrends.length}`);

    // Save trends
    await this.saveTrends(highConfidenceTrends);

    return highConfidenceTrends;
  }

  /**
   * Analyze time series trends
   */
  private analyzeTimeSeriesTrends(entries: DataEntry[]): TimeSeriesTrend[] {
    const trends: TimeSeriesTrend[] = [];

    // Group entries by metric type
    const metricGroups = this.groupByMetric(entries);

    metricGroups.forEach((entries, metric) => {
      if (entries.length < 3) return;

      // Extract time series data
      const timeSeries = this.extractTimeSeries(entries);

      // Calculate linear regression
      const regression = this.calculateLinearRegression(
        timeSeries.values,
        timeSeries.indices
      );

      // Determine direction
      const direction =
        regression.slope > 0.01 ? 'up' : regression.slope < -0.01 ? 'down' : 'stable';

      // Calculate change percentage
      const firstValue = timeSeries.values[0];
      const lastValue = timeSeries.values[timeSeries.values.length - 1];
      const change = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

      const trend: TimeSeriesTrend = {
        id: `ts-${metric}`,
        metric,
        type: 'time-series',
        direction,
        change,
        period: `${moment(timeSeries.start).format('YYYY-MM-DD')} to ${moment(
          timeSeries.end
        ).format('YYYY-MM-DD')}`,
        confidence: Math.abs(regression.rSquared),
        data: {
          values: timeSeries.values,
          labels: timeSeries.labels,
        },
        startDate: timeSeries.start,
        endDate: timeSeries.end,
        slope: regression.slope,
        intercept: regression.intercept,
        rSquared: regression.rSquared,
      };

      trends.push(trend);
    });

    return trends;
  }

  /**
   * Analyze project progress trends
   */
  private analyzeProjectProgressTrends(
    entries: DataEntry[]
  ): ProjectProgressTrend[] {
    const trends: ProjectProgressTrend[] = [];

    // Filter project-related entries
    const projectEntries = entries.filter(
      (e) => e.source === 'github' || e.type === 'task' || e.type === 'issue'
    );

    // Group by project
    const projectGroups = this.groupByProject(projectEntries);

    projectGroups.forEach((entries, projectId) => {
      if (entries.length < 2) return;

      // Calculate completion metrics
      const completed = entries.filter((e) => e.content && e.content.state === 'closed')
        .length;
      const total = entries.length;

      // Calculate velocity (tasks per week)
      const duration =
        Math.max(...entries.map((e) => e.timestamp)) -
        Math.min(...entries.map((e) => e.timestamp));
      const weeks = Math.max(1, duration / (1000 * 60 * 60 * 24 * 7));
      const velocity = completed / weeks;

      // Determine trend direction
      const recentEntries = entries.slice(-Math.min(5, entries.length));
      const recentCompleted = recentEntries.filter(
        (e) => e.content && e.content.state === 'closed'
      ).length;
      const direction =
        recentCompleted >= recentEntries.length / 2 ? 'up' : 'down';

      const trend: ProjectProgressTrend = {
        id: `pp-${projectId}`,
        metric: 'project-progress',
        type: 'project-progress',
        direction,
        change: weeks > 0 ? (velocity / weeks) * 100 : 0,
        period: `${weeks.toFixed(1)} weeks`,
        confidence: Math.min(1, entries.length / 10),
        data: {
          values: [completed, total],
          labels: ['completed', 'total'],
        },
        projectId,
        completedTasks: completed,
        totalTasks: total,
        velocity,
      };

      trends.push(trend);
    });

    return trends;
  }

  /**
   * Analyze user behavior trends
   */
  private analyzeUserBehaviorTrends(entries: DataEntry[]): UserBehaviorTrend[] {
    const trends: UserBehaviorTrend[] = [];

    // Filter user entries
    const userEntries = entries.filter((e) => e.source === 'discord');

    // Group by user
    const userGroups = this.groupByUser(userEntries);

    userGroups.forEach((entries, userId) => {
      if (entries.length < 2) return;

      // Analyze behavior types
      const behaviorTypes = this.analyzeBehaviorTypes(entries);

      behaviorTypes.forEach((behavior, type) => {
        // Calculate frequency (per day)
        const duration =
          Math.max(...entries.map((e) => e.timestamp)) -
          Math.min(...entries.map((e) => e.timestamp));
        const days = Math.max(1, duration / (1000 * 60 * 60 * 24));
        const frequency = behavior.count / days;

        // Calculate change rate (recent vs overall)
        const midpoint = Math.floor(entries.length / 2);
        const recentEntries = entries.slice(midpoint);
        const recentBehavior = this.analyzeBehaviorTypes(recentEntries);
        const recentCount = recentBehavior.get(type)?.count || 0;
        const overallCount = behavior.count;
        const changeRate =
          overallCount > 0 ? ((recentCount - overallCount / 2) / overallCount) * 100 : 0;

        // Determine direction
        const direction = changeRate > 5 ? 'up' : changeRate < -5 ? 'down' : 'stable';

        const trend: UserBehaviorTrend = {
          id: `ub-${userId}-${type}`,
          metric: `user-behavior-${type}`,
          type: 'user-behavior',
          direction,
          change: changeRate,
          period: `${days.toFixed(1)} days`,
          confidence: Math.min(1, entries.length / 10),
          data: {
            values: [behavior.count],
            labels: [type],
          },
          userId,
          behavior: type,
          frequency,
          changeRate,
        };

        trends.push(trend);
      });
    });

    return trends;
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(
    values: number[],
    indices: number[]
  ): { slope: number; intercept: number; rSquared: number } {
    if (values.length < 2) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    try {
      const data = indices.map((i, idx) => [i, values[idx]]);
      const regression = ss.linearRegression(data);

      // Create a function from the regression object
      const regressionFn = (x: number) => regression.m * x + regression.b;

      const rSquared = ss.rSquared(data, regressionFn);

      return {
        slope: regression.m,
        intercept: regression.b,
        rSquared,
      };
    } catch (error) {
      console.error('Error calculating linear regression:', error);
      return { slope: 0, intercept: 0, rSquared: 0 };
    }
  }

  /**
   * Extract time series from entries
   */
  private extractTimeSeries(entries: DataEntry[]): {
    values: number[];
    labels: string[];
    indices: number[];
    start: number;
    end: number;
  } {
    // Sort by timestamp
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    const values: number[] = [];
    const labels: string[] = [];
    const indices: number[] = [];

    sorted.forEach((entry, idx) => {
      // Extract value from content
      let value = 1; // Default: count

      if (entry.content && typeof entry.content === 'object') {
        if ('value' in entry.content) {
          value = Number(entry.content.value) || 1;
        } else if ('count' in entry.content) {
          value = Number(entry.content.count) || 1;
        }
      }

      values.push(value);
      labels.push(moment(entry.timestamp).format('YYYY-MM-DD'));
      indices.push(idx);
    });

    return {
      values,
      labels,
      indices,
      start: sorted[0].timestamp,
      end: sorted[sorted.length - 1].timestamp,
    };
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
   * Group entries by project
   */
  private groupByProject(entries: DataEntry[]): Map<string, DataEntry[]> {
    const groups = new Map<string, DataEntry[]>();

    entries.forEach((entry) => {
      let projectId = 'default';

      if (entry.content && typeof entry.content === 'object') {
        if ('project' in entry.content) {
          projectId = String(entry.content.project);
        } else if ('repository' in entry.content) {
          projectId = String(entry.content.repository);
        }
      }

      if (!groups.has(projectId)) {
        groups.set(projectId, []);
      }
      groups.get(projectId)!.push(entry);
    });

    return groups;
  }

  /**
   * Group entries by user
   */
  private groupByUser(entries: DataEntry[]): Map<string, DataEntry[]> {
    const groups = new Map<string, DataEntry[]>();

    entries.forEach((entry) => {
      let userId = 'anonymous';

      if (entry.content && typeof entry.content === 'object') {
        if ('userId' in entry.content) {
          userId = String(entry.content.userId);
        } else if ('author' in entry.content) {
          userId = String(entry.content.author);
        }
      }

      if (!groups.has(userId)) {
        groups.set(userId, []);
      }
      groups.get(userId)!.push(entry);
    });

    return groups;
  }

  /**
   * Analyze behavior types from entries
   */
  private analyzeBehaviorTypes(entries: DataEntry[]): Map<string, { count: number }> {
    const types = new Map<string, { count: number }>();

    entries.forEach((entry) => {
      const type = entry.type || 'unknown';

      if (!types.has(type)) {
        types.set(type, { count: 0 });
      }
      types.get(type)!.count++;
    });

    return types;
  }

  /**
   * Calculate statistical metrics
   */
  calculateStatisticalMetrics(values: number[]): {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        min: 0,
        max: 0,
      };
    }

    try {
      return {
        mean: ss.mean(values),
        median: ss.median(values),
        standardDeviation: ss.standardDeviation(values),
        variance: ss.variance(values),
        min: ss.min(values),
        max: ss.max(values),
      };
    } catch (error) {
      console.error('Error calculating statistical metrics:', error);
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        min: 0,
        max: 0,
      };
    }
  }

  /**
   * Save trends to file
   */
  private async saveTrends(trends: Trend[]): Promise<void> {
    try {
      await fs.writeJson(this.TRENDS_FILE, trends, { spaces: 2 });
      console.log(`Saved ${trends.length} trends to ${this.TRENDS_FILE}`);
    } catch (error) {
      console.error('Error saving trends:', error);
      throw error;
    }
  }

  /**
   * Load trends from file
   */
  async loadTrends(): Promise<Trend[]> {
    try {
      if (await fs.pathExists(this.TRENDS_FILE)) {
        const trends = await fs.readJson(this.TRENDS_FILE);
        return trends;
      }
      return [];
    } catch (error) {
      console.error('Error loading trends:', error);
      return [];
    }
  }

  /**
   * Get trend by ID
   */
  async getTrend(id: string): Promise<Trend | null> {
    const trends = await this.loadTrends();
    return trends.find((t) => t.id === id) || null;
  }
}
