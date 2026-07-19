export const GAME = Object.freeze({
  version: '2.8.0',
  // v2.8.0 手感基线：更长的腾空观察时间，水平输入快速响应且松手后短暂收束。
  tempoScale: 1,
  gravity: 1500,
  jumpVelocity: 920,
  horizontalSpeed: 380,
  horizontalAcceleration: 2600,
  horizontalDamping: 0.84,
  playerRadius: 34,
  uiScale: 0.82,
  accessibilityUiScale: 1.18,
  playerVisualScale: 0.88,
  cloudVisualScale: 0.88,
  collisionScale: 1,
  cameraVisibleHeight: 1.20,
  cloudWidth: 144,
  cloudHeight: 42,
  cloudGap: 130,
  cameraLineRatio: 0.41,
  cameraFollowRate: 3.15,
  cameraMaxFollowSpeed: 560,
  springCameraLag: 0.16,
  springCameraCatch: 0.34,
  springCameraLagRate: 1.9,
  springCameraCatchRate: 4.8,
  dashCameraLag: 0.12,
  dashCameraCatch: 0.42,
  dashCameraCatchRate: 5.2,
  deathMargin: 180,
  levelTarget: 200,
  springJumpMultiplier: 1.62,
  comboTimeout: 2.8,
  precisionLandingRatio: 0.18,
  precisionLandingReward: 1,
  comboDash8SpeedMultiplier: 1.30,
  comboDash8Duration: 0.32,
  comboDash8ExitMultiplier: 1.08,
  comboDash12SpeedMultiplier: 1.55,
  comboDash12Duration: 0.42,
  comboDash12ExitMultiplier: 1.12,
  comboDashGravityScale: 0.45,
  effectTrailPoolSize: 24,
  effectParticlePoolSize: 128,
  effectFloatTextPoolSize: 12,
  coinSpawnChance: 0.28,
  starSpawnChance: 0.10,
  milestones: Object.freeze([50, 100, 200, 500, 1000, 2000, 5000]),
});

export type CloudType = 'normal' | 'spring' | 'fragile' | 'moving';

export interface SkinDefinition {
  id: string;
  name: string;
  unlockCost: number;
  bodyColor: string;
  accentColor: string;
  glowColor: string;
  spritePath: string;
}

export const SKINS: ReadonlyArray<SkinDefinition> = Object.freeze([
  { id: 'sunny', name: '小太阳', unlockCost: 0, bodyColor: '#FFE066', accentColor: '#FF9F1C', glowColor: '#FFD166', spritePath: 'art/characters/sunny' },
  { id: 'ice', name: '冰晶蓝', unlockCost: 0, bodyColor: '#9BE7FF', accentColor: '#4DABF7', glowColor: '#C8F4FF', spritePath: 'art/characters/ice' },
  { id: 'sakura', name: '樱花粉', unlockCost: 0, bodyColor: '#FFB3C6', accentColor: '#FB6F92', glowColor: '#FFD6E0', spritePath: 'art/characters/sakura' },
  { id: 'jade', name: '翡翠绿', unlockCost: 50, bodyColor: '#A3E4D7', accentColor: '#52BE80', glowColor: '#B7F7D4', spritePath: 'art/characters/jade' },
  { id: 'night', name: '暗夜紫', unlockCost: 100, bodyColor: '#C39BD3', accentColor: '#7D3C98', glowColor: '#DEC9FF', spritePath: 'art/characters/night' },
  { id: 'flame', name: '烈焰红', unlockCost: 200, bodyColor: '#FF9A9E', accentColor: '#EE5A24', glowColor: '#FFC1B8', spritePath: 'art/characters/flame' },
]);
