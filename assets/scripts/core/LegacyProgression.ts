import { SKILLS, SkillId } from './GameConfig';
import { StorageService } from '../platform/StorageService';

export interface SkillSaveEntry {
  unlocked: boolean;
  owned: boolean;
  uses: number;
  maxUses: number;
  level: number;
}

export type SkillSaveData = Record<SkillId, SkillSaveEntry>;

const SKILL_KEY = 'cloudBounceSkills';
const ACTIVE_KEY = 'cloudBounceActiveSkills';

export class LegacyProgression {
  static loadSkills(): SkillSaveData {
    const defaults = this.defaults();
    const saved = StorageService.getJSON<Partial<SkillSaveData>>(SKILL_KEY, {});
    for (const skill of SKILLS) {
      const value = saved[skill.id];
      if (!value) continue;
      defaults[skill.id] = {
        unlocked: Boolean(value.unlocked),
        owned: Boolean(value.owned),
        uses: this.safe(value.uses),
        maxUses: Math.max(1, this.safe(value.maxUses, 1)),
        level: this.safe(value.level),
      };
    }
    return defaults;
  }

  static saveSkills(data: SkillSaveData): void {
    StorageService.setJSON(SKILL_KEY, data);
  }

  static loadActiveSkills(): SkillId[] {
    const saved = StorageService.getJSON<unknown[]>(ACTIVE_KEY, ['shield', 'magnet']);
    return saved.filter((id): id is SkillId => SKILLS.some((skill) => skill.id === id)).slice(0, 3);
  }

  static saveActiveSkills(ids: SkillId[]): void {
    StorageService.setJSON(ACTIVE_KEY, ids.slice(0, 3));
  }

  static buySkill(id: SkillId, currentCoins: number, currentLevel = 1): { bought: boolean; coins: number; reason: string } {
    const definition = SKILLS.find((skill) => skill.id === id);
    if (!definition) return { bought: false, coins: currentCoins, reason: '技能不存在' };
    const data = this.loadSkills();
    const entry = data[id];
    if (entry.owned) return { bought: false, coins: currentCoins, reason: '已经拥有' };
    if (currentLevel < definition.unlockLevel) return { bought: false, coins: currentCoins, reason: `通关 ${definition.unlockLevel} 关后解锁` };
    if (currentCoins < definition.coinCost) return { bought: false, coins: currentCoins, reason: `需要 ${definition.coinCost} 金币` };
    entry.unlocked = true;
    entry.owned = true;
    entry.uses = entry.maxUses;
    this.saveSkills(data);
    return { bought: true, coins: currentCoins - definition.coinCost, reason: `${definition.name} 已购买` };
  }

  static toggleActive(id: SkillId): { active: SkillId[]; reason: string } {
    const data = this.loadSkills();
    if (!data[id].owned) return { active: this.loadActiveSkills(), reason: '请先购买技能' };
    const active = this.loadActiveSkills();
    const index = active.indexOf(id);
    if (index >= 0) active.splice(index, 1);
    else if (active.length >= 3) return { active, reason: '最多同时装备3个技能' };
    else active.push(id);
    this.saveActiveSkills(active);
    return { active, reason: index >= 0 ? '已卸下' : '已装备' };
  }

  private static defaults(): SkillSaveData {
    return {
      shield: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
      magnet: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
      slowmo: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
      ghost: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
      doubleJump: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
      timeWarp: { unlocked: false, owned: false, uses: 0, maxUses: 1, level: 0 },
    };
  }

  private static safe(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
  }
}
