/**
 * Phase 3: Memory Storage
 * パターン永続化、学習モデル、知識ベースを統合
 */

export { PatternStorage } from './pattern-storage';
export type {
  Pattern,
  PatternMetadata,
  PatternVersion,
  PatternQuery,
  PatternStorageConfig,
  PatternUpdate,
} from './pattern-storage/types';

export { LearningModel } from './learning-model';
export type {
  PatternFeatures,
  ClassificationResult,
  WeightedPattern,
  LearningModelConfig,
  TrainingData,
  ModelMetrics,
  LearningProgress,
} from './learning-model/types';

export { KnowledgeBase } from './knowledge-base';
export type {
  KnowledgeItem,
  KnowledgeMetadata,
  KnowledgeRelationship,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeExtractionResult,
  KnowledgeBaseConfig,
  KnowledgeStats,
} from './knowledge-base/types';

import { PatternStorage } from './pattern-storage';
import { LearningModel } from './learning-model';
import { KnowledgeBase } from './knowledge-base';
import { Pattern } from './pattern-storage/types';

/**
 * Phase 3 Integration: Memory Storage System
 */
export class MemoryStorageSystem {
  private patternStorage: PatternStorage;
  private learningModel: LearningModel;
  private knowledgeBase: KnowledgeBase;

  constructor(config?: {
    patternDataDir?: string;
    knowledgeDataDir?: string;
    modelConfig?: Partial<import('./learning-model/types').LearningModelConfig>;
  }) {
    this.patternStorage = new PatternStorage({
      dataDir: config?.patternDataDir ?? './data/patterns',
    });
    this.learningModel = new LearningModel(config?.modelConfig);
    this.knowledgeBase = new KnowledgeBase({
      dataDir: config?.knowledgeDataDir ?? './data/knowledge',
    });
  }

  /**
   * システムを初期化
   */
  async initialize(): Promise<void> {
    await this.patternStorage.initialize();
    await this.knowledgeBase.initialize();

    // 既存パターンから学習モデルを初期化
    const allPatterns = await this.patternStorage.queryPatterns({});
    if (allPatterns.length > 0) {
      const features = allPatterns.map(p => ({
        id: p.id,
        features: LearningModel.createFeaturesFromPattern(p.data),
        label: p.type,
        metadata: {
          confidence: p.metadata.confidence,
          frequency: p.metadata.frequency,
          timestamp: p.createdAt,
        },
      }));

      await this.learningModel.initialize(features);
    }
  }

  /**
   * パターンを保存し、知識を抽出
   */
  async addPattern(pattern: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // パターンを保存
    const savedPattern = await this.patternStorage.savePattern(pattern);

    // 知識を抽出
    const extraction = this.knowledgeBase.extractKnowledge(savedPattern);
    await this.knowledgeBase.addKnowledgeItems(extraction.extractedItems);

    // 関係を追加
    for (const relationship of extraction.relationships) {
      await this.knowledgeBase.addRelationship(relationship);
    }

    // 学習モデルを更新
    const features = {
      id: savedPattern.id,
      features: LearningModel.createFeaturesFromPattern(savedPattern.data),
      label: savedPattern.type,
      metadata: {
        confidence: savedPattern.metadata.confidence,
        frequency: savedPattern.metadata.frequency,
        timestamp: savedPattern.createdAt,
      },
    };

    try {
      await this.learningModel.updateModel([features], true);
    } catch (error) {
      // 更新に失敗した場合は、完全再学習を試みる
      const allPatterns = await this.patternStorage.queryPatterns({});
      const allFeatures = allPatterns.map(p => ({
        id: p.id,
        features: LearningModel.createFeaturesFromPattern(p.data),
        label: p.type,
        metadata: {
          confidence: p.metadata.confidence,
          frequency: p.metadata.frequency,
          timestamp: p.createdAt,
        },
      }));

      this.learningModel.dispose();
      await this.learningModel.initialize(allFeatures);
      await this.learningModel.train(allFeatures);
    }
  }

  /**
   * パターンを検索
   */
  async searchPatterns(query: import('./pattern-storage/types').PatternQuery): Promise<Pattern[]> {
    return await this.patternStorage.queryPatterns(query);
  }

  /**
   * 知識を検索
   */
  searchKnowledge(query: import('./knowledge-base/types').KnowledgeQuery): import('./knowledge-base/types').KnowledgeSearchResult[] {
    return this.knowledgeBase.queryKnowledge(query);
  }

  /**
   * パターンを分類
   */
  async classifyPattern(pattern: Pattern): Promise<import('./learning-model/types').ClassificationResult> {
    const features = {
      id: pattern.id,
      features: LearningModel.createFeaturesFromPattern(pattern.data),
      label: pattern.type,
      metadata: {
        confidence: pattern.metadata.confidence,
        frequency: pattern.metadata.frequency,
        timestamp: pattern.createdAt,
      },
    };

    return await this.learningModel.classifyPattern(features);
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    patterns: ReturnType<PatternStorage['getStats']>;
    model: ReturnType<LearningModel['getModelStats']>;
    knowledge: ReturnType<KnowledgeBase['getStats']>;
  } {
    return {
      patterns: this.patternStorage.getStats(),
      model: this.learningModel.getModelStats(),
      knowledge: this.knowledgeBase.getStats(),
    };
  }

  /**
   * システムをシャットダウン
   */
  async shutdown(): Promise<void> {
    this.learningModel.dispose();
  }
}
