/**
 * Knowledge Base Types
 */

export interface KnowledgeItem {
  id: string;
  patternId: string;
  type: 'fact' | 'rule' | 'relationship' | 'concept';
  content: string;
  structuredData: Record<string, any>;
  metadata: KnowledgeMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeMetadata {
  confidence: number;
  sources: string[];
  frequency: number;
  tags: string[];
  lastVerified?: number;
}

export interface KnowledgeRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: 'causal' | 'temporal' | 'hierarchical' | 'associative' | 'contradictory';
  strength: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeQuery {
  type?: 'fact' | 'rule' | 'relationship' | 'concept';
  tags?: string[];
  patternId?: string;
  minConfidence?: number;
  text?: string;
  relatedTo?: string;
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  relevanceScore: number;
}

export interface KnowledgeExtractionResult {
  extractedItems: KnowledgeItem[];
  relationships: KnowledgeRelationship[];
}

export interface KnowledgeBaseConfig {
  dataDir: string;
  maxItems: number;
  enablePersistence: boolean;
}

export interface KnowledgeStats {
  totalItems: number;
  byType: Record<string, number>;
  totalRelationships: number;
  averageConfidence: number;
}
