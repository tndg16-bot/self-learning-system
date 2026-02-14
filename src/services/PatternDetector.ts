import moment from 'moment-timezone';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DataEntry,
  PatternAnalysis,
  TimeBasedPattern,
  FrequencyBasedPattern,
  ContextBasedPattern,
} from '../types';

/**
 * Pattern Detector Service
 * Detects repetitive patterns in integrated data
 */
export class PatternDetector {
  private readonly MIN_OCCURRENCES = 3;
  private readonly MIN_CONFIDENCE = 0.6;
  private readonly DATA_PATH = path.join(process.cwd(), 'learning-data');
  private readonly PATTERNS_FILE = path.join(this.DATA_PATH, 'patterns.json');

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
   * Detect all types of patterns
   */
  async detectPatterns(entries: DataEntry[]): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];

    console.log(`Starting pattern detection for ${entries.length} entries...`);

    // Detect time-based patterns
    const timePatterns = this.detectTimeBasedPatterns(entries);
    patterns.push(...timePatterns);
    console.log(`Found ${timePatterns.length} time-based patterns`);

    // Detect frequency-based patterns
    const freqPatterns = this.detectFrequencyBasedPatterns(entries);
    patterns.push(...freqPatterns);
    console.log(`Found ${freqPatterns.length} frequency-based patterns`);

    // Detect context-based patterns
    const ctxPatterns = this.detectContextBasedPatterns(entries);
    patterns.push(...ctxPatterns);
    console.log(`Found ${ctxPatterns.length} context-based patterns`);

    // Filter by confidence threshold
    const highConfidencePatterns = patterns.filter(
      (p) => p.confidence >= this.MIN_CONFIDENCE
    );

    console.log(`Total high-confidence patterns: ${highConfidencePatterns.length}`);

    // Save patterns
    await this.savePatterns(highConfidencePatterns);

    return highConfidencePatterns;
  }

  /**
   * Detect time-based patterns (e.g., every Monday at 10am)
   */
  private detectTimeBasedPatterns(entries: DataEntry[]): TimeBasedPattern[] {
    const patterns: Map<string, any[]> = new Map();

    // Group entries by time slot
    entries.forEach((entry) => {
      const m = moment(entry.timestamp);
      const key = `${m.day()}-${m.hour()}-${m.minute()}`;

      if (!patterns.has(key)) {
        patterns.set(key, []);
      }
      patterns.get(key)!.push(entry);
    });

    // Find recurring time slots
    const detectedPatterns: TimeBasedPattern[] = [];
    patterns.forEach((entries, key) => {
      if (entries.length >= this.MIN_OCCURRENCES) {
        const [day, hour, minute] = key.split('-').map(Number);
        const m = moment(entries[0].timestamp);

        const pattern: TimeBasedPattern = {
          id: `time-${key}`,
          type: 'time-based',
          confidence: this.calculateTimeConfidence(entries),
          description: `Recurring pattern every ${this.getFrequencyLabel(
            day
          )} at ${hour}:${minute.toString().padStart(2, '0')}`,
          occurrences: entries.length,
          firstSeen: Math.min(...entries.map((e) => e.timestamp)),
          lastSeen: Math.max(...entries.map((e) => e.timestamp)),
          metadata: {
            source: entries[0].source,
            type: entries[0].type,
          },
          category: entries[0].type,
          frequency: entries.length,
          schedule: {
            frequency: day === 0 ? 'daily' : 'weekly', // Simplify for now
            dayOfWeek: day,
            hour,
            minute,
          },
        };

        detectedPatterns.push(pattern);
      }
    });

    return detectedPatterns;
  }

  /**
   * Detect frequency-based patterns (e.g., repeated 3+ times)
   */
  private detectFrequencyBasedPatterns(
    entries: DataEntry[]
  ): FrequencyBasedPattern[] {
    const patterns: Map<string, DataEntry[]> = new Map();

    // Group by content hash (simplified)
    entries.forEach((entry) => {
      const key = this.generateContentKey(entry);

      if (!patterns.has(key)) {
        patterns.set(key, []);
      }
      patterns.get(key)!.push(entry);
    });

    // Find frequently occurring patterns
    const detectedPatterns: FrequencyBasedPattern[] = [];
    patterns.forEach((entries, key) => {
      if (entries.length >= this.MIN_OCCURRENCES) {
        const duration =
          Math.max(...entries.map((e) => e.timestamp)) -
          Math.min(...entries.map((e) => e.timestamp));
        const days = duration / (1000 * 60 * 60 * 24) || 1;

        const pattern: FrequencyBasedPattern = {
          id: `freq-${key}`,
          type: 'frequency-based',
          confidence: this.calculateFrequencyConfidence(entries, days),
          description: `Repeating content: ${key}`,
          occurrences: entries.length,
          firstSeen: Math.min(...entries.map((e) => e.timestamp)),
          lastSeen: Math.max(...entries.map((e) => e.timestamp)),
          metadata: {
            source: entries[0].source,
            type: entries[0].type,
            examples: entries.slice(0, 3).map((e) => e.content),
          },
          category: entries[0].type,
          frequency: entries.length / days,
          period: 'day',
          threshold: this.MIN_OCCURRENCES,
        };

        detectedPatterns.push(pattern);
      }
    });

    return detectedPatterns;
  }

  /**
   * Detect context-based patterns (e.g., similar tasks, similar solutions)
   */
  private detectContextBasedPatterns(
    entries: DataEntry[]
  ): ContextBasedPattern[] {
    const patterns: ContextBasedPattern[] = [];

    // Group by type and find similarities
    const typeGroups = this.groupByType(entries);

    typeGroups.forEach((entries, type) => {
      if (entries.length < this.MIN_OCCURRENCES) return;

      // Calculate similarity within the group
      const similarity = this.calculateContextSimilarity(entries);

      if (similarity >= this.MIN_CONFIDENCE) {
        const pattern: ContextBasedPattern = {
          id: `ctx-${type}`,
          type: 'context-based',
          confidence: similarity,
          description: `Contextual pattern in ${type} activities`,
          occurrences: entries.length,
          firstSeen: Math.min(...entries.map((e) => e.timestamp)),
          lastSeen: Math.max(...entries.map((e) => e.timestamp)),
          metadata: {
            source: entries[0].source,
            commonAttributes: this.extractCommonAttributes(entries),
          },
          category: type,
          frequency: entries.length,
          similarity,
          context: type,
          relatedEntries: entries.slice(0, 5).map((e) => e.id),
        };

        patterns.push(pattern);
      }
    });

    return patterns;
  }

  /**
   * Calculate confidence score for time-based patterns
   */
  private calculateTimeConfidence(entries: DataEntry[]): number {
    if (entries.length < 2) return 0;

    // Check consistency of timing
    const timestamps = entries.map((e) => e.timestamp).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Calculate standard deviation of intervals
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower stdDev relative to mean = higher confidence
    const cv = mean > 0 ? stdDev / mean : 1;
    return Math.max(0, 1 - cv);
  }

  /**
   * Calculate confidence score for frequency-based patterns
   */
  private calculateFrequencyConfidence(
    entries: DataEntry[],
    days: number
  ): number {
    // More occurrences in shorter time = higher confidence
    const score = Math.min(1, (entries.length / this.MIN_OCCURRENCES) * 0.8);
    return Math.max(this.MIN_CONFIDENCE, score);
  }

  /**
   * Calculate similarity score for context-based patterns
   */
  private calculateContextSimilarity(entries: DataEntry[]): number {
    if (entries.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const similarity = this.contentSimilarity(
          entries[i].content,
          entries[j].content
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate similarity between two content objects
   */
  private contentSimilarity(content1: any, content2: any): number {
    // Simplified similarity calculation
    // In production, use more sophisticated NLP or ML techniques
    const str1 = JSON.stringify(content1).toLowerCase();
    const str2 = JSON.stringify(content2).toLowerCase();

    if (str1 === str2) return 1;

    // Simple word overlap
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate a key for content grouping
   */
  private generateContentKey(entry: DataEntry): string {
    const content = entry.content;

    // Simplified key generation
    if (typeof content === 'string') {
      return content.substring(0, 50);
    } else if (content && typeof content === 'object') {
      return Object.keys(content).sort().join(',');
    }

    return entry.type;
  }

  /**
   * Group entries by type
   */
  private groupByType(entries: DataEntry[]): Map<string, DataEntry[]> {
    const groups = new Map<string, DataEntry[]>();

    entries.forEach((entry) => {
      if (!groups.has(entry.type)) {
        groups.set(entry.type, []);
      }
      groups.get(entry.type)!.push(entry);
    });

    return groups;
  }

  /**
   * Extract common attributes from entries
   */
  private extractCommonAttributes(entries: DataEntry[]): string[] {
    if (entries.length === 0) return [];

    const allKeys = new Set<string>();
    entries.forEach((entry) => {
      if (entry.content && typeof entry.content === 'object') {
        Object.keys(entry.content).forEach((key) => allKeys.add(key));
      }
    });

    const common: string[] = [];
    allKeys.forEach((key) => {
      const hasKey = entries.every(
        (entry) =>
          entry.content && typeof entry.content === 'object' && key in entry.content
      );
      if (hasKey) {
        common.push(key);
      }
    });

    return common;
  }

  /**
   * Get frequency label for day of week
   */
  private getFrequencyLabel(day: number): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[day];
  }

  /**
   * Save patterns to file
   */
  private async savePatterns(patterns: PatternAnalysis[]): Promise<void> {
    try {
      await fs.writeJson(this.PATTERNS_FILE, patterns, { spaces: 2 });
      console.log(`Saved ${patterns.length} patterns to ${this.PATTERNS_FILE}`);
    } catch (error) {
      console.error('Error saving patterns:', error);
      throw error;
    }
  }

  /**
   * Load patterns from file
   */
  async loadPatterns(): Promise<PatternAnalysis[]> {
    try {
      if (await fs.pathExists(this.PATTERNS_FILE)) {
        const patterns = await fs.readJson(this.PATTERNS_FILE);
        return patterns;
      }
      return [];
    } catch (error) {
      console.error('Error loading patterns:', error);
      return [];
    }
  }

  /**
   * Get pattern by ID
   */
  async getPattern(id: string): Promise<PatternAnalysis | null> {
    const patterns = await this.loadPatterns();
    return patterns.find((p) => p.id === id) || null;
  }
}
