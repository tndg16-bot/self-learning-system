import { DiscordReader } from '../src/phase1/discord-reader';

describe('DiscordReader', () => {
  describe('Environment Variable Loading', () => {
    let originalUserId: string | undefined;

    beforeAll(() => {
      // 保存
      originalUserId = process.env.DISCORD_USER_ID;
    });

    afterAll(() => {
      // 復元
      if (originalUserId) {
        process.env.DISCORD_USER_ID = originalUserId;
      } else {
        delete process.env.DISCORD_USER_ID;
      }
    });

    it('should load userId from environment variable', () => {
      // テスト用のuserIdを設定
      process.env.DISCORD_USER_ID = '123456789';

      const reader = new DiscordReader();
      const messages = reader['getMockData']();

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].authorId).toBe('123456789');
    });

    it('should throw error when DISCORD_USER_ID is not set', () => {
      // 環境変数を削除
      delete process.env.DISCORD_USER_ID;

      const reader = new DiscordReader();

      expect(() => {
        reader['getMockData']();
      }).toThrow('DISCORD_USER_ID is not set in .env file or config');
    });

    it('should use config.userId when provided', () => {
      // configでuserIdを上書き
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader({ userId: '987654321' });

      const messages = reader['getMockData']();
      expect(messages[0].authorId).toBe('987654321');
    });
  });

  describe('Filter Messages', () => {
    const mockMessages = [
      {
        id: '1',
        timestamp: '2026-02-14T10:00:00Z',
        channelId: 'channel-1',
        content: 'Hello',
        author: 'user1',
        authorId: '123456789',
      },
      {
        id: '2',
        timestamp: '2026-02-14T11:00:00Z',
        channelId: 'channel-1',
        content: 'World',
        author: 'user2',
        authorId: '987654321',
      },
      {
        id: '3',
        timestamp: '2026-02-14T12:00:00Z',
        channelId: 'channel-2',
        content: 'Test',
        author: 'user1',
        authorId: '123456789',
      },
    ];

    it('should filter by userId', () => {
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader();
      const filtered = reader.filterMessages(mockMessages);

      expect(filtered.length).toBe(2);
      expect(filtered.every(msg => msg.authorId === '123456789')).toBe(true);
    });

    it('should filter by channels', () => {
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader({ channels: ['channel-1'] });
      const filtered = reader.filterMessages(mockMessages);

      expect(filtered.length).toBe(1);
      expect(filtered[0].channelId).toBe('channel-1');
    });

    it('should filter by date range', () => {
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader({
        startDate: '2026-02-14T10:30:00Z',
        endDate: '2026-02-14T11:30:00Z',
      });
      const filtered = reader.filterMessages(mockMessages);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Pattern Detection Structure', () => {
    it('should structure messages for pattern detection', () => {
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader();
      const messages = reader['getMockData']();
      const structured = reader.structureForPatternDetection(messages);

      expect(structured).toHaveProperty('totalCount');
      expect(structured).toHaveProperty('hourlyDistribution');
      expect(structured).toHaveProperty('weekdayDistribution');
      expect(structured).toHaveProperty('channelDistribution');
      expect(structured).toHaveProperty('wordFrequency');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      process.env.DISCORD_USER_ID = '123456789';
      const reader = new DiscordReader();
      const messages = reader['getMockData']();
      const stats = reader.getStatistics(messages);

      expect(stats.totalMessages).toBe(messages.length);
      expect(stats.uniqueChannels).toBeGreaterThan(0);
      expect(stats.uniqueAuthors).toBeGreaterThan(0);
      expect(stats.averageMessagesPerDay).toBeGreaterThan(0);
    });

    it('should handle empty messages array', () => {
      const reader = new DiscordReader();
      const stats = reader.getStatistics([]);

      expect(stats.totalMessages).toBe(0);
      expect(stats.uniqueChannels).toBe(0);
      expect(stats.uniqueAuthors).toBe(0);
      expect(stats.averageMessagesPerDay).toBe(0);
    });
  });
});
