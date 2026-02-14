/**
 * Phase 5: 統合とテスト
 * Phase 1（データ収集）、Phase 2（パターン分析）、Phase 4（自己進化）の統合テスト
 */

import 'dotenv/config';
import { DataCollector } from './src/phase1';
import { PatternDetector, TrendAnalyzer, StatisticsAnalyzer } from './src/services';
import { ProposalGenerator } from './src/phase4/proposal-generator';
import { EvolutionEngine } from './src/phase4/evolution-engine';
import { ReportGenerator } from './src/phase4/report-generator';
import { DataCollectionConfig } from './src/types';

/**
 * 統合テストを実行する
 */
export async function runIntegrationTest() {
  console.log('=== Phase 5: 統合とテスト ===\n');

  try {
    // Phase 1: データ収集
    console.log('📊 Phase 1: データ収集を開始...');
    const config: DataCollectionConfig = {
      discord: {
        channels: ['1471766005846905016'], // #秘書さんの部屋
        userId: process.env.DISCORD_USER_ID,
        startDate: '2026-02-14',
        endDate: '2026-02-15',
      },
      github: {
        owner: 'tndg16-bot',
        repo: 'self-learning-system',
        startDate: '2026-02-14',
        endDate: '2026-02-15',
      },
      obsidian: {
        vaultPath: 'C:\\Users\\chatg\\Documents\\AntigravityVault',
        startDate: '2026-02-14',
        endDate: '2026-02-15',
      },
    };

    const collector = new DataCollector(config);
    const result = await collector.collectAll();

    if (!result.success || !result.data) {
      throw new Error('データ収集に失敗しました');
    }

    console.log(`✅ Phase 1 完了!`);
    console.log(`   - Discordメッセージ: ${result.data.discordMessages.length}件`);
    console.log(`   - GitHub Issues: ${result.data.githubIssues.length}件`);
    console.log(`   - GitHub PRs: ${result.data.githubPullRequests.length}件`);
    console.log(`   - GitHub Commits: ${result.data.githubCommits.length}件`);
    console.log(`   - Obsidian Notes: ${result.data.obsidianNotes.length}件\n`);

    // Phase 2: パターン分析
    console.log('🔍 Phase 2: パターン分析を開始...');
    const detector = new PatternDetector();
    const analyzer = new TrendAnalyzer();
    const stats = new StatisticsAnalyzer();

    // データをDataEntryに変換
    const dataEntries: any[] = [];
    result.data.discordMessages.forEach(msg => {
      dataEntries.push({
        id: msg.id,
        timestamp: new Date(msg.timestamp).getTime(),
        source: 'discord',
        type: 'message',
        content: msg,
      });
    });

    result.data.githubIssues.forEach(issue => {
      dataEntries.push({
        id: String(issue.id),
        timestamp: new Date(issue.createdAt).getTime(),
        source: 'github',
        type: 'issue',
        content: issue,
      });
    });

    const patterns = await detector.detectPatterns(dataEntries);

    console.log(`✅ Phase 2 完了!`);
    console.log(`   - 検出されたパターン: ${patterns.length}件\n`);

    // Phase 4: 自己進化
    console.log('🧠 Phase 4: 自己進化を開始...');

    // 提案生成
    const proposalGenerator = new ProposalGenerator();
    // @ts-ignore - PatternAnalysis[] to Pattern[] type mismatch
    const proposals = await proposalGenerator.generateProposals(patterns as any[]);

    console.log(`✅ Phase 4a 完了!`);
    console.log(`   - 生成された提案: ${proposals.length}件\n`);

    // 進化エンジン
    const evolutionEngine = new EvolutionEngine();
    const evolutionResult = await evolutionEngine.executeEvolution({
      learningData: {
        patterns: patterns as any[],
        proposals: proposals,
        evolutionHistory: [],
        lastUpdated: new Date().toISOString(),
      },
      currentTime: new Date().toISOString(),
    });

    console.log(`✅ Phase 4b 完了!`);
    console.log(`   - 進化ルールが適用されました`);
    console.log(`   - 進化アクション: ${evolutionResult.actions.length}件\n`);

    // レポート生成
    const reportGenerator = new ReportGenerator();
    const report = await reportGenerator.generateFullReport({
      timeframe: '2026-02-14 to 2026-02-15',
      includeVisualizations: true,
      learningData: {
        patterns: patterns as any[],
        proposals: proposals,
        evolutionHistory: await evolutionEngine.getEvolutionHistory(),
        lastUpdated: new Date().toISOString(),
      },
    });

    console.log(`✅ Phase 4c 完了!`);
    console.log(`   - レポートが生成されました\n`);

    // 統合テスト完了
    console.log('=== ✅ Phase 5: 統合とテスト 完了! ===\n');
    console.log('🎉 すべてのフェーズが正常に動作しました！\n');

    return {
      success: true,
      data: {
        phase1: result.data,
        phase2: patterns,
        phase4: {
          proposals,
          report,
        },
      },
    };
  } catch (error: any) {
    console.error('❌ 統合テストに失敗しました:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 直接実行された場合
if (require.main === module) {
  runIntegrationTest()
    .then(result => {
      if (result.success) {
        console.log('✅ 統合テスト成功！');
        process.exit(0);
      } else {
        console.log('❌ 統合テスト失敗！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
