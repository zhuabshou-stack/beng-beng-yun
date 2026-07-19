import { StorageService } from '../platform/StorageService';

export interface LifetimeStats {
  games: number;
  jumps: number;
  landings: number;
  coins: number;
  stars: number;
  bestScore: number;
  bestHeight: number;
  bestCombo: number;
  playTimeSeconds: number;
}

export interface RunProgressSnapshot {
  score: number;
  height: number;
  maxCombo: number;
}

const STATS_KEY = 'cloudBounceLifetimeStats';

const EMPTY_STATS: Readonly<LifetimeStats> = Object.freeze({
  games: 0,
  jumps: 0,
  landings: 0,
  coins: 0,
  stars: 0,
  bestScore: 0,
  bestHeight: 0,
  bestCombo: 0,
  playTimeSeconds: 0,
});

export class ProgressionService {
  static load(): LifetimeStats {
    const saved = StorageService.getJSON<Partial<LifetimeStats>>(STATS_KEY, {});
    return {
      games: this.safe(saved.games),
      jumps: this.safe(saved.jumps),
      landings: this.safe(saved.landings),
      coins: this.safe(saved.coins),
      stars: this.safe(saved.stars),
      bestScore: Math.max(this.safe(saved.bestScore), StorageService.getNumber('cloudBounceBest', 0)),
      bestHeight: this.safe(saved.bestHeight),
      bestCombo: this.safe(saved.bestCombo),
      playTimeSeconds: this.safe(saved.playTimeSeconds),
    };
  }

  static reset(): void {
    StorageService.setJSON(STATS_KEY, { ...EMPTY_STATS });
  }

  static mutate(update: (stats: LifetimeStats) => void): LifetimeStats {
    const stats = this.load();
    update(stats);
    StorageService.setJSON(STATS_KEY, stats);
    return stats;
  }

  static recordGameStart(): void {
    this.mutate((stats) => { stats.games += 1; });
  }

  static recordGameStarted(): void {
    this.recordGameStart();
  }

  static recordJump(): void {
    this.mutate((stats) => { stats.jumps += 1; });
  }

  static recordLanding(): void {
    this.mutate((stats) => { stats.landings += 1; });
  }

  static recordCollectible(type: 'coin' | 'star', amount: number): void {
    this.mutate((stats) => {
      if (type === 'coin') stats.coins += amount;
      else stats.stars += amount;
    });
  }

  static recordCoin(amount = 1): void {
    this.recordCollectible('coin', amount);
  }

  static recordStar(amount = 1): void {
    this.recordCollectible('star', amount);
  }

  static recordPlayTime(seconds: number): void {
    this.mutate((stats) => { stats.playTimeSeconds += Math.max(0, seconds); });
  }

  static recordRunResult(run: RunProgressSnapshot): void {
    this.mutate((stats) => {
      stats.bestScore = Math.max(stats.bestScore, Math.floor(run.score));
      stats.bestHeight = Math.max(stats.bestHeight, Math.floor(run.height));
      stats.bestCombo = Math.max(stats.bestCombo, Math.floor(run.maxCombo));
    });
  }

  static recordRunProgress(score: number, height: number, combo: number, playTimeSeconds: number): void {
    this.mutate((stats) => {
      stats.bestScore = Math.max(stats.bestScore, Math.floor(score));
      stats.bestHeight = Math.max(stats.bestHeight, Math.floor(height));
      stats.bestCombo = Math.max(stats.bestCombo, Math.floor(combo));
      stats.playTimeSeconds += Math.max(0, playTimeSeconds);
    });
  }

  private static safe(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
