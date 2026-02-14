/**
 * Task 11: Proposal Generator - 改善提案生成
 *
 * パターンから改善提案を生成し、優先順位付けを行うモジュール
 */
import OpenAI from 'openai';
import {
  Pattern,
  Proposal,
  ProposalGenerationRequest,
  LearningData
} from '../types';
import {
  initOpenAI,
  loadLearningData,
  saveLearningData,
  generateId,
  formatDate,
  priorityToNumber,
  handleError
} from '../utils';

export class ProposalGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = initOpenAI();
  }

  /**
   * パターンから改善提案を生成する
   */
  async generateProposals(
    patterns: Pattern[],
    context?: string,
    constraints?: string[]
  ): Promise<Proposal[]> {
    try {
      console.log('📋 Generating proposals from patterns...');

      // パターンを分析してプロンプトを作成
      const prompt = this.buildAnalysisPrompt(patterns, context, constraints);

      // OpenAI APIで提案を生成
      const { AI_MODEL } = await import('../utils');
      const completion = await this.openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI API');
      }

      // レスポンスを解析して提案オブジェクトに変換
      const proposals = this.parseProposals(response, patterns);

      console.log(`✅ Generated ${proposals.length} proposals`);
      return proposals;
    } catch (error) {
      handleError(error, 'ProposalGenerator.generateProposals');
      return [];
    }
  }

  /**
   * 提案の優先順位付けを行う
   */
  async prioritizeProposals(proposals: Proposal[]): Promise<Proposal[]> {
    try {
      console.log('⚖️ Prioritizing proposals...');

      // OpenAI APIで優先順位を評価
      const prompt = this.buildPrioritizationPrompt(proposals);

      const { AI_MODEL } = await import('../utils');
      const completion = await this.openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getPrioritizationSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return proposals;
      }

      // レスポンスを解析して優先順位を更新
      const prioritizedProposals = this.updatePriorities(proposals, response);

      // 優先順位でソート
      prioritizedProposals.sort((a, b) => {
        return priorityToNumber(b.priority) - priorityToNumber(a.priority);
      });

      console.log(`✅ Prioritized ${prioritizedProposals.length} proposals`);
      return prioritizedProposals;
    } catch (error) {
      handleError(error, 'ProposalGenerator.prioritizeProposals');
      return proposals;
    }
  }

  /**
   * 自然言語で提案を生成する
   */
  async generateProposalText(proposal: Proposal): Promise<string> {
    try {
      const prompt = `以下の改善提案を、ユーザーに向けて自然言語で説明してください：

**タイトル**: ${proposal.title}
**説明**: ${proposal.description}
**優先度**: ${proposal.priority}
**カテゴリ**: ${proposal.category}
**期待される影響**: ${proposal.estimatedImpact}

形式:
- わかりやすいタイトル
- 簡潔な背景説明
- 具体的なアクション
- 期待される効果`;

      const { AI_MODEL } = await import('../utils');
      const completion = await this.openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたはユーザーの生産性向上を支援するAIアシスタントです。改善提案を分かりやすく説明してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return completion.choices[0].message.content || '説明を生成できませんでした。';
    } catch (error) {
      handleError(error, 'ProposalGenerator.generateProposalText');
      return proposal.description;
    }
  }

  /**
   * 学習データに提案を追加する
   */
  async saveProposalsToLearningData(proposals: Proposal[]): Promise<void> {
    try {
      const learningData = await loadLearningData();

      // 既存の提案と重複をチェック
      const existingIds = new Set(learningData.proposals.map(p => p.id));
      const newProposals = proposals.filter(p => !existingIds.has(p.id));

      learningData.proposals.push(...newProposals);
      await saveLearningData(learningData);

      console.log(`✅ Saved ${newProposals.length} new proposals to learning data`);
    } catch (error) {
      handleError(error, 'ProposalGenerator.saveProposalsToLearningData');
    }
  }

  /**
   * 改善提案のテンプレートを作成する
   */
  createProposalTemplate(): string {
    return `## 改善提案テンプレート

### 📝 基本情報
- **提案ID**: 自動生成
- **タイトル**: [短いタイトル]
- **作成日時**: [日時]
- **ステータス**: pending → reviewed → implemented / rejected

### 🎯 概要
- **説明**: [改善内容の説明]
- **カテゴリ**: automation / efficiency / quality / other
- **優先度**: high / medium / low

### 📊 影響
- **期待される効果**: [具体的な効果]
- **影響範囲**: [どの部分に影響するか]
- **実装難易度**: 低 / 中 / 高

### 🔗 関連パターン
- **パターンID**: [関連するパターンのID]
- **頻度**: [パターンの発生頻度]
- **最終観察日**: [最後に観察された日時]

### ✅ 次のアクション
- [ ] レビュー依頼を送る
- [ ] 詳細設計を作成
- [ ] 実装を開始
- [ ] テストと検証
`;
  }

  /**
   * システムプロンプトを取得
   */
  private getSystemPrompt(): string {
    return `あなたはユーザーの行動パターンを分析し、生産性向上のための改善提案を生成するAIアシスタントです。

ユーザーの行動パターンから以下の改善提案を生成してください：
1. **自動化の機会**: 繰り返し行われるタスクを自動化できないか
2. **効率化の改善**: ワークフローの最適化提案
3. **品質向上**: エラーを減らすための提案
4. **その他**: その他生産性向上に関連する提案

提案はJSON形式で返してください：
\`\`\`json
[
  {
    "title": "提案タイトル",
    "description": "詳細な説明",
    "priority": "high|medium|low",
    "category": "automation|efficiency|quality|other",
    "estimatedImpact": "期待される影響",
    "patternId": "関連するパターンのID"
  }
]
\`\`\``;
  }

  /**
   * 分析プロンプトを構築
   */
  private buildAnalysisPrompt(
    patterns: Pattern[],
    context?: string,
    constraints?: string[]
  ): string {
    let prompt = `以下のユーザーの行動パターンを分析して、改善提案を生成してください：\n\n`;

    // パターン情報を追加
    patterns.forEach((pattern, index) => {
      prompt += `### パターン ${index + 1}\n`;
      prompt += `- タイプ: ${pattern.type}\n`;
      prompt += `- カテゴリ: ${pattern.category}\n`;
      prompt += `- 頻度: ${pattern.frequency}\n`;
      prompt += `- 最終観察: ${formatDate(pattern.lastSeen)}\n`;
      prompt += `- 説明: ${pattern.description}\n\n`;
    });

    // コンテキストを追加
    if (context) {
      prompt += `### コンテキスト\n${context}\n\n`;
    }

    // 制約を追加
    if (constraints && constraints.length > 0) {
      prompt += `### 制約条件\n`;
      constraints.forEach(c => {
        prompt += `- ${c}\n`;
      });
      prompt += '\n';
    }

    prompt += `上記のパターンに基づいて、実行可能で具体的な改善提案を生成してください。`;

    return prompt;
  }

  /**
   * 優先順位付けのシステムプロンプト
   */
  private getPrioritizationSystemPrompt(): string {
    return `あなたは改善提案の優先順位を評価するAIアシスタントです。

以下の基準で優先順位を判断してください：
1. **影響の大きさ**: どの程度の改善が見込めるか
2. **実装難易度**: 実装がどのくらい簡単か
3. **緊急性**: 早急な対応が必要か

優先度をJSON形式で返してください：
\`\`\`json
{
  "priorities": [
    { "proposalId": "提案ID", "priority": "high|medium|low", "reason": "理由" }
  ]
}
\`\`\``;
  }

  /**
   * 優先順位付けプロンプトを構築
   */
  private buildPrioritizationPrompt(proposals: Proposal[]): string {
    let prompt = `以下の改善提案の優先順位を評価してください：\n\n`;

    proposals.forEach((proposal, index) => {
      prompt += `### 提案 ${index + 1}\n`;
      prompt += `- ID: ${proposal.id}\n`;
      prompt += `- タイトル: ${proposal.title}\n`;
      prompt += `- 説明: ${proposal.description}\n`;
      prompt += `- 現在の優先度: ${proposal.priority}\n`;
      prompt += `- カテゴリ: ${proposal.category}\n`;
      prompt += `- 期待される影響: ${proposal.estimatedImpact}\n\n`;
    });

    prompt += `各提案の影響の大きさ、実装難易度、緊急性を考慮して、適切な優先順位を割り当ててください。`;

    return prompt;
  }

  /**
   * 提案を解析
   */
  private parseProposals(response: string, patterns: Pattern[]): Proposal[] {
    try {
      // JSONを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : response;

      const parsedProposals = JSON.parse(jsonContent);

      if (!Array.isArray(parsedProposals)) {
        throw new Error('Response is not an array');
      }

      return parsedProposals.map((p: any) => ({
        id: generateId('proposal'),
        title: p.title || '改善提案',
        description: p.description || '',
        priority: (p.priority === 'high' || p.priority === 'medium' || p.priority === 'low') ? p.priority : 'medium',
        category: p.category || 'other',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        patternId: p.patternId || '',
        estimatedImpact: p.estimatedImpact || '未評価'
      }));
    } catch (error) {
      handleError(error, 'ProposalGenerator.parseProposals');
      return [];
    }
  }

  /**
   * 優先順位を更新
   */
  private updatePriorities(proposals: Proposal[], response: string): Proposal[] {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : response;

      const parsed = JSON.parse(jsonContent);
      const priorities = parsed.priorities || [];

      const priorityMap = new Map(
        priorities.map((p: any) => [p.proposalId, p.priority])
      );

      return proposals.map(p => ({
        ...p,
        priority: (priorityMap.get(p.id) === 'high' || priorityMap.get(p.id) === 'medium' || priorityMap.get(p.id) === 'low') ? priorityMap.get(p.id) as 'high' | 'medium' | 'low' : p.priority
      }));
    } catch (error) {
      handleError(error, 'ProposalGenerator.updatePriorities');
      return proposals;
    }
  }
}

