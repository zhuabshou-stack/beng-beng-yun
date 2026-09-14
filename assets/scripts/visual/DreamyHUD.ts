import {
  _decorator, BlockInputEvents, Button, Color, Component, EventTouch, Graphics,
  HorizontalTextAlignment, Label, Node, Sprite, SpriteFrame, Tween, UITransform, Vec3,
  VerticalTextAlignment, tween, view,
} from 'cc';
import { GAME, SKILLS, SkillId } from '../core/GameConfig';
import { LegacyProgression } from '../core/LegacyProgression';
import { DisplaySettings } from '../core/DisplaySettings';
import { AudioManager } from '../core/AudioManager';
import { CameraRig } from '../game/CameraRig';
import { GameManager } from '../game/GameManager';
import { PlatformService } from '../platform/PlatformService';
const { ccclass } = _decorator;

export interface HUDFrames {
  homeIcon: SpriteFrame | null;
  pauseIcon: SpriteFrame | null;
  coinIcon: SpriteFrame | null;
}

@ccclass('DreamyHUD')
export class DreamyHUD extends Component {
  onHomeRequested: (() => void) | null = null;
  onSkillsRequested: (() => void) | null = null;
  onRankingRequested: (() => void) | null = null;
  onSkinsRequested: (() => void) | null = null;
  private gameManager: GameManager | null = null;
  private cameraRig: CameraRig | null = null;
  private scoreLabel: Label | null = null;
  private bestLabel: Label | null = null;
  private coinLabel: Label | null = null;
  private statsLabel: Label | null = null;
  private comboLabel: Label | null = null;
  private progressLabel: Label | null = null;
  private progressGraphics: Graphics | null = null;
  private pausePanel: Node | null = null;
  private pauseOverlay: Node | null = null;
  private settingsPanel: Node | null = null;
  private settingsOverlay: Node | null = null;
  private soundSettingLabel: Label | null = null;
  private musicSettingLabel: Label | null = null;
  private skillBar: Node | null = null;
  private readonly skillLabels = new Map<SkillId, Label>();
  private readonly skillButtons = new Map<SkillId, Button>();
  private lastScore = -1;
  private lastCoins = -1;
  private lastStars = -1;
  private lastCombo = -1;
  private lastProgress = -1;
  private lastWidth = 0;
  private lastHeight = 0;
  private settingsClosing = false;

  configure(gameManager: GameManager, cameraRig: CameraRig, frames: HUDFrames): void {
    this.gameManager = gameManager;
    this.cameraRig = cameraRig;
    this.build(frames);
    this.gameManager.onSkillStateChanged = () => this.updateSkillBar();
    this.applyDisplaySettings();
  }

  applyDisplaySettings(): void {
    const scale = DisplaySettings.getUiScale();
    this.node.setScale(scale, scale, 1);
    this.lastWidth = 0;
    this.lastHeight = 0;
  }

