/**
 * Task 3: Obsidian Reader
 * Obsidian VaultからDaily Notesを読み取り、ユーザーの行動パターンを収集する
 */

import matter from 'gray-matter';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ObsidianDailyNote, ObsidianTask } from '../types';

export class ObsidianReader {
  private vaultPath: string;
  private dailyNotesPath: string;
  private startDate?: string;
  private endDate?: string;

  constructor(config: {
    vaultPath: string;
    dailyNotesPath?: string;
    startDate?: string;
    endDate?: string;
  }) {
    this.vaultPath = config.vaultPath;
    this.dailyNotesPath = config.dailyNotesPath || path.join(config.vaultPath, 'Daily Notes');
    this.startDate = config.startDate;
    this.endDate = config.endDate;
  }

  /**
   * Daily Notesを読み取る
   */
  async readDailyNotes(): Promise<ObsidianDailyNote[]> {
    try {
      // Daily Notesディレクトリが存在するか確認
      if (!await fs.pathExists(this.dailyNotesPath)) {
        throw new Error(`Daily Notes directory not found: ${this.dailyNotesPath}`);
      }

      // Markdownファイルを取得
      const files = await fs.readdir(this.dailyNotesPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      const notes: ObsidianDailyNote[] = [];

      for (const file of markdownFiles) {
        const filePath = path.join(this.dailyNotesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        try {
          const parsed = matter(content);
          const date = this.extractDateFromFilename(file);

          // 日時範囲フィルタリング
          if (date) {
            if (this.startDate && date < new Date(this.startDate)) {
              continue;
            }
            if (this.endDate && date > new Date(this.endDate)) {
              continue;
            }
          }

          const dailyNote = this.parseDailyNote(content, date);
          notes.push(dailyNote);
        } catch (error) {
          console.error(`Failed to parse ${file}: ${error}`);
        }
      }

      // 日付でソート
      notes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return notes;
    } catch (error) {
      throw new Error(`Obsidian Daily Notes reading failed: ${error}`);
    }
  }

  /**
   * ファイル名から日付を抽出する
   */
  private extractDateFromFilename(filename: string): Date | null {
    // ファイル名から日付を抽出（例: 2026-02-15.md, Daily note 2026-02-15.md）
    const dateMatch = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);

    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(`${year}-${month}-${day}`);
    }

    return null;
  }

  /**
   * Daily Noteをパースする
   */
  private parseDailyNote(content: string, date: Date | null): ObsidianDailyNote {
    const parsed = matter(content);
    const frontmatter = parsed.data as Record<string, any>;

    // タスクを抽出
    const tasks = this.extractTasks(content);

    // メモを抽出
    const notes = this.extractNotes(content);

    // タグを抽出
    const tags = this.extractTags(content, frontmatter);

    // カテゴリを抽出
    const categories = this.extractCategories(frontmatter);

    return {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content,
      date: date ? date.toISOString() : new Date().toISOString(),
      tasks,
      notes,
      tags,
      categories,
    };
  }

