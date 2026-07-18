import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, UIOpacity, UITransform, VerticalTextAlignment, math, view,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { DisplaySettings, UiMode } from '../core/DisplaySettings';
import { DouyinBridge } from '../platform/DouyinBridge';
import { StorageService } from '../platform/StorageService';
import { SceneNavigator } from './SceneNavigator';
const { ccclass, property } = _decorator;

interface HomeStar { node: Node; phase: number; speed: number; }

@ccclass('HomeSceneBootstrap')
export class HomeSceneBootstrap extends Component {
  @property(SpriteFrame)
  logoSpriteFrame: SpriteFrame | null = null;

  private content: Node | null = null;
  private contentOpacity: UIOpacity | null = null;
  private bestLabel: Label | null = null;
  private coinLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private modeLabel: Label | null = null;
  private settingsPanel: Node | null = null;
  private elapsed = 0;
  private starting = false;
  private gameReady = false;
  private transitionTime = 0;
  private readonly stars: HomeStar[] = [];

  onLoad(): void {
    this.node.getComponent(UITransform)?.setContentSize(1080, 1920);
    this.build();
  }

  onEnable(): void {
    this.refreshPersistentData();
    this.applyUiMode();
  }

  update(dt: number): void {
    const step = Math.min(dt, 1 / 30);
    this.elapsed += step;
    for (const star of this.stars) {
      const pulse = 0.72 + Math.sin(this.elapsed * star.speed + star.phase) * 0.24;
      star.node.setScale(pulse, pulse, 1);
    }
    if (!this.starting || !this.content || !this.contentOpacity) return;
    this.transitionTime += step;
    const progress = math.clamp01(this.transitionTime / 0.72);
    this.contentOpacity.opacity = Math.round(255 * (1 - progress));
    this.content.setScale(DisplaySettings.getUiScale() * (1 + progress * 0.06), DisplaySettings.getUiScale() * (1 + progress * 0.06), 1);
    if (this.gameReady && progress >= 1) SceneNavigator.game();
  }

  private build(): void {
    this.drawBackground();
    this.content = this.createNode('HomeContent', this.node);
    this.contentOpacity = this.content.addComponent(UIOpacity);

    const safe = DouyinBridge.getSafeAreaInsets(1080, 1920);
    const logo = this.createNode('HomeLogo', this.content);
    logo.setPosition(0, 630 - safe.top * 0.45, 0);
    logo.addComponent(UITransform).setContentSize(560, 300);
    if (this.logoSpriteFrame) {
      const sprite = logo.addComponent(Sprite); sprite.spriteFrame = this.logoSpriteFrame;
    } else {
      const art = logo.addComponent(Graphics);
      art.fillColor = new Color(255, 255, 255, 235);
      art.circle(-108, -8, 48); art.circle(-48, 25, 66); art.circle(30, 34, 76); art.circle(112, -5, 50);
      art.roundRect(-135, -52, 270, 82, 40); art.fill();
    }
    this.createLabel('GameTitle', logo, '蹦蹦云', 74, new Color(106, 78, 157, 255)).node.setPosition(0, -4, 0);
    this.createLabel('Subtitle', logo, '向着星光，轻轻一跃', 22, new Color(116, 101, 165, 225)).node.setPosition(0, -72, 0);

    const stats = this.createPanel('PersistentStats', this.content, 520, 88, new Color(40, 47, 104, 62));
    stats.setPosition(0, 350, 0);
    this.bestLabel = this.createLabel('BestScore', stats, '最高分  0', 25, Color.WHITE);
    this.bestLabel.node.setPosition(-128, 0, 0);
    this.coinLabel = this.createLabel('TotalCoins', stats, '总金币  0', 25, new Color(255, 229, 135, 255));
    this.coinLabel.node.setPosition(128, 0, 0);

    const start = this.createButton('StartButton', this.content, '开始游戏', 390, 104, new Color(255, 160, 116, 255), 38);
    start.setPosition(0, 190, 0);
    start.on(Button.EventType.CLICK, this.startGame, this);

    const entries: Array<{ name: string; label: string; action: () => void }> = [
      { name: 'SkinEntry', label: '皮肤', action: () => this.showDeveloping('皮肤') },
      { name: 'SkillEntry', label: '技能', action: () => this.showDeveloping('技能') },
      { name: 'RankEntry', label: '排行榜', action: () => this.showDeveloping('排行榜') },
      { name: 'StatsEntry', label: '统计', action: () => this.showDeveloping('统计') },
      { name: 'SettingsEntry', label: '设置', action: () => this.openSettings() },
      { name: 'ShareEntry', label: '分享', action: () => this.share() },
    ];
    entries.forEach((entry, index) => {
      const col = index % 3; const row = Math.floor(index / 3);
      const button = this.createCompactButton(entry.name, entry.label);
      button.setPosition((col - 1) * 225, 5 - row * 125, 0);
      button.on(Button.EventType.CLICK, entry.action, this);
    });

    this.statusLabel = this.createLabel('HomeStatus', this.content, '选择标准 UI，保留更宽阔的云海视野', 20, new Color(255, 255, 255, 190));
    this.statusLabel.node.setPosition(0, -295, 0);
    this.createLabel('KeyboardHint', this.content, '电脑：A / D 或方向键移动 · Esc 暂停 · R 重开', 17, new Color(255, 255, 255, 135)).node.setPosition(0, -720 + safe.bottom, 0);
    this.createLabel('VersionLabel', this.content, `v${GAME.version}`, 16, new Color(255, 255, 255, 105)).node.setPosition(450 - safe.right, -875 + safe.bottom, 0);
    this.buildSettingsPanel();
    this.applyUiMode();
    this.refreshPersistentData();
  }

