/**
 * Learning Model - 学習モデル構築
 * パターンの分類、重み付け、学習アルゴリズムの実装
 */

import * as tf from '@tensorflow/tfjs-node';
import {
  PatternFeatures,
  ClassificationResult,
  WeightedPattern,
  LearningModelConfig,
  TrainingData,
  ModelMetrics,
  LearningProgress,
} from './types';

export class LearningModel {
  private model: tf.Sequential | null = null;
  private config: LearningModelConfig;
  private isInitialized: boolean = false;
  private labelMap: string[] = [];
  private inverseLabelMap: Map<string, number> = new Map();
  private trainingHistory: LearningProgress[] = [];

  constructor(config?: Partial<LearningModelConfig>) {
    this.config = {
      inputSize: config?.inputSize ?? 100,
      learningRate: config?.learningRate ?? 0.001,
      batchSize: config?.batchSize ?? 32,
      epochs: config?.epochs ?? 10,
      hiddenLayers: config?.hiddenLayers ?? [64, 32],
      dropoutRate: config?.dropoutRate ?? 0.2,
    };
  }

  /**
   * モデルを初期化
   */
  async initialize(features: PatternFeatures[]): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 特徴量のサイズを決定
    if (features.length > 0) {
      this.config.inputSize = features[0].features.length;
    }

    // ラベルマップを作成
    const uniqueLabels = [...new Set(features.map(f => f.label))];
    this.labelMap = uniqueLabels;
    this.inverseLabelMap = new Map(
      uniqueLabels.map((label, index) => [label, index])
    );

    // モデルを構築
    this.buildModel();

