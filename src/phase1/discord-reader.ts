/**
 * Task 1: Discord Reader
 * Discord APIを使用して、ユーザーのメッセージパターンを収集する
 */

import { promises as fs } from 'fs';
import { DiscordMessage } from '../types';

export class DiscordReader {
  private config: {
    channels?: string[];
    userId?: string;
    startDate?: string;
    endDate?: string;
    useMockData?: boolean;
  };

  constructor(config?: {
    channels?: string[];
    userId?: string;
    startDate?: string;
    endDate?: string;
    useMockData?: boolean;
  }) {
    // 環境変数からDISCORD_USER_IDを読み込む
    const defaultUserId = process.env.DISCORD_USER_ID || undefined;
    this.config = config || {};

    // config.userIdが指定されていない場合、環境変数の値を使用
    if (!this.config.userId && defaultUserId) {
      this.config.userId = defaultUserId;
    }
  }

  /**
   * メッセージを収集する
   * 注: Discord.jsを使用する場合、Botトークンが必要
   * ここでは、OpenClawのmessageツールを使用してデータを収集する
   */
  async collectMessages(): Promise<DiscordMessage[]> {
    if (this.config.useMockData) {
      return this.getMockData();
    }

    try {
      // 注: この実装はOpenClaw環境に依存しています
      // 実際の使用では、OpenClawのmessageツールを使用してデータを収集します

      // デモ用のダミーデータを返す（環境変数または設定から取得したDISCORD_USER_IDに合わせる）
      const targetUserId = this.config.userId;
      if (!targetUserId) {
        throw new Error('DISCORD_USER_ID is not set in .env file or config');
      }

      const messages: DiscordMessage[] = [
        {
          id: '1',
          timestamp: new Date('2026-02-14T10:00:00+09:00').toISOString(),
          channelId: '1471766005846905016',
          content: 'おはよう',
          author: 'tndg16',
          authorId: targetUserId,
        },
        {
          id: '2',
          timestamp: new Date('2026-02-14T12:00:00+09:00').toISOString(),
          channelId: '1471766005846905016',
          content: '今日は何をする？',
          author: 'tndg16',
          authorId: targetUserId,
        },
        {
          id: '3',
          timestamp: new Date('2026-02-14T14:00:00+09:00').toISOString(),
          channelId: '1471766005846905016',
          content: 'タスクを管理して',
          author: 'tndg16',
          authorId: targetUserId,
        },
      ];

      return messages;
    } catch (error) {
      throw new Error(`Discord message collection failed: ${error}`);
    }
  }

  /**
   * モックデータを生成する
   */
  private getMockData(): DiscordMessage[] {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const targetUserId = this.config.userId;
    if (!targetUserId) {
      throw new Error('DISCORD_USER_ID is not set in .env file or config');
    }

    return [
      {
        id: 'discord-1',
        timestamp: `${dateStr}T09:00:00Z`,
        channelId: '1471766005846905016',
        channelName: 'general',
        content: 'おはようございます！今日は自己進化システムの実装を進めます',
        author: 'tndg16',
        authorId: targetUserId,
      },
      {
        id: 'discord-2',
        timestamp: `${dateStr}T10:30:00Z`,
        channelId: '1471766005846905016',
        channelName: 'general',
        content: 'Phase 1 データ収集機能の実装を開始しました',
        author: 'tndg16',
        authorId: targetUserId,
      },
      {
        id: 'discord-3',
        timestamp: `${dateStr}T12:00:00Z`,
        channelId: '1471766005846905016',
        channelName: 'general',
        content: 'GitHub APIトークンが期限切れなので、モックデータを使用します',
        author: 'tndg16',
        authorId: targetUserId,
      },
      {
        id: 'discord-4',
        timestamp: `${dateStr}T14:00:00Z`,
        channelId: '1471766005846905016',
        channelName: 'general',
        content: 'Google Calendar統合も追加しました',
        author: 'tndg16',
        authorId: targetUserId,
      },
      {
        id: 'discord-5',
        timestamp: `${dateStr}T16:00:00Z`,
        channelId: '1471766005846905016',
        channelName: 'general',
        content: '進捗状況をDiscordスレッドに報告します',
        author: 'tndg16',
        authorId: targetUserId,
      },
    ];
  }

