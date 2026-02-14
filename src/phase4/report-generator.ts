/**
 * Task 13: Report Generator - 学習レポート生成
 *
 * 学習レポートを生成し、Discord通知を送るモジュール
 */
import OpenAI from 'openai';
import {
  LearningData,
  Pattern,
  Proposal,
  EvolutionRecord,
  ReportGenerationRequest,
  DiscordNotification
} from '../types';
import {
  initOpenAI,
  loadLearningData,
  generateId,
  formatDate,
  handleError
} from '../utils';

export class ReportGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = initOpenAI();
  }

  /**
   * レポートテンプレートを作成する
   */
  createReportTemplate(): string {
    return `# 自己進化システム 学習レポート

## 📊 サマリー

### データ統計
- パターン数: {PATTERN_COUNT}
- 改善提案数: {PROPOSAL_COUNT}
- 進化記録数: {EVOLUTION_COUNT}
- 最終更新: {LAST_UPDATED}

### 改善提案の状態
- Pending: {PENDING_COUNT}
- Reviewed: {REVIEWED_COUNT}
- Implemented: {IMPLEMENTED_COUNT}
- Rejected: {REJECTED_COUNT}

## 🔥 高頻度パターン

{HIGH_FREQUENCY_PATTERNS}

## 💡 改善提案の一覧

{PROPOSALS_LIST}

## 📈 パターンの可視化

{PATTERNS_VISUALIZATION}

## 🔄 最近の進化

{RECENT_EVOLUTION}

## 📝 まとめ

{SUMMARY}
`;
  }

  /**
   * 学習結果のサマリーを生成する
   */
  async generateSummary(learningData: LearningData): Promise<string> {
    try {
      console.log('📝 Generating learning summary...');

      const prompt = `以下の学習データに基づいて、サマリーを生成してください：

## パターン
${learningData.patterns.map(p => `- ${p.category}: ${p.description} (頻度: ${p.frequency})`).join('\n')}

## 改善提案
${learningData.proposals.map(p => `- [${p.status}] ${p.title}: ${p.description}`).join('\n')}

## 進化履歴（最新5件）
${learningData.evolutionHistory.slice(-5).map(e => `- ${e.description} (${formatDate(e.timestamp)})`).join('\n')}

サマリーには以下を含めてください：
1. 学習データの全体像
2. 注目すべきパターン
3. 重要な改善提案
4. 今後のアクション

500文字以内で簡潔にまとめてください。`;

      const { AI_MODEL } = await import('../utils');
      const completion = await this.openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたは自己進化AIシステムの学習結果をサマライズするAIアシスタントです。簡潔で分かりやすいサマリーを生成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      const summary = completion.choices[0].message.content || 'サマリーを生成できませんでした。';

      console.log('✅ Summary generated');
      return summary;
    } catch (error) {
      handleError(error, 'ReportGenerator.generateSummary');
      return 'サマリーの生成に失敗しました。';
    }
  }

  /**
   * パターンの可視化を生成する
   */
  generatePatternsVisualization(learningData: LearningData): string {
    try {
      console.log('📊 Generating patterns visualization...');

      // パターンをタイプ別に集計
      const byType = learningData.patterns.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + p.frequency;
        return acc;
      }, {} as Record<string, number>);

      // パターンをカテゴリ別に集計
      const byCategory = learningData.patterns.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.frequency;
        return acc;
      }, {} as Record<string, number>);

      let visualization = `### タイプ別パターン分布\n`;
      visualization += `\`\`\`\n`;
    Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const bar = '█'.repeat(Math.min(count, 20));
      visualization += `${type.padEnd(15)} ${bar} ${count}\n`;
    });
    visualization += `\`\`\`\n`;

    visualization += `\n### カテゴリ別パターン分布\n`;
    visualization += `\`\`\`\n`;
    Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      const bar = '█'.repeat(Math.min(count, 20));
      visualization += `${category.padEnd(25)} ${bar} ${count}\n`;
    });
    visualization += `\`\`\`\n`;

    // 時系列で最近のパターンを表示
    visualization += `\n### 最近検出されたパターン\n`;
    const recentPatterns = [...learningData.patterns]
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, 5);

    recentPatterns.forEach((p, i) => {
      visualization += `${i + 1}. **${p.category}** (${p.type})\n`;
      visualization += `   頻度: ${p.frequency} | 最終観察: ${formatDate(p.lastSeen)}\n`;
      visualization += `   ${p.description}\n\n`;
    });

    console.log('✅ Patterns visualization generated');
    return visualization;
  } catch (error) {
    handleError(error, 'ReportGenerator.generatePatternsVisualization');
    return '可視化の生成に失敗しました。';
  }
}

  /**
   * 改善提案の一覧を生成する
   */
  generateProposalsList(learningData: LearningData): string {
    try {
      console.log('📋 Generating proposals list...');

      if (learningData.proposals.length === 0) {
        return '現在、改善提案はありません。';
      }

      // ステータス別に分類
      const byStatus = {
        pending: learningData.proposals.filter(p => p.status === 'pending'),
        reviewed: learningData.proposals.filter(p => p.status === 'reviewed'),
        implemented: learningData.proposals.filter(p => p.status === 'implemented'),
        rejected: learningData.proposals.filter(p => p.status === 'rejected')
      };

      let list = '';

      // High Priorityの提案を先に表示
      const highPriority = learningData.proposals.filter(p => p.priority === 'high' && p.status === 'pending');
      if (highPriority.length > 0) {
        list += `### 🔴 High Priority (Pending)\n`;
        highPriority.forEach((p, i) => {
          list += `${i + 1}. **${p.title}** [${p.category}]\n`;
          list += `   ${p.description}\n`;
          list += `   期待される影響: ${p.estimatedImpact}\n\n`;
        });
      }

      // Medium Priorityの提案
      const mediumPriority = learningData.proposals.filter(p => p.priority === 'medium' && p.status === 'pending');
      if (mediumPriority.length > 0) {
        list += `### 🟡 Medium Priority (Pending)\n`;
        mediumPriority.slice(0, 3).forEach((p, i) => {
          list += `${i + 1}. **${p.title}** [${p.category}]\n`;
          list += `   ${p.description}\n\n`;
        });
      }

      // 実装済みの提案
      if (byStatus.implemented.length > 0) {
        list += `### ✅ 実装済み提案 (最近の5件)\n`;
        byStatus.implemented.slice(-5).reverse().forEach((p, i) => {
          list += `${i + 1}. ${p.title} - ${p.estimatedImpact}\n`;
        });
      }

      // レビュー中の提案
      if (byStatus.reviewed.length > 0) {
        list += `\n### 👀 レビュー中 (${byStatus.reviewed.length}件)\n`;
      }

      console.log('✅ Proposals list generated');
      return list || '表示する提案がありません。';
    } catch (error) {
      handleError(error, 'ReportGenerator.generateProposalsList');
      return '提案リストの生成に失敗しました。';
    }
  }

  /**
   * 最近の進化を生成する
   */
  generateRecentEvolution(learningData: LearningData): string {
    try {
      console.log('📜 Generating recent evolution...');

      const recent = learningData.evolutionHistory.slice(-10).reverse();

      if (recent.length === 0) {
        return 'まだ進化の記録はありません。';
      }

      let evolution = '';
      recent.forEach((record, i) => {
        evolution += `${i + 1}. **${formatDate(record.timestamp)}**\n`;
        evolution += `   ${record.description}\n`;
        if (record.data && Object.keys(record.data).length > 0) {
          evolution += `   ${JSON.stringify(record.data).substring(0, 100)}...\n`;
        }
        evolution += '\n';
      });

      console.log('✅ Recent evolution generated');
      return evolution;
    } catch (error) {
      handleError(error, 'ReportGenerator.generateRecentEvolution');
      return '進化履歴の生成に失敗しました。';
    }
  }

  /**
   * 完全なレポートを生成する
   */
  async generateFullReport(request?: ReportGenerationRequest): Promise<LearningReport> {
    try {
      console.log('📄 Generating full learning report...');

      const learningData = await loadLearningData();

      // サマリーを生成
      const summary = await this.generateSummary(learningData);

      // パターンの可視化を生成
      const patternsVisualization = this.generatePatternsVisualization(learningData);

      // 改善提案の一覧を生成
      const proposalsList = this.generateProposalsList(learningData);

      // 最近の進化を生成
      const recentEvolution = this.generateRecentEvolution(learningData);

      // テンプレートに埋め込み
      const template = this.createReportTemplate();
      const content = template
        .replace('{PATTERN_COUNT}', String(learningData.patterns.length))
        .replace('{PROPOSAL_COUNT}', String(learningData.proposals.length))
        .replace('{EVOLUTION_COUNT}', String(learningData.evolutionHistory.length))
        .replace('{LAST_UPDATED}', formatDate(learningData.lastUpdated))
        .replace('{PENDING_COUNT}', String(learningData.proposals.filter(p => p.status === 'pending').length))
        .replace('{REVIEWED_COUNT}', String(learningData.proposals.filter(p => p.status === 'reviewed').length))
        .replace('{IMPLEMENTED_COUNT}', String(learningData.proposals.filter(p => p.status === 'implemented').length))
        .replace('{REJECTED_COUNT}', String(learningData.proposals.filter(p => p.status === 'rejected').length))
        .replace('{HIGH_FREQUENCY_PATTERNS}', this.getHighFrequencyPatterns(learningData))
        .replace('{PROPOSALS_LIST}', proposalsList)
        .replace('{PATTERNS_VISUALIZATION}', patternsVisualization)
        .replace('{RECENT_EVOLUTION}', recentEvolution)
        .replace('{SUMMARY}', summary);

      const report: LearningReport = {
        id: generateId('report'),
        title: `自己進化システム 学習レポート - ${new Date().toLocaleDateString('ja-JP')}`,
        content,
        metadata: {
          patternCount: learningData.patterns.length,
          proposalCount: learningData.proposals.length,
          evolutionCount: learningData.evolutionHistory.length,
          generatedAt: new Date().toISOString()
        }
      };

      console.log('✅ Full report generated');
      return report;
    } catch (error) {
      handleError(error, 'ReportGenerator.generateFullReport');
      throw error;
    }
  }

  /**
   * Discord通知を作成する
   */
  async createDiscordNotification(
    report: LearningReport,
    channelId: string
  ): Promise<DiscordNotification> {
    try {
      console.log('💬 Creating Discord notification...');

      const notification: DiscordNotification = {
        channelId,
        content: `📊 **自己進化システム 学習レポート**\n${report.title}`,
        embeds: [
          {
            title: 'サマリー',
            description: `パターン: ${report.metadata.patternCount}件\n提案: ${report.metadata.proposalCount}件\n進化: ${report.metadata.evolutionCount}件`,
            color: 0x00ff00,
            fields: [
              {
                name: '生成日時',
                value: formatDate(report.metadata.generatedAt),
                inline: true
              },
              {
                name: '詳細',
                value: 'レポート全文はファイルを確認してください',
                inline: true
              }
            ]
          }
        ]
      };

      console.log('✅ Discord notification created');
      return notification;
    } catch (error) {
      handleError(error, 'ReportGenerator.createDiscordNotification');
      throw error;
    }
  }

  /**
   * Discord通知を送信する（実際の送信はメインエージェントが行う）
   */
  async sendDiscordNotification(notification: DiscordNotification): Promise<boolean> {
    try {
      // ここでは実際の送信を行わず、通知データを返す
      // メインエージェントがmessage toolを使って送信する
      console.log('📤 Discord notification prepared for sending');
      console.log(`   Channel: ${notification.channelId}`);
      console.log(`   Content: ${notification.content}`);

      return true;
    } catch (error) {
      handleError(error, 'ReportGenerator.sendDiscordNotification');
      return false;
    }
  }

  /**
   * 高頻度パターンを取得
   */
  private getHighFrequencyPatterns(learningData: LearningData): string {
    const highFrequency = learningData.patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    let text = '';
    highFrequency.forEach((p, i) => {
      text += `${i + 1}. **${p.category}** (${p.frequency}回)\n`;
      text += `   ${p.description}\n\n`;
    });

    return text || '高頻度パターンはありません。';
  }
}