  update(): void {
    if (!this.gameManager || !this.cameraRig) return;
    const cameraY = this.cameraRig.node.position.y;
    this.node.setPosition(0, cameraY, 0);
    const visible = view.getVisibleSize();
    if (Math.abs(visible.width - this.lastWidth) > 1 || Math.abs(visible.height - this.lastHeight) > 1) {
      this.layout(visible.width, visible.height);
    }

    const data = this.gameManager.data;
    const score = Math.floor(data.score);
    if (score !== this.lastScore) {
      this.lastScore = score;
      if (this.scoreLabel) {
        this.scoreLabel.string = `${score}`;
        Tween.stopAllByTarget(this.scoreLabel.node);
        this.scoreLabel.node.setScale(1, 1, 1);
        tween(this.scoreLabel.node).to(0.08, { scale: new Vec3(1.12, 1.12, 1) }).to(0.14, { scale: Vec3.ONE }).start();
      }
    }
    if (this.bestLabel) this.bestLabel.string = `最高 ${data.bestScore}`;
    if (this.coinLabel && data.totalCoins !== this.lastCoins) {
      const shouldAnimate = this.lastCoins >= 0;
      this.lastCoins = data.totalCoins;
      this.coinLabel.string = `${data.totalCoins}`;
      if (shouldAnimate) {
        Tween.stopAllByTarget(this.coinLabel.node);
        this.coinLabel.node.setScale(1, 1, 1);
        tween(this.coinLabel.node).to(0.08, { scale: new Vec3(1.2, 1.2, 1) }).to(0.16, { scale: Vec3.ONE }).start();
      }
    }
    if (this.statsLabel) {
      this.statsLabel.string = `高度 ${Math.floor(data.heightMeters)}m    星星 ${data.stars}`;
      if (this.lastStars >= 0 && data.stars !== this.lastStars) {
        Tween.stopAllByTarget(this.statsLabel.node);
        this.statsLabel.node.setScale(1, 1, 1);
        tween(this.statsLabel.node).to(0.08, { scale: new Vec3(1.12, 1.12, 1) }).to(0.16, { scale: Vec3.ONE }).start();
      }
      this.lastStars = data.stars;
    }
    this.updateCombo(data.combo);
    const levelTarget = GAME.levelTarget * this.gameManager.currentLevel;
    const progress = Math.min(1, score / levelTarget);
    if (Math.abs(progress - this.lastProgress) > 0.001) {
      this.lastProgress = progress;
      this.drawProgress(progress);
      if (this.progressLabel) this.progressLabel.string = `云端旅程  ${score}/${levelTarget}`;
    }
    if (this.pauseOverlay) this.pauseOverlay.active = this.gameManager.phase === 'paused' && !this.settingsOverlay?.active;
    this.updateSkillBar();
  }

