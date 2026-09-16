import {
  _decorator, Component, Node, EventKeyboard, EventTouch, input, Input, KeyCode,
  UITransform, Vec3, view, warn,
} from 'cc';
import { GAME, SKILLS, SkillId, levelSpeedScale, levelTargetFor } from '../core/GameConfig';
import { MetaService } from '../core/MetaService';
import { LegacyProgression } from '../core/LegacyProgression';
import { GameData } from '../core/GameData';
import { PlayerController } from './PlayerController';
import { CloudManager } from './CloudManager';
import { CloudPlatform } from './CloudPlatform';
import { CameraRig } from './CameraRig';
import { CollectibleType } from './Collectible';
import { CollectibleManager } from './CollectibleManager';
import { CloudType } from '../core/GameConfig';
import { StorageService } from '../platform/StorageService';
import { PlatformService } from '../platform/PlatformService';
import { AudioManager } from '../core/AudioManager';
import { ProgressionService } from '../core/ProgressionService';
const { ccclass, property } = _decorator;

export type GamePhase = 'idle' | 'playing' | 'paused' | 'gameover' | 'complete';
export interface LandingFeedback {
  type: CloudType;
  combo: number;
  scoreGain: number;
  tempoScale: number;
  position: Vec3;
}

@ccclass('GameManager')
export class GameManager extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property(CloudManager)
  cloudManager: CloudManager | null = null;

  @property(CameraRig)
  cameraRig: CameraRig | null = null;

  @property(CollectibleManager)
  collectibleManager: CollectibleManager | null = null;

  @property(Node)
  touchArea: Node | null = null;

  readonly data = new GameData();
  phase: GamePhase = 'idle';
  onLandingFeedback: ((feedback: LandingFeedback) => void) | null = null;
  onCollectibleFeedback: ((type: CollectibleType, position: Vec3) => void) | null = null;
  onExplosion: ((position: Vec3) => void) | null = null;
  onMilestone: ((score: number, position: Vec3) => void) | null = null;
  onLevelComplete: ((level: number, position: Vec3) => void) | null = null;
  onRunStarted: ((position: Vec3) => void) | null = null;
  onSkillToast: ((message: string) => void) | null = null;
  onSkillStateChanged: (() => void) | null = null;
  onRestartRequested: (() => void) | null = null;
  private viewportWidth = 720;
  private viewportHeight = 1280;
  private previousPlayerY = 0;
  private lastLandedCloud: CloudPlatform | null = null;
  private lastLandingY = 0;
  private touchDirection = 0;
  private escapeHeld = false;
  private restartHeld = false;
  private readonly pressedMovementKeys = new Set<KeyCode>();
  private readonly touchPosition = new Vec3();
  private runPlayTime = 0;
  private recordedPlayTime = 0;
  private nextMilestoneIndex = 0;
  private nextLevelTarget: number = GAME.levelTarget;
  currentLevel = 1;
  // 本关已游玩时长（未缩放），用于开局保护期渐入
  private levelPlayTime = 0;
  private gameTime = 0;
  private shieldActive = false;
  // v2.14 爽感状态：完美连击→暴走、龙卷风、巨型化
  private perfectStreak = 0;
  private surgeRemaining = 0;
  private tornadoRemaining = 0;
  private giantRemaining = 0;
  private mineFuse = -1;
  private readonly minePosition = new Vec3();
  private ghostRemaining = 0;
  private slowmoRemaining = 0;
  private magnetRemaining = 0;
  private featherRemaining = 0;
  private doubleJumpReady = false;
  private readonly cooldownUntil = new Map<SkillId, number>();
  private readonly history: Array<{ age: number; position: Vec3; velocity: Vec3; score: number }> = [];
  private readonly handleAppHide = (): void => this.pause();
  private readonly handleCollected = (type: CollectibleType, position: Vec3): void => this.handleCollectible(type, position);

  onLoad(): void {
    this.refreshViewport();
    this.loadPersistentData();
    input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    PlatformService.onHide(this.handleAppHide);
  }

  start(): void {
    this.validateBindings();
  }

  refreshViewport(): void {
    const visibleSize = view.getVisibleSize();
    if (visibleSize.width > 0 && visibleSize.height > 0) {
      this.viewportWidth = visibleSize.width;
      this.viewportHeight = visibleSize.height * GAME.cameraVisibleHeight;
      return;
    }
    const transform = this.touchArea?.getComponent(UITransform);
    if (transform) {
      this.viewportWidth = transform.contentSize.width;
      this.viewportHeight = transform.contentSize.height * GAME.cameraVisibleHeight;
    }
  }

  onDestroy(): void {
    this.flushRunProgress();
    input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    PlatformService.offHide(this.handleAppHide);
  }

  startRun(): void {
    this.prepareRun();
    this.beginPreparedRun();
  }

  prepareRun(resetLevel = false): void {
    if (!this.player || !this.cloudManager) return;
    if (resetLevel) this.currentLevel = 1;
    this.data.resetRun();
    this.lastLandedCloud = null;
    this.lastLandingY = 0;
    this.phase = 'idle';
    this.runPlayTime = 0;
    this.recordedPlayTime = 0;
    this.nextMilestoneIndex = 0;
    this.nextLevelTarget = levelTargetFor(this.currentLevel);
    this.levelPlayTime = 0;
    this.perfectStreak = 0;
    this.surgeRemaining = 0;
    this.tornadoRemaining = 0;
    this.giantRemaining = 0;
    this.player?.setGiant(false);
    this.gameTime = 0;
    this.shieldActive = false;
    this.ghostRemaining = 0;
    this.slowmoRemaining = 0;
    this.magnetRemaining = 0;
    this.featherRemaining = 0;
    this.doubleJumpReady = false;
    this.cooldownUntil.clear();
    this.history.length = 0;
    this.resetInputState();
    this.player.reset(new Vec3(0, -260, 0));
    this.player.setTempoScale(1);
    this.player.setSkinIndex(this.data.selectedSkin);
    this.player.setGhostVisual(false);
    this.collectibleManager?.reset();
    this.cloudManager.reset(this.viewportWidth, -330);
    this.previousPlayerY = this.player.node.position.y;
    this.cameraRig?.reset();
  }

  beginPreparedRun(): void {
    if (!this.player || !this.cloudManager || this.phase !== 'idle') return;
    this.phase = 'playing';
    this.applyCombinedInput();
    // v2.15 连败保护：连败 2 次后下一局自带一次护盾（不外显原因）
    if (MetaService.getDefeatStreak() >= 2) {
      this.shieldActive = true;
      this.onSkillToast?.('🛡️ 护盾云已就位');
    }
    this.cloudManager.ddaRelief = MetaService.ddaActive(this.currentLevel);
    this.player.jump();
    ProgressionService.recordGameStarted();
    ProgressionService.recordJump();
    AudioManager.playSound('jump');
    this.onRunStarted?.(this.player.node.position.clone());
  }

  returnToHome(): void {
    this.flushRunProgress();
    this.phase = 'idle';
    this.lastLandedCloud = null;
    this.resetComboTempo();
    this.resetInputState();
  }

  pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.player?.setInputDirection(0);
    }
  }

  resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.applyCombinedInput();
    }
  }

  update(dt: number): void {
    if (this.phase !== 'playing' || !this.player || !this.cloudManager) return;
    // v2.13 关卡节奏：逐关时间加速（直接满速开局）
    // v2.15 隐藏 DDA：同关连败 3 次后小幅降速（绝不外显）
    const speed = levelSpeedScale(this.currentLevel) * (MetaService.ddaActive(this.currentLevel) ? 0.92 : 1);
    let remaining = Math.min(Math.max(0, dt * speed), GAME.physicsMaxFrameDelta * Math.max(1, speed));
    while (remaining > 0 && this.phase === 'playing') {
      const step = Math.min(remaining, GAME.physicsMaxStep);
      this.simulateStep(step);
      remaining -= step;
    }
  }

  private simulateStep(dt: number): void {
    if (!this.player || !this.cloudManager) return;
    this.gameTime += dt;
    this.runPlayTime += dt;
    this.previousPlayerY = this.player.node.position.y;
    this.updateSkills(dt);
    if (this.tornadoRemaining > 0) {
      this.tornadoRemaining = Math.max(0, this.tornadoRemaining - dt);
      this.player.velocity.y = GAME.tornadoRiseSpeed;
    }
    if (this.surgeRemaining > 0) this.surgeRemaining = Math.max(0, this.surgeRemaining - dt);
    if (this.giantRemaining > 0) {
      this.giantRemaining = Math.max(0, this.giantRemaining - dt);
      if (this.giantRemaining === 0) this.player.setGiant(false);
    }
    if (this.mineFuse >= 0) {
      this.mineFuse -= dt;
      if (this.mineFuse < 0) this.explodeMine();
    }
    this.saveHistory(dt);
    this.player.simulate(dt, this.viewportWidth, this.slowmoRemaining > 0 ? 0.5 : 1);
    if (this.featherRemaining > 0 && this.player.velocity.y < 0) {
      this.player.velocity.y *= Math.pow(GAME.featherFallDampingPerFrame, dt * GAME.legacyReferenceFps);
      this.featherRemaining = Math.max(0, this.featherRemaining - dt);
    }
    if (this.doubleJumpReady && this.player.velocity.y < 0) {
      this.doubleJumpReady = false;
      this.player.jump(0.7, this.data.combo);
      ProgressionService.recordJump();
      this.onSkillToast?.('🦘 二段跳!');
    }
    const landed = this.ghostRemaining <= 0 && this.tornadoRemaining <= 0 && this.resolveLanding();
    if (
      !landed
      && this.lastLandedCloud
      && this.player.velocity.y < -GAME.comboResetFallSpeed
      && this.player.node.position.y + this.player.radius < this.lastLandingY - GAME.comboMissDropDistance
    ) {
      this.lastLandedCloud = null;
      this.resetComboTempo();
    }
    this.collectibleManager?.collectTouching(this.player, this.handleCollected);
    if (this.magnetRemaining > 0) {
      this.collectibleManager?.attractTowards(
        this.player.node.position,
        GAME.magnetRadius,
        GAME.magnetSpeed,
        dt,
      );
    }

    const cameraY = this.cameraRig?.node.position.y ?? 0;
    this.cloudManager.ensureAhead(cameraY + this.viewportHeight * 0.85, this.viewportWidth);
    this.cloudManager.cleanup(cameraY - this.viewportHeight * 0.75);
    this.collectibleManager?.cleanup(cameraY - this.viewportHeight * 0.75);

    this.data.heightMeters = Math.max(this.data.heightMeters, Math.floor((this.player.node.position.y + 260) * 0.18));
    if (this.player.node.position.y < cameraY - this.viewportHeight * GAME.deathLineRatio - GAME.deathMargin) {
      if (this.shieldActive) {
        this.shieldActive = false;
        this.lastLandedCloud = null;
        this.resetComboTempo();
        this.player.node.setPosition(this.player.node.position.x, cameraY - this.viewportHeight * 0.1, 0);
        this.player.velocity.set(0, GAME.shieldBounceVelocity, 0);
        this.onSkillToast?.('🛡️ 护盾触发!');
      } else this.finishRun();
    }
  }

  addCoin(amount = 1): void {
    this.data.runCoins += amount;
    this.data.totalCoins += amount;
    StorageService.setNumber('cloudBounceCoins', this.data.totalCoins);
    ProgressionService.recordCoin(amount);
  }

  addStar(amount = 1): void {
    this.data.stars += amount;
    this.data.score += 10 * amount * (this.surgeRemaining > 0 ? GAME.surgeScoreMultiplier : 1);
    MetaService.addDailyStars(amount);
    ProgressionService.recordStar(amount);
    this.checkProgressFeedback();
  }

  useSkill(id: SkillId): boolean {
    MetaService.recordSkillUsed();
    const definition = SKILLS.find((skill) => skill.id === id);
    const unavailable = this.getSkillUnavailableReason(id);
    if (!definition || unavailable) {
      this.onSkillToast?.(unavailable ?? '技能不存在');
      return false;
    }
    const skills = LegacyProgression.loadSkills();
    const entry = skills[id];
    entry.uses -= 1;
    LegacyProgression.saveSkills(skills);
    this.cooldownUntil.set(id, this.gameTime + definition.cooldownSeconds);
    if (id === 'shield') this.shieldActive = true;
    else if (id === 'magnet') this.magnetRemaining = definition.effectSeconds;
    else if (id === 'slowmo') this.slowmoRemaining = definition.effectSeconds;
    else if (id === 'ghost') {
      this.ghostRemaining = definition.effectSeconds;
      this.player?.setGhostVisual(true);
    } else if (id === 'doubleJump') this.doubleJumpReady = true;
    else this.rewind();
    this.onSkillToast?.(`${definition.icon} ${definition.name} 激活!`);
    this.onSkillStateChanged?.();
    return true;
  }

  getSkillCooldown(id: SkillId): number {
    return Math.max(0, (this.cooldownUntil.get(id) ?? 0) - this.gameTime);
  }

  getSkillUnavailableReason(id: SkillId): string | null {
    const definition = SKILLS.find((skill) => skill.id === id);
    if (!definition) return '技能不存在';
    if (this.phase === 'paused') return '游戏已暂停，请先关闭设置或继续游戏';
    if (this.phase !== 'playing') return this.phase === 'complete' ? '关卡已完成' : '技能只能在游戏中使用';
    const entry = LegacyProgression.loadSkills()[id];
    if (!entry.owned) return `${definition.name}尚未购买`;
    if (entry.uses <= 0) return `${definition.name}本局可用次数已耗尽`;
    const cooldown = this.getSkillCooldown(id);
    if (cooldown > 0) return `${definition.name}冷却中（${Math.ceil(cooldown)}秒）`;
    if (id === 'shield' && this.shieldActive) return '护盾已经生效';
    if (id === 'doubleJump' && this.doubleJumpReady) return '二段跳已经待命';
    if (id === 'timeWarp' && this.history.length === 0) return '暂无可回溯记录';
    return null;
  }

  private resolveLanding(): boolean {
    if (!this.player || !this.cloudManager || this.player.velocity.y > 0) return false;
    const currentY = this.player.node.position.y;
    const previousBottom = this.previousPlayerY - this.player.radius;
    const currentBottom = currentY - this.player.radius;
    const px = this.player.node.position.x;

    for (const cloud of this.cloudManager.clouds) {
      if (cloud.broken || !cloud.node.active) continue;
      const top = cloud.node.position.y + cloud.height * 0.5;
      const halfW = cloud.width * 0.5;
      const crossesTop = previousBottom >= top && currentBottom <= top;
      const insideX = px + this.player.radius * 0.65 >= cloud.node.position.x - halfW && px - this.player.radius * 0.65 <= cloud.node.position.x + halfW;
      if (!crossesTop || !insideX) continue;

      this.player.node.setPosition(px, top + this.player.radius, 0);
      const continuesCombo = cloud !== this.lastLandedCloud;
      const perfect = Math.abs(px - cloud.node.position.x) <= cloud.width * 0.5 * GAME.perfectZoneRatio;
      let scoreGain = this.data.registerLanding(continuesCombo);
      if (perfect) {
        this.perfectStreak += 1;
        this.data.score += GAME.surgeScoreBonus;
        scoreGain += GAME.surgeScoreBonus;
        if (this.perfectStreak >= GAME.surgePerfectStreak && this.surgeRemaining <= 0) {
          this.surgeRemaining = GAME.surgeSeconds;
          this.perfectStreak = 0;
          this.onSkillToast?.('☁️ 连续完美落点，云暴走！得分翻倍');
          AudioManager.playSound('milestone');
        }
      } else {
        this.perfectStreak = 0;
      }
      if (this.surgeRemaining > 0) {
        this.data.score += scoreGain * (GAME.surgeScoreMultiplier - 1);
        scoreGain *= GAME.surgeScoreMultiplier;
      }
      this.lastLandedCloud = cloud;
      this.lastLandingY = top;
      const tempoScale = Math.min(
        GAME.comboTempoMax,
        1 + Math.max(0, this.data.combo - 1) * GAME.comboTempoStep,
      );
      this.player.setTempoScale(tempoScale);
      this.cameraRig?.setComboFollowScale(Math.min(
        GAME.comboCameraFollowMax,
        1 + Math.max(0, this.data.combo - 1) * GAME.comboCameraFollowStep,
      ));
      cloud.playLandingBounce(cloud.type === 'spring');
      this.player.jump(cloud.type === 'spring' ? GAME.springJumpMultiplier : 1, this.data.combo);
      ProgressionService.recordLanding();
      ProgressionService.recordJump();
      AudioManager.playSound(cloud.type === 'spring' ? 'spring' : 'jump');
      if (cloud.type === 'fragile') cloud.breakApart();
      if (this.data.combo >= 5) {
        AudioManager.playSound('combo');
      }
      this.onLandingFeedback?.({
        type: cloud.type,
        combo: this.data.combo,
        scoreGain,
        tempoScale,
        position: new Vec3(px, top, 0),
      });
      this.checkProgressFeedback();
      PlatformService.vibrateShort();
      return true;
    }
    return false;
  }

  private handleCollectible(type: CollectibleType, position: Vec3): void {
    if (type === 'coin') this.addCoin();
    else if (type === 'star') this.addStar();
    else if (type === 'tornado') {
      this.tornadoRemaining = GAME.tornadoDuration;
      this.onSkillToast?.('🌪️ 龙卷风！扶摇直上');
    } else if (type === 'giant') {
      this.giantRemaining = GAME.giantDuration;
      this.player?.setGiant(true);
      this.onSkillToast?.('🟣 巨型化！落点更宽');
    } else if (type === 'mine') {
      this.armMine(position);
    } else this.featherRemaining = GAME.featherGlideDuration;
    this.onCollectibleFeedback?.(type, position);
    AudioManager.playSound(type === 'coin' || type === 'star' ? type : 'star');
  }

  // 地雷：踩中点燃引信，0.9s 后爆炸（护盾期被炸会被弹开而非坠落）
  private armMine(position: Vec3): void {
    if (this.mineFuse >= 0) return;
    if (Math.random() < GAME.mineDudChance) {
      this.onSkillToast?.('💧 哑弹…好险');
      return;
    }
    this.mineFuse = GAME.mineFuseSeconds;
    this.minePosition.set(position);
    this.onSkillToast?.('💥 地雷！快弹离');
    AudioManager.playSound('ui');
  }

  private explodeMine(): void {
    this.mineFuse = -1;
    this.onExplosion?.(this.minePosition.clone());
    AudioManager.playSound('explode');
    const range = GAME.cloudGap * 1.6;
    for (const cloud of this.cloudManager.clouds) {
      if (cloud.broken || !cloud.node.active) continue;
      if (Math.abs(cloud.node.position.y - this.minePosition.y) <= range) {
        cloud.breakApart();
        cloud.broken = true;
      }
    }
    if (this.player && Math.abs(this.player.node.position.y - this.minePosition.y) <= range * 1.2) {
      if (this.shieldActive) {
        this.shieldActive = false;
        this.player.velocity.y = GAME.shieldBounceVelocity;
        this.onSkillToast?.('🛡️ 护盾抵住爆炸！');
      } else {
        this.player.velocity.y = -260;
      }
    }
  }

  private finishRun(): void {
    this.phase = 'gameover';
    this.lastLandedCloud = null;
    this.resetComboTempo();
    const stats = this.data.snapshot();
    this.flushRunProgress();
    ProgressionService.recordRunResult(stats);
    MetaService.recordDeath(this.currentLevel);
    MetaService.addWeeklyScore(stats.score);
    MetaService.recordRunScore(Math.floor(stats.score));
    this.data.bestScore = Math.max(this.data.bestScore, stats.score);
    StorageService.setNumber('cloudBounceBest', this.data.bestScore);
    StorageService.setNumber('cloudBounceCoins', this.data.totalCoins);
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    ranking.push(stats.score);
    ranking.sort((a, b) => b - a);
    StorageService.setJSON('cloudBounceRanking', ranking.slice(0, 10));
    AudioManager.playSound('gameOver');
  }

  private checkProgressFeedback(): void {
    if (!this.player) return;
    while (this.nextMilestoneIndex < GAME.milestones.length && this.data.score >= GAME.milestones[this.nextMilestoneIndex]) {
      const milestone = GAME.milestones[this.nextMilestoneIndex];
      this.nextMilestoneIndex += 1;
      this.onMilestone?.(milestone, this.player.node.position.clone());
      AudioManager.playSound('milestone');
    }
    if (this.phase === 'playing' && this.data.score >= this.nextLevelTarget) this.completeLevel();
  }

  continueNextLevel(): void {
    if (this.phase !== 'complete') return;
    this.currentLevel += 1;
    this.startRun();
  }

  private completeLevel(): void {
    this.phase = 'complete';
    MetaService.addCompletedLevel();
    MetaService.resetDefeatStreak();
    this.data.totalCoins += GAME.levelRewardCoins;
    StorageService.setNumber('cloudBounceCoins', this.data.totalCoins);
    this.onLevelComplete?.(this.currentLevel, this.player?.node.position.clone() ?? Vec3.ZERO);
    this.resetInputState();
  }

  private updateSkills(dt: number): void {
    this.magnetRemaining = Math.max(0, this.magnetRemaining - dt);
    this.slowmoRemaining = Math.max(0, this.slowmoRemaining - dt);
    const wasGhost = this.ghostRemaining > 0;
    this.ghostRemaining = Math.max(0, this.ghostRemaining - dt);
    if (wasGhost && this.ghostRemaining === 0) this.player?.setGhostVisual(false);
  }

  private saveHistory(dt: number): void {
    for (const entry of this.history) entry.age += dt;
    this.history.push({ age: 0, position: this.player?.node.position.clone() ?? Vec3.ZERO, velocity: this.player?.velocity.clone() ?? Vec3.ZERO, score: this.data.score });
    while (this.history.length > 0 && this.history[0].age > 3.1) this.history.shift();
  }

  private rewind(): void {
    if (!this.player || this.history.length === 0) return;
    const entry = this.history.find((value) => value.age >= 2.9) ?? this.history[0];
    this.player.node.setPosition(entry.position);
    this.player.velocity.set(entry.velocity);
    this.data.score = entry.score;
  }

  private resetComboTempo(): void {
    this.data.resetCombo();
    this.player?.setTempoScale(1);
    this.cameraRig?.setComboFollowScale(1);
  }

  private flushRunProgress(): void {
    const delta = Math.max(0, this.runPlayTime - this.recordedPlayTime);
    if (delta > 0) {
      ProgressionService.recordPlayTime(delta);
      this.recordedPlayTime = this.runPlayTime;
    }
  }

  private loadPersistentData(): void {
    this.data.bestScore = StorageService.getNumber('cloudBounceBest', 0);
    this.data.totalCoins = StorageService.getNumber('cloudBounceCoins', 0);
    this.data.selectedSkin = StorageService.getNumber('cloudBounceSkin', 0);
  }

  private onTouchStart(event: EventTouch): void {
    this.applyTouch(event);
  }

  private onTouchMove(event: EventTouch): void {
    this.applyTouch(event);
  }

  private onTouchEnd(): void {
    this.touchDirection = 0;
    this.applyCombinedInput();
  }

  private applyTouch(event: EventTouch): void {
    if (this.phase !== 'playing' || !this.player) return;
    const location = event.getUILocation();
    const transform = this.touchArea?.getComponent(UITransform);
    if (!transform) {
      this.touchDirection = location.x < this.viewportWidth * 0.5 ? -1 : 1;
      this.applyCombinedInput();
      return;
    }
    this.touchPosition.set(location.x, location.y, 0);
    const local = transform.convertToNodeSpaceAR(this.touchPosition);
    this.touchDirection = local.x < 0 ? -1 : 1;
    this.applyCombinedInput();
  }

  private onKeyDown(event: EventKeyboard): void {
    const code = event.keyCode;
    if (this.isMovementKey(code)) {
      this.pressedMovementKeys.add(code);
      this.applyCombinedInput();
      return;
    }
    if ((code === KeyCode.ESCAPE || code === KeyCode.KEY_P) && !this.escapeHeld) {
      this.escapeHeld = true;
      if (this.phase === 'playing') this.pause();
      else if (this.phase === 'paused') this.resume();
      return;
    }
    if (code === KeyCode.KEY_R && !this.restartHeld) {
      this.restartHeld = true;
      if (this.phase === 'gameover') this.onRestartRequested?.();
    }
    const skillKeys: Partial<Record<KeyCode, SkillId>> = {
      [KeyCode.DIGIT_1]: 'shield', [KeyCode.DIGIT_2]: 'magnet', [KeyCode.DIGIT_3]: 'slowmo',
      [KeyCode.DIGIT_4]: 'ghost', [KeyCode.DIGIT_5]: 'doubleJump', [KeyCode.DIGIT_6]: 'timeWarp',
    };
    const skillId = skillKeys[code];
    if (skillId) this.useSkill(skillId);
  }

  private onKeyUp(event: EventKeyboard): void {
    const code = event.keyCode;
    if (this.isMovementKey(code)) {
      this.pressedMovementKeys.delete(code);
      this.applyCombinedInput();
    }
    if (code === KeyCode.ESCAPE || code === KeyCode.KEY_P) this.escapeHeld = false;
    if (code === KeyCode.KEY_R) this.restartHeld = false;
  }

  private isMovementKey(code: KeyCode): boolean {
    return code === KeyCode.KEY_A || code === KeyCode.ARROW_LEFT
      || code === KeyCode.KEY_D || code === KeyCode.ARROW_RIGHT;
  }

  private applyCombinedInput(): void {
    if (!this.player || this.phase !== 'playing') {
      this.player?.setInputDirection(0);
      return;
    }
    const left = this.pressedMovementKeys.has(KeyCode.KEY_A) || this.pressedMovementKeys.has(KeyCode.ARROW_LEFT);
    const right = this.pressedMovementKeys.has(KeyCode.KEY_D) || this.pressedMovementKeys.has(KeyCode.ARROW_RIGHT);
    const keyboardDirection = (right ? 1 : 0) - (left ? 1 : 0);
    this.player.setInputDirection(keyboardDirection !== 0 ? keyboardDirection : this.touchDirection);
  }

  private resetInputState(): void {
    this.touchDirection = 0;
    this.pressedMovementKeys.clear();
    this.escapeHeld = false;
    this.restartHeld = false;
    this.player?.setInputDirection(0);
  }

  private validateBindings(): void {
    const missing: string[] = [];
    if (!this.player) missing.push('player');
    if (!this.cloudManager) missing.push('cloudManager');
    if (!this.cameraRig) missing.push('cameraRig');
    if (!this.collectibleManager) missing.push('collectibleManager');
    if (!this.touchArea) missing.push('touchArea');
    if (missing.length > 0) {
      warn(`[GameManager] 场景引用未绑定：${missing.join(', ')}`);
    }
  }
}