  private drawBackground(): void {
    const node = this.createNode('HomeBackground', this.node);
    node.addComponent(UITransform).setContentSize(1080, 1920);
    const graphics = node.addComponent(Graphics);
    const colors = [new Color(79, 94, 181), new Color(145, 178, 229), new Color(255, 205, 222)];
    for (let i = 0; i < 40; i += 1) {
      const t = i / 39; const segment = Math.min(1, Math.floor(t * 2)); const local = t * 2 - segment;
      graphics.fillColor = this.mix(colors[segment], colors[segment + 1], local);
      graphics.rect(-540, -960 + i * 49, 1080, 51); graphics.fill();
    }
    graphics.fillColor = new Color(77, 72, 145, 55);
    graphics.moveTo(-540, -520); graphics.lineTo(-380, -340); graphics.lineTo(-210, -510); graphics.lineTo(30, -260); graphics.lineTo(260, -500); graphics.lineTo(460, -315); graphics.lineTo(540, -430); graphics.lineTo(540, -960); graphics.lineTo(-540, -960); graphics.close(); graphics.fill();
    for (let i = 0; i < 26; i += 1) {
      const star = this.createNode(`HomeStar_${i}`, this.node);
      star.setPosition(-470 + ((i * 181) % 940), -760 + ((i * 277) % 1540), 0);
      const spark = star.addComponent(Graphics); spark.fillColor = new Color(255, 249, 214, 90 + (i % 4) * 28); spark.circle(0, 0, 2 + (i % 3)); spark.fill();
      this.stars.push({ node: star, phase: i * 0.83, speed: 1 + (i % 5) * 0.22 });
    }
  }

  private buildSettingsPanel(): void {
    this.settingsPanel = this.createPanel('SettingsPanel', this.node, 620, 500, new Color(31, 36, 82, 242));
    this.settingsPanel.addComponent(UIOpacity);
    this.createLabel('SettingsTitle', this.settingsPanel, '显示设置', 42, Color.WHITE).node.setPosition(0, 160, 0);
    this.modeLabel = this.createLabel('CurrentMode', this.settingsPanel, '', 23, new Color(225, 232, 255, 225));
    this.modeLabel.node.setPosition(0, 92, 0);
    const standard = this.createButton('StandardMode', this.settingsPanel, '标准 UI', 390, 86, new Color(91, 164, 218, 255), 30);
    standard.setPosition(0, 12, 0); standard.on(Button.EventType.CLICK, () => this.setUiMode('standard'), this);
    const large = this.createButton('LargeMode', this.settingsPanel, '大字模式', 390, 86, new Color(174, 126, 211, 255), 30);
    large.setPosition(0, -90, 0); large.on(Button.EventType.CLICK, () => this.setUiMode('large'), this);
    const close = this.createButton('CloseSettings', this.settingsPanel, '关闭', 240, 70, new Color(255, 177, 118, 255), 25);
    close.setPosition(0, -188, 0); close.on(Button.EventType.CLICK, () => { if (this.settingsPanel) this.settingsPanel.active = false; }, this);
    this.settingsPanel.active = false;
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true; this.transitionTime = 0;
    if (this.statusLabel) this.statusLabel.string = '云层正在展开…';
    SceneNavigator.preload('Game', undefined, () => { this.gameReady = true; });
  }

