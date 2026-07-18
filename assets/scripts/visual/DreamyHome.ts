import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, VerticalTextAlignment, math, view,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { CameraRig } from '../game/CameraRig';
import { GameManager } from '../game/GameManager';
import { PlayerController } from '../game/PlayerController';
const { ccclass } = _decorator;

type HomeState = 'idle' | 'starting' | 'hidden';

@ccclass('DreamyHome')
export class DreamyHome extends Component {
  private gameManager: GameManager | null = null;
  private cameraRig: CameraRig | null = null;
  private player: PlayerController | null = null;
  private world: Node | null = null;
  private hud: Node | null = null;
  private overlayOpacity: UIOpacity | null = null;
  private worldOpacity: UIOpacity | null = null;
  private countdownLabel: Label | null = null;
  private bestLabel: Label | null = null;
  private coinLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private backdrop: Graphics | null = null;
  private state: HomeState = 'idle';
  private transitionTime = 0;
  private lastWidth = 0;
  private lastHeight = 0;

  configure(
    gameManager: GameManager,
    cameraRig: CameraRig,
    player: PlayerController,
    world: Node,
    hud: Node,
    logoFrame: SpriteFrame | null,
  ): void {
    this.gameManager = gameManager;
    this.cameraRig = cameraRig;
    this.player = player;
    this.world = world;
    this.hud = hud;
    this.worldOpacity = world.getComponent(UIOpacity) ?? world.addComponent(UIOpacity);
    this.build(logoFrame);
  }

  show(): void {
    if (!this.gameManager || !this.player) return;
    this.gameManager.prepareRun();
    this.state = 'idle';
    this.transitionTime = 0;
    this.node.active = true;
    if (this.overlayOpacity) this.overlayOpacity.opacity = 255;
    if (this.worldOpacity) this.worldOpacity.opacity = 150;
    if (this.hud) this.hud.active = false;
    this.player.node.setScale(0.88, 0.88, 1);
    if (this.countdownLabel) this.countdownLabel.node.active = false;
    if (this.statusLabel) this.statusLabel.string = '点击开始，向云端出发';
    this.refreshPersistentStats();
  }

