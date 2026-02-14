/**
 * Pattern Storage Types
 */

export interface Pattern {
  id: string;
  type: string;
  data: Record<string, any>;
  metadata: PatternMetadata;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface PatternMetadata {
  confidence: number;
  frequency: number;
  lastSeen: number;
  tags: string[];
  source: string;
}

export interface PatternVersion {
  patternId: string;
  version: number;
  data: Record<string, any>;
  metadata: PatternMetadata;
  timestamp: number;
}

export interface PatternQuery {
  type?: string;
  tags?: string[];
  minConfidence?: number;
  minFrequency?: number;
  createdAfter?: number;
  createdBefore?: number;
  notExpired?: boolean;
}

export interface PatternStorageConfig {
  dataDir: string;
  maxVersions: number;
  defaultExpirationDays: number;
}

export interface PatternUpdate {
  data?: Record<string, any>;
  metadata?: Partial<PatternMetadata>;
  expiresAt?: number;
}