  private openSettings(): void {
    if (!this.settingsPanel) return;
    this.settingsPanel.active = true;
    this.settingsPanel.setScale(DisplaySettings.getUiScale(), DisplaySettings.getUiScale(), 1);
    this.updateModeLabel();
  }

  private setUiMode(mode: UiMode): void {
    DisplaySettings.setUiMode(mode); this.applyUiMode(); this.updateModeLabel();
    if (this.statusLabel) this.statusLabel.string = mode === 'large' ? '已启用大字模式：游戏视野和难度保持不变' : '已启用标准 UI：保留更宽阔的云海视野';
  }

  private applyUiMode(): void {
    const scale = DisplaySettings.getUiScale();
    this.content?.setScale(scale, scale, 1);
    if (this.settingsPanel?.active) this.settingsPanel.setScale(scale, scale, 1);
    this.updateModeLabel();
  }

  private updateModeLabel(): void {
    if (this.modeLabel) this.modeLabel.string = DisplaySettings.getUiMode() === 'large' ? '当前：大字模式' : '当前：标准 UI';
  }

  private refreshPersistentData(): void {
    if (this.bestLabel) this.bestLabel.string = `最高分  ${StorageService.getNumber('cloudBounceBest', 0)}`;
    if (this.coinLabel) this.coinLabel.string = `总金币  ${StorageService.getNumber('cloudBounceCoins', 0)}`;
  }

  private share(): void {
    DouyinBridge.share('蹦蹦云：向着星光，轻轻一跃');
    if (this.statusLabel) this.statusLabel.string = DouyinBridge.isDouyin ? '已打开抖音分享入口' : '分享功能将在抖音环境启用';
  }

  private showDeveloping(name: string): void { if (this.statusLabel) this.statusLabel.string = `${name}功能开发中`; }

  private createCompactButton(name: string, text: string): Node {
    const node = this.createButton(name, this.content!, text, 190, 94, new Color(64, 76, 143, 190), 24);
    const mark = this.createNode(`${name}Mark`, node); mark.setPosition(0, 17, 0);
    const graphics = mark.addComponent(Graphics); graphics.strokeColor = new Color(255, 238, 183, 220); graphics.lineWidth = 4;
    graphics.circle(0, 0, 12); graphics.moveTo(-16, 0); graphics.lineTo(16, 0); graphics.moveTo(0, -16); graphics.lineTo(0, 16); graphics.stroke();
    node.getChildByName(`${name}Label`)?.setPosition(0, -23, 0);
    return node;
  }

  private createPanel(name: string, parent: Node, width: number, height: number, color: Color): Node {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(width, height);
    const g = node.addComponent(Graphics); g.fillColor = color; g.roundRect(-width / 2, -height / 2, width, height, Math.min(36, height * 0.18)); g.fill();
    g.strokeColor = new Color(255, 255, 255, 60); g.lineWidth = 2; g.roundRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, Math.min(35, height * 0.18)); g.stroke();
    return node;
  }

  private createButton(name: string, parent: Node, text: string, width: number, height: number, color: Color, fontSize: number): Node {
    const node = this.createPanel(name, parent, width, height, color); node.addComponent(Button);
    this.createLabel(`${name}Label`, node, text, fontSize, Color.WHITE);
    return node;
  }

  private createLabel(name: string, parent: Node, text: string, size: number, color: Color): Label {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(420, Math.max(60, size + 20));
    const label = node.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size + 8; label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER; return label;
  }

  private createNode(name: string, parent: Node): Node { const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node; }
  private mix(a: Color, b: Color, t: number): Color { return new Color(Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t), Math.round(a.b + (b.b - a.b) * t), 255); }
}