  /**
   * タスクを抽出する
   */
  private extractTasks(content: string): ObsidianTask[] {
    const tasks: ObsidianTask[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Markdownのチェックボックスを検出
      // - [ ] 未完了タスク
      // - [x] 完了タスク
      const taskMatch = line.match(/^[\s]*-\s*\[(x|X|\s)\]\s*(.*)$/);

      if (taskMatch) {
        const completed = taskMatch[1].toLowerCase() === 'x';
        const text = taskMatch[2].trim();

        // タグを抽出
        const tags = text.match(/#\w+/g)?.map(t => t.slice(1)) || [];

        tasks.push({
          id: `task-${Date.now()}-${tasks.length}`,
          description: text,
          text,
          completed,
          tags: tags.length > 0 ? tags : undefined,
        });
      }
    }

    return tasks;
  }

  /**
   * メモを抽出する
   */
  private extractNotes(content: string): string[] {
    const notes: string[] = [];
    const lines = content.split('\n');
    let inNoteSection = false;
    let currentNote = '';

    for (const line of lines) {
      // ノートセクションの開始
      if (line.match(/^#+\s*(メモ|Note|Notes)/i)) {
        inNoteSection = true;
        continue;
      }

      // タスクや見出し以外の行をメモとして扱う
      if (line.trim() && !line.match(/^[\s]*-\s*\[/) && !line.match(/^#+\s*/)) {
        if (inNoteSection || line.trim().length > 10) {
          if (currentNote) {
            currentNote += ' ';
          }
          currentNote += line.trim();
        }
      } else if (currentNote) {
        notes.push(currentNote);
        currentNote = '';
      }
    }

    if (currentNote) {
      notes.push(currentNote);
    }

    return notes;
  }

  /**
   * タグを抽出する
   */
  private extractTags(content: string, frontmatter: Record<string, any>): string[] {
    const tags = new Set<string>();

    // Frontmatterからタグを抽出
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        frontmatter.tags.forEach((tag: string) => tags.add(tag));
      } else if (typeof frontmatter.tags === 'string') {
        tags.add(frontmatter.tags);
      }
    }

    // 本文からタグを抽出 (#tag形式)
    const contentTags = content.match(/#\w+/g);
    if (contentTags) {
      contentTags.forEach(tag => tags.add(tag.slice(1)));
    }

    return Array.from(tags);
  }

  /**
   * カテゴリを抽出する
   */
  private extractCategories(frontmatter: Record<string, any>): string[] {
    if (frontmatter.category) {
      if (Array.isArray(frontmatter.category)) {
        return frontmatter.category;
      } else if (typeof frontmatter.category === 'string') {
        return [frontmatter.category];
      }
    }

    if (frontmatter.categories) {
      if (Array.isArray(frontmatter.categories)) {
        return frontmatter.categories;
      } else if (typeof frontmatter.categories === 'string') {
        return [frontmatter.categories];
      }
    }

    return [];
  }

  /**
   * データをJSONファイルに保存する
   */
  async saveToFile(notes: ObsidianDailyNote[], filePath: string): Promise<void> {
    try {
      const data = {
        notes,
        count: notes.length,
        statistics: this.calculateStatistics(notes),
        collectedAt: new Date().toISOString(),
      };

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Obsidian data: ${error}`);
    }
  }

  /**
   * 統計情報を計算する
   */
  private calculateStatistics(notes: ObsidianDailyNote[]): Record<string, any> {
    const totalTasks = notes.reduce((sum, note) => sum + note.tasks.length, 0);
    const completedTasks = notes.reduce(
      (sum, note) => sum + note.tasks.filter(t => t.completed).length,
      0
    );
    const totalNotes = notes.reduce((sum, note) => sum + note.notes.length, 0);
    const totalTags = notes.reduce((sum, note) => sum + note.tags.length, 0);

    // タグの頻度
    const tagFrequency: Record<string, number> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    });

    // カテゴリの頻度
    const categoryFrequency: Record<string, number> = {};
    notes.forEach(note => {
      note.categories.forEach(category => {
        categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
      });
    });

    return {
      totalNotes: notes.length,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      totalNotesContent: totalNotes,
      totalTags,
      uniqueTags: Object.keys(tagFrequency).length,
      uniqueCategories: Object.keys(categoryFrequency).length,
      tagFrequency,
      categoryFrequency,
    };
  }

  /**
   * パターン検出のためにデータを構造化する
   */
  structureForPatternDetection(notes: ObsidianDailyNote[]): Record<string, any> {
    // 曜日ごとのタスク完了率
    const weekdayCompletion: Record<number, { total: number; completed: number }> = {};

    notes.forEach(note => {
      const day = new Date(note.date).getDay();
      if (!weekdayCompletion[day]) {
        weekdayCompletion[day] = { total: 0, completed: 0 };
      }
      weekdayCompletion[day].total += note.tasks.length;
      weekdayCompletion[day].completed += note.tasks.filter(t => t.completed).length;
    });

    // よく使われるタグ
    const tagFrequency: Record<string, number> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    });

    // タスクのキーワード
    const taskKeywords: Record<string, number> = {};
    notes.forEach(note => {
      note.tasks.forEach(task => {
        const words = task.text.split(/\s+/).filter(w => w.length > 2);
        words.forEach(word => {
          taskKeywords[word] = (taskKeywords[word] || 0) + 1;
        });
      });
    });

    // 週ごとのアクティビティ
    const weeklyActivity: Record<number, { tasks: number; notes: number }> = {};
    notes.forEach(note => {
      const date = new Date(note.date);
      const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (!weeklyActivity[week]) {
        weeklyActivity[week] = { tasks: 0, notes: 0 };
      }
      weeklyActivity[week].tasks += note.tasks.length;
      weeklyActivity[week].notes += note.notes.length;
    });

    return {
      weekdayCompletion,
      tagFrequency,
      taskKeywords,
      weeklyActivity,
    };
  }

  /**
   * データ収集の統計情報を取得する
   */
  getStatistics(notes: ObsidianDailyNote[]): {
    totalNotes: number;
    totalTasks: number;
    totalCompletedTasks: number;
    completionRate: number;
    dateRange: { start: string; end: string };
  } {
    if (notes.length === 0) {
      return {
        totalNotes: 0,
        totalTasks: 0,
        totalCompletedTasks: 0,
        completionRate: 0,
        dateRange: { start: '', end: '' },
      };
    }

    const totalTasks = notes.reduce((sum, note) => sum + note.tasks.length, 0);
    const completedTasks = notes.reduce(
      (sum, note) => sum + note.tasks.filter(t => t.completed).length,
      0
    );

    const dates = notes.map(note => new Date(note.date));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      totalNotes: notes.length,
      totalTasks,
      totalCompletedTasks: completedTasks,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }
}

// エクスポート
export default ObsidianReader;
