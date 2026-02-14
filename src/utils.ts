/**
 * 自己進化システムユーティリティ関数
 */
import fs from 'fs-extra';
import path from 'path';
import OpenAI from 'openai';

// データファイルのパス
const DATA_DIR = path.join(__dirname, '../data');
const LEARNING_DATA_FILE = path.join(DATA_DIR, 'learning-data.json');

// OpenAIクライアント
let openaiClient: OpenAI | null = null;

// AIモデル設定
export const AI_MODEL = process.env.AI_MODEL || 'zai/glm-4.7';
export const AI_BASE_URL = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';

/**
 * OpenAIクライアントの初期化
 */
export function initOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey,
      baseURL: AI_BASE_URL
    });
  }
  return openaiClient;
}

/**
 * 学習データを読み込む
 */
export async function loadLearningData() {
  try {
    await fs.ensureDir(DATA_DIR);
    if (await fs.pathExists(LEARNING_DATA_FILE)) {
      const data = await fs.readJson(LEARNING_DATA_FILE);
      return data;
    }
    // データが存在しない場合は初期データを返す
    return {
      patterns: [],
      proposals: [],
      evolutionHistory: [],
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error loading learning data:', error);
    throw error;
  }
}

/**
 * 学習データを保存する
 */
export async function saveLearningData(data: any) {
  try {
    await fs.ensureDir(DATA_DIR);
    data.lastUpdated = new Date().toISOString();
    await fs.writeJson(LEARNING_DATA_FILE, data, { spaces: 2 });
    console.log(`✅ Learning data saved to ${LEARNING_DATA_FILE}`);
  } catch (error) {
    console.error('Error saving learning data:', error);
    throw error;
  }
}

/**
 * 一意のIDを生成
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 日付フォーマット
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * テキストを要約する
 */
export function summarizeText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 優先順位を数値に変換
 */
export function priorityToNumber(priority: string): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * 配列をシャッフル
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * エラーハンドリング
 */
export function handleError(error: unknown, context: string): void {
  if (error instanceof Error) {
    console.error(`❌ [${context}] ${error.message}`);
    console.error(error.stack);
  } else {
    console.error(`❌ [${context}] Unknown error:`, error);
  }
}
