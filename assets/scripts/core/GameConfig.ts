export const GAME = Object.freeze({
  version: '2.14.0',
  // HTML v2.1.1 是本分支的唯一玩法规格。原版使用 60 FPS 帧单位；
  // Cocos 世界统一放大 2 倍，再换算为秒单位，保留相同的相对跳高和云间距。
  legacyReferenceFps: 60,
  legacyWorldScale: 2,
  legacyGravityPerFrame: 0.30,
  legacyJumpVelocityPerFrame: 14,
  legacyMoveSpeedPerFrame: 6,
  legacyAccelerationPerFrame: 0.30,
  legacyDampingPerFrame: 0.92,
  tempoScale: 1,
  gravity: 2160,
  jumpVelocity: 1680,
  horizontalSpeed: 720,
  horizontalAcceleration: 2160,
  horizontalDamping: 0.92,
  playerRadius: 36,
  playerVisualHalfWidth: 60,
  screenEdgePadding: 20,
  physicsMaxStep: 1 / 60,
  physicsMaxFrameDelta: 0.1,
  uiScale: 1,
  accessibilityUiScale: 1.18,
  playerVisualScale: 1,
  cloudVisualScale: 1,
  collisionScale: 1,
  cameraVisibleHeight: 1,
  cloudWidth: 140,
  cloudHeight: 40,
  cloudGap: 100,
  cloudGapRandom: 40,
  cloudHorizontalRange: 140,
  cameraLineRatio: 0.40,
  cameraFollowRate: 2.45,
  cameraMaxFollowSpeed: 99999,
  deathLineRatio: 0.50,
  deathMargin: 200,
  levelTarget: 200,
  levelRewardCoins: 50,
  // v2.13 关卡节奏：逐关时间加速（有封顶）、开局保护渐入、目标分渐进——确保"一关比一关快且过得去"
  levelSpeedStep: 0.07,
  levelSpeedCap: 2.0,
  levelGraceSeconds: 3,
  levelTargetGrowth: 1.25,
  // v2.14 爽感核心：完美落点→连击暴走、空中事件道具
  perfectZoneRatio: 0.18,
  surgeSeconds: 5,
  surgePerfectStreak: 3,
  surgeScoreMultiplier: 2,
  surgeScoreBonus: 8,
  tornadoDuration: 1.6,
  tornadoRiseSpeed: 980,
  giantDuration: 8,
  giantScale: 1.6,
  giantCollectChance: 0.035,
  tornadoCollectChance: 0.045,
  // v2.15 难度波浪：10 关一周期（3 简单+4 中等+2 难+1 松弛大爽关）
  levelWaveTable: Object.freeze([0.92, 0.95, 0.98, 1.0, 1.03, 1.06, 1.09, 1.12, 1.16, 0.9]),
  medals: Object.freeze([200, 500, 1000, 2000]),
  springJumpMultiplier: 2,
  comboResetFallSpeed: 120,
  // HTML 原版保持固定速度；以下增量仅实现本轮明确要求，并以原版速度为 1.0 基准。
  comboTempoStep: 0.035,
  comboTempoMax: 1.28,
  comboMissDropDistance: 180,
  comboCameraFollowStep: 0.06,
  comboCameraFollowMax: 1.36,
  comboFeedbackStep: 0.10,
  comboFeedbackMax: 1.80,
  jumpStretchDuration: 0.16,
  jumpStretchBase: 1.10,
  jumpStretchComboStep: 0.018,
  jumpStretchMax: 1.24,
  effectTrailPoolSize: 20,
  effectParticlePoolSize: 128,
  effectFloatTextPoolSize: 12,
  coinSpawnChance: 0.35,
  starSpawnChance: 0.25,
  initialStarSpawnChance: 0.30,
  featherSpawnChance: 0.08,
  featherGlideDuration: 0.5,
  featherFallDampingPerFrame: 0.6,
  movingCloudAmplitude: 80,
  movingCloudAngularSpeed: 1.2,
  magnetRadius: 300,
  magnetSpeed: 160,
  shieldBounceVelocity: 1200,
  milestones: Object.freeze([50, 100, 200, 500, 1000, 2000, 5000]),
});

// 关卡目标分：首关 levelTarget，之后每关 ×1.25 渐进（取整到 10），避免后期遥不可及
export function levelTargetFor(level: number): number {
  return Math.round((GAME.levelTarget * Math.pow(GAME.levelTargetGrowth, level - 1)) / 10) * 10;
}

// 关卡时间加速：第 n 关 = (1 + (n-1)×0.07) × 难度波浪（10 关周期，末关松弛），封顶 2.0
export function levelSpeedScale(level: number): number {
  const base = 1 + Math.max(0, level - 1) * GAME.levelSpeedStep;
  const wave = GAME.levelWaveTable[(Math.max(1, level) - 1) % GAME.levelWaveTable.length];
  return Math.min(GAME.levelSpeedCap, base * wave);
}

export type CloudType = 'normal' | 'spring' | 'fragile' | 'moving';

// 皮肤专属识别特征（纯矢量绘制，PlayerController.ensureVisual 按 feature 分支）
export type SkinFeature = 'sunRays' | 'iceCrystals' | 'petals' | 'leafWings' | 'moonRing' | 'flameCrest' | 'boltMark' | 'candySprinkle' | 'visor' | 'inkBrush';

export interface SkinDefinition {
  rarity: number;
  id: string;
  name: string;
  unlockCost: number;
  bodyColor: string;
  midColor: string;
  accentColor: string;
  glowColor: string;
  eyeColor: string;
  blushColor: string;
  wingColor: string;
  spritePath: string;
  feature?: SkinFeature;
}