  private build(frames: HUDFrames): void {
    this.node.removeAllChildren();
    const scoreChip = this.createNode('ScoreChip', this.node);
    this.scoreLabel = this.createLabel('ScoreLabel', scoreChip, '0', 44, new Color(255, 255, 255, 255));
    this.scoreLabel.node.setPosition(0, 2, 0);
    this.bestLabel = this.createLabel('BestLabel', scoreChip, '最高 0', 20, new Color(255, 255, 255, 155));
    this.bestLabel.node.setPosition(0, -42, 0);

    const coinChip = this.createNode('CoinChip', this.node);
    this.createIcon('CoinIcon', coinChip, frames.coinIcon, 'coin');
    this.coinLabel = this.createLabel('CoinLabel', coinChip, '0', 30, new Color(255, 235, 151, 255));
    this.coinLabel.node.setPosition(36, 0, 0);

    const statsChip = this.createGlassPanel('RunStatsChip', 330, 54, 0.10);
    this.statsLabel = this.createLabel('RunStatsLabel', statsChip, '高度 0m    ⭐ 0', 20, new Color(241, 245, 255, 225));

    this.comboLabel = this.createLabel('ComboLabel', this.node, 'COMBO 2', 34, new Color(255, 191, 126, 255));
    this.comboLabel.node.active = false;

    this.skillBar = this.createNode('SkillBar', this.node);
    this.rebuildSkillBar();

    const homeButton = this.createGlassButton('HomeButton', frames.homeIcon, 'home');
    homeButton.on(Button.EventType.CLICK, this.requestHome, this);
    const pauseButton = this.createGlassButton('PauseButton', frames.pauseIcon, 'pause');
    pauseButton.on(Button.EventType.CLICK, this.togglePause, this);
    const settingsButton = this.createGlassButton('SettingsButton', null, 'settings');
    settingsButton.on(Button.EventType.CLICK, this.openSettingsPanel, this);

    const progressPanel = this.createGlassPanel('LevelProgressBar', 650, 84, 0.3);
    const progressNode = this.createNode('ProgressFill', progressPanel);
    this.progressGraphics = progressNode.addComponent(Graphics);
    this.progressLabel = this.createLabel('ProgressLabel', progressPanel, '云端旅程  0/200', 22, new Color(255, 255, 255, 225));
    this.progressLabel.node.setPosition(0, 17, 0);
    const versionLabel = this.createLabel('VersionLabel', this.node, `v${GAME.version}`, 16, new Color(255, 255, 255, 115));
    versionLabel.node.getComponent(UITransform)?.setContentSize(120, 36);

    this.pauseOverlay = this.createModalOverlay('PauseOverlay');
    this.pausePanel = this.createGlassPanel('PausePanel', 600, 820, 0.94, this.pauseOverlay);
    this.createLabel('PauseTitle', this.pausePanel, '⏸️ 游戏暂停', 48, Color.WHITE).node.setPosition(0, 335, 0);
    const resume = this.createRoundedButton('ResumeButton', this.pausePanel, '继续游戏');
    resume.setPosition(0, 225, 0);
    resume.on(Button.EventType.CLICK, this.resume, this);
    const restart = this.createRoundedButton('PauseRestartButton', this.pausePanel, '重新开始');
    restart.setPosition(0, 115, 0);
    restart.on(Button.EventType.CLICK, this.restart, this);
    const skills = this.createRoundedButton('PauseSkillButton', this.pausePanel, '⚡ 技能商店');
    skills.setPosition(0, 5, 0); skills.on(Button.EventType.CLICK, () => this.onSkillsRequested?.(), this);
    const ranking = this.createRoundedButton('PauseRankButton', this.pausePanel, '🏆 排行榜');
    ranking.setPosition(0, -105, 0); ranking.on(Button.EventType.CLICK, () => this.onRankingRequested?.(), this);
    const skins = this.createRoundedButton('PauseSkinButton', this.pausePanel, '🎨 皮肤');
    skins.setPosition(0, -215, 0); skins.on(Button.EventType.CLICK, () => this.onSkinsRequested?.(), this);
    const pauseHome = this.createRoundedButton('PauseHomeButton', this.pausePanel, '返回主页');
    pauseHome.setScale(0.78, 0.78, 1);
    pauseHome.setPosition(0, -335, 0);
    pauseHome.on(Button.EventType.CLICK, this.requestHome, this);
    this.pauseOverlay.active = false;

    this.settingsOverlay = this.createModalOverlay('SettingsOverlay');
    this.settingsPanel = this.createGlassPanel('SettingsPanel', 560, 500, 0.96, this.settingsOverlay);
    this.createLabel('SettingsTitle', this.settingsPanel, '⚙️ 设置', 44, Color.WHITE).node.setPosition(0, 185, 0);
    const sound = this.createRoundedButton('SoundSettingButton', this.settingsPanel, '🔊 音效');
    sound.setPosition(0, 72, 0); sound.on(Button.EventType.CLICK, this.toggleSound, this);
    this.soundSettingLabel = sound.getChildByName('SoundSettingButtonLabel')?.getComponent(Label) ?? null;
    const music = this.createRoundedButton('MusicSettingButton', this.settingsPanel, '🎵 音乐');
    music.setPosition(0, -42, 0); music.on(Button.EventType.CLICK, this.toggleMusic, this);
    this.musicSettingLabel = music.getChildByName('MusicSettingButtonLabel')?.getComponent(Label) ?? null;
    const closeSettings = this.createRoundedButton('CloseSettingsButton', this.settingsPanel, '关闭');
    closeSettings.setScale(0.78, 0.78, 1); closeSettings.setPosition(0, -170, 0);
    closeSettings.on(Button.EventType.CLICK, this.closeSettingsPanel, this);
    this.settingsOverlay.active = false;
    this.refreshAudioSettingLabels();

    const visible = view.getVisibleSize();
    this.layout(visible.width, visible.height);
    this.drawProgress(0);
  }