    this.isInitialized = true;
  }

  /**
   * ニューラルネットワークモデルを構築
   */
  private buildModel(): void {
    this.model = tf.sequential();

    // 入力層
    this.model.add(
      tf.layers.dense({
        inputShape: [this.config.inputSize],
        units: this.config.hiddenLayers[0],
        activation: 'relu',
      })
    );

    // 隠れ層
    for (let i = 1; i < this.config.hiddenLayers.length; i++) {
      this.model.add(tf.layers.dense({
        units: this.config.hiddenLayers[i],
        activation: 'relu',
      }));
      this.model.add(tf.layers.dropout({
        rate: this.config.dropoutRate,
      }));
    }

    // 出力層
    this.model.add(tf.layers.dense({
      units: this.labelMap.length,
      activation: 'softmax',
    }));

    // モデルをコンパイル
    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
  }

  /**
   * パターンを分類
   */
  async classifyPattern(pattern: PatternFeatures): Promise<ClassificationResult> {
    this.ensureInitialized();

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const inputTensor = tf.tensor2d([pattern.features]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();

    const maxProb = Math.max(...probabilities);
    const predictedIndex = probabilities.indexOf(maxProb);
    const predictedLabel = this.labelMap[predictedIndex];

    // 確率分布を構築
    const probDistribution: Record<string, number> = {};
    for (let i = 0; i < this.labelMap.length; i++) {
      probDistribution[this.labelMap[i]] = probabilities[i];
    }

    inputTensor.dispose();
    prediction.dispose();

    return {
      patternId: pattern.id,
      predictedLabel,
      confidence: maxProb,
      probabilities: probDistribution,
    };
  }

  /**
   * 複数のパターンを分類
   */
  async classifyPatterns(patterns: PatternFeatures[]): Promise<ClassificationResult[]> {
    this.ensureInitialized();

    const results: ClassificationResult[] = [];
    for (const pattern of patterns) {
      const result = await this.classifyPattern(pattern);
      results.push(result);
    }

    return results;
  }

  /**
   * パターンに重み付け
   */
  applyWeights(patterns: PatternFeatures[]): WeightedPattern[] {
    const weightedPatterns: WeightedPattern[] = [];

    for (const pattern of patterns) {
      const weight = this.calculateWeight(pattern);
      weightedPatterns.push({
        id: pattern.id,
        weight,
        originalFeatures: pattern,
      });
    }

    // 重みで降順ソート
    return weightedPatterns.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 重みを計算
   */
  private calculateWeight(pattern: PatternFeatures): number {
    // 信頼度と頻度の加重平均
    const confidenceWeight = pattern.metadata.confidence * 0.7;
    const frequencyWeight = Math.min(pattern.metadata.frequency / 10, 1) * 0.3;

    return confidenceWeight + frequencyWeight;
  }

  /**
   * 学習データを作成
   */
  prepareTrainingData(patterns: PatternFeatures[]): TrainingData {
    const featuresData = patterns.map(p => p.features);
    const labelsData = patterns.map(p => {
      const index = this.inverseLabelMap.get(p.label) ?? 0;
      const oneHot = new Array(this.labelMap.length).fill(0);
      oneHot[index] = 1;
      return oneHot;
    });

    const features = tf.tensor2d(featuresData);
    const labels = tf.tensor2d(labelsData);

    return { features, labels };
  }

  /**
   * モデルを学習
   */
  async train(
    patterns: PatternFeatures[],
    onProgress?: (progress: LearningProgress) => void
  ): Promise<ModelMetrics> {
    this.ensureInitialized();

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const { features, labels } = this.prepareTrainingData(patterns);

    // 学習履歴をリセット
    this.trainingHistory = [];

    // 学習
    const history = await this.model.fit(features, labels, {
      batchSize: this.config.batchSize,
      epochs: this.config.epochs,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const progress: LearningProgress = {
            epoch: epoch + 1,
            loss: logs?.loss ?? 0,
            accuracy: logs?.accuracy ?? 0,
            timestamp: Date.now(),
          };
          this.trainingHistory.push(progress);

          if (onProgress) {
            onProgress(progress);
          }
        },
      },
    });

    features.dispose();
    labels.dispose();

    // 最終メトリクスを取得
    const lossArray = history.history.loss[history.history.loss.length - 1];
    const accArray = history.history.acc?.[history.history.acc.length - 1];
    const finalLoss = Array.isArray(lossArray) ? lossArray[0] : lossArray;
    const finalAccuracy = Array.isArray(accArray) ? accArray[0] : (accArray ?? 0);

    return {
      accuracy: finalAccuracy,
      loss: finalLoss,
      timestamp: Date.now(),
    };
  }

  /**
   * モデルを更新
   */
  async updateModel(
    patterns: PatternFeatures[],
    incremental: boolean = true
  ): Promise<ModelMetrics> {
    this.ensureInitialized();

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    if (incremental) {
      // 増分学習（追加データで再学習）
      const { features, labels } = this.prepareTrainingData(patterns);
      const history = await this.model.fit(features, labels, {
        batchSize: this.config.batchSize,
        epochs: Math.max(1, Math.floor(this.config.epochs / 2)),
        shuffle: true,
      });

      features.dispose();
      labels.dispose();

      const lossArray = history.history.loss[history.history.loss.length - 1];
      const accArray = history.history.acc?.[history.history.acc.length - 1];
      const finalLoss = Array.isArray(lossArray) ? lossArray[0] : lossArray;
      const finalAccuracy = Array.isArray(accArray) ? accArray[0] : (accArray ?? 0);

      return {
        accuracy: finalAccuracy,
        loss: finalLoss,
        timestamp: Date.now(),
      };
    } else {
      // 完全再学習
      return await this.train(patterns);
    }
  }

  /**
   * モデルを保存
   */
  async saveModel(path: string): Promise<void> {
    this.ensureInitialized();

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    await this.model.save(`file://${path}`);

    // メタデータを保存
    const metadata = {
      labelMap: this.labelMap,
      config: this.config,
      trainingHistory: this.trainingHistory,
    };

    const fs = require('fs-extra');
    await fs.writeJSON(`${path}/metadata.json`, metadata, { spaces: 2 });
  }

  /**
   * モデルを読み込み
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);

    const fs = require('fs-extra');
    const metadata = await fs.readJSON(`${path}/metadata.json`);

    this.labelMap = metadata.labelMap;
    this.config = metadata.config;
    this.trainingHistory = metadata.trainingHistory ?? [];

    this.inverseLabelMap = new Map(
      this.labelMap.map((label: string, index: number) => [label, index])
    );

    this.isInitialized = true;
  }

  /**
   * 学習履歴を取得
   */
  getTrainingHistory(): LearningProgress[] {
    return [...this.trainingHistory];
  }

  /**
   * モデルの統計情報を取得
   */
  getModelStats(): {
    isInitialized: boolean;
    numClasses: number;
    inputSize: number;
    numParameters: number;
  } {
    const numParameters = this.model?.countParams() ?? 0;

    return {
      isInitialized: this.isInitialized,
      numClasses: this.labelMap.length,
      inputSize: this.config.inputSize,
      numParameters,
    };
  }

  /**
   * モデルを破棄
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }

  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.model) {
      throw new Error('LearningModel must be initialized before use. Call initialize() first.');
    }
  }

  /**
   * 特徴量を正規化
   */
  static normalizeFeatures(features: number[]): number[] {
    const max = Math.max(...features);
    const min = Math.min(...features);

    if (max === min) {
      return features.map(() => 0.5);
    }

    return features.map(f => (f - min) / (max - min));
  }

  /**
   * 特徴量ベクトルを作成（パターンから）
   */
  static createFeaturesFromPattern(pattern: Record<string, any>, size: number = 100): number[] {
    const values = Object.values(pattern);
    const flatValues: number[] = [];

    for (const value of values) {
      if (typeof value === 'number') {
        flatValues.push(value);
      } else if (typeof value === 'boolean') {
        flatValues.push(value ? 1 : 0);
      } else if (typeof value === 'string') {
        // 文字列を数値に変換（ハッシュ）
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
          const char = value.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        flatValues.push(Math.abs(hash) % 1000 / 1000);
      }
    }

    // サイズに合わせてパディングまたはトリミング
    if (flatValues.length >= size) {
      return flatValues.slice(0, size);
    } else {
      return [...flatValues, ...new Array(size - flatValues.length).fill(0)];
    }
  }
}