  update(dt: number): void {
    if (!this.cameraRig) return;
    this.node.setPosition(0, this.cameraRig.node.position.y, 0);
    const visible = view.getVisibleSize();
    if (Math.abs(visible.width - this.lastWidth) > 1 || Math.abs(visible.height - this.lastHeight) > 1) {
      this.layout(visible.width, visible.height);
    }
    if (this.state !== 'starting') return;

    this.transitionTime += Math.min(dt, 1 / 30);
    const duration = 1.08;
    const progress = math.clamp01(this.transitionTime / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (this.overlayOpacity) this.overlayOpacity.opacity = Math.round(255 * (1 - math.clamp01((progress - 0.18) / 0.82)));
    if (this.worldOpacity) this.worldOpacity.opacity = Math.round(150 + 105 * eased);
    this.player?.node.setScale(0.72 + 0.28 * eased, 0.72 + 0.28 * eased, 1);

    const cameraPosition = this.cameraRig.node.position.clone();
    cameraPosition.y = -52 * (1 - eased);
    this.cameraRig.node.setPosition(cameraPosition);
    this.updateCountdown(this.transitionTime);

    if (progress >= 1) this.finishTransition();
  }

  private build(logoFrame: SpriteFrame | null): void {
    this.node.removeAllChildren();
    this.overlayOpacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);

    const backdropNode = this.createNode('HomeBackdrop', this.node);
    backdropNode.addComponent(UITransform);
    this.backdrop = backdropNode.addComponent(Graphics);

    const logo = this.createNode('Logo', this.node);
    logo.addComponent(UITransform).setContentSize(500, 260);
    if (logoFrame) {
      const sprite = logo.addComponent(Sprite);
      sprite.spriteFrame = logoFrame;
    } else {
      const art = logo.addComponent(Graphics);
      art.fillColor = new Color(255, 255, 255, 44);
      art.ellipse(0, -8, 230, 92);
      art.fill();
      art.fillColor = new Color(255, 255, 255, 235);
      art.circle(-105, -2, 44); art.circle(-48, 29, 62); art.circle(28, 35, 70); art.circle(105, -1, 46);
      art.roundRect(-132, -40, 264, 72, 34);
      art.fill();
    }
    const title = this.createLabel('GameTitle', logo, '蹦蹦云', 82, new Color(112, 82, 162, 255));
    title.node.setPosition(0, -8, 0);
    const subtitle = this.createLabel('Subtitle', logo, '向着星光，轻轻一跃', 24, new Color(118, 101, 165, 225));
    subtitle.node.setPosition(0, -73, 0);

    const stats = this.createPanel('PersistentStats', 570, 104, 0.25);
    this.bestLabel = this.createLabel('HomeBestScore', stats, '最高分  0', 27, new Color(255, 255, 255, 235));
    this.bestLabel.node.setPosition(-142, 0, 0);
    this.coinLabel = this.createLabel('HomeTotalCoins', stats, '总金币  0', 27, new Color(255, 229, 135, 255));
    this.coinLabel.node.setPosition(142, 0, 0);

    const startButton = this.createButton('StartButton', '开始游戏', 440, 116, new Color(255, 161, 116, 255), 42);
    startButton.on(Button.EventType.CLICK, this.beginTransition, this);

    const difficulty = this.createButton('DifficultyButton', '难度  标准', 180, 82, new Color(112, 171, 231, 220), 24);
    difficulty.on(Button.EventType.CLICK, () => this.showPlaceholder('当前使用标准节奏，更多难度后续开放'), this);
    const skin = this.createButton('SkinButton', '皮肤', 180, 82, new Color(193, 139, 222, 220), 24);
    skin.on(Button.EventType.CLICK, () => this.showPlaceholder('皮肤入口已预留'), this);
    const settings = this.createButton('SettingsButton', '设置', 180, 82, new Color(102, 190, 186, 220), 24);
    settings.on(Button.EventType.CLICK, () => this.showPlaceholder('设置入口已预留'), this);

    this.statusLabel = this.createLabel('HomeStatus', this.node, '点击开始，向云端出发', 21, new Color(255, 255, 255, 195));
    const keyboardHint = this.createLabel('KeyboardHint', this.node, '电脑测试：A / D 或方向键移动 · Esc 暂停 · R 重开', 18, new Color(255, 255, 255, 145));
    keyboardHint.node.getComponent(UITransform)?.setContentSize(680, 54);

    this.countdownLabel = this.createLabel('CountdownLabel', this.node, '3', 98, Color.WHITE);
    this.countdownLabel.node.active = false;

    const version = this.createLabel('HomeVersion', this.node, `v${GAME.version}`, 16, new Color(255, 255, 255, 105));
    version.node.getComponent(UITransform)?.setContentSize(120, 40);

    for (let i = 0; i < 14; i += 1) {
      const star = this.createNode(`HomeStar_${i}`, this.node);
      const starGraphics = star.addComponent(Graphics);
      starGraphics.fillColor = new Color(255, 249, 210, 70 + (i % 4) * 30);
      starGraphics.circle(0, 0, 2 + (i % 3));
      starGraphics.fill();
      star.setSiblingIndex(1);
    }

    const visible = view.getVisibleSize();
    this.layout(visible.width, visible.height);
    this.refreshPersistentStats();
  }

