/**
 * Phase 1: データ収集 - テスト
 */

import { DataCollector } from './src/phase1';
import { DataCollectionConfig } from './src/types';

async function testDataCollection() {
  console.log('=== Phase 1: データ収集 - テスト ===\n');

  // データ収集設定
  const config: DataCollectionConfig = {
    discord: {
      channels: ['1471766005846905016'], // #秘書さんの部屋
      userId: undefined, // 全ユーザーのメッセージを収集
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7日間
      endDate: new Date().toISOString(),
    },
    github: {
      owner: 'tndg16-bot',
      repo: 'self-learning-system',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7日間
      endDate: new Date().toISOString(),
    },
    obsidian: {
      vaultPath: 'C:\\Users\\chatg\\Documents\\AntigravityVault',
      dailyNotesPath: undefined,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7日間
      endDate: new Date().toISOString(),
    },
  };

  try {
    const collector = new DataCollector(config);

    console.log('1. Discordデータ収集中...');
    const discordMessages = await (collector as any).collectDiscordData();
    console.log(`   ✓ ${discordMessages.length} 件のメッセージを収集しました`);

    console.log('\n2. GitHubデータ収集中...');
    const githubData = await (collector as any).collectGitHubData();
    console.log(`   ✓ ${githubData.issues.length} 件のIssuesを収集しました`);
    console.log(`   ✓ ${githubData.pullRequests.length} 件のPRsを収集しました`);
    console.log(`   ✓ ${githubData.commits.length} 件のコミットを収集しました`);

    console.log('\n3. Obsidianデータ収集中...');
    const obsidianNotes = await (collector as any).collectObsidianData();
    console.log(`   ✓ ${obsidianNotes.length} 件のDaily Notesを収集しました`);

    console.log('\n4. データ統合中...');
    const result = await collector.collectAll();

    if (result.success && result.data) {
      console.log(`   ✓ データ統合が完了しました`);
      console.log(`   - Discord: ${result.data.discordMessages.length} 件`);
      console.log(`   - GitHub Issues: ${result.data.githubIssues.length} 件`);
      console.log(`   - GitHub PRs: ${result.data.githubPullRequests.length} 件`);
      console.log(`   - GitHub Commits: ${result.data.githubCommits.length} 件`);
      console.log(`   - Obsidian: ${result.data.obsidianNotes.length} 件`);

      console.log('\n5. データ品質チェック中...');
      const qualityCheck = await (collector as any).checkDataQuality(result.data);
      console.log(`   ✓ データ品質チェック: ${qualityCheck.isValid ? '合格' : '不合格'}`);
      if (qualityCheck.issues.length > 0) {
        console.log(`   問題: ${qualityCheck.issues.join(', ')}`);
      }
      if (qualityCheck.warnings.length > 0) {
        console.log(`   警告: ${qualityCheck.warnings.join(', ')}`);
      }

      console.log('\n6. データを保存中...');
      await collector.saveToFile(result.data, './learning-data/integrated-data.json');
      console.log(`   ✓ データを保存しました: ./learning-data/integrated-data.json`);

      console.log('\n=== テスト完了 ===');
      console.log('✓ Phase 1: データ収集は正常に動作しています');
    } else {
      console.error('\n✗ データ収集に失敗しました');
      if (result.errors) {
        result.errors.forEach(error => {
          console.error(`   [${error.source}] ${error.error.message}`);
        });
      }
    }
  } catch (error) {
    console.error('\n✗ テスト中にエラーが発生しました:', error);
    throw error;
  }
}

// テスト実行
testDataCollection()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
