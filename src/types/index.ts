/**
 * 共通の型定義
 */

// Discord メッセージデータ
export interface DiscordMessage {
  id: string;
  timestamp: string;
  channelId: string;
  content: string;
  author: string;
  authorId: string;
}

// GitHub Issueデータ
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
  closedAt?: string | null;
  labels: any[];
  assignees: string[];
  author?: string;
  repository?: string;
}

// GitHub PRデータ
export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
  mergedAt?: string | null;
  merged: boolean;
  reviews: number;
  additions: number;
  deletions: number;
  author?: string;
  repository?: string;
}

// GitHub コミットデータ
export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  authorDate: string;
  additions: number;
  deletions: number;
  files: string[];
}

// Obsidian Daily Note データ
export interface ObsidianDailyNote {
  date: string;
  tasks: ObsidianTask[];
  notes: string[];
  tags: string[];
  categories: string[];
}

export interface ObsidianTask {
  text: string;
  completed: boolean;
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
}

// データ収集設定
export interface DataCollectionConfig {
  discord: {
    channels?: string[];
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

// エラーハンドリング
export interface DataCollectionError {
  source: 'discord' | 'github' | 'obsidian';
  error: Error;
  timestamp: string;
}

// 結果
export interface DataCollectionResult {
  success: boolean;
  data?: IntegratedData;
  errors?: DataCollectionError[];
}
