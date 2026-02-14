/**
 * Task 12: Evolution Engine - 自己進化エンジン
 *
 * 学習モデルを読み込み、知識ベースを検索し、自己進化を実行するモジュール
 */
import OpenAI from 'openai';
import {
  Pattern,
  Proposal,
  EvolutionRecord,
  LearningData,
  EvolutionRequest
} from '../types';
import {
  initOpenAI,
  loadLearningData,
  saveLearningData,
  generateId,
  formatDate,
  handleError
} from '../utils';

export class EvolutionEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = initOpenAI();
  }

  /**
   * 学習モデルを読み込む
   */
  async loadLearningModel(): Promise<any> {
    try {
      console.log('📖 Loading learning model...');

      const learningData = await loadLearningData();

      // パターンの統計情報を計算
      const model = {
        patterns: {
          total: learningData.patterns.length,
          byType: this.groupBy(learningData.patterns, 'type'),
          byCategory: this.groupBy(learningData.patterns, 'category'),
          highFrequency: learningData.patterns.filter(p => p.frequency > 20)
        },
        proposals: {
          total: learningData.proposals.length,
          byStatus: this.groupBy(learningData.proposals, 'status'),
          byCategory: this.groupBy(learningData.proposals, 'category'),
          pending: learningData.proposals.filter(p => p.status === 'pending'),
          implemented: learningData.proposals.filter(p => p.status === 'implemented')
        },
        evolutionHistory: {
          total: learningData.evolutionHistory.length,
          recent: learningData.evolutionHistory.slice(-10)
        },
        lastUpdated: learningData.lastUpdated
      };

      console.log('✅ Learning model loaded successfully');
      console.log(`   - Patterns: ${model.patterns.total}`);
      console.log(`   - Proposals: ${model.proposals.total}`);
      console.log(`   - Evolution History: ${model.evolutionHistory.total}`);

      return model;
    } catch (error) {
      handleError(error, 'EvolutionEngine.loadLearningModel');
      return null;
    }
  }

  /**
   * 知識ベースを検索する
   */
  async searchKnowledgeBase(query: string): Promise<{
    patterns: Pattern[];
    proposals: Proposal[];
    records: EvolutionRecord[];
  }> {
    try {
      console.log(`🔍 Searching knowledge base: "${query}"`);

      const learningData = await loadLearningData();

      // 簡易的なキーワード検索
      const patterns = learningData.patterns.filter(p =>
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.type.toLowerCase().includes(query.toLowerCase())
      );

      const proposals = learningData.proposals.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      );

      const records = learningData.evolutionHistory.filter(r =>
        r.description.toLowerCase().includes(query.toLowerCase())
      );

      console.log(`✅ Found ${patterns.length} patterns, ${proposals.length} proposals, ${records.length} records`);

      return { patterns, proposals, records };
    } catch (error) {
      handleError(error, 'EvolutionEngine.searchKnowledgeBase');
      return { patterns: [], proposals: [], records: [] };
    }
  }

  /**
   * 進化ルールを定義する
   */
  defineEvolutionRules(): EvolutionRule[] {
    return [
      {
        id: 'rule_1',
        name: '自動化の機会',
        condition: '高頻度パターンの検出',
        action: '自動化の提案を生成',
        priority: 'high'
      },
      {
        id: 'rule_2',
        name: '未実装提案の確認',
        condition: 'pending状態の提案がある',
        action: '提案の優先順位を再評価',
        priority: 'medium'
      },
      {
        id: 'rule_3',
        name: 'パターンの更新',
        condition: '新しいパターンが検出された',
        action: 'パターンを知識ベースに追加',
        priority: 'medium'
      },
      {
        id: 'rule_4',
        name: '学習進捗の報告',
        condition: '週次実行',
        action: '学習レポートを生成',
        priority: 'low'
      }
    ];
  }

  /**
   * 自己進化を実行する
   */
  async executeEvolution(request: EvolutionRequest): Promise<EvolutionResult> {
    try {
      console.log('🔄 Executing evolution...');

      const { learningData, currentTime } = request;

      // 進化ルールを適用
      const rules = this.defineEvolutionRules();
      const actions = [];

      // ルール1: 高頻度パターンの検出
      const highFrequencyPatterns = learningData.patterns.filter(p => p.frequency > 20);
      if (highFrequencyPatterns.length > 0) {
        actions.push({
          rule: rules[0],
          result: {
            type: 'high_frequency_patterns',
            count: highFrequencyPatterns.length,
            patterns: highFrequencyPatterns
          }
        });
      }

      // ルール2: 未実装提案の確認
      const pendingProposals = learningData.proposals.filter(p => p.status === 'pending');
      if (pendingProposals.length > 0) {
        actions.push({
          rule: rules[1],
          result: {
            type: 'pending_proposals',
            count: pendingProposals.length,
            proposals: pendingProposals
          }
        });
      }

      // ルール3: パターンの更新（新しいパターンがあるか確認）
      const recentPatterns = learningData.patterns.filter(p => {
        const patternDate = new Date(p.lastSeen);
        const weekAgo = new Date(currentTime);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return patternDate > weekAgo;
      });
      if (recentPatterns.length > 0) {
        actions.push({
          rule: rules[2],
          result: {
            type: 'recent_patterns',
            count: recentPatterns.length,
            patterns: recentPatterns
          }
        });
      }

      // ルール4: 学習進捗の報告（週次実行のチェック）
      const lastReport = learningData.evolutionHistory
        .filter(r => r.type === 'learning')
        .pop();
      if (lastReport) {
        const lastReportDate = new Date(lastReport.timestamp);
        const weekAgo = new Date(currentTime);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (lastReportDate < weekAgo) {
          actions.push({
            rule: rules[3],
            result: {
              type: 'weekly_report_needed',
              lastReportDate: lastReport.timestamp
            }
          });
        }
      } else {
        actions.push({
          rule: rules[3],
          result: {
            type: 'weekly_report_needed',
            lastReportDate: null
          }
        });
      }

      // 進化記録を作成
      const record: EvolutionRecord = {
        id: generateId('evolution'),
        type: 'evolution',
        description: `自己進化が実行されました（${actions.length}個のアクション）`,
        timestamp: currentTime,
        data: {
          actions,
          summary: {
            totalActions: actions.length,
            highFrequencyPatterns: highFrequencyPatterns.length,
            pendingProposals: pendingProposals.length,
            recentPatterns: recentPatterns.length
          }
        }
      };

      // 学習データを更新
      learningData.evolutionHistory.push(record);
      await saveLearningData(learningData);

      console.log('✅ Evolution executed successfully');
      console.log(`   - Total actions: ${actions.length}`);

      return {
        success: true,
        record,
        actions,
        timestamp: currentTime
      };
    } catch (error) {
      handleError(error, 'EvolutionEngine.executeEvolution');
      return {
        success: false,
        record: null,
        actions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 進化の記録を取得する
   */
  async getEvolutionHistory(limit: number = 50): Promise<EvolutionRecord[]> {
    try {
      const learningData = await loadLearningData();
      return learningData.evolutionHistory.slice(-limit).reverse();
    } catch (error) {
      handleError(error, 'EvolutionEngine.getEvolutionHistory');
      return [];
    }
  }

  /**
   * 進化のサマリーを生成する
   */
  async generateEvolutionSummary(): Promise<string> {
    try {
      console.log('📊 Generating evolution summary...');

      const learningData = await loadLearningData();

      const summary = `
## 自己進化サマリー

### 📈 データ統計
- **パターン数**: ${learningData.patterns.length}
- **改善提案数**: ${learningData.proposals.length}
- **進化記録数**: ${learningData.evolutionHistory.length}

### 🎯 改善提案の状態
- **Pending**: ${learningData.proposals.filter(p => p.status === 'pending').length}
- **Reviewed**: ${learningData.proposals.filter(p => p.status === 'reviewed').length}
- **Implemented**: ${learningData.proposals.filter(p => p.status === 'implemented').length}
- **Rejected**: ${learningData.proposals.filter(p => p.status === 'rejected').length}

### 🔥 高頻度パターン（Top 5）
${learningData.patterns
  .sort((a, b) => b.frequency - a.frequency)
  .slice(0, 5)
  .map((p, i) => `${i + 1}. ${p.category} (${p.frequency}回) - ${p.description}`)
  .join('\n')}

### 📅 最近の進化（Top 5）
${learningData.evolutionHistory
  .slice(-5)
  .reverse()
  .map((r, i) => `${i + 1}. [${formatDate(r.timestamp)}] ${r.description}`)
  .join('\n')}

### 🔄 最終更新
${formatDate(learningData.lastUpdated)}
`;

      console.log('✅ Evolution summary generated');
      return summary;
    } catch (error) {
      handleError(error, 'EvolutionEngine.generateEvolutionSummary');
      return 'サマリーの生成に失敗しました。';
    }
  }

  /**
   * 配列をグループ化
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((result, item) => {
      const value = String(item[key]);
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }
}

/**
 * 進化ルール
 */
interface EvolutionRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 進化実行結果
 */
interface EvolutionResult {
  success: boolean;
  record: EvolutionRecord | null;
  actions: Array<{
    rule: EvolutionRule;
    result: any;
  }>;
  timestamp: string;
  error?: string;
}

/**
 * テスト関数
 */
export async function testEvolutionEngine() {
  console.log('🧪 Testing Evolution Engine...\n');

  const engine = new EvolutionEngine();

  try {
    // 1. 学習モデルの読み込み
    console.log('\n📖 Step 1: Loading learning model...\n');
    const model = await engine.loadLearningModel();
    console.log(JSON.stringify(model, null, 2));

    // 2. 知識ベースの検索
    console.log('\n🔍 Step 2: Searching knowledge base...\n');
    const searchResult = await engine.searchKnowledgeBase('discord');
    console.log(`Found ${searchResult.patterns.length} patterns related to "discord"`);
    searchResult.patterns.forEach(p => {
      console.log(`  - ${p.category}: ${p.description}`);
    });

    // 3. 進化ルールの定義
    console.log('\n📋 Step 3: Defining evolution rules...\n');
    const rules = engine.defineEvolutionRules();
    rules.forEach(r => {
      console.log(`  [${r.priority.toUpperCase()}] ${r.name}`);
      console.log(`    Condition: ${r.condition}`);
      console.log(`    Action: ${r.action}\n`);
    });

    // 4. 自己進化の実行
    console.log('\n🔄 Step 4: Executing evolution...\n');
    const learningData = await engine.loadLearningModel();
    const result = await engine.executeEvolution({
      learningData,
      currentTime: new Date().toISOString()
    });
    console.log(JSON.stringify(result, null, 2));

    // 5. 進化履歴の取得
    console.log('\n📜 Step 5: Getting evolution history...\n');
    const history = await engine.getEvolutionHistory(5);
    history.forEach((h, i) => {
      console.log(`${i + 1}. [${formatDate(h.timestamp)}] ${h.description}`);
    });

    // 6. 進化サマリーの生成
    console.log('\n📊 Step 6: Generating evolution summary...\n');
    const summary = await engine.generateEvolutionSummary();
    console.log(summary);

    console.log('\n✅ Evolution Engine test completed successfully!');
  } catch (error) {
    handleError(error, 'testEvolutionEngine');
    throw error;
  }
}

// モジュール実行時はテストを実行
if (require.main === module) {
  testEvolutionEngine()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
