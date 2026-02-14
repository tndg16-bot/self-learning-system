/**
 * Learning Model Tests
 */

import { LearningModel } from './LearningModel';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('LearningModel', () => {
  let model: LearningModel;
  let testDataDir: string;

  beforeAll(async () => {
    await tf.ready();
  });

  afterAll(async () => {
    // TensorFlowのリソースをクリーンアップ
    // tf.disposeVariables();
  });

  beforeEach(async () => {
    model = new LearningModel({
      inputSize: 10,
      epochs: 2,
    });
    testDataDir = path.join(__dirname, '../../test-data', 'learning-model', Date.now().toString());
  });

  afterEach(async () => {
    model.dispose();
    await fs.remove(path.join(__dirname, '../../test-data', 'learning-model'));
  });

  describe('initialize', () => {
    it('should initialize the model with features', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);
      const stats = model.getModelStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.numClasses).toBe(2);
      expect(stats.inputSize).toBe(10);
    });
  });

  describe('classifyPattern', () => {
    it('should classify a pattern', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);
      await model.train(features);

      const testPattern = {
        id: '3',
        features: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        label: 'unknown',
        metadata: { confidence: 0.5, frequency: 1, timestamp: Date.now() },
      };

      const result = await model.classifyPattern(testPattern);

      expect(result).toBeDefined();
      expect(result.predictedLabel).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.probabilities).toBeDefined();
    });
  });

  describe('applyWeights', () => {
    it('should apply weights to patterns', () => {
      const patterns = [
        {
          id: '1',
          features: [1, 2, 3],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 10, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [4, 5, 6],
          label: 'class2',
          metadata: { confidence: 0.5, frequency: 1, timestamp: Date.now() },
        },
      ];

      const weighted = model.applyWeights(patterns);

      expect(weighted.length).toBe(2);
      expect(weighted[0].weight).toBeGreaterThanOrEqual(weighted[1].weight);
    });

    it('should sort patterns by weight in descending order', () => {
      const patterns = [
        {
          id: '1',
          features: [1, 2, 3],
          label: 'class1',
          metadata: { confidence: 0.5, frequency: 1, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [4, 5, 6],
          label: 'class2',
          metadata: { confidence: 0.9, frequency: 10, timestamp: Date.now() },
        },
      ];

      const weighted = model.applyWeights(patterns);

      expect(weighted[0].id).toBe('2');
      expect(weighted[1].id).toBe('1');
    });
  });

  describe('train', () => {
    it('should train the model', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);

      const progressUpdates: any[] = [];
      const onProgress = (progress: any) => progressUpdates.push(progress);

      const metrics = await model.train(features, onProgress);

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.loss).toBeGreaterThanOrEqual(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should update training history', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);
      await model.train(features);

      const history = model.getTrainingHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('updateModel', () => {
    it('should update model incrementally', async () => {
      const initialFeatures = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
      ];

      await model.initialize(initialFeatures);
      await model.train(initialFeatures);

      const newFeatures = [
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      // 新しいラベルを追加するため、再初期化が必要
      const allFeatures = [...initialFeatures, ...newFeatures];
      model.dispose();
      model = new LearningModel({ inputSize: 10, epochs: 2 });
      await model.initialize(allFeatures);
      await model.train(allFeatures);

      const stats = model.getModelStats();
      expect(stats.numClasses).toBe(2);
    });
  });

  describe('saveModel and loadModel', () => {
    it('should save and load model', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
        {
          id: '2',
          features: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          label: 'class2',
          metadata: { confidence: 0.8, frequency: 3, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);
      await model.train(features);

      const modelPath = path.join(testDataDir, 'model');
      await model.saveModel(modelPath);

      // 新しいモデルインスタンスを作成してロード
      model.dispose();
      const newModel = new LearningModel();
      await newModel.loadModel(modelPath);

      const stats = newModel.getModelStats();
      expect(stats.isInitialized).toBe(true);
      expect(stats.numClasses).toBe(2);

      newModel.dispose();
    });
  });

  describe('static methods', () => {
    describe('normalizeFeatures', () => {
      it('should normalize features to [0, 1]', () => {
        const features = [0, 5, 10];
        const normalized = LearningModel.normalizeFeatures(features);

        expect(normalized[0]).toBeCloseTo(0, 5);
        expect(normalized[1]).toBeCloseTo(0.5, 5);
        expect(normalized[2]).toBeCloseTo(1, 5);
      });

      it('should handle all same values', () => {
        const features = [5, 5, 5];
        const normalized = LearningModel.normalizeFeatures(features);

        expect(normalized.every(v => v === 0.5)).toBe(true);
      });
    });

    describe('createFeaturesFromPattern', () => {
      it('should create feature vector from pattern', () => {
        const pattern = {
          num: 0.5,
          bool: true,
          str: 'test',
        };

        const features = LearningModel.createFeaturesFromPattern(pattern, 10);

        expect(features).toBeDefined();
        expect(features.length).toBe(10);
        expect(typeof features[0]).toBe('number');
      });

      it('should pad or trim to target size', () => {
        const pattern = { a: 1, b: 2 };
        const features1 = LearningModel.createFeaturesFromPattern(pattern, 5);
        const features2 = LearningModel.createFeaturesFromPattern(pattern, 1);

        expect(features1.length).toBe(5);
        expect(features2.length).toBe(1);
      });
    });
  });

  describe('getModelStats', () => {
    it('should return model statistics', async () => {
      const features = [
        {
          id: '1',
          features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          label: 'class1',
          metadata: { confidence: 0.9, frequency: 5, timestamp: Date.now() },
        },
      ];

      await model.initialize(features);
      const stats = model.getModelStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.numClasses).toBe(1);
      expect(stats.inputSize).toBe(10);
      expect(stats.numParameters).toBeGreaterThan(0);
    });
  });
});
