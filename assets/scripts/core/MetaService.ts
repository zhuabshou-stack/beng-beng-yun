import { StorageService } from '../platform/StorageService';

// 局外系统集中服务：每日任务、7 日签到、云蛋盲盒、离线收益、周榜、隐藏 DDA、连败保护。
// 全部走新增存档键（cloudBounceMeta*/cloudBounceWeekly/cloudBounceDDA），不动旧存档语义。

export interface DailyState {
  date: string;
  bestScore: number;
  stars: number;
  skillUsed: boolean;
  claimed: [boolean, boolean, boolean];
}

export const DAILY_TASKS: ReadonlyArray<{ label: string; target: number; reward: number }> = Object.freeze([
  { label: '单局达到 300 分', target: 300, reward: 80 },
  { label: '单局收集 8 颗星星', target: 8, reward: 60 },
  { label: '使用 1 次技能', target: 1, reward: 50 },
]);

const SIGN_REWARDS: ReadonlyArray<{ coins: number; day5Skin?: boolean }> = Object.freeze([
  { coins: 60 }, { coins: 80 }, { coins: 100 }, { coins: 120 }, { coins: 60, day5Skin: true }, { coins: 180 }, { coins: 250 },
]);

export interface MedalInfo {
  index: number; // 已达到的最高奖牌档（-1 = 无）
  name: string;
  gap: number; // 距下一档还差多少分（已是最高档时为 0）
  nextName: string;
}

const MEDALS = [200, 500, 1000, 2000];
const MEDAL_NAMES = ['铜牌', '银牌', '金牌', '钻石牌'];

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function todayKey(): string {
  const now = new Date();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  return `${now.getFullYear()}-${month}-${day}`;
}