/**
 * テスト関数
 */
export async function testProposalGenerator() {
  console.log('🧪 Testing Proposal Generator...\n');

  const generator = new ProposalGenerator();

  // テスト用パターン
  const testPatterns: Pattern[] = [
    {
      id: 'pattern_1',
      type: 'discord',
      category: 'task_management',
      frequency: 50,
      lastSeen: new Date().toISOString(),
      description: '毎朝8時にタスク管理のリマインダーを送っている',
      metadata: { time: '08:00', channel: 'general' }
    },
    {
      id: 'pattern_2',
      type: 'github',
      category: 'issue_tracking',
      frequency: 30,
      lastSeen: new Date().toISOString(),
      description: '毎週月曜日にIssuesの進捗確認をしている',
      metadata: { day: 'monday', repo: 'self-learning-system' }
    },
    {
      id: 'pattern_3',
      type: 'obsidian',
      category: 'note_taking',
      frequency: 20,
      lastSeen: new Date().toISOString(),
      description: '毎日23時にDaily Notesを更新している',
      metadata: { time: '23:00', format: 'markdown' }
    }
  ];

  try {
    // 1. 提案の生成
    console.log('\n📝 Step 1: Generating proposals...\n');
    const proposals = await generator.generateProposals(
      testPatterns,
      '現在は手動で作業をしているが、自動化の機会があるかもしれない'
    );

    console.log('\n📋 Generated Proposals:\n');
    proposals.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`);
      console.log(`   Priority: ${p.priority} | Category: ${p.category}`);
      console.log(`   ${p.description}\n`);
    });

    // 2. 優先順位付け
    console.log('\n⚖️ Step 2: Prioritizing proposals...\n');
    const prioritized = await generator.prioritizeProposals(proposals);

    console.log('\n📊 Prioritized Proposals:\n');
    prioritized.forEach((p, i) => {
      console.log(`${i + 1}. [${p.priority.toUpperCase()}] ${p.title}`);
    });

    // 3. 自然言語生成
    if (proposals.length > 0) {
      console.log('\n💬 Step 3: Generating natural language explanation...\n');
      const explanation = await generator.generateProposalText(proposals[0]);
      console.log(explanation);
    }

    // 4. 学習データに保存
    console.log('\n💾 Step 4: Saving to learning data...\n');
    await generator.saveProposalsToLearningData(proposals);

    console.log('\n✅ Proposal Generator test completed successfully!');
  } catch (error) {
    handleError(error, 'testProposalGenerator');
    throw error;
  }
}

// モジュール実行時はテストを実行
if (require.main === module) {
  testProposalGenerator()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
