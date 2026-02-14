/**
 * Knowledge Base - 知識ベース構築
 * パターンから知識を抽出、構造化、永続化、検索
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  KnowledgeItem,
  KnowledgeMetadata,
  KnowledgeRelationship,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeExtractionResult,
  KnowledgeBaseConfig,
  KnowledgeStats,
} from './types';
import { Pattern } from '../pattern-storage/types';

export class KnowledgeBase {
  private config: KnowledgeBaseConfig;
  private items: Map<string, KnowledgeItem>;
  private relationships: Map<string, KnowledgeRelationship>;
  private patternIndex: Map<string, Set<string>>; // patternId -> knowledge item IDs
  private tagIndex: Map<string, Set<string>>; // tag -> knowledge item IDs
  private initialized: boolean = false;

  constructor(config?: Partial<KnowledgeBaseConfig>) {
    this.config = {
      dataDir: config?.dataDir ?? './data/knowledge',
      maxItems: config?.maxItems ?? 10000,
      enablePersistence: config?.enablePersistence ?? true,
    };
    this.items = new Map();
    this.relationships = new Map();
    this.patternIndex = new Map();
    this.tagIndex = new Map();
  }

  /**
   * 知識ベースを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.config.enablePersistence) {
      await fs.ensureDir(this.config.dataDir);
      await this.loadAllKnowledge();
    }

    this.initialized = true;
  }

  /**
   * パターンから知識を抽出
   */
  extractKnowledge(pattern: Pattern): KnowledgeExtractionResult {
    const extractedItems: KnowledgeItem[] = [];
    const relationships: KnowledgeRelationship[] = [];

    // パターンタイプに基づいて知識を抽出
    switch (pattern.type) {
      case 'behavioral':
        extractedItems.push(...this.extractBehavioralKnowledge(pattern));
        break;
      case 'temporal':
        extractedItems.push(...this.extractTemporalKnowledge(pattern));
        break;
      case 'sequential':
        extractedItems.push(...this.extractSequentialKnowledge(pattern));
        break;
      case 'categorical':
        extractedItems.push(...this.extractCategoricalKnowledge(pattern));
        break;
      default:
        extractedItems.push(this.extractGenericKnowledge(pattern));
    }

    // 関連性を分析
    if (extractedItems.length > 1) {
      relationships.push(...this.analyzeRelationships(extractedItems));
    }

    return {
      extractedItems,
      relationships,
    };
  }

  /**
   * 行動パターンから知識を抽出
   */
  private extractBehavioralKnowledge(pattern: Pattern): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const data = pattern.data;

    // 行動規則を抽出
    if (data.trigger && data.action) {
      items.push({
        id: this.generateKnowledgeId(),
        patternId: pattern.id,
        type: 'rule',
        content: `When ${data.trigger}, then ${data.action}`,
        structuredData: {
          trigger: data.trigger,
          action: data.action,
          context: data.context,
        },
        metadata: {
          confidence: pattern.metadata.confidence,
          sources: [pattern.metadata.source],
          frequency: pattern.metadata.frequency,
          tags: ['behavioral', 'rule', ...pattern.metadata.tags],
          lastVerified: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return items;
  }

  /**
   * 時系列パターンから知識を抽出
   */
  private extractTemporalKnowledge(pattern: Pattern): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const data = pattern.data;

    // 時間的関係を抽出
    if (data.sequence && Array.isArray(data.sequence)) {
      const sequence = data.sequence.join(' -> ');
      items.push({
        id: this.generateKnowledgeId(),
        patternId: pattern.id,
        type: 'relationship',
        content: `Temporal sequence: ${sequence}`,
        structuredData: {
          sequence: data.sequence,
          interval: data.interval,
          duration: data.duration,
        },
        metadata: {
          confidence: pattern.metadata.confidence,
          sources: [pattern.metadata.source],
          frequency: pattern.metadata.frequency,
          tags: ['temporal', 'sequence', ...pattern.metadata.tags],
          lastVerified: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return items;
  }

  /**
   * 連続パターンから知識を抽出
   */
  private extractSequentialKnowledge(pattern: Pattern): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const data = pattern.data;

    // 連続規則を抽出
    if (data.steps && Array.isArray(data.steps)) {
      items.push({
        id: this.generateKnowledgeId(),
        patternId: pattern.id,
        type: 'rule',
        content: `Sequential pattern: ${data.steps.join(' → ')}`,
        structuredData: {
          steps: data.steps,
          conditions: data.conditions,
        },
        metadata: {
          confidence: pattern.metadata.confidence,
          sources: [pattern.metadata.source],
          frequency: pattern.metadata.frequency,
          tags: ['sequential', 'rule', ...pattern.metadata.tags],
          lastVerified: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return items;
  }

  /**
   * カテゴリパターンから知識を抽出
   */
  private extractCategoricalKnowledge(pattern: Pattern): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const data = pattern.data;

    // カテゴリ事実を抽出
    if (data.category && data.items) {
      items.push({
        id: this.generateKnowledgeId(),
        patternId: pattern.id,
        type: 'concept',
        content: `Category ${data.category} contains: ${Array.isArray(data.items) ? data.items.join(', ') : data.items}`,
        structuredData: {
          category: data.category,
          items: data.items,
          attributes: data.attributes,
        },
        metadata: {
          confidence: pattern.metadata.confidence,
          sources: [pattern.metadata.source],
          frequency: pattern.metadata.frequency,
          tags: ['categorical', 'concept', ...pattern.metadata.tags],
          lastVerified: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return items;
  }

  /**
   * 汎用知識を抽出
   */
  private extractGenericKnowledge(pattern: Pattern): KnowledgeItem {
    const data = pattern.data;

    return {
      id: this.generateKnowledgeId(),
      patternId: pattern.id,
      type: 'fact',
      content: JSON.stringify(data),
      structuredData: data,
      metadata: {
        confidence: pattern.metadata.confidence,
        sources: [pattern.metadata.source],
        frequency: pattern.metadata.frequency,
        tags: ['generic', ...pattern.metadata.tags],
        lastVerified: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * 知識項目間の関係を分析
   */
  private analyzeRelationships(items: KnowledgeItem[]): KnowledgeRelationship[] {
    const relationships: KnowledgeRelationship[] = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];

        // 共通タグの数に基づいて関連性を判定
        const commonTags = item1.metadata.tags.filter(tag =>
          item2.metadata.tags.includes(tag)
        );

        if (commonTags.length > 0) {
          const strength = commonTags.length / Math.max(item1.metadata.tags.length, item2.metadata.tags.length);

          relationships.push({
            id: this.generateRelationshipId(),
            fromId: item1.id,
            toId: item2.id,
            type: 'associative',
            strength,
            metadata: {
              commonTags,
            },
          });
        }
      }
    }

    return relationships;
  }

  /**
   * 知識項目を追加
   */
  async addKnowledge(item: KnowledgeItem): Promise<void> {
    this.ensureInitialized();

    // 最大数チェック
    if (this.items.size >= this.config.maxItems) {
      // 最も古い/信頼度の低いアイテムを削除
      await this.pruneOldItems(1);
    }

    this.items.set(item.id, { ...item });

    // インデックス更新
    this.updatePatternIndex(item);
    this.updateTagIndex(item);

    if (this.config.enablePersistence) {
      await this.persistKnowledge(item);
    }
  }

  /**
   * 複数の知識項目を追加
   */
  async addKnowledgeItems(items: KnowledgeItem[]): Promise<void> {
    this.ensureInitialized();

    for (const item of items) {
      await this.addKnowledge(item);
    }
  }

  /**
   * 関係を追加
   */
  async addRelationship(relationship: KnowledgeRelationship): Promise<void> {
    this.ensureInitialized();

    this.relationships.set(relationship.id, { ...relationship });

    if (this.config.enablePersistence) {
      await this.persistRelationship(relationship);
    }
  }

  /**
   * 知識項目を取得
   */
  getKnowledge(id: string): KnowledgeItem | null {
    this.ensureInitialized();

    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  /**
   * 関係を取得
   */
  getRelationship(id: string): KnowledgeRelationship | null {
    this.ensureInitialized();

    const relationship = this.relationships.get(id);
    return relationship ? { ...relationship } : null;
  }

  /**
   * クエリで知識を検索
   */
  queryKnowledge(query: KnowledgeQuery): KnowledgeSearchResult[] {
    this.ensureInitialized();

    const results: KnowledgeSearchResult[] = [];

    for (const item of this.items.values()) {
      let relevanceScore = 1.0;

      // タイプフィルタ
      if (query.type && item.type !== query.type) {
        continue;
      }

      // タグフィルタ
      if (query.tags && query.tags.length > 0) {
        const hasTags = query.tags.some(tag => item.metadata.tags.includes(tag));
        if (!hasTags) {
          continue;
        }
        // タグマッチ数に基づいてスコア計算
        const matchedTags = query.tags.filter(tag => item.metadata.tags.includes(tag));
        relevanceScore = matchedTags.length / query.tags.length;
      }

      // パターンIDフィルタ
      if (query.patternId && item.patternId !== query.patternId) {
        continue;
      }

      // 信頼度フィルタ
      if (query.minConfidence && item.metadata.confidence < query.minConfidence) {
        continue;
      }

      // テキスト検索
      if (query.text) {
        const text = query.text.toLowerCase();
        const contentMatch = item.content.toLowerCase().includes(text);
        const structuredMatch = JSON.stringify(item.structuredData).toLowerCase().includes(text);

        if (!contentMatch && !structuredMatch) {
          continue;
        }

        // テキストマッチの品質に基づいてスコア調整
        if (contentMatch) {
          relevanceScore *= 1.2;
        }
        if (structuredMatch) {
          relevanceScore *= 1.1;
        }
      }

      // 関連アイテム検索
      if (query.relatedTo) {
        const relatedIds = this.findRelatedItemIds(query.relatedTo);
        if (!relatedIds.has(item.id)) {
          continue;
        }
        const relationship = this.relationships.get(
          Array.from(this.relationships.values()).find(
            r => r.fromId === query.relatedTo || r.toId === query.relatedTo
          )?.id ?? ''
        );
        if (relationship) {
          relevanceScore *= relationship.strength;
        }
      }

      results.push({
        item: { ...item },
        relevanceScore,
      });
    }

    // スコアで降順ソート
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 関連する知識項目を検索
   */
  findRelatedItems(itemId: string, maxDepth: number = 2): KnowledgeItem[] {
    this.ensureInitialized();

    const visited = new Set<string>();
    const result: KnowledgeItem[] = [];

    const traverse = (id: string, depth: number) => {
      if (depth > maxDepth || visited.has(id)) {
        return;
      }

      visited.add(id);

      // 直接的な関係を検索
      for (const relationship of this.relationships.values()) {
        let neighborId: string | null = null;

        if (relationship.fromId === id) {
          neighborId = relationship.toId;
        } else if (relationship.toId === id) {
          neighborId = relationship.fromId;
        }

        if (neighborId && !visited.has(neighborId)) {
          const neighbor = this.items.get(neighborId);
          if (neighbor) {
            result.push({ ...neighbor });
            traverse(neighborId, depth + 1);
          }
        }
      }
    };

    traverse(itemId, 0);

    return result;
  }

  /**
   * 知識項目を削除
   */
  async removeKnowledge(id: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.items.has(id)) {
      return false;
    }

    const item = this.items.get(id)!;

    // インデックスから削除
    this.removeFromPatternIndex(item);
    this.removeFromTagIndex(item);

    this.items.delete(id);

    // 関連する関係も削除
    const relationshipsToRemove: string[] = [];
    for (const [relId, rel] of this.relationships.entries()) {
      if (rel.fromId === id || rel.toId === id) {
        relationshipsToRemove.push(relId);
      }
    }

    for (const relId of relationshipsToRemove) {
      this.relationships.delete(relId);
    }

    if (this.config.enablePersistence) {
      await this.removeKnowledgeFile(id);
    }

    return true;
  }

  /**
   * 知識項目を更新
   */
  async updateKnowledge(
    id: string,
    updates: Partial<Pick<KnowledgeItem, 'content' | 'structuredData' | 'metadata'>>
  ): Promise<KnowledgeItem | null> {
    this.ensureInitialized();

    const item = this.items.get(id);

    if (!item) {
      return null;
    }

    const updatedItem: KnowledgeItem = {
      ...item,
      content: updates.content ?? item.content,
      structuredData: updates.structuredData ?? item.structuredData,
      metadata: updates.metadata ?? item.metadata,
      updatedAt: Date.now(),
    };

    this.items.set(id, updatedItem);

    if (this.config.enablePersistence) {
      await this.persistKnowledge(updatedItem);
    }

    return { ...updatedItem };
  }

  /**
   * 統計情報を取得
   */
  getStats(): KnowledgeStats {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const item of this.items.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalConfidence += item.metadata.confidence;
    }

    return {
      totalItems: this.items.size,
      byType,
      totalRelationships: this.relationships.size,
      averageConfidence: this.items.size > 0 ? totalConfidence / this.items.size : 0,
    };
  }

  /**
   * パターンインデックスを更新
   */
  private updatePatternIndex(item: KnowledgeItem): void {
    const patternIds = this.patternIndex.get(item.patternId) ?? new Set();
    patternIds.add(item.id);
    this.patternIndex.set(item.patternId, patternIds);
  }

  /**
   * タグインデックスを更新
   */
  private updateTagIndex(item: KnowledgeItem): void {
    for (const tag of item.metadata.tags) {
      const tagIds = this.tagIndex.get(tag) ?? new Set();
      tagIds.add(item.id);
      this.tagIndex.set(tag, tagIds);
    }
  }

  /**
   * パターンインデックスから削除
   */
  private removeFromPatternIndex(item: KnowledgeItem): void {
    const patternIds = this.patternIndex.get(item.patternId);
    if (patternIds) {
      patternIds.delete(item.id);
      if (patternIds.size === 0) {
        this.patternIndex.delete(item.patternId);
      }
    }
  }

  /**
   * タグインデックスから削除
   */
  private removeFromTagIndex(item: KnowledgeItem): void {
    for (const tag of item.metadata.tags) {
      const tagIds = this.tagIndex.get(tag);
      if (tagIds) {
        tagIds.delete(item.id);
        if (tagIds.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * 関連アイテムIDを検索
   */
  private findRelatedItemIds(itemId: string): Set<string> {
    const relatedIds = new Set<string>();

    for (const relationship of this.relationships.values()) {
      if (relationship.fromId === itemId) {
        relatedIds.add(relationship.toId);
      } else if (relationship.toId === itemId) {
        relatedIds.add(relationship.fromId);
      }
    }

    return relatedIds;
  }

  /**
   * 古いアイテムを削除
   */
  private async pruneOldItems(count: number): Promise<void> {
    const itemsByAge = Array.from(this.items.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    for (let i = 0; i < Math.min(count, itemsByAge.length); i++) {
      await this.removeKnowledge(itemsByAge[i][0]);
    }
  }

  /**
   * 全知識をファイルからロード
   */
  private async loadAllKnowledge(): Promise<void> {
    const files = await fs.readdir(this.config.dataDir);
    const knowledgeFiles = files.filter(f => f.startsWith('knowledge-') && f.endsWith('.json'));

    for (const file of knowledgeFiles) {
      const filePath = path.join(this.config.dataDir, file);
      try {
        const data = await fs.readJSON(filePath);
        if (data && data.id) {
          this.items.set(data.id, data);
          this.updatePatternIndex(data);
          this.updateTagIndex(data);
        }
      } catch (error) {
        console.error(`Failed to load knowledge from ${file}:`, error);
      }
    }

    // 関係ファイルをロード
    const relFile = path.join(this.config.dataDir, 'relationships.json');
    try {
      if (await fs.pathExists(relFile)) {
        const relationships = await fs.readJSON(relFile);
        for (const rel of relationships) {
          if (rel && rel.id) {
            this.relationships.set(rel.id, rel);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load relationships:', error);
    }
  }

  /**
   * 知識をファイルに保存
   */
  private async persistKnowledge(item: KnowledgeItem): Promise<void> {
    const filePath = path.join(this.config.dataDir, `knowledge-${item.id}.json`);
    await fs.writeJSON(filePath, item, { spaces: 2 });
  }

  /**
   * 関係をファイルに保存
   */
  private async persistRelationship(relationship: KnowledgeRelationship): Promise<void> {
    const relFile = path.join(this.config.dataDir, 'relationships.json');
    const relationships = Array.from(this.relationships.values());
    await fs.writeJSON(relFile, relationships, { spaces: 2 });
  }

  /**
   * 知識ファイルを削除
   */
  private async removeKnowledgeFile(id: string): Promise<void> {
    const filePath = path.join(this.config.dataDir, `knowledge-${id}.json`);
    await fs.remove(filePath);
  }

  /**
   * 知識IDを生成
   */
  private generateKnowledgeId(): string {
    return `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 関係IDを生成
   */
  private generateRelationshipId(): string {
    return `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('KnowledgeBase must be initialized before use. Call initialize() first.');
    }
  }
}
