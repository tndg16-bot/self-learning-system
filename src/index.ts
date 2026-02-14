/**
 * 自己進化システム - メインエントリーポイント
 */

import { DataCollector } from './phase1';
import { DataCollectionConfig } from './types';
import { PatternDetector, TrendAnalyzer, StatisticsAnalyzer } from './services';

/**
 * データ収集を実行する
 */
export async function runDataCollection(config: DataCollectionConfig) {
  const collector = new DataCollector(config);
  const result = await collector.collectAll();

  if (result.success && result.data) {
    console.log('Data collection completed successfully!');
    console.log(`Collected ${result.data.discordMessages.length} Discord messages`);
    console.log(`Collected ${result.data.githubIssues.length} GitHub issues`);
    console.log(`Collected ${result.data.githubPullRequests.length} GitHub PRs`);
    console.log(`Collected ${result.data.githubCommits.length} GitHub commits`);
    console.log(`Collected ${result.data.obsidianNotes.length} Obsidian notes`);

    // データを保存
    await collector.saveToFile(
      result.data,
      './learning-data/integrated-data.json'
    );

    console.log('Data saved to ./learning-data/integrated-data.json');

    return result.data;
  } else {
    console.error('Data collection failed!');
    if (result.errors) {
      result.errors.forEach(error => {
        console.error(`[${error.source}] ${error.error.message}`);
      });
    }
    throw new Error('Data collection failed');
  }
}

/**
 * メイン関数
 */
export async function main() {
  try {
    // データ収集設定
    const config: DataCollectionConfig = {
      discord: {
        channels: ['1471766005846905016'], // #秘書さんの部屋
        userId: process.env.DISCORD_USER_ID,
        startDate: process.env.START_DATE,
        endDate: process.env.END_DATE,
      },
      github: {
        owner: 'tndg16-bot',
        repo: 'self-learning-system',
        startDate: process.env.START_DATE,
        endDate: process.env.END_DATE,
      },
      obsidian: {
        vaultPath: process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\chatg\\Documents\\AntigravityVault',
        dailyNotesPath: process.env.OBSIDIAN_DAILY_NOTES_PATH,
        startDate: process.env.START_DATE,
        endDate: process.env.END_DATE,
      },
    };

    const data = await runDataCollection(config);
    return data;
  } catch (error: any) {
    console.error('Error:', error);
    throw error;
  }
}

// エクスポート
export { DataCollector } from './phase1';
export { PatternDetector, TrendAnalyzer, StatisticsAnalyzer } from './services';
export * from './types';

// 直接実行された場合
if (require.main === module) {
  main()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
