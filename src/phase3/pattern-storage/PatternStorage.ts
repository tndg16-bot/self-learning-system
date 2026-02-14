/**
 * Pattern Storage - パターン永続化システム
 * パターンデータの永続化、バージョン管理、有効期限管理を行う
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  Pattern,
  PatternMetadata,
  PatternVersion,
  PatternQuery,
  PatternStorageConfig,
  PatternUpdate,
} from './types';

export class PatternStorage {
  private config: PatternStorageConfig;
  private patterns: Map<string, Pattern>;
  private versions: Map<string, PatternVersion[]>;
  private initialized: boolean = false;

  constructor(config?: Partial<PatternStorageConfig>) {
    this.config = {
      dataDir: config?.dataDir || './data/patterns',
      maxVersions: config?.maxVersions || 10,
      defaultExpirationDays: config?.defaultExpirationDays || 30,
    };
    this.patterns = new Map();
    this.versions = new Map();
  }

  /**
   * パターンストレージを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await fs.ensureDir(this.config.dataDir);
    await this.loadAllPatterns();

    // 有効期限切れのパターンをクリーンアップ
    await this.cleanExpiredPatterns();

    this.initialized = true;
  }

  /**
   * パターンを保存
   */
  async savePattern(pattern: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pattern> {
    this.ensureInitialized();

    const id = this.generatePatternId(pattern);
    const now = Date.now();
    const expiresAt = pattern.expiresAt ?? now + (this.config.defaultExpirationDays * 24 * 60 * 60 * 1000);

    const newPattern: Pattern = {
      ...pattern,
      id,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    // 既存パターンの場合はバージョン管理
    if (this.patterns.has(id)) {
      await this.createVersion(this.patterns.get(id)!);
    }

    this.patterns.set(id, newPattern);
    await this.persistPattern(newPattern);

    return newPattern;
  }

  /**
   * パターンを取得
   */
  async getPattern(id: string): Promise<Pattern | null> {
    this.ensureInitialized();

    const pattern = this.patterns.get(id);

    if (!pattern) {
      return null;
    }

    // 有効期限チェック
    if (pattern.expiresAt && Date.now() > pattern.expiresAt) {
      await this.deletePattern(id);
      return null;
    }

    return { ...pattern };
  }

  /**
   * パターンを更新
   */
  async updatePattern(id: string, update: PatternUpdate): Promise<Pattern | null> {
    this.ensureInitialized();

    const pattern = this.patterns.get(id);

    if (!pattern) {
      return null;
    }

    // 更新前にバージョンを作成
    await this.createVersion(pattern);

    const updatedPattern: Pattern = {
      ...pattern,
      data: update.data ?? pattern.data,
      metadata: { ...pattern.metadata, ...update.metadata },
      expiresAt: update.expiresAt ?? pattern.expiresAt,
      updatedAt: Date.now(),
    };

    this.patterns.set(id, updatedPattern);
    await this.persistPattern(updatedPattern);

    return { ...updatedPattern };
  }

  /**
   * パターンを削除
   */
  async deletePattern(id: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.patterns.has(id)) {
      return false;
    }

    this.patterns.delete(id);
    this.versions.delete(id);

    const filePath = this.getPatternFilePath(id);
    const versionsPath = this.getVersionsFilePath(id);

    await fs.remove(filePath);
    await fs.remove(versionsPath);

    return true;
  }

  /**
   * クエリでパターンを検索
   */
  async queryPatterns(query: PatternQuery): Promise<Pattern[]> {
    this.ensureInitialized();

    const results: Pattern[] = [];
    const now = Date.now();

    for (const pattern of this.patterns.values()) {
      // 有効期限チェック
      if (query.notExpired && pattern.expiresAt && now > pattern.expiresAt) {
        continue;
      }

      // タイプチェック
      if (query.type && pattern.type !== query.type) {
        continue;
      }

      // タグチェック
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => pattern.metadata.tags.includes(tag));
        if (!hasAllTags) {
          continue;
        }
      }

      // 信頼度チェック
      if (query.minConfidence !== undefined && pattern.metadata.confidence < query.minConfidence) {
        continue;
      }

      // 頻度チェック
      if (query.minFrequency !== undefined && pattern.metadata.frequency < query.minFrequency) {
        continue;
      }

      // 作成日時チェック
      if (query.createdAfter && pattern.createdAt < query.createdAfter) {
        continue;
      }

      if (query.createdBefore && pattern.createdAt > query.createdBefore) {
        continue;
      }

      results.push({ ...pattern });
    }

    return results;
  }

  /**
   * パターンのバージョン履歴を取得
   */
  async getPatternVersions(id: string): Promise<PatternVersion[]> {
    this.ensureInitialized();

    const versions = this.versions.get(id) ?? [];
    return versions.map(v => ({ ...v }));
  }

  /**
   * 特定のバージョンのパターンを復元
   */
  async restorePattern(id: string, version: number): Promise<Pattern | null> {
    this.ensureInitialized();

    const versions = this.versions.get(id);

    if (!versions || versions.length === 0) {
      return null;
    }

    const versionData = versions.find(v => v.version === version);

    if (!versionData) {
      return null;
    }

    // 現在のパターンをバージョン管理
    const currentPattern = this.patterns.get(id);
    if (currentPattern) {
      await this.createVersion(currentPattern);
    }

    // 復元
    const restoredPattern: Pattern = {
      id,
      type: currentPattern?.type || 'unknown',
      data: { ...versionData.data },
      metadata: { ...versionData.metadata },
      createdAt: currentPattern?.createdAt || Date.now(),
      updatedAt: Date.now(),
      expiresAt: currentPattern?.expiresAt,
    };

    this.patterns.set(id, restoredPattern);
    await this.persistPattern(restoredPattern);

    return { ...restoredPattern };
  }

  /**
   * すべてのパターンをファイルからロード
   */
  private async loadAllPatterns(): Promise<void> {
    const files = await fs.readdir(this.config.dataDir);
    const patternFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('versions-'));

    for (const file of patternFiles) {
      const filePath = path.join(this.config.dataDir, file);
      try {
        const data = await fs.readJSON(filePath);
        if (data && data.id) {
          this.patterns.set(data.id, data);
          await this.loadPatternVersions(data.id);
        }
      } catch (error) {
        console.error(`Failed to load pattern from ${file}:`, error);
      }
    }
  }

  /**
   * パターンのバージョンをロード
   */
  private async loadPatternVersions(patternId: string): Promise<void> {
    const versionsPath = this.getVersionsFilePath(patternId);

    try {
      if (await fs.pathExists(versionsPath)) {
        const versions = await fs.readJSON(versionsPath);
        this.versions.set(patternId, versions);
      }
    } catch (error) {
      console.error(`Failed to load versions for pattern ${patternId}:`, error);
    }
  }

  /**
   * パターンをファイルに保存
   */
  private async persistPattern(pattern: Pattern): Promise<void> {
    const filePath = this.getPatternFilePath(pattern.id);
    await fs.writeJSON(filePath, pattern, { spaces: 2 });
  }

  /**
   * バージョンを作成
   */
  private async createVersion(pattern: Pattern): Promise<void> {
    const versions = this.versions.get(pattern.id) || [];
    const nextVersion = versions.length + 1;

    const version: PatternVersion = {
      patternId: pattern.id,
      version: nextVersion,
      data: { ...pattern.data },
      metadata: { ...pattern.metadata },
      timestamp: Date.now(),
    };

    versions.push(version);

    // 最大バージョン数を超えた場合、古いバージョンを削除
    if (versions.length > this.config.maxVersions) {
      versions.shift();
    }

    this.versions.set(pattern.id, versions);
    await this.persistVersions(pattern.id, versions);
  }

  /**
   * バージョンをファイルに保存
   */
  private async persistVersions(patternId: string, versions: PatternVersion[]): Promise<void> {
    const versionsPath = this.getVersionsFilePath(patternId);
    await fs.writeJSON(versionsPath, versions, { spaces: 2 });
  }

  /**
   * 有効期限切れのパターンを削除
   */
  private async cleanExpiredPatterns(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.expiresAt && now > pattern.expiresAt) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      await this.deletePattern(id);
    }
  }

  /**
   * パターンIDを生成
   */
  private generatePatternId(pattern: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt'>): string {
    const hash = this.hashData(pattern);
    return `${pattern.type}-${hash}`;
  }

  /**
   * データからハッシュを生成
   */
  private hashData(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * パターンファイルパスを取得
   */
  private getPatternFilePath(id: string): string {
    return path.join(this.config.dataDir, `${id}.json`);
  }

  /**
   * バージョンファイルパスを取得
   */
  private getVersionsFilePath(id: string): string {
    return path.join(this.config.dataDir, `versions-${id}.json`);
  }

  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PatternStorage must be initialized before use. Call initialize() first.');
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalPatterns: number;
    totalVersions: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    let totalVersions = 0;

    for (const pattern of this.patterns.values()) {
      byType[pattern.type] = (byType[pattern.type] || 0) + 1;
    }

    for (const versions of this.versions.values()) {
      totalVersions += versions.length;
    }

    return {
      totalPatterns: this.patterns.size,
      totalVersions,
      byType,
    };
  }
}
