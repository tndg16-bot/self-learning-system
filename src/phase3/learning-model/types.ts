/**
 * Learning Model Types
 */

import * as tf from '@tensorflow/tfjs-node';

export interface PatternFeatures {
  id: string;
  features: number[];
  label: string;
  metadata: {
    confidence: number;
    frequency: number;
    timestamp: number;
  };
}

export interface ClassificationResult {
  patternId: string;
  predictedLabel: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface WeightedPattern {
  id: string;
  weight: number;
  originalFeatures: PatternFeatures;
}

export interface LearningModelConfig {
  inputSize: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  hiddenLayers: number[];
  dropoutRate: number;
}

export interface TrainingData {
  features: tf.Tensor;
  labels: tf.Tensor;
}

export interface ModelMetrics {
  accuracy: number;
  loss: number;
  timestamp: number;
}

export interface LearningProgress {
  epoch: number;
  loss: number;
  accuracy: number;
  timestamp: number;
}