  private layout(width: number, height: number): void {
    this.lastWidth = width;
    this.lastHeight = height;
    const scale = DisplaySettings.getUiScale();
    const safe = PlatformService.getSafeAreaInsets(width, height);
    const halfWidth = width * 0.5 / scale;
    const halfHeight = height * 0.5 / scale;
    const top = halfHeight - safe.top / scale - 62;
    this.node.getChildByName('HomeButton')?.setPosition(-halfWidth + safe.left / scale + 62, top, 0);
    this.node.getChildByName('PauseButton')?.setPosition(-halfWidth + safe.left / scale + 142, top, 0);
    this.node.getChildByName('SettingsButton')?.setPosition(-halfWidth + safe.left / scale + 222, top, 0);
    this.node.getChildByName('ScoreChip')?.setPosition(0, top - 5, 0);
    this.node.getChildByName('CoinChip')?.setPosition(halfWidth - safe.right / scale - 100, top, 0);
    this.node.getChildByName('RunStatsChip')?.setPosition(0, top - 102, 0);
    this.node.getChildByName('ComboLabel')?.setPosition(0, top - 158, 0);
    this.skillBar?.setPosition(halfWidth - safe.right / scale - 48, top - 104, 0);
    this.node.getChildByName('LevelProgressBar')?.setPosition(0, -halfHeight + safe.bottom / scale + 54, 0);
    this.node.getChildByName('VersionLabel')?.setPosition(halfWidth - safe.right / scale - 62, -halfHeight + safe.bottom / scale + 20, 0);
    this.pauseOverlay?.getComponent(UITransform)?.setContentSize(width / scale, height / scale);
    this.settingsOverlay?.getComponent(UITransform)?.setContentSize(width / scale, height / scale);
    this.pausePanel?.setPosition(0, 0, 0);
    this.settingsPanel?.setPosition(0, 0, 0);
  }

  private drawProgress(progress: number): void {
    const graphics = this.progressGraphics;
    if (!graphics) return;
    const width = 570;
    graphics.clear();
    graphics.fillColor = new Color(255, 255, 255, 48);
    graphics.roundRect(-width * 0.5, -21, width, 13, 7);
    graphics.fill();
    if (progress > 0) {
      graphics.fillColor = new Color(242, 147, 251, 255);
      graphics.roundRect(-width * 0.5, -21, width * progress, 13, 7);
      graphics.fill();
      graphics.fillColor = new Color(255, 220, 130, 180);
      graphics.circle(-width * 0.5 + width * progress, -14.5, 8);
      graphics.fill();
    }
  }

  private updateCombo(combo: number): void {
    const label = this.comboLabel;
    if (!label) return;
    label.node.active = combo >= 2;
    if (combo < 2 || combo === this.lastCombo) {
      this.lastCombo = combo;
      return;
    }
    this.lastCombo = combo;
    const bonus = Math.floor(combo / 5);
    label.string = bonus > 0 ? `🔥 ${combo} 连击   +${bonus}` : `🔥 ${combo} 连击`;
    label.fontSize = combo >= 10 ? 42 : combo >= 5 ? 38 : 34;
    label.color = combo >= 10 ? new Color(255, 225, 112, 255)
      : combo >= 5 ? new Color(255, 170, 128, 255) : new Color(255, 205, 156, 255);
    Tween.stopAllByTarget(label.node);
    label.node.setScale(0.86, 0.86, 1);
    tween(label.node).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
  }

  private togglePause(): void {
    if (!this.gameManager) return;
    if (this.gameManager.phase === 'playing') this.openPausePanel();
    else if (this.gameManager.phase === 'paused') this.resume();
  }

  private requestHome(): void {
    if (this.pauseOverlay) this.pauseOverlay.active = false;
    if (this.settingsOverlay) this.settingsOverlay.active = false;
    this.onHomeRequested?.();
  }

  private openPausePanel(): void {
    this.gameManager?.pause();
    if (this.pauseOverlay) this.pauseOverlay.active = true;
    if (this.pausePanel) {
      this.pausePanel.setScale(0.9, 0.9, 1);
      tween(this.pausePanel).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }
  }

  private resume(): void {
    this.gameManager?.resume();
    if (this.pauseOverlay) this.pauseOverlay.active = false;
  }

  private restart(): void {
    if (this.pauseOverlay) this.pauseOverlay.active = false;
    this.gameManager?.onRestartRequested?.();
  }

