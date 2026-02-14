/**
 * 自己進化システム共通型定義
 */

// ==================== Phase 1: データ収集 ====================

// Discordメッセージ
export interface DiscordMessage {
  id: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: string;
  channelId: string;
  channel?: string; // Legacy field for compatibility
  channelName?: string;
  attachments?: string[];
  reactions?: string[];
}

// GitHub Issue
export interface GitHubIssue {
  id: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  closedAt?: string;
  labels: string[];
  number: number;
  repository: string;
  assignees?: string[];
}

// GitHub Pull Request
export interface GitHubPullRequest {
  id: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  mergedAt?: string;
  closedAt?: string;
  additions: number;
  deletions: number;
  number: number;
  repository: string;
  merged?: boolean;
  reviews?: number;
}

// GitHub Commit
export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  authorDate?: string;
  additions: number;
  deletions: number;
  files: string[];
  repository: string;
}

// Obsidian Daily Note
export interface ObsidianDailyNote {
  id: string;
  date: string;
  content: string;
  tasks: ObsidianTask[];
  notes?: string[];
  tags: string[];
  categories?: string[];
  metadata?: Record<string, any>;
}

// Obsidian Task
export interface ObsidianTask {
  id: string;
  description: string;
  text?: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

// 統合データ
export interface IntegratedData {
  discordMessages: DiscordMessage[];
  githubIssues: GitHubIssue[];
  githubPullRequests: GitHubPullRequest[];
  githubCommits: GitHubCommit[];
  obsidianNotes: ObsidianDailyNote[];
  startDate?: string;
  endDate?: string;
  metadata: {
    collectedAt: string;
    dateRange: {
      start: string;
      end: string;
    };
    totalEntries: number;
  };
}

// データ収集設定
export interface DataCollectionConfig {
  discord: {
    channels: string[];
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
  github: {
    owner: string;
    repo: string;
    startDate?: string;
    endDate?: string;
  };
  obsidian: {
    vaultPath: string;
    dailyNotesPath?: string;
    startDate?: string;
    endDate?: string;
  };
}

// データ収集エラー
export interface DataCollectionError {
  source: 'discord' | 'github' | 'obsidian';
  error: Error;
  timestamp: string;
}

// データ収集結果
export interface DataCollectionResult {
  success: boolean;
  data?: IntegratedData;
  errors?: DataCollectionError[];
}

// ==================== Phase 2: パターン分析 ====================

// データエントリ（統合データの共通形式）
export interface DataEntry {
  id: string;
  timestamp: number;
  source: 'discord' | 'github' | 'obsidian';
  type: string;
  content: any;
}

// パターン検出結果（Phase 2用）
export interface PatternAnalysis {
  id: string;
  type: 'time-based' | 'frequency-based' | 'context-based';
  confidence: number; // 0 to 1
  description: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  metadata: any;
}

// 時間ベースのパターン
export interface TimeBasedPattern extends PatternAnalysis {
  type: 'time-based';
  category: string;
  frequency: number;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    hour?: number;
    minute?: number;
  };
}

// 頻度ベースのパターン
export interface FrequencyBasedPattern extends PatternAnalysis {
  type: 'frequency-based';
  category: string;
  frequency: number; // times per period
  period: 'day' | 'week' | 'month';
  threshold: number;
}

// コンテキストベースのパターン
export interface ContextBasedPattern extends PatternAnalysis {
  type: 'context-based';
  category: string;
  frequency: number;
  similarity: number;
  context: string;
  relatedEntries: string[];
}

// トレンド分析結果
export interface Trend {
  id: string;
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number; // percentage
  period: string;
  confidence: number;
  data: {
    values: number[];
    labels: string[];
  };
}

// 時系列トレンド
export interface TimeSeriesTrend extends Trend {
  type: 'time-series';
  startDate: number;
  endDate: number;
  slope: number;
  intercept: number;
  rSquared: number;
}

// プロジェクト進捗トレンド
export interface ProjectProgressTrend extends Trend {
  type: 'project-progress';
  projectId: string;
  completedTasks: number;
  totalTasks: number;
  velocity: number; // tasks per period
}

// ユーザー行動トレンド
export interface UserBehaviorTrend extends Trend {
  type: 'user-behavior';
  userId: string;
  behavior: string;
  frequency: number;
  changeRate: number;
}

// 統計分析結果
export interface Statistics {
  id: string;
  metric: string;
  basic: {
    mean: number;
    median: number;
    mode?: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    range: number;
  };
  distribution: {
    skewness: number;
    kurtosis: number;
    quartiles: {
      q1: number;
      q2: number;
      q3: number;
    };
  };
  outliers: Outlier[];
  correlations: Correlation[];
}

// 外れ値検出結果
export interface Outlier {
  value: number;
  index: number;
  type: 'low' | 'high';
  zScore: number;
  timestamp?: number;
}

// 相関分析結果
export interface Correlation {
  metric1: string;
  metric2: string;
  correlation: number; // -1 to 1
  significance: number; // p-value
  strength: 'none' | 'weak' | 'moderate' | 'strong';
}

// 以前のPattern型（互換性維持用）
export interface LegacyPattern {
  id: string;
  type: 'discord' | 'github' | 'obsidian' | 'calendar';
  category: string;
  frequency: number;
  lastSeen: string;
  description: string;
  metadata: Record<string, any>;
}

// 学習データ構造
export interface LearningData {
  patterns: Pattern[];
  proposals: Proposal[];
  evolutionHistory: EvolutionRecord[];
  lastUpdated: string;
}

// パターン
export interface Pattern {
  id: string;
  type: 'discord' | 'github' | 'obsidian' | 'calendar';
  category: string;
  frequency: number;
  lastSeen: string;
  description: string;
  metadata: Record<string, any>;
}

// 改善提案
export interface Proposal {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'automation' | 'efficiency' | 'quality' | 'other';
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  createdAt: string;
  patternId: string;
  estimatedImpact: string;
}

// 進化記録
export interface EvolutionRecord {
  id: string;
  type: 'proposal' | 'pattern' | 'learning' | 'evolution';
  description: string;
  timestamp: string;
  data: Record<string, any>;
}

// OpenAI APIリクエスト
export interface OpenAIRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// 改善提案生成リクエスト
export interface ProposalGenerationRequest {
  patterns: Pattern[];
  context?: string;
  constraints?: string[];
}

// 進化エンジンリクエスト
export interface EvolutionRequest {
  learningData: LearningData;
  currentTime: string;
}

// レポート生成リクエスト
export interface ReportGenerationRequest {
  learningData: LearningData;
  timeframe?: string;
  includeVisualizations?: boolean;
}

// Discord通知設定
export interface DiscordNotification {
  channelId: string;
  content: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}