export const SKINS: ReadonlyArray<SkinDefinition> = Object.freeze([
  { id: 'sunny', name: '小太阳', unlockCost: 0, bodyColor: '#FFE066', midColor: '#FFB347', accentColor: '#FF8C00', glowColor: '#FFD166', eyeColor: '#333333', blushColor: '#FF9696', wingColor: '#FFFFFF', spritePath: 'art/characters/sunny', feature: 'sunRays', rarity: 1, },
  { id: 'ice', name: '冰晶蓝', unlockCost: 0, bodyColor: '#A8E6CF', midColor: '#88D8F7', accentColor: '#4DABF7', glowColor: '#C8F4FF', eyeColor: '#1A5276', blushColor: '#96C8FF', wingColor: '#C8E6FF', spritePath: 'art/characters/ice', feature: 'iceCrystals', rarity: 1, },
  { id: 'sakura', name: '樱花粉', unlockCost: 0, bodyColor: '#FFB3C6', midColor: '#FF8FAB', accentColor: '#FB6F92', glowColor: '#FFD6E0', eyeColor: '#5C1A3E', blushColor: '#FF6496', wingColor: '#FFC8DC', spritePath: 'art/characters/sakura', feature: 'petals', rarity: 1, },
  { id: 'jade', name: '翡翠绿', unlockCost: 50, bodyColor: '#A3E4D7', midColor: '#7DCEA0', accentColor: '#52BE80', glowColor: '#B7F7D4', eyeColor: '#1A5C3E', blushColor: '#96FFC8', wingColor: '#C8FFDC', spritePath: 'art/characters/jade', feature: 'leafWings', rarity: 2, },
  { id: 'night', name: '暗夜紫', unlockCost: 100, bodyColor: '#C39BD3', midColor: '#A569BD', accentColor: '#7D3C98', glowColor: '#DEC9FF', eyeColor: '#2C1A5C', blushColor: '#C896FF', wingColor: '#DCC8FF', spritePath: 'art/characters/night', feature: 'moonRing', rarity: 2, },
  { id: 'flame', name: '烈焰红', unlockCost: 200, bodyColor: '#FF9A9E', midColor: '#FF6B6B', accentColor: '#EE5A24', glowColor: '#FFC1B8', eyeColor: '#4A1A1A', blushColor: '#FF9696', wingColor: '#FFC8C8', spritePath: 'art/characters/flame', feature: 'flameCrest', rarity: 3, },
  { id: 'bolt', name: '闪电黄', unlockCost: 300, bodyColor: '#FFE97F', midColor: '#FFD23F', accentColor: '#F5A623', glowColor: '#FFF3B0', eyeColor: '#4A3A00', blushColor: '#FFC94D', wingColor: '#FFF0C2', spritePath: 'art/characters/bolt', feature: 'boltMark', rarity: 2, },
  { id: 'candy', name: '软糖豆', unlockCost: 300, bodyColor: '#FF9AA2', midColor: '#FFB7B2', accentColor: '#FFDAC1', glowColor: '#FFE3E0', eyeColor: '#7A3B3B', blushColor: '#FF8FA5', wingColor: '#B5EAD7', spritePath: 'art/characters/candy', feature: 'candySprinkle', rarity: 2, },
  { id: 'astro', name: '小宇航', unlockCost: 400, bodyColor: '#E8F1FF', midColor: '#BFD7FF', accentColor: '#8FA8D8', glowColor: '#E0ECFF', eyeColor: '#25324D', blushColor: '#AFC6EE', wingColor: '#D6E4FF', spritePath: 'art/characters/astro', feature: 'visor', rarity: 3, },
  { id: 'ink', name: '水墨侠', unlockCost: 500, bodyColor: '#F5F5F0', midColor: '#C8C8C0', accentColor: '#4A4A45', glowColor: '#E8E8E2', eyeColor: '#222222', blushColor: '#D8D8D0', wingColor: '#B0B0A8', spritePath: 'art/characters/ink', feature: 'inkBrush', rarity: 4, },
]);

export type SkillId = 'shield' | 'magnet' | 'slowmo' | 'ghost' | 'doubleJump' | 'timeWarp';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  coinCost: number;
  unlockLevel: number;
  cooldownSeconds: number;
  effectSeconds: number;
}

export const SKILLS: ReadonlyArray<SkillDefinition> = Object.freeze([
  { id: 'shield', name: '护盾', icon: '🛡️', description: '抵挡一次掉落伤害并反弹回安全高度', coinCost: 80, unlockLevel: 0, cooldownSeconds: 15, effectSeconds: 0 },
  { id: 'magnet', name: '磁铁', icon: '🧲', description: '3秒内吸引附近星星、金币和羽毛', coinCost: 60, unlockLevel: 0, cooldownSeconds: 20, effectSeconds: 3 },
  { id: 'slowmo', name: '时间减速', icon: '⏳', description: '重力降低50%，持续5秒', coinCost: 100, unlockLevel: 0, cooldownSeconds: 25, effectSeconds: 5 },
  { id: 'ghost', name: '幽灵形态', icon: '👻', description: '4秒内穿过云层，不触发弹跳', coinCost: 120, unlockLevel: 0, cooldownSeconds: 30, effectSeconds: 4 },
  { id: 'doubleJump', name: '二段跳', icon: '🦘', description: '下降时自动追加一次70%高度跳跃', coinCost: 50, unlockLevel: 0, cooldownSeconds: 10, effectSeconds: 0 },
  { id: 'timeWarp', name: '时光倒流', icon: '🌀', description: '回到约3秒前的位置和分数', coinCost: 0, unlockLevel: 3, cooldownSeconds: 45, effectSeconds: 0 },
]);
