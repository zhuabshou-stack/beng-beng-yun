import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, Tween, UITransform, Vec3, VerticalTextAlignment, tween, view,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { DisplaySettings } from '../core/DisplaySettings';
import { CameraRig } from '../game/CameraRig';
import { GameManager } from '../game/GameManager';
import { DouyinBridge } from '../platform/DouyinBridge';
const { ccclass } = _decorator;

export interface HUDFrames {
  homeIcon: SpriteFrame | null;
  pauseIcon: SpriteFrame | null;
  coinIcon: SpriteFrame | null;
}

@ccclass('DreamyHUD')
export class DreamyHUD extends Component {
  onHomeRequested: (() => void) | null = null;
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
  private lastScore = -1;
  private lastCoins = -1;
  private lastStars = -1;
  private lastCombo = -1;
  private lastProgress = -1;
  private lastWidth = 0;
  private lastHeight = 0;

  configure(gameManager: GameManager, cameraRig: CameraRig, frames: HUDFrames): void {
    this.gameManager = gameManager;
    this.cameraRig = cameraRig;
    this.build(frames);
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
    const progress = Math.min(1, score / GAME.levelTarget);
    if (Math.abs(progress - this.lastProgress) > 0.001) {
      this.lastProgress = progress;
      this.drawProgress(progress);
      if (this.progressLabel) this.progressLabel.string = `云端旅程  ${score}/${GAME.levelTarget}`;
    }
    if (this.pausePanel) this.pausePanel.active = this.gameManager.phase === 'paused';
  }

  private build(frames: HUDFrames): void {
    this.node.removeAllChildren();
    const scoreChip = this.createGlassPanel('ScoreChip', 250, 118, 0.22);
    this.scoreLabel = this.createLabel('ScoreLabel', scoreChip, '0', 54, new Color(255, 255, 255, 255));
    this.scoreLabel.node.setPosition(0, 14, 0);
    this.bestLabel = this.createLabel('BestLabel', scoreChip, '最高 0', 22, new Color(235, 242, 255, 205));
    this.bestLabel.node.setPosition(0, -35, 0);

    const coinChip = this.createGlassPanel('CoinChip', 180, 78, 0.22);
    this.createIcon('CoinIcon', coinChip, frames.coinIcon, 'coin');
    this.coinLabel = this.createLabel('CoinLabel', coinChip, '0', 30, new Color(255, 235, 151, 255));
    this.coinLabel.node.setPosition(36, 0, 0);

    const statsChip = this.createGlassPanel('RunStatsChip', 330, 58, 0.18);
    this.statsLabel = this.createLabel('RunStatsLabel', statsChip, '高度 0m    星星 0', 21, new Color(241, 245, 255, 225));

    this.comboLabel = this.createLabel('ComboLabel', this.node, 'COMBO 2', 34, new Color(255, 191, 126, 255));
    this.comboLabel.node.active = false;

    const homeButton = this.createGlassButton('HomeButton', frames.homeIcon, 'home');
    homeButton.on(Button.EventType.CLICK, this.requestHome, this);
    const pauseButton = this.createGlassButton('PauseButton', frames.pauseIcon, 'pause');
    pauseButton.on(Button.EventType.CLICK, this.togglePause, this);

    const progressPanel = this.createGlassPanel('LevelProgressBar', 650, 84, 0.3);
    const progressNode = this.createNode('ProgressFill', progressPanel);
    this.progressGraphics = progressNode.addComponent(Graphics);
    this.progressLabel = this.createLabel('ProgressLabel', progressPanel, '云端旅程  0/200', 22, new Color(255, 255, 255, 225));
    this.progressLabel.node.setPosition(0, 17, 0);
    const versionLabel = this.createLabel('VersionLabel', this.node, `v${GAME.version}`, 16, new Color(255, 255, 255, 115));
    versionLabel.node.getComponent(UITransform)?.setContentSize(120, 36);

    this.pausePanel = this.createGlassPanel('PausePanel', 560, 360, 0.82);
    this.createLabel('PauseTitle', this.pausePanel, '旅程暂停', 52, Color.WHITE).node.setPosition(0, 92, 0);
    this.createLabel('PauseHint', this.pausePanel, '稍作休息，再向云端出发', 24, new Color(220, 228, 255, 210)).node.setPosition(0, 34, 0);
    const resume = this.createRoundedButton('ResumeButton', this.pausePanel, '继续游戏');
    resume.setPosition(0, -55, 0);
    resume.on(Button.EventType.CLICK, this.resume, this);
    const pauseHome = this.createRoundedButton('PauseHomeButton', this.pausePanel, '返回主页');
    pauseHome.setScale(0.78, 0.78, 1);
    pauseHome.setPosition(0, -145, 0);
    pauseHome.on(Button.EventType.CLICK, this.requestHome, this);
    this.pausePanel.active = false;

    const visible = view.getVisibleSize();
    this.layout(visible.width, visible.height);
    this.drawProgress(0);
  }

