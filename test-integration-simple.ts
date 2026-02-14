/**
 * Phase 5: 統合とテスト（簡易版）
 * Phase 2（パターン分析）、Phase 4（自己進化）の統合テスト
 * モックデータを使用してテスト
 */

import 'dotenv/config';
import { PatternDetector, TrendAnalyzer, StatisticsAnalyzer } from './src/services';
import { ProposalGenerator } from './src/phase4/proposal-generator';
import { EvolutionEngine } from './src/phase4/evolution-engine';
import { ReportGenerator } from './src/phase4/report-generator';

/**
 * 統合テストを実行する（簡易版）
 */
export async function runSimpleIntegrationTest() {
  console.log('=== Phase 5: 統合とテスト（簡易版）===\n');

  try {
    // モックデータを作成
    console.log('📊 モックデータを作成中...');

    const mockData: any[] = [
      {
        id: '1',
        timestamp: Date.now() - 86400000 * 2, // 2日前
        source: 'discord',
        type: 'message',
        content: {
          id: '1',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          content: 'おはよう',
          author: 'tndg16',
          authorId: '123456789012345678',
          channelId: '1471766005846905016',
        },
      },
      {
        id: '2',
        timestamp: Date.now() - 86400000, // 1日前
        source: 'discord',
        type: 'message',
        content: {
          id: '2',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          content: '今日は何をする？',
          author: 'tndg16',
          authorId: '123456789012345678',
          channelId: '1471766005846905016',
        },
      },
      {
        id: '3',
        timestamp: Date.now(), // 今日
        source: 'discord',
        type: 'message',
        content: {
          id: '3',
          timestamp: new Date().toISOString(),
          content: 'タスクを管理して',
          author: 'tndg16',
          authorId: '123456789012345678',
          channelId: '1471766005846905016',
        },
      },
    ];

    console.log(`✅ モックデータ作成完了! (${mockData.length}件)\n`);

    // Phase 2: パターン分析
    console.log('🔍 Phase 2: パターン分析を開始...');
    const detector = new PatternDetector();

    const patterns = await detector.detectPatterns(mockData);

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
    console.log('=== ✅ Phase 5: 統合とテスト（簡易版）完了! ===\n');
    console.log('🎉 Phase 2と4が正常に動作しました！\n');

    return {
      success: true,
      data: {
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
  runSimpleIntegrationTest()
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