function weekKey(): string {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${pad2(week)}`;
}

export class MetaService {
  // —— 每日任务 ——
  static getDaily(): DailyState {
    const date = todayKey();
    const state = StorageService.getJSON<DailyState>('cloudBounceMetaDaily', { date, bestScore: 0, stars: 0, skillUsed: false, claimed: [false, false, false] });
    if (state.date !== date) {
      const fresh: DailyState = { date, bestScore: 0, stars: 0, skillUsed: false, claimed: [false, false, false] };
      StorageService.setJSON('cloudBounceMetaDaily', fresh);
      return fresh;
    }
    return state;
  }

  static recordRunScore(score: number): void {
    const state = this.getDaily();
    if (score > state.bestScore) {
      state.bestScore = score;
      StorageService.setJSON('cloudBounceMetaDaily', state);
    }
  }

  static addDailyStars(amount: number): void {
    const state = this.getDaily();
    state.stars += amount;
    StorageService.setJSON('cloudBounceMetaDaily', state);
  }

  static recordSkillUsed(): void {
    const state = this.getDaily();
    if (!state.skillUsed) {
      state.skillUsed = true;
      StorageService.setJSON('cloudBounceMetaDaily', state);
    }
  }

  // 返回 null=已完成/未达成；否则返回奖励金币数（领取成功）
  static claimDailyTask(index: number): number | null {
    if (index < 0 || index >= DAILY_TASKS.length) return null;
    const state = this.getDaily();
    if (state.claimed[index]) return null;
    const task = DAILY_TASKS[index];
    const progress = index === 0 ? state.bestScore : index === 1 ? state.stars : state.skillUsed ? 1 : 0;
    if (progress < task.target) return null;
    state.claimed[index] = true;
    StorageService.setJSON('cloudBounceMetaDaily', state);
    return task.reward;
  }

  // —— 7 日签到 ——
  static needsSign(): boolean {
    const state = StorageService.getJSON<{ lastDate: string; streak: number }>('cloudBounceMetaSign', { lastDate: '', streak: 0 });
    return state.lastDate !== todayKey();
  }

  static getSignStreak(): number {
    const state = StorageService.getJSON<{ lastDate: string; streak: number }>('cloudBounceMetaSign', { lastDate: '', streak: 0 });
    return state.lastDate === todayKey() ? state.streak : state.streak % 7;
  }

  // 返回 { day, coins, skinGranted }；skinGranted=本次赠送了付费档皮肤
  static sign(): { day: number; coins: number; skinGranted: boolean } {
    const state = StorageService.getJSON<{ lastDate: string; streak: number }>('cloudBounceMetaSign', { lastDate: '', streak: 0 });
    const day = state.lastDate === todayKey() ? state.streak : (state.streak % 7) + 1;
    const reward = SIGN_REWARDS[day - 1];
    let coins = reward.coins;
    let skinGranted = false;
    if (reward.day5Skin) {
      // 第 5 天：赠送一款未拥有的付费档皮肤；全拥有则折算 150 币
      const owned = StorageService.getNumber('cloudBounceCoins', 0);
      const locked: number[] = [];
      const costs = [0, 0, 0, 50, 100, 200, 300, 300, 400, 500];
      costs.forEach((cost, index) => { if (owned < cost && cost > 0) locked.push(index); });
      if (locked.length > 0) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        const prevCoins = StorageService.getNumber('cloudBounceCoins', 0);
        StorageService.setNumber('cloudBounceCoins', prevCoins + costs[pick]);
        skinGranted = true;
      } else {
        coins += 150;
      }
    }
    StorageService.setJSON('cloudBounceMetaSign', { lastDate: todayKey(), streak: day });
    return { day, coins, skinGranted };
  }

  // —— 云蛋盲盒：每通 5 关得 1 颗 ——
  static addCompletedLevel(): void {
    const done = StorageService.getNumber('cloudBounceMetaLevels', 0) + 1;
    StorageService.setNumber('cloudBounceMetaLevels', done);
  }

  static eggsAvailable(): number {
    const done = StorageService.getNumber('cloudBounceMetaLevels', 0);
    const opened = StorageService.getNumber('cloudBounceMetaEggs', 0);
    return Math.max(0, Math.floor(done / 5) - opened);
  }

  // 开蛋：70% 金币 50-200；30% 随机未拥有皮肤（折算 250 币）
  static openEgg(): { coins: number; skinIndex: number | null } {
    if (this.eggsAvailable() <= 0) return { coins: 0, skinIndex: null };
    const opened = StorageService.getNumber('cloudBounceMetaEggs', 0) + 1;
    StorageService.setNumber('cloudBounceMetaEggs', opened);
    const prevCoins = StorageService.getNumber('cloudBounceCoins', 0);
    if (Math.random() < 0.3) {
      const owned = StorageService.getNumber('cloudBounceCoins', 0);
      const costs = [0, 0, 0, 50, 100, 200, 300, 300, 400, 500];
      const locked: number[] = [];
      costs.forEach((cost, index) => { if (owned < cost && cost > 0) locked.push(index); });
      if (locked.length > 0) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        StorageService.setNumber('cloudBounceCoins', prevCoins + costs[pick]);
        return { coins: costs[pick], skinIndex: pick };
      }
    }
    const coins = 50 + Math.floor(Math.random() * 16) * 10;
    StorageService.setNumber('cloudBounceCoins', prevCoins + coins);
    return { coins, skinIndex: null };
  }

  // —— 离线收益：间隔 ≥30 分钟才有，上限 200 ——
  static touchLastSeen(): void {
    StorageService.setNumber('cloudBounceMetaSeen', Date.now());
  }

  static consumeOffline(): { minutes: number; coins: number } | null {
    const last = StorageService.getNumber('cloudBounceMetaSeen', 0);
    this.touchLastSeen();
    if (last <= 0) return null;
    const minutes = Math.floor((Date.now() - last) / 60000);
    if (minutes < 30) return null;
    return { minutes, coins: Math.min(200, minutes * 2) };
  }

  // —— 周榜（本地；好友榜由平台桥接后接入）——
  static addWeeklyScore(score: number): void {
    const key = weekKey();
    const board = StorageService.getJSON<{ week: string; list: number[] }>('cloudBounceWeekly', { week: key, list: [] });
    if (board.week !== key) {
      board.week = key;
      board.list = [];
    }
    board.list.push(Math.floor(score));
    board.list.sort((a, b) => b - a);
    board.list = board.list.slice(0, 10);
    StorageService.setJSON('cloudBounceWeekly', board);
  }

  static getWeekly(): number[] {
    const board = StorageService.getJSON<{ week: string; list: number[] }>('cloudBounceWeekly', { week: weekKey(), list: [] });
    return board.week === weekKey() ? board.list : [];
  }

  // —— 隐藏 DDA 与连败保护（绝不外显）——
  static recordDeath(level: number): void {
    const data = StorageService.getJSON<{ attempts: Record<string, number>; streak: number }>('cloudBounceDDA', { attempts: {}, streak: 0 });
    const key = `${level}`;
    data.attempts[key] = (data.attempts[key] ?? 0) + 1;
    data.streak += 1;
    StorageService.setJSON('cloudBounceDDA', data);
  }

  static resetDefeatStreak(): void {
    const data = StorageService.getJSON<{ attempts: Record<string, number>; streak: number }>('cloudBounceDDA', { attempts: {}, streak: 0 });
    data.streak = 0;
    StorageService.setJSON('cloudBounceDDA', data);
  }

  static getDefeatStreak(): number {
    return StorageService.getJSON<{ streak: number }>('cloudBounceDDA', { streak: 0 }).streak;
  }

  static ddaActive(level: number): boolean {
    const data = StorageService.getJSON<{ attempts: Record<string, number> }>('cloudBounceDDA', { attempts: {} });
    return (data.attempts[`${level}`] ?? 0) >= 3;
  }

  // —— 奖牌 ——
  static medalInfo(score: number): MedalInfo {
    let index = -1;
    for (let i = 0; i < MEDALS.length; i += 1) {
      if (score >= MEDALS[i]) index = i;
    }
    const next = index + 1;
    return {
      index,
      name: index >= 0 ? MEDAL_NAMES[index] : '',
      gap: next < MEDALS.length ? Math.max(0, MEDALS[next] - score) : 0,
      nextName: next < MEDALS.length ? MEDAL_NAMES[next] : '',
    };
  }
}