  private layout(width: number, height: number): void {
    this.lastWidth = width;
    this.lastHeight = height;
    const scale = DisplaySettings.getUiScale();
    const safe = DouyinBridge.getSafeAreaInsets(width, height);
    const halfWidth = width * 0.5 / scale;
    const halfHeight = height * 0.5 / scale;
    const top = halfHeight - safe.top / scale - 62;
    this.node.getChildByName('HomeButton')?.setPosition(-halfWidth + safe.left / scale + 62, top, 0);
    this.node.getChildByName('PauseButton')?.setPosition(-halfWidth + safe.left / scale + 142, top, 0);
    this.node.getChildByName('ScoreChip')?.setPosition(0, top - 5, 0);
    this.node.getChildByName('CoinChip')?.setPosition(halfWidth - safe.right / scale - 100, top, 0);
    this.node.getChildByName('RunStatsChip')?.setPosition(0, top - 102, 0);
    this.node.getChildByName('ComboLabel')?.setPosition(0, top - 158, 0);
    this.node.getChildByName('LevelProgressBar')?.setPosition(0, -halfHeight + safe.bottom / scale + 54, 0);
    this.node.getChildByName('VersionLabel')?.setPosition(halfWidth - safe.right / scale - 62, -halfHeight + safe.bottom / scale + 20, 0);
    this.pausePanel?.setPosition(0, 0, 0);
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
    const bonus = Math.min(3, Math.floor(combo / 5));
    label.string = combo >= 8 ? `高连击  COMBO ${combo}`
      : bonus > 0 ? `COMBO ${combo}   落云奖励 +${bonus}` : `COMBO ${combo}`;
    label.fontSize = combo >= 8 ? 42 : combo >= 5 ? 38 : 34;
    label.color = combo >= 8 ? new Color(255, 225, 112, 255)
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
    if (this.pausePanel) this.pausePanel.active = false;
    this.onHomeRequested?.();
  }

  private openPausePanel(): void {
    this.gameManager?.pause();
    if (this.pausePanel) {
      this.pausePanel.active = true;
      this.pausePanel.setScale(0.9, 0.9, 1);
      tween(this.pausePanel).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }
  }

  private resume(): void {
    this.gameManager?.resume();
    if (this.pausePanel) this.pausePanel.active = false;
  }

  private createGlassPanel(name: string, width: number, height: number, alpha: number): Node {
    const node = this.createNode(name, this.node);
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

  private createGlassButton(name: string, frame: SpriteFrame | null, kind: 'home' | 'pause'): Node {
    const node = this.createGlassPanel(name, 66, 66, 0.28);
    node.addComponent(Button);
    this.createIcon(`${name}Icon`, node, frame, kind);
    this.addPressFeedback(node);
    return node;
  }

  private createIcon(name: string, parent: Node, frame: SpriteFrame | null, kind: 'home' | 'pause' | 'coin'): Node {
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
    } else {
      graphics.circle(-34, 0, 18); graphics.fill();
      graphics.strokeColor = new Color(255, 249, 204, 255); graphics.lineWidth = 3; graphics.circle(-34, 0, 11); graphics.stroke();
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
