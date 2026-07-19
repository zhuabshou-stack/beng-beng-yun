import {
  _decorator, Component, Node, EventKeyboard, EventTouch, input, Input, KeyCode,
  UITransform, Vec3, isValid, view, warn,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { GameData } from '../core/GameData';
import { PlayerController } from './PlayerController';
import { CloudManager } from './CloudManager';
import { CloudPlatform } from './CloudPlatform';
import { CameraRig } from './CameraRig';
import { CollectibleType } from './Collectible';
import { CollectibleManager } from './CollectibleManager';
import { CloudType } from '../core/GameConfig';
import { StorageService } from '../platform/StorageService';
import { DouyinBridge } from '../platform/DouyinBridge';
import { AudioManager } from '../core/AudioManager';
import { ProgressionService } from '../core/ProgressionService';
const { ccclass, property } = _decorator;

export type GamePhase = 'idle' | 'playing' | 'paused' | 'gameover' | 'complete';
export interface LandingFeedback {
  type: CloudType;
  combo: number;
  scoreGain: number;
  precise: boolean;
  repeated: boolean;
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
  onDashFeedback: ((tier: 8 | 12, position: Vec3) => void) | null = null;
  onMilestone: ((score: number, position: Vec3) => void) | null = null;
  onLevelComplete: ((level: number, position: Vec3) => void) | null = null;
  onRunStarted: ((position: Vec3) => void) | null = null;
  onRestartRequested: (() => void) | null = null;
  private viewportWidth = 720;
  private viewportHeight = 1280;
  private previousPlayerY = 0;
  private comboTimeRemaining = 0;
  private lastLandedCloud: CloudPlatform | null = null;
  private touchDirection = 0;
  private escapeHeld = false;
  private restartHeld = false;
  private readonly pressedMovementKeys = new Set<KeyCode>();
  private readonly touchPosition = new Vec3();
  private runPlayTime = 0;
  private recordedPlayTime = 0;
  private nextMilestoneIndex = 0;
  private nextLevelTarget = GAME.levelTarget;
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
    DouyinBridge.onHide(this.handleAppHide);
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
    DouyinBridge.offHide(this.handleAppHide);
  }

  startRun(): void {
    this.prepareRun();
    this.beginPreparedRun();
  }

  prepareRun(): void {
    if (!this.player || !this.cloudManager) return;
    this.data.resetRun();
    this.comboTimeRemaining = 0;
    this.lastLandedCloud = null;
    this.phase = 'idle';
    this.runPlayTime = 0;
    this.recordedPlayTime = 0;
    this.nextMilestoneIndex = 0;
    this.nextLevelTarget = GAME.levelTarget;
    this.resetInputState();
    this.player.reset(new Vec3(0, -260, 0));
    this.collectibleManager?.reset();
    this.cloudManager.reset(this.viewportWidth, -330);
    this.previousPlayerY = this.player.node.position.y;
    this.cameraRig?.reset();
  }

  beginPreparedRun(): void {
    if (!this.player || !this.cloudManager || this.phase !== 'idle') return;
    this.phase = 'playing';
    this.applyCombinedInput();
    this.player.jump();
    ProgressionService.recordGameStarted();
    ProgressionService.recordJump();
    AudioManager.playSound('jump');
    this.onRunStarted?.(this.player.node.position.clone());
  }

  returnToHome(): void {
    this.flushRunProgress();
    this.phase = 'idle';
    this.comboTimeRemaining = 0;
    this.lastLandedCloud = null;
    this.data.resetCombo();
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
    const clampedDt = Math.min(dt, 1 / 30);
    this.runPlayTime += clampedDt;
    this.previousPlayerY = this.player.node.position.y;
    this.player.simulate(clampedDt, this.viewportWidth);
    this.resolveLanding();
    this.updateComboTimer(clampedDt);
    this.collectibleManager?.collectTouching(this.player, this.handleCollected);

    const cameraY = this.cameraRig?.node.position.y ?? 0;
    this.cloudManager.ensureAhead(cameraY + this.viewportHeight * 0.85, this.viewportWidth);
    this.cloudManager.cleanup(cameraY - this.viewportHeight * 0.75);
    this.collectibleManager?.cleanup(cameraY - this.viewportHeight * 0.75);

    this.data.heightMeters = Math.max(this.data.heightMeters, Math.floor((this.player.node.position.y + 260) * 0.18));
    if (this.player.node.position.y < cameraY - this.viewportHeight * 0.65 - GAME.deathMargin) this.finishRun();
  }

  addCoin(amount = 1): void {
    this.data.runCoins += amount;
    this.data.totalCoins += amount;
    StorageService.setNumber('cloudBounceCoins', this.data.totalCoins);
    ProgressionService.recordCoin(amount);
  }

  addStar(amount = 1): void {
    this.data.stars += amount;
    this.data.score += 10 * amount;
    ProgressionService.recordStar(amount);
    this.checkProgressFeedback();
  }

  private resolveLanding(): void {
    if (!this.player || !this.cloudManager || this.player.velocity.y > 0) return;
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
      const repeatsSameCloud = this.lastLandedCloud === cloud && this.comboTimeRemaining > 0;
      let scoreGain = 0;
      if (repeatsSameCloud) {
        // 同一朵云不增加连击，也不刷新倒计时；基础落地分仍保留。
        scoreGain = this.data.registerRepeatLanding();
      } else {
        const continuesCombo = this.lastLandedCloud !== null && this.comboTimeRemaining > 0;
        scoreGain = this.data.registerLanding(continuesCombo);
        this.lastLandedCloud = cloud;
        this.comboTimeRemaining = GAME.comboTimeout;
      }
      const distanceFromCenter = Math.abs(px - cloud.node.position.x);
      const precise = !repeatsSameCloud && distanceFromCenter <= halfW * GAME.precisionLandingRatio;
      if (precise) {
        scoreGain += GAME.precisionLandingReward;
        this.data.score += GAME.precisionLandingReward;
      }
      cloud.playLandingBounce(cloud.type === 'spring');
      this.player.jump(cloud.type === 'spring' ? GAME.springJumpMultiplier : 1);
      ProgressionService.recordLanding();
      ProgressionService.recordJump();
      AudioManager.playSound(cloud.type === 'spring' ? 'spring' : 'jump');
      if (cloud.type === 'spring') this.cameraRig?.notifySpringBounce();
      if (cloud.type === 'fragile') {
        this.scheduleOnce(() => {
          if (isValid(cloud.node, true)) cloud.breakApart();
        }, 0.18);
      }
      if (!repeatsSameCloud && (this.data.combo === 8 || this.data.combo === 12)) {
        const tier = this.data.combo as 8 | 12;
        this.player.startComboDash(tier);
        this.cameraRig?.notifyDash();
        this.onDashFeedback?.(tier, this.player.node.position.clone());
        AudioManager.playSound('dash');
      } else if (this.data.combo >= 5 && !repeatsSameCloud) {
        AudioManager.playSound('combo');
      }
      this.onLandingFeedback?.({ type: cloud.type, combo: this.data.combo, scoreGain, precise, repeated: repeatsSameCloud, position: new Vec3(px, top, 0) });
      this.checkProgressFeedback();
      DouyinBridge.vibrateShort();
      break;
    }
  }

  private updateComboTimer(dt: number): void {
    if (this.data.combo <= 0) return;
    this.comboTimeRemaining -= dt;
    if (this.comboTimeRemaining > 0) return;
    this.comboTimeRemaining = 0;
    this.lastLandedCloud = null;
    this.data.resetCombo();
  }

  private handleCollectible(type: CollectibleType, position: Vec3): void {
    if (type === 'coin') this.addCoin();
    else this.addStar();
    this.onCollectibleFeedback?.(type, position);
    AudioManager.playSound(type);
  }

  private finishRun(): void {
    this.phase = 'gameover';
    this.comboTimeRemaining = 0;
    this.lastLandedCloud = null;
    this.data.resetCombo();
    const stats = this.data.snapshot();
    this.flushRunProgress();
    ProgressionService.recordRunResult(stats);
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
    while (this.data.score >= this.nextLevelTarget) {
      const level = Math.floor(this.nextLevelTarget / GAME.levelTarget);
      this.onLevelComplete?.(level, this.player.node.position.clone());
      this.nextLevelTarget += GAME.levelTarget;
    }
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
    if (code === KeyCode.ESCAPE && !this.escapeHeld) {
      this.escapeHeld = true;
      if (this.phase === 'playing') this.pause();
      else if (this.phase === 'paused') this.resume();
      return;
    }
    if (code === KeyCode.KEY_R && !this.restartHeld) {
      this.restartHeld = true;
      if (this.phase === 'gameover') this.onRestartRequested?.();
    }
  }

  private onKeyUp(event: EventKeyboard): void {
    const code = event.keyCode;
    if (this.isMovementKey(code)) {
      this.pressedMovementKeys.delete(code);
      this.applyCombinedInput();
    }
    if (code === KeyCode.ESCAPE) this.escapeHeld = false;
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