  private openSettingsPanel(): void {
    if (!this.gameManager) return;
    this.settingsClosing = false;
    if (this.gameManager.phase === 'playing') this.gameManager.pause();
    if (this.pauseOverlay) this.pauseOverlay.active = false;
    if (this.settingsOverlay) this.settingsOverlay.active = true;
    this.refreshAudioSettingLabels();
  }

  private closeSettingsPanel(): void {
    if (this.settingsClosing) return;
    this.settingsClosing = true;
    this.scheduleOnce(() => {
      if (this.settingsOverlay) this.settingsOverlay.active = false;
      this.gameManager?.resume();
      if (this.pauseOverlay) this.pauseOverlay.active = false;
      this.settingsClosing = false;
    }, 0);
  }

  private toggleSound(): void {
    AudioManager.setSoundEnabled(!AudioManager.soundEnabled);
    this.refreshAudioSettingLabels();
  }

  private toggleMusic(): void {
    AudioManager.setMusicEnabled(!AudioManager.musicEnabled);
    this.refreshAudioSettingLabels();
  }

  private refreshAudioSettingLabels(): void {
    if (this.soundSettingLabel) this.soundSettingLabel.string = `🔊 音效：${AudioManager.soundEnabled ? '开' : '关'}`;
    if (this.musicSettingLabel) this.musicSettingLabel.string = `🎵 音乐：${AudioManager.musicEnabled ? '开' : '关'}`;
  }

  private rebuildSkillBar(): void {
    if (!this.skillBar || !this.gameManager) return;
    for (const child of [...this.skillBar.children]) child.destroy();
    this.skillLabels.clear();
    this.skillButtons.clear();
    const active = LegacyProgression.loadActiveSkills();
    const data = LegacyProgression.loadSkills();
    active.forEach((id, index) => {
      if (!data[id].owned) return;
      const definition = SKILLS.find((skill) => skill.id === id);
      if (!definition) return;
      const button = this.createGlassPanel(`Skill_${id}`, 76, 76, 0.38);
      button.parent = this.skillBar;
      button.setPosition(-index * 88, 0, 0);
      const buttonComponent = button.addComponent(Button);
      this.skillButtons.set(id, buttonComponent);
      this.createLabel(`SkillIcon_${id}`, button, definition.icon, 31, Color.WHITE).node.setPosition(0, 10, 0);
      const key = SKILLS.findIndex((skill) => skill.id === id) + 1;
      const keyLabel = this.createLabel(`SkillKey_${id}`, button, `${key}`, 13, new Color(255, 255, 255, 135));
      keyLabel.node.getComponent(UITransform)?.setContentSize(24, 24);
      keyLabel.node.setPosition(25, 25, 0);
      const label = this.createLabel(`SkillState_${id}`, button, `${data[id].uses}`, 14, new Color(255, 215, 0, 255));
      label.node.setPosition(0, -24, 0);
      this.skillLabels.set(id, label);
      button.on(Button.EventType.CLICK, () => this.gameManager?.useSkill(id), this);
      this.addPressFeedback(button);
    });
  }

  private updateSkillBar(): void {
    if (!this.gameManager) return;
    const data = LegacyProgression.loadSkills();
    for (const [id, label] of this.skillLabels) {
      const cooldown = this.gameManager.getSkillCooldown(id);
      label.string = cooldown > 0 ? `${Math.ceil(cooldown)}s` : `${data[id].uses}`;
      label.color = cooldown > 0 || data[id].uses <= 0 ? new Color(255, 120, 120, 220) : new Color(255, 215, 0, 255);
      const button = this.skillButtons.get(id);
      // 保持按钮可点击，让冷却、未购买、次数不足等状态能显示明确原因。
      if (button) button.interactable = true;
    }
  }

