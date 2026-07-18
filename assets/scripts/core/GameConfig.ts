export const GAME = Object.freeze({
  version: '2.7.0',
  // 垂直速度乘 tempoScale、重力乘 tempoScale²，可缩短腾空时间并基本保持跳跃高度。
  tempoScale: 1.14,
  gravity: 1800,
  jumpVelocity: 840,
  horizontalSpeed: 360,
  horizontalAcceleration: 1800,
  horizontalDamping: 0.90,
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
  cameraLineRatio: 0.40,
  cameraFollowRate: 3.9,
  springCameraLag: 0.18,
  springCameraCatch: 0.26,
  deathMargin: 180,
  levelTarget: 200,
  springJumpMultiplier: 1.75,
  comboTimeout: 2.8,
  coinSpawnChance: 0.28,
  starSpawnChance: 0.10,
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
