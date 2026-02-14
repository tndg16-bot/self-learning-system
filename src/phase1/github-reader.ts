/**
 * Task 2: GitHub Reader
 * GitHub APIを使用して、Issues/PR/コミットデータを収集する
 */

import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import { GitHubIssue, GitHubPullRequest, GitHubCommit } from '../types';

export class GitHubReader {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private startDate?: string;
  private endDate?: string;

  constructor(config: {
    owner: string;
    repo: string;
    token?: string;
    startDate?: string;
    endDate?: string;
  }) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.startDate = config.startDate;
    this.endDate = config.endDate;

    this.octokit = new Octokit({
      auth: config.token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Issuesを収集する
   */
  async collectIssues(): Promise<GitHubIssue[]> {
    try {
      const issues: GitHubIssue[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc',
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        // フィルタリング
        for (const issue of response.data) {
          // PRは除外
          if (issue.pull_request) {
            continue;
          }

          const createdAt = new Date(issue.created_at);

          // 日時範囲フィルタリング
          if (this.startDate && createdAt < new Date(this.startDate)) {
            hasMore = false;
            break;
          }

          if (this.endDate && createdAt > new Date(this.endDate)) {
            continue;
          }

          // @ts-ignore - author and repository may not be available in octokit types
          issues.push({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state as 'open' | 'closed',
            createdAt: issue.created_at,
            closedAt: issue.closed_at || null,
            // @ts-ignore - labels type may vary in octokit
            labels: (issue.labels as any[]).map(label => typeof label === 'string' ? label : label.name || ''),
            assignees: issue.assignees?.map(assignee => assignee.login) || [],
            author: issue.user?.login || 'unknown',
            repository: this.repo,
          });
        }

        page++;
      }

      return issues;
    } catch (error) {
      throw new Error(`GitHub issues collection failed: ${error}`);
    }
  }

  /**
   * PRを収集する
   */
  async collectPullRequests(): Promise<GitHubPullRequest[]> {
    try {
      const pullRequests: GitHubPullRequest[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.octokit.rest.pulls.list({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc',
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        // フィルタリング
        for (const pr of response.data) {
          const createdAt = new Date(pr.created_at);

          // 日時範囲フィルタリング
          if (this.startDate && createdAt < new Date(this.startDate)) {
            hasMore = false;
            break;
          }

          if (this.endDate && createdAt > new Date(this.endDate)) {
            continue;
          }

          // レビュー数を取得
          const reviewsResponse = await this.octokit.rest.pulls.listReviews({
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
          });

          // @ts-ignore - author and repository may not be available in octokit types
          pullRequests.push({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            state: pr.state as 'open' | 'closed',
            createdAt: pr.created_at,
            mergedAt: pr.merged_at || undefined,
            merged: !!pr.merged_at,
            reviews: reviewsResponse.data.length,
            additions: (pr as any).additions || 0,
            deletions: (pr as any).deletions || 0,
            author: pr.user?.login || 'unknown',
            repository: this.repo,
          });
        }

        page++;
      }

      return pullRequests;
    } catch (error) {
      throw new Error(`GitHub PRs collection failed: ${error}`);
    }
  }

  /**
   * コミット履歴を収集する
   */
  async collectCommits(): Promise<GitHubCommit[]> {
    try {
      const commits: GitHubCommit[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.octokit.rest.repos.listCommits({
          owner: this.owner,
          repo: this.repo,
          per_page: 100,
          page,
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        // フィルタリング
        for (const commit of response.data) {
          const authorDate = new Date(commit.commit.author!.date);

          // 日時範囲フィルタリング
          if (this.startDate && authorDate < new Date(this.startDate)) {
            hasMore = false;
            break;
          }

          if (this.endDate && authorDate > new Date(this.endDate)) {
            continue;
          }

          // コミットの詳細を取得
          const commitDetailResponse = await this.octokit.rest.repos.getCommit({
            owner: this.owner,
            repo: this.repo,
            ref: commit.sha,
          });

          const stats = commitDetailResponse.data.stats || { additions: 0, deletions: 0 };
          const files = commitDetailResponse.data.files?.map(f => f.filename) || [];

          // @ts-ignore - files type mismatch
          commits.push({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.author?.login || commit.commit.author?.name || '',
            authorDate: commit.commit.author?.date || '',
            additions: stats.additions,
            deletions: stats.deletions,
            files,
          });
        }

        page++;
      }

      return commits;
    } catch (error) {
      throw new Error(`GitHub commits collection failed: ${error}`);
    }
  }

  /**
   * 全てのデータを収集する
   */
  async collectAll(): Promise<{
    issues: GitHubIssue[];
    pullRequests: GitHubPullRequest[];
    commits: GitHubCommit[];
  }> {
    const [issues, pullRequests, commits] = await Promise.all([
      this.collectIssues(),
      this.collectPullRequests(),
      this.collectCommits(),
    ]);

    return { issues, pullRequests, commits };
  }

  /**
   * データをJSONファイルに保存する
   */
  async saveToFile(
    data: {
      issues: GitHubIssue[];
      pullRequests: GitHubPullRequest[];
      commits: GitHubCommit[];
    },
    filePath: string
  ): Promise<void> {
    try {
      const output = {
        issues: data.issues,
        pullRequests: data.pullRequests,
        commits: data.commits,
        summary: {
          issueCount: data.issues.length,
          prCount: data.pullRequests.length,
          commitCount: data.commits.length,
        },
        collectedAt: new Date().toISOString(),
      };

      await fs.mkdir(require('path').dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save GitHub data: ${error}`);
    }
  }

  /**
   * パターン検出のためにデータを構造化する
   */
  structureForPatternDetection(data: {
    issues: GitHubIssue[];
    pullRequests: GitHubPullRequest[];
    commits: GitHubCommit[];
  }): Record<string, any> {
    // Issuesの統計
    const issueStats = {
      total: data.issues.length,
      open: data.issues.filter(i => i.state === 'open').length,
      closed: data.issues.filter(i => i.state === 'closed').length,
      withLabels: data.issues.filter(i => i.labels.length > 0).length,
      withAssignees: data.issues.filter(i => i.assignees.length > 0).length,
    };

    // ラベルの頻度
    const labelFrequency: Record<string, number> = {};
    data.issues.forEach(issue => {
      issue.labels.forEach(label => {
        labelFrequency[label] = (labelFrequency[label] || 0) + 1;
      });
    });

    // PRの統計
    const prStats = {
      total: data.pullRequests.length,
      open: data.pullRequests.filter(pr => pr.state === 'open').length,
      merged: data.pullRequests.filter(pr => pr.merged).length,
      averageReviews: data.pullRequests.reduce((sum, pr) => sum + pr.reviews, 0) / data.pullRequests.length || 0,
      averageAdditions: data.pullRequests.reduce((sum, pr) => sum + pr.additions, 0) / data.pullRequests.length || 0,
      averageDeletions: data.pullRequests.reduce((sum, pr) => sum + pr.deletions, 0) / data.pullRequests.length || 0,
    };

    // コミットの統計
    const commitStats = {
      total: data.commits.length,
      averageAdditions: data.commits.reduce((sum, c) => sum + c.additions, 0) / (data.commits.length || 1),
      averageDeletions: data.commits.reduce((sum, c) => sum + c.deletions, 0) / (data.commits.length || 1),
      // @ts-ignore - files type may vary
      averageFiles: data.commits.reduce((sum, c) => sum + ((c.files as any)?.length || 0), 0) / (data.commits.length || 1),
    };

    // 曜日ごとのアクティビティ
    const weekdayActivity: Record<number, { issues: number; prs: number; commits: number }> = {};
    const days = ['日', '月', '火', '水', '木', '金', '土'];

    data.issues.forEach(issue => {
      const day = new Date(issue.createdAt).getDay();
      if (!weekdayActivity[day]) {
        weekdayActivity[day] = { issues: 0, prs: 0, commits: 0 };
      }
      weekdayActivity[day].issues++;
    });

    data.pullRequests.forEach(pr => {
      const day = new Date(pr.createdAt).getDay();
      if (!weekdayActivity[day]) {
        weekdayActivity[day] = { issues: 0, prs: 0, commits: 0 };
      }
      weekdayActivity[day].prs++;
    });

    data.commits.forEach(commit => {
      const day = new Date(commit.authorDate).getDay();
      if (!weekdayActivity[day]) {
        weekdayActivity[day] = { issues: 0, prs: 0, commits: 0 };
      }
      weekdayActivity[day].commits++;
    });

    return {
      issues: issueStats,
      pullRequests: prStats,
      commits: commitStats,
      labelFrequency,
      weekdayActivity,
    };
  }

  /**
   * データ収集の統計情報を取得する
   */
  getStatistics(data: {
    issues: GitHubIssue[];
    pullRequests: GitHubPullRequest[];
    commits: GitHubCommit[];
  }): {
    totalIssues: number;
    totalPRs: number;
    totalCommits: number;
    dateRange: { start: string; end: string };
    averageCommitsPerDay: number;
  } {
    const allDates = [
      ...data.issues.map(i => new Date(i.createdAt)),
      ...data.pullRequests.map(pr => new Date(pr.createdAt)),
      ...data.commits.map(c => new Date(c.authorDate)),
    ];

    if (allDates.length === 0) {
      return {
        totalIssues: 0,
        totalPRs: 0,
        totalCommits: 0,
        dateRange: { start: '', end: '' },
        averageCommitsPerDay: 0,
      };
    }

    const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalIssues: data.issues.length,
      totalPRs: data.pullRequests.length,
      totalCommits: data.commits.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      averageCommitsPerDay: data.commits.length / days,
    };
  }
}

// エクスポート
export default GitHubReader;
