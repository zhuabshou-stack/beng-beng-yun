export interface RunStats {
  score: number;
  coins: number;
  stars: number;
  maxCombo: number;
  height: number;
}

export class GameData {
  score = 0;
  runCoins = 0;
  stars = 0;
  combo = 0;
  maxCombo = 0;
  heightMeters = 0;
  totalCoins = 0;
  bestScore = 0;
  selectedSkin = 0;

  resetRun(): void {
    this.score = 0;
    this.runCoins = 0;
    this.stars = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.heightMeters = 0;
  }

  registerLanding(continuesCombo: boolean): number {
    // 首次或连续落到不同云时累加；重复落回同一朵云会中断连续落云。
    this.combo = continuesCombo ? this.combo + 1 : 0;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const scoreGain = 1 + Math.floor(this.combo / 5);
    this.score += scoreGain;
    return scoreGain;
  }

  resetCombo(): void {
    this.combo = 0;
  }

  snapshot(): RunStats {
    return {
      score: Math.floor(this.score),
      coins: this.runCoins,
      stars: this.stars,
      maxCombo: this.maxCombo,
      height: Math.floor(this.heightMeters),
    };
  }
}