  private createGlassPanel(name: string, width: number, height: number, alpha: number, parent = this.node): Node {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(30, 38, 86, Math.round(alpha * 255));
    graphics.roundRect(-width * 0.5, -height * 0.5, width, height, Math.min(34, height * 0.4));
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 52);
    graphics.lineWidth = 2;
    graphics.roundRect(-width * 0.5 + 1, -height * 0.5 + 1, width - 2, height - 2, Math.min(33, height * 0.4));
    graphics.stroke();
    return node;
  }

  private createModalOverlay(name: string): Node {
    const visible = view.getVisibleSize();
    const overlay = this.createNode(name, this.node);
    overlay.addComponent(UITransform).setContentSize(visible.width, visible.height);
    overlay.addComponent(BlockInputEvents);
    const veil = overlay.addComponent(Graphics);
    veil.fillColor = new Color(5, 8, 24, 178);
    veil.rect(-visible.width * 0.5, -visible.height * 0.5, visible.width, visible.height);
    veil.fill();
    const stop = (event: EventTouch): void => {
      event.propagationStopped = true;
    };
    overlay.on(Node.EventType.TOUCH_START, stop, this);
    overlay.on(Node.EventType.TOUCH_MOVE, stop, this);
    overlay.on(Node.EventType.TOUCH_END, stop, this);
    overlay.on(Node.EventType.TOUCH_CANCEL, stop, this);
    return overlay;
  }

  private createGlassButton(name: string, frame: SpriteFrame | null, kind: 'home' | 'pause' | 'settings'): Node {
    const node = this.createGlassPanel(name, 66, 66, 0.28);
    node.addComponent(Button);
    this.createIcon(`${name}Icon`, node, frame, kind);
    this.addPressFeedback(node);
    return node;
  }

  private createIcon(name: string, parent: Node, frame: SpriteFrame | null, kind: 'home' | 'pause' | 'coin' | 'settings'): Node {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(42, 42);
    if (frame) {
      const sprite = node.addComponent(Sprite);
      sprite.spriteFrame = frame;
      return node;
    }
    const graphics = node.addComponent(Graphics);
    graphics.strokeColor = kind === 'coin' ? new Color(255, 224, 105, 255) : Color.WHITE;
    graphics.fillColor = graphics.strokeColor;
    graphics.lineWidth = 5;
    if (kind === 'home') {
      graphics.moveTo(-16, -2); graphics.lineTo(0, 14); graphics.lineTo(16, -2); graphics.stroke();
      graphics.roundRect(-12, -16, 24, 18, 3); graphics.fill();
    } else if (kind === 'pause') {
      graphics.roundRect(-12, -15, 8, 30, 3); graphics.roundRect(4, -15, 8, 30, 3); graphics.fill();
    } else if (kind === 'coin') {
      graphics.circle(-34, 0, 18); graphics.fill();
      graphics.strokeColor = new Color(255, 249, 204, 255); graphics.lineWidth = 3; graphics.circle(-34, 0, 11); graphics.stroke();
    } else {
      graphics.circle(0, 0, 13); graphics.stroke();
      graphics.circle(0, 0, 5); graphics.stroke();
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        graphics.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
        graphics.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
      }
      graphics.stroke();
    }
    return node;
  }

  private createRoundedButton(name: string, parent: Node, text: string): Node {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(320, 96);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(255, 177, 106, 255);
    graphics.roundRect(-160, -48, 320, 96, 38);
    graphics.fill();
    this.createLabel(`${name}Label`, node, text, 34, Color.WHITE);
    node.addComponent(Button);
    this.addPressFeedback(node);
    return node;
  }

  private addPressFeedback(node: Node): void {
    const restoreScale = new Vec3();
    node.on(Node.EventType.TOUCH_START, () => {
      node.getScale(restoreScale);
      node.setScale(restoreScale.x * 0.93, restoreScale.y * 0.93, 1);
    }, this);
    const restore = (): void => node.setScale(restoreScale);
    node.on(Node.EventType.TOUCH_END, restore, this);
    node.on(Node.EventType.TOUCH_CANCEL, restore, this);
  }

  private createLabel(name: string, parent: Node, text: string, fontSize: number, color: Color): Label {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(520, Math.max(66, fontSize + 20));
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    return label;
  }

  private createNode(name: string, parent: Node): Node {
    const node = new Node(name);
    node.parent = parent;
    node.layer = this.node.layer;
    return node;
  }
}
