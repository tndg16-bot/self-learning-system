# 自己進化システム (Self-Learning System)

ユーザーの行動パターンとプロジェクト進捗から学習し、記憶を蓄積して自己進化するAIエージェントシステム。

## 概要

このシステムは以下の機能を提供します：

- **記憶の蓄積**: 収集した情報を記憶して、過去の経験として活用できるようにする
- **自己進化**: 蓄積した経験から学んで、改善を提案する

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    Self-Learning System                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  Data       │   │  Pattern    │   │  Memory     │    │
│  │  Collector  │→  │  Analyzer   │→  │  Storage    │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│         ↓                ↓                ↓              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  Discord    │   │  Pattern    │   │  Learning   │    │
│  │  Reader     │   │  Detector   │   │  Model      │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  GitHub     │   │  Proposal   │   │  Evolution  │    │
│  │  Reader     │   │  Generator  │   │  Engine     │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│  ┌─────────────┐                    ┌─────────────┐    │
│  │  Obsidian   │                    │  Report     │    │
│  │  Reader     │                    │  Generator  │    │
│  └─────────────┘                    └─────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 開発フェーズ

### Phase 1: データ収集（Foundation）
- **Task 1**: Discord Reader - ユーザーのメッセージパターン収集 ✓
- **Task 2**: GitHub Reader - Issues/PR/コミットデータ収集 ✓
- **Task 3**: Obsidian Reader - Daily Notesから行動パターン収集 ✓
- **Task 4**: Data Collector - 全データソースを統合 ✓

### Phase 2: パターン分析（Pattern Detection）
- **Task 5**: Pattern Detector - 繰り返しパターン検出
- **Task 6**: Trend Analyzer - トレンドと傾向分析
- **Task 7**: Statistics Analyzer - 統計分析

### Phase 3: 記憶蓄積（Memory Storage）✓
- **Task 8**: Pattern Storage - パターンを永続化 ✓
  - パターンデータのJSON永続化
  - バージョン管理（最大10バージョン）
  - 有効期限管理（デフォルト30日）
  - クエリによる検索機能
- **Task 9**: Learning Model - 学習モデル構築 ✓
  - TensorFlow.jsによるニューラルネットワーク
  - パターンの分類と予測
  - 重み付けアルゴリズム（信頼度70% + 頻度30%）
  - 増分学習と完全再学習に対応
- **Task 10**: Knowledge Base - 知識ベース構築 ✓
  - パターンからの知識抽出（行動/時系列/連続/カテゴリ）
  - 知識の構造化（事実/ルール/関係/概念）
  - 関係性の分析と保存
  - 全文検索とタグ検索

### Phase 4: 自己進化（Self-Evolution）
- **Task 11**: Proposal Generator - 改善提案生成
- **Task 12**: Evolution Engine - 自己進化エンジン
- **Task 13**: Report Generator - 学習レポート生成

### Phase 5: 統合とテスト（Integration & Testing）
- **Task 14**: Integration - 全モジュール統合
- **Task 15**: Testing - テストと検証
- **Task 16**: Documentation - ドキュメント作成

## インストール

```bash
npm install
```

## 環境変数

以下の環境変数を設定してください：

```bash
# GLM4.7 API Key
OPENAI_API_KEY=your-glm-api-key-here

# AI Model Configuration (optional, default values shown)
AI_MODEL=zai/glm-4.7
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# Discord
DISCORD_USER_ID=your_discord_user_id

# GitHub
GITHUB_TOKEN=your_github_token

# Obsidian
OBSIDIAN_VAULT_PATH=C:\Users\chatg\Documents\AntigravityVault
OBSIDIAN_DAILY_NOTES_PATH=Daily Notes

# 日時範囲（オプション）
START_DATE=2026-02-01
END_DATE=2026-02-15
```

**重要**: このシステムでは **GLM4.7 (zai/glm-4.7)** を使用します。すべてのAI API呼び出し（Task 11: Proposal Generator, Task 13: Report Generatorなど）でGLM4.7が使用されます。

## 使い方

### データ収集を実行する

```bash
npm run dev
```

### Phase 1をテストする

```bash
npm test
```

または、直接テストスクリプトを実行：

```bash
ts-node test-phase1.ts
```

### Phase 3をテストする

```bash
# 全てのテストを実行
npm test

# Phase 3のみテスト
npm test -- phase3

# 特定モジュールをテスト
npm test -- pattern-storage
npm test -- learning-model
npm test -- knowledge-base
```

## データ構造

### Discord Message
```typescript
interface DiscordMessage {
  id: string;
  timestamp: string;
  channel: string;
  content: string;
  author: string;
  authorId: string;
  guild?: string;
}
```

### GitHub Issue
```typescript
interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  labels: string[];
  assignees: string[];
}
```

### Obsidian Daily Note
```typescript
interface ObsidianDailyNote {
  date: string;
  tasks: ObsidianTask[];
  notes: string[];
  tags: string[];
  categories: string[];
}
```

## プロジェクト構成

```
self-learning-system/
├── src/
│   ├── phase1/           # データ収集モジュール
│   │   ├── discord-reader.ts
│   │   ├── github-reader.ts
│   │   ├── obsidian-reader.ts
│   │   ├── data-collector.ts
│   │   └── index.ts
│   ├── phase2/           # パターン分析モジュール（未実装）
│   │   ├── pattern-detector.ts
│   │   ├── trend-analyzer.ts
│   │   ├── statistics-analyzer.ts
│   │   └── index.ts
│   ├── phase3/           # 記憶蓄積モジュール
│   │   ├── pattern-storage/
│   │   │   ├── PatternStorage.ts
│   │   │   ├── types.ts
│   │   │   ├── pattern-storage.test.ts
│   │   │   └── index.ts
│   │   ├── learning-model/
│   │   │   ├── LearningModel.ts
│   │   │   ├── types.ts
│   │   │   ├── learning-model.test.ts
│   │   │   └── index.ts
│   │   ├── knowledge-base/
│   │   │   ├── KnowledgeBase.ts
│   │   │   ├── types.ts
│   │   │   ├── knowledge-base.test.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   └── phase3.test.ts
│   ├── types/            # 型定義
│   │   └── index.ts
│   └── index.ts          # メインエントリーポイント
├── learning-data/        # 学習データ保存先
│   └── integrated-data.json
├── data/                 # Phase 3データ保存先
│   ├── patterns/         # パターンデータ
│   └── knowledge/        # 知識データ
├── test-phase1.ts        # テストスクリプト
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 期待される効果

- **自動化の機会発見**: 繰り返しタスクを自動検出してスキル化提案
- **行動パターンの理解**: ユーザーの好みを学習して応答の品質向上
- **プロジェクトの効率化**: 進捗の傾向を分析して改善提案
- **継続的な自己改善**: 経験から学んでシステムを進化

## ライセンス

MIT

## コントリビューター

- tndg16-bot

## 関連リンク

- [GitHub Repository](https://github.com/tndg16-bot/self-learning-system)
- [Issues](https://github.com/tndg16-bot/self-learning-system/issues)