/**
 * 学習レポート
 */
interface LearningReport {
  id: string;
  title: string;
  content: string;
  metadata: {
    patternCount: number;
    proposalCount: number;
    evolutionCount: number;
    generatedAt: string;
  };
}

/**
 * テスト関数
 */
export async function testReportGenerator() {
  console.log('🧪 Testing Report Generator...\n');

  const generator = new ReportGenerator();

  try {
    // 1. レポートテンプレートの作成
    console.log('\n📄 Step 1: Creating report template...\n');
    const template = generator.createReportTemplate();
    console.log(template);

    // 2. 完全なレポートの生成
    console.log('\n📝 Step 2: Generating full report...\n');
    const report = await generator.generateFullReport({
      timeframe: 'week',
      includeVisualizations: true,
      learningData: {
        patterns: [],
        proposals: [],
        evolutionHistory: [],
        lastUpdated: new Date().toISOString(),
      },
    });
    console.log(report.title);
    console.log(report.content);

    // 3. Discord通知の作成
    console.log('\n💬 Step 3: Creating Discord notification...\n');
    const notification = await generator.createDiscordNotification(
      report,
      '1471769660948086785' // #秘書さんの部屋
    );
    console.log(JSON.stringify(notification, null, 2));

    // 4. 通知の送信準備
    console.log('\n📤 Step 4: Preparing notification for sending...\n');
    await generator.sendDiscordNotification(notification);

    console.log('\n✅ Report Generator test completed successfully!');
  } catch (error) {
    handleError(error, 'testReportGenerator');
    throw error;
  }
}

// モジュール実行時はテストを実行
if (require.main === module) {
  testReportGenerator()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