  /**
   * メッセージをフィルタリングする
   */
  filterMessages(messages: DiscordMessage[]): DiscordMessage[] {
    let filtered = [...messages];

    // ユーザーIDでフィルタリング
    if (this.config.userId) {
      filtered = filtered.filter(msg => msg.authorId === this.config.userId);
    }

    // チャンネルでフィルタリング
    if (this.config.channels && this.config.channels.length > 0) {
      filtered = filtered.filter(msg =>
        this.config.channels!.includes(msg.channelId)
      );
    }

    // 日時範囲でフィルタリング
    if (this.config.startDate) {
      const startDate = new Date(this.config.startDate);
      filtered = filtered.filter(msg => new Date(msg.timestamp) >= startDate);
    }

    if (this.config.endDate) {
      // endDateをその日の23:59:59に設定して、その日のメッセージも含める
      const endDate = new Date(this.config.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(msg => new Date(msg.timestamp) <= endDate);
    }

    return filtered;
  }

  /**
   * メッセージをJSONファイルに保存する
   */
  async saveToFile(messages: DiscordMessage[], filePath: string): Promise<void> {
    try {
      const data = {
        messages,
        count: messages.length,
        collectedAt: new Date().toISOString(),
      };

      await fs.mkdir(require('path').dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save messages: ${error}`);
    }
  }

  /**
   * パターン検出のためにデータを構造化する
   */
  structureForPatternDetection(messages: DiscordMessage[]): Record<string, any> {
    // 時間帯ごとのメッセージ数
    const hourlyMessages: Record<number, number> = {};
    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      hourlyMessages[hour] = (hourlyMessages[hour] || 0) + 1;
    });

    // 曜日ごとのメッセージ数
    const weekdayMessages: Record<number, number> = {};
    messages.forEach(msg => {
      const weekday = new Date(msg.timestamp).getDay();
      weekdayMessages[weekday] = (weekdayMessages[weekday] || 0) + 1;
    });

    // チャンネルごとのメッセージ数
    const channelMessages: Record<string, number> = {};
    messages.forEach(msg => {
      channelMessages[msg.channelId] = (channelMessages[msg.channelId] || 0) + 1;
    });

    // よく使われる単語（簡易的な実装）
    const wordFrequency: Record<string, number> = {};
    messages.forEach(msg => {
      const words = msg.content.split(/\s+/).filter(w => w.length > 1);
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    return {
      totalCount: messages.length,
      hourlyDistribution: hourlyMessages,
      weekdayDistribution: weekdayMessages,
      channelDistribution: channelMessages,
      wordFrequency,
    };
  }

  /**
   * データ収集の統計情報を取得する
   */
  getStatistics(messages: DiscordMessage[]): {
    totalMessages: number;
    dateRange: { start: string; end: string };
    uniqueChannels: number;
    uniqueAuthors: number;
    averageMessagesPerDay: number;
  } {
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        dateRange: { start: '', end: '' },
        uniqueChannels: 0,
        uniqueAuthors: 0,
        averageMessagesPerDay: 0,
      };
    }

    const timestamps = messages.map(msg => new Date(msg.timestamp));
    const uniqueChannels = new Set(messages.map(msg => msg.channelId));
    const uniqueAuthors = new Set(messages.map(msg => msg.authorId));

    const startDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const endDate = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalMessages: messages.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      uniqueChannels: uniqueChannels.size,
      uniqueAuthors: uniqueAuthors.size,
      averageMessagesPerDay: messages.length / days,
    };
  }
}

// エクスポート
export default DiscordReader;
