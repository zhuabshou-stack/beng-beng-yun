import {
  _decorator, BlockInputEvents, Button, Color, Component, EventTouch, Graphics,
  HorizontalTextAlignment, Label, Node, Sprite, SpriteFrame, Tween, UITransform, Vec3,
  VerticalTextAlignment, tween, view,
} from 'cc';
import { GAME, SKILLS, SkillId, levelTargetFor } from '../core/GameConfig';
import { LegacyProgression } from '../core/LegacyProgression';
import { DisplaySettings } from '../core/DisplaySettings';
import { AudioManager } from '../core/AudioManager';
import { CameraRig } from '../game/CameraRig';
import { GameManager } from '../game/GameManager';
import { PlatformService } from '../platform/PlatformService';
import { UiKit } from '../ui/UiKit';
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
    const levelTarget = levelTargetFor(this.gameManager.currentLevel);
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
    this.scoreLabel = this.createLabel('ScoreLabel', scoreChip, '0', 62, new Color(255, 255, 255, 255));
    UiKit.styleLabel(this.scoreLabel, { shadowColor: UiKit.HUD_TEXT_SHADOW });
    this.scoreLabel.node.setPosition(0, 2, 0);
    this.bestLabel = this.createLabel('BestLabel', scoreChip, '最高 0', 39, new Color(255, 255, 255, 155));
    UiKit.styleLabel(this.bestLabel, { shadowColor: new Color(0, 0, 0, 77) });
    this.bestLabel.node.setPosition(0, -58, 0);

    // HTML：💰 emoji + 金色数字（#coinDisplay）
    const coinChip = this.createNode('CoinChip', this.node);
    const coinEmoji = this.createLabel('CoinIcon', coinChip, '💰', 55, Color.WHITE);
    coinEmoji.node.setPosition(-58, 0, 0);
    this.coinLabel = this.createLabel('CoinLabel', coinChip, '0', 44, new Color(255, 255, 255, 255));
    this.coinLabel.color = new Color(255, 215, 0, 255);
    UiKit.styleLabel(this.coinLabel, { shadowColor: UiKit.HUD_TEXT_SHADOW });
    this.coinLabel.node.setPosition(25, 0, 0);

    const statsChip = this.createGlassPanel('RunStatsChip', 420, 62, 0.10);
    this.statsLabel = this.createLabel('RunStatsLabel', statsChip, '高度 0m    ⭐ 0', 28, new Color(241, 245, 255, 225));
    UiKit.styleLabel(this.statsLabel, { shadowColor: new Color(0, 0, 0, 77) });

    // HTML §4：连击 #ff6b6b + 红色文字阴影
    this.comboLabel = this.createLabel('ComboLabel', this.node, 'COMBO 2', 40, new Color(255, 107, 107, 255));
    UiKit.styleLabel(this.comboLabel, { shadowColor: UiKit.COMBO_SHADOW });
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
    this.progressLabel = this.createLabel('ProgressLabel', progressPanel, '云端旅程  0/200', 26, new Color(255, 255, 255, 225));
    UiKit.styleLabel(this.progressLabel, { shadowColor: new Color(0, 0, 0, 102) });
    this.progressLabel.node.setPosition(0, 17, 0);
    const versionLabel = this.createLabel('VersionLabel', this.node, `v${GAME.version}`, 16, new Color(255, 255, 255, 115));
    versionLabel.node.getComponent(UITransform)?.setContentSize(120, 36);

    this.pauseOverlay = this.createModalOverlay('PauseOverlay');
    // HTML 实测：pause-box 886×1196，无重新开始按钮（重开走结算面板）
    this.pausePanel = this.createStyledPanel('PausePanel', 886, 1196, this.pauseOverlay);
    const pauseTitle = this.createLabel('PauseTitle', this.pausePanel, '⏸️ 游戏暂停', 72, Color.WHITE);
    UiKit.styleLabel(pauseTitle);
    pauseTitle.node.setPosition(0, 472, 0);
    const resume = this.createRoundedButton('ResumeButton', this.pausePanel, '▶️ 继续游戏', 'primary');
    resume.setPosition(0, 292, 0);
    resume.on(Button.EventType.CLICK, this.resume, this);
    const skills = this.createRoundedButton('PauseSkillButton', this.pausePanel, '⚡ 技能商店', 'menu');
    skills.setPosition(0, 118, 0); skills.on(Button.EventType.CLICK, () => this.onSkillsRequested?.(), this);
    const ranking = this.createRoundedButton('PauseRankButton', this.pausePanel, '🏆 排行榜', 'menu');
    ranking.setPosition(0, -68, 0); ranking.on(Button.EventType.CLICK, () => this.onRankingRequested?.(), this);
    const skins = this.createRoundedButton('PauseSkinButton', this.pausePanel, '🎨 皮肤', 'menu');
    skins.setPosition(0, -253, 0); skins.on(Button.EventType.CLICK, () => this.onSkinsRequested?.(), this);
    const pauseHome = this.createRoundedButton('PauseHomeButton', this.pausePanel, '🏠 回到主页', 'secondary');
    pauseHome.setPosition(0, -458, 0);
    pauseHome.on(Button.EventType.CLICK, this.requestHome, this);
    this.pauseOverlay.active = false;

    this.settingsOverlay = this.createModalOverlay('SettingsOverlay');
    this.settingsPanel = this.createStyledPanel('SettingsPanel', 918, 1000, this.settingsOverlay);
    const settingsTitle = this.createLabel('SettingsTitle', this.settingsPanel, '⚙️ 设置', 57, Color.WHITE);
    UiKit.styleLabel(settingsTitle);
    settingsTitle.node.setPosition(0, 410, 0);
    // HTML §3.2：标签 + 真开关
    const soundLabel = this.createLabel('SoundSettingLabel', this.settingsPanel, '🔊 音效', 41, new Color(255, 255, 255, 204));
    UiKit.styleLabel(soundLabel, { shadow: false });
    soundLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    soundLabel.node.getComponent(UITransform)?.setContentSize(400, 70);
    soundLabel.node.setPosition(-240, 150, 0);
    const soundToggle = UiKit.createToggle(this.settingsPanel, 285, 150, AudioManager.soundEnabled, (setOn) => {
      const next = !AudioManager.soundEnabled;
      AudioManager.setSoundEnabled(next);
      setOn(next);
    });
    soundToggle.name = 'SoundToggle';
    const musicLabel = this.createLabel('MusicSettingLabel', this.settingsPanel, '🎵 音乐', 41, new Color(255, 255, 255, 204));
    UiKit.styleLabel(musicLabel, { shadow: false });
    musicLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    musicLabel.node.getComponent(UITransform)?.setContentSize(400, 70);
    musicLabel.node.setPosition(-240, -40, 0);
    const musicToggle = UiKit.createToggle(this.settingsPanel, 285, -40, AudioManager.musicEnabled, (setOn) => {
      const next = !AudioManager.musicEnabled;
      AudioManager.setMusicEnabled(next);
      setOn(next);
    });
    musicToggle.name = 'MusicToggle';
    const closeSettings = this.createRoundedButton('CloseSettingsButton', this.settingsPanel, '关闭', 'menu');
    closeSettings.setPosition(0, -380, 0);
    closeSettings.on(Button.EventType.CLICK, this.closeSettingsPanel, this);
    this.settingsOverlay.active = false;

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
    // HTML 实测：圆钮 133，中心距顶 99；分数中心距顶 85
    const top = halfHeight - safe.top / scale - 99;
    this.node.getChildByName('HomeButton')?.setPosition(-halfWidth + safe.left / scale + 100, top, 0);
    this.node.getChildByName('PauseButton')?.setPosition(-halfWidth + safe.left / scale + 255, top, 0);
    this.node.getChildByName('SettingsButton')?.setPosition(-halfWidth + safe.left / scale + 410, top, 0);
    this.node.getChildByName('ScoreChip')?.setPosition(0, top - 110, 0);
    this.node.getChildByName('CoinChip')?.setPosition(halfWidth - safe.right / scale - 105, top + 3, 0);
    this.node.getChildByName('RunStatsChip')?.setPosition(0, top - 250, 0);
    this.node.getChildByName('ComboLabel')?.setPosition(0, top - 315, 0);
    this.skillBar?.setPosition(halfWidth - safe.right / scale - 85, top, 0);
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
    // HTML §4：轨道白 30%、填充 #f093fb→#ffd166 渐变、金色端点
    graphics.fillColor = new Color(255, 255, 255, 77);
    graphics.roundRect(-width * 0.5, -21, width, 13, 7);
    graphics.fill();
    if (progress > 0) {
      const fillWidth = width * progress;
      UiKit.fillRoundedHorizontalGradient(graphics, -width * 0.5 + fillWidth * 0.5, -14.5, fillWidth, 13, 7, UiKit.PROGRESS_GRADIENT);
      graphics.fillColor = new Color(255, 209, 102, 255);
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
    label.color = combo >= 10 ? new Color(255, 215, 0, 255)
      : combo >= 5 ? new Color(255, 138, 128, 255) : new Color(255, 107, 107, 255);
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

  private openSettingsPanel(): void {
    if (!this.gameManager) return;
    this.settingsClosing = false;
    if (this.gameManager.phase === 'playing') this.gameManager.pause();
    if (this.pauseOverlay) this.pauseOverlay.active = false;
    if (this.settingsOverlay) this.settingsOverlay.active = true;
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
  }

  private toggleMusic(): void {
    AudioManager.setMusicEnabled(!AudioManager.musicEnabled);
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
      const button = this.createGlassPanel(`Skill_${id}`, 133, 133, 0.38);
      button.parent = this.skillBar;
      button.setPosition(-index * 145, 0, 0);
      const buttonComponent = button.addComponent(Button);
      this.skillButtons.set(id, buttonComponent);
      this.createLabel(`SkillIcon_${id}`, button, definition.icon, 50, Color.WHITE).node.setPosition(0, 16, 0);
      const key = SKILLS.findIndex((skill) => skill.id === id) + 1;
      const keyLabel = this.createLabel(`SkillKey_${id}`, button, `${key}`, 18, new Color(255, 255, 255, 135));
      keyLabel.node.getComponent(UITransform)?.setContentSize(24, 24);
      keyLabel.node.setPosition(46, 46, 0);
      const label = this.createLabel(`SkillState_${id}`, button, `${data[id].uses}`, 20, new Color(255, 215, 0, 255));
      label.node.setPosition(0, -40, 0);
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
    // HTML 游戏内按钮底 rgba(0,0,0,0.4)：黑色玻璃
    graphics.fillColor = new Color(0, 0, 0, Math.round(alpha * 255));
    graphics.roundRect(-width * 0.5, -height * 0.5, width, height, Math.min(34, height * 0.4));
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 38);
    graphics.lineWidth = 2;
    graphics.roundRect(-width * 0.5 + 1, -height * 0.5 + 1, width - 2, height - 2, Math.min(33, height * 0.4));
    graphics.stroke();
    return node;
  }

  // HTML §3.1 面板：渐变底 + 圆角 48 + 白 10% 边 + 大投影（暂停/设置面板用）
  private createStyledPanel(name: string, width: number, height: number, parent: Node): Node {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(width, height);
    const art = node.addComponent(Graphics);
    UiKit.drawDropShadow(art, width, height, 48, 24, 128);
    UiKit.fillRoundedVerticalGradient(art, width, height, 48, UiKit.PANEL_GRADIENT);
    art.strokeColor = new Color(255, 255, 255, 26);
    art.lineWidth = 3;
    art.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, 46);
    art.stroke();
    return node;
  }

  private createModalOverlay(name: string): Node {
    const visible = view.getVisibleSize();
    const overlay = this.createNode(name, this.node);
    overlay.addComponent(UITransform).setContentSize(visible.width, visible.height);
    overlay.addComponent(BlockInputEvents);
    // HTML 游戏内面板遮罩 rgba(0,0,0,0.6)
    const veil = overlay.addComponent(Graphics);
    veil.fillColor = new Color(0, 0, 0, 153);
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
    const node = this.createGlassPanel(name, 133, 133, 0.28);
    node.addComponent(Button);
    this.createIcon(`${name}Icon`, node, frame, kind);
    this.addPressFeedback(node);
    return node;
  }

  private createIcon(name: string, parent: Node, frame: SpriteFrame | null, kind: 'home' | 'pause' | 'coin' | 'settings'): Node {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(80, 80);
    if (frame) {
      const sprite = node.addComponent(Sprite);
      sprite.spriteFrame = frame;
      return node;
    }
    // 矢量图形按 80px 容器等比放大绘制（原尺寸按 42px 设计）
    node.setScale(1.9, 1.9, 1);
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

  private createRoundedButton(name: string, parent: Node, text: string, style: 'primary' | 'menu' | 'secondary' = 'primary'): Node {
    if (style === 'primary') {
      // HTML 实测：胶囊 753×152 圆角 76
      return this.createStyledButton(name, parent, text, 753, 152, 76, 51, UiKit.PRIMARY_GRADIENT);
    }
    if (style === 'secondary') {
      return this.createStyledButton(name, parent, text, 753, 125, 62, 44, UiKit.ACCENT_GRADIENT);
    }
    // menu：白 10% 底 + 白 15% 边（HTML .btn-menu 665×130）
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(665, 130);
    const art = node.addComponent(Graphics);
    art.fillColor = new Color(255, 255, 255, 26);
    art.roundRect(-332, -65, 665, 130, 33); art.fill();
    art.strokeColor = new Color(255, 255, 255, 38); art.lineWidth = 2;
    art.roundRect(-330, -63, 661, 126, 32); art.stroke();
    const label = this.createLabel(`${name}Label`, node, text, 44, Color.WHITE);
    UiKit.styleLabel(label, { shadow: false });
    node.addComponent(Button);
    UiKit.pressFeedback(node, 0.95);
    return node;
  }

  private createStyledButton(name: string, parent: Node, text: string, width: number, height: number, radius: number, fontSize: number, colors: readonly [string, string]): Node {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(width, height);
    const art = node.addComponent(Graphics);
    UiKit.drawDropShadow(art, width, height, radius, 12, 90);
    UiKit.fillRoundedVerticalGradient(art, width, height, radius, colors);
    art.strokeColor = new Color(255, 255, 255, 51);
    art.lineWidth = 2;
    art.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, Math.max(1, radius - 2));
    art.stroke();
    const label = this.createLabel(`${name}Label`, node, text, fontSize, Color.WHITE);
    UiKit.styleLabel(label, { shadow: false });
    node.addComponent(Button);
    UiKit.pressFeedback(node, 0.95);
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
