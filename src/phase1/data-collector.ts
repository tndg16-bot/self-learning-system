/**
 * Task 4: Data Collector
 * Discord、GitHub、Obsidianから収集したデータを統合し、パターン分析の準備をする
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DiscordMessage,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  ObsidianDailyNote,
  IntegratedData,
  DataCollectionConfig,
  DataCollectionError,
  DataCollectionResult,
} from '../types';
import DiscordReader from './discord-reader';
import GitHubReader from './github-reader';
import ObsidianReader from './obsidian-reader';

export class DataCollector {
  private config: DataCollectionConfig;
  private errors: DataCollectionError[] = [];

  constructor(config: DataCollectionConfig) {
    this.config = config;
  }

  /**
   * 全てのデータを収集する
   */
  async collectAll(): Promise<DataCollectionResult> {
    const discordMessages = await this.collectDiscordData();
    const githubData = await this.collectGitHubData();
    const obsidianNotes = await this.collectObsidianData();

    // データを統合
    const integratedData = await this.integrateData({
      discordMessages,
      githubIssues: githubData.issues,
      githubPullRequests: githubData.pullRequests,
      githubCommits: githubData.commits,
      obsidianNotes,
    });

    return {
      success: this.errors.length === 0,
      data: integratedData,
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Discordデータを収集する
   */
  private async collectDiscordData(): Promise<DiscordMessage[]> {
    try {
      const reader = new DiscordReader(this.config.discord);
      const messages = await reader.collectMessages();
      return reader.filterMessages(messages);
    } catch (error) {
      this.errors.push({
        source: 'discord',
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
      return [];
    }
  }

  /**
   * GitHubデータを収集する
   */
  private async collectGitHubData(): Promise<{
    issues: GitHubIssue[];
    pullRequests: GitHubPullRequest[];
    commits: GitHubCommit[];
  }> {
    try {
      const reader = new GitHubReader({
        owner: this.config.github.owner,
        repo: this.config.github.repo,
        startDate: this.config.github.startDate,
        endDate: this.config.github.endDate,
      });

      return await reader.collectAll();
    } catch (error) {
      this.errors.push({
        source: 'github',
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
      return { issues: [], pullRequests: [], commits: [] };
    }
  }

  /**
   * Obsidianデータを収集する
   */
  private async collectObsidianData(): Promise<ObsidianDailyNote[]> {
    try {
      const reader = new ObsidianReader({
        vaultPath: this.config.obsidian.vaultPath,
        dailyNotesPath: this.config.obsidian.dailyNotesPath,
        startDate: this.config.obsidian.startDate,
        endDate: this.config.obsidian.endDate,
      });

      return await reader.readDailyNotes();
    } catch (error) {
      this.errors.push({
        source: 'obsidian',
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
      return [];
    }
  }

  /**
   * データを統合する
   */
  private async integrateData(data: {
    discordMessages: DiscordMessage[];
    githubIssues: GitHubIssue[];
    githubPullRequests: GitHubPullRequest[];
    githubCommits: GitHubCommit[];
    obsidianNotes: ObsidianDailyNote[];
  }): Promise<IntegratedData> {
    // 重複排除（Discordメッセージ）
    const uniqueDiscordMessages = this.removeDuplicates(
      data.discordMessages,
      (msg) => `${msg.id}-${msg.timestamp}`
    );

    // 日時範囲を計算
    const allTimestamps = [
      ...uniqueDiscordMessages.map(m => new Date(m.timestamp)),
      ...data.githubIssues.map(i => new Date(i.createdAt)),
      ...data.githubPullRequests.map(pr => new Date(pr.createdAt)),
      ...data.githubCommits.map(c => new Date(c.authorDate)),
      ...data.obsidianNotes.map(n => new Date(n.date)),
    ];

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (allTimestamps.length > 0) {
      const start = new Date(Math.min(...allTimestamps.map(t => t.getTime())));
      const end = new Date(Math.max(...allTimestamps.map(t => t.getTime())));

      // 設定された範囲と実際のデータの範囲を比較
      if (this.config.discord.startDate || this.config.github.startDate || this.config.obsidian.startDate) {
        const configuredStart = this.findEarliestStartDate();
        startDate = new Date(Math.max(start.getTime(), new Date(configuredStart).getTime())).toISOString();
      } else {
        startDate = start.toISOString();
      }

      if (this.config.discord.endDate || this.config.github.endDate || this.config.obsidian.endDate) {
        const configuredEnd = this.findLatestEndDate();
        endDate = new Date(Math.min(end.getTime(), new Date(configuredEnd).getTime())).toISOString();
      } else {
        endDate = end.toISOString();
      }
    }

    return {
      discordMessages: uniqueDiscordMessages,
      githubIssues: data.githubIssues,
      githubPullRequests: data.githubPullRequests,
      githubCommits: data.githubCommits,
      obsidianNotes: data.obsidianNotes,
      startDate,
      endDate,
      metadata: {
        collectedAt: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate,
        },
        totalEntries:
          uniqueDiscordMessages.length +
          data.githubIssues.length +
          data.githubPullRequests.length +
          data.githubCommits.length +
          data.obsidianNotes.length,
      },
    };
  }

  /**
   * 最も早い開始日を探す
   */
  private findEarliestStartDate(): string {
    const dates = [
      this.config.discord.startDate,
      this.config.github.startDate,
      this.config.obsidian.startDate,
    ].filter((d): d is string => d !== undefined);

    if (dates.length === 0) {
      return new Date('1970-01-01').toISOString();
    }

    return dates.reduce((earliest, current) =>
      new Date(current) < new Date(earliest) ? current : earliest
    );
  }

  /**
   * 最も遅い終了日を探す
   */
  private findLatestEndDate(): string {
    const dates = [
      this.config.discord.endDate,
      this.config.github.endDate,
      this.config.obsidian.endDate,
    ].filter((d): d is string => d !== undefined);

    if (dates.length === 0) {
      return new Date().toISOString();
    }

    return dates.reduce((latest, current) =>
      new Date(current) > new Date(latest) ? current : latest
    );
  }

  /**
   * 重複を削除する
   */
  private removeDuplicates<T>(array: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * データを正規化する
   */
  async normalizeData(data: IntegratedData): Promise<IntegratedData> {
    // Discordメッセージの正規化
    const normalizedDiscordMessages = data.discordMessages.map(msg => ({
      ...msg,
      content: msg.content.trim(),
      timestamp: new Date(msg.timestamp).toISOString(),
    }));

    // GitHub Issuesの正規化
    const normalizedIssues = data.githubIssues.map(issue => ({
      ...issue,
      title: issue.title.trim(),
      labels: issue.labels.map(l => l.trim()),
      assignees: issue.assignees.map(a => a.trim()),
    }));

    // GitHub PRsの正規化
    const normalizedPRs = data.githubPullRequests.map(pr => ({
      ...pr,
      title: pr.title.trim(),
    }));

    // GitHub Commitsの正規化
    const normalizedCommits = data.githubCommits.map(commit => ({
      ...commit,
      message: commit.message.trim(),
      author: commit.author.trim(),
    }));

    // Obsidian Notesの正規化
    const normalizedNotes = data.obsidianNotes.map(note => ({
      ...note,
      tasks: note.tasks.map(task => ({
        ...task,
        text: task.text.trim(),
      })),
      notes: note.notes.map(n => n.trim()),
      tags: note.tags.map(t => t.trim()),
      categories: note.categories.map(c => c.trim()),
    }));

    return {
      discordMessages: normalizedDiscordMessages,
      githubIssues: normalizedIssues,
      githubPullRequests: normalizedPRs,
      githubCommits: normalizedCommits,
      obsidianNotes: normalizedNotes,
      startDate: data.startDate,
      endDate: data.endDate,
      metadata: {
        collectedAt: new Date().toISOString(),
        dateRange: {
          start: data.startDate || '',
          end: data.endDate || '',
        },
        totalEntries:
          normalizedDiscordMessages.length +
          normalizedIssues.length +
          normalizedPRs.length +
          normalizedCommits.length +
          normalizedNotes.length,
      },
    };
  }

  /**
   * データ品質チェック
   */
  async checkDataQuality(data: IntegratedData): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // データが空の場合
    if (data.discordMessages.length === 0) {
      warnings.push('No Discord messages collected');
    }
    if (data.githubIssues.length === 0) {
      warnings.push('No GitHub issues collected');
    }
    if (data.githubPullRequests.length === 0) {
      warnings.push('No GitHub pull requests collected');
    }
    if (data.githubCommits.length === 0) {
      warnings.push('No GitHub commits collected');
    }
    if (data.obsidianNotes.length === 0) {
      warnings.push('No Obsidian notes collected');
    }

    // 全てのデータが空の場合
    if (
      data.discordMessages.length === 0 &&
      data.githubIssues.length === 0 &&
      data.githubPullRequests.length === 0 &&
      data.githubCommits.length === 0 &&
      data.obsidianNotes.length === 0
    ) {
      issues.push('No data collected from any source');
    }

    // 日時範囲の整合性チェック
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        issues.push('Start date is after end date');
      }
    }

    // Discordメッセージのチェック
    data.discordMessages.forEach((msg, index) => {
      if (!msg.content) {
        issues.push(`Discord message at index ${index} has empty content`);
      }
      if (!msg.timestamp || isNaN(new Date(msg.timestamp).getTime())) {
        issues.push(`Discord message at index ${index} has invalid timestamp`);
      }
    });

    // GitHub Issuesのチェック
    data.githubIssues.forEach((issue, index) => {
      if (!issue.title) {
        issues.push(`GitHub issue at index ${index} has empty title`);
      }
      if (!issue.createdAt || isNaN(new Date(issue.createdAt).getTime())) {
        issues.push(`GitHub issue at index ${index} has invalid createdAt`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * 統合データを保存する
   */
  async saveToFile(data: IntegratedData, filePath: string): Promise<void> {
    try {
      const output = {
        ...data,
        summary: this.generateSummary(data),
        qualityCheck: await this.checkDataQuality(data),
        savedAt: new Date().toISOString(),
      };

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save integrated data: ${error}`);
    }
  }

  /**
   * サマリーを生成する
   */
  private generateSummary(data: IntegratedData): Record<string, any> {
    return {
      discord: {
        totalMessages: data.discordMessages.length,
        uniqueChannels: new Set(data.discordMessages.map(m => m.channel)).size,
        uniqueAuthors: new Set(data.discordMessages.map(m => m.authorId)).size,
      },
      github: {
        totalIssues: data.githubIssues.length,
        totalPRs: data.githubPullRequests.length,
        totalCommits: data.githubCommits.length,
        openIssues: data.githubIssues.filter(i => i.state === 'open').length,
        closedIssues: data.githubIssues.filter(i => i.state === 'closed').length,
        mergedPRs: data.githubPullRequests.filter(pr => pr.merged).length,
      },
      obsidian: {
        totalNotes: data.obsidianNotes.length,
        totalTasks: data.obsidianNotes.reduce((sum, n) => sum + n.tasks.length, 0),
        completedTasks: data.obsidianNotes.reduce(
          (sum, n) => sum + n.tasks.filter(t => t.completed).length,
          0
        ),
      },
      dateRange: {
        start: data.startDate,
        end: data.endDate,
      },
    };
  }

  /**
   * データの統計情報を取得する
   */
  getStatistics(data: IntegratedData): Record<string, any> {
    const summary = this.generateSummary(data);

    return {
      ...summary,
      qualityCheck: this.checkDataQuality(data),
      errors: this.errors,
    };
  }
}

// エクスポート
export default DataCollector;