  private layout(width: number, height: number): void {
    this.lastWidth = width;
    this.lastHeight = height;
    const backdropNode = this.node.getChildByName('HomeBackdrop');
    backdropNode?.getComponent(UITransform)?.setContentSize(width, height);
    if (this.backdrop) {
      this.backdrop.clear();
      this.backdrop.fillColor = new Color(71, 63, 133, 68);
      this.backdrop.rect(-width * 0.5, -height * 0.5, width, height);
      this.backdrop.fill();
      this.backdrop.fillColor = new Color(255, 183, 218, 28);
      this.backdrop.rect(-width * 0.5, -height * 0.05, width, height * 0.55);
      this.backdrop.fill();
    }
    const top = height * 0.5;
    this.node.getChildByName('Logo')?.setPosition(0, top - 300, 0);
    this.node.getChildByName('PersistentStats')?.setPosition(0, 125, 0);
    this.node.getChildByName('StartButton')?.setPosition(0, -20, 0);
    this.node.getChildByName('DifficultyButton')?.setPosition(-205, -165, 0);
    this.node.getChildByName('SkinButton')?.setPosition(0, -165, 0);
    this.node.getChildByName('SettingsButton')?.setPosition(205, -165, 0);
    this.statusLabel?.node.setPosition(0, -255, 0);
    this.node.getChildByName('KeyboardHint')?.setPosition(0, -height * 0.5 + 95, 0);
    this.node.getChildByName('HomeVersion')?.setPosition(width * 0.5 - 68, -height * 0.5 + 28, 0);
    this.countdownLabel?.node.setPosition(0, 10, 0);
    for (let i = 0; i < 14; i += 1) {
      const x = -width * 0.44 + ((i * 137) % Math.max(1, width * 0.88));
      const y = -height * 0.40 + ((i * 223) % Math.max(1, height * 0.82));
      this.node.getChildByName(`HomeStar_${i}`)?.setPosition(x, y, 0);
    }
  }

  private beginTransition(): void {
    if (!this.gameManager || !this.player) return;
    if (this.state === 'starting') {
      this.transitionTime = Math.max(this.transitionTime, 0.78);
      return;
    }
    if (this.state !== 'idle') return;
    this.gameManager.prepareRun();
    this.state = 'starting';
    this.transitionTime = 0;
    this.player.node.setScale(0.72, 0.72, 1);
    if (this.countdownLabel) this.countdownLabel.node.active = true;
    if (this.statusLabel) this.statusLabel.string = '再次点击开始可快速进入';
  }

  private updateCountdown(time: number): void {
    if (!this.countdownLabel) return;
    this.countdownLabel.string = time < 0.34 ? '3' : time < 0.60 ? '2' : time < 0.84 ? '1' : '出发';
    const pulse = 0.92 + Math.sin(time * 22) * 0.06;
    this.countdownLabel.node.setScale(pulse, pulse, 1);
  }

  private finishTransition(): void {
    this.state = 'hidden';
    if (this.worldOpacity) this.worldOpacity.opacity = 255;
    this.player?.node.setScale(1, 1, 1);
    if (this.hud) this.hud.active = true;
    this.node.active = false;
    this.gameManager?.beginPreparedRun();
  }

  private refreshPersistentStats(): void {
    if (!this.gameManager) return;
    if (this.bestLabel) this.bestLabel.string = `最高分  ${this.gameManager.data.bestScore}`;
    if (this.coinLabel) this.coinLabel.string = `总金币  ${this.gameManager.data.totalCoins}`;
  }

  private showPlaceholder(message: string): void {
    if (this.statusLabel) this.statusLabel.string = message;
  }

  private createPanel(name: string, width: number, height: number, alpha: number): Node {
    const node = this.createNode(name, this.node);
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(35, 40, 93, Math.round(alpha * 255));
    graphics.roundRect(-width * 0.5, -height * 0.5, width, height, 34);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 60);
    graphics.lineWidth = 2;
    graphics.roundRect(-width * 0.5 + 1, -height * 0.5 + 1, width - 2, height - 2, 33);
    graphics.stroke();
    return node;
  }

  private createButton(name: string, text: string, width: number, height: number, color: Color, fontSize: number): Node {
    const node = this.createNode(name, this.node);
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(-width * 0.5, -height * 0.5, width, height, Math.min(40, height * 0.42));
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 55);
    graphics.roundRect(-width * 0.36, height * 0.12, width * 0.72, Math.max(8, height * 0.12), height * 0.06);
    graphics.fill();
    this.createLabel(`${name}Label`, node, text, fontSize, Color.WHITE);
    node.addComponent(Button);
    return node;
  }

  private createLabel(name: string, parent: Node, text: string, fontSize: number, color: Color): Label {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(360, Math.max(58, fontSize + 18));
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
