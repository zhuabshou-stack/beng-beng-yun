import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, Tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment, math, tween,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { DisplaySettings, UiMode } from '../core/DisplaySettings';
import { DouyinBridge } from '../platform/DouyinBridge';
import { StorageService } from '../platform/StorageService';
import { SceneNavigator } from './SceneNavigator';
import { AudioManager } from '../core/AudioManager';
import { ProgressionService } from '../core/ProgressionService';
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
  private soundLabel: Label | null = null;
  private musicLabel: Label | null = null;
  private settingsPanel: Node | null = null;
  private infoPanel: Node | null = null;
  private infoTitle: Label | null = null;
  private infoContent: Label | null = null;
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
      { name: 'RankEntry', label: '排行榜', action: () => this.openRanking() },
      { name: 'StatsEntry', label: '统计', action: () => this.openStats() },
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
    this.buildInfoPanel();
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
    this.settingsPanel = this.createPanel('SettingsPanel', this.node, 680, 760, new Color(31, 36, 82, 244));
    this.settingsPanel.addComponent(UIOpacity);
    this.createLabel('SettingsTitle', this.settingsPanel, '设置', 42, Color.WHITE).node.setPosition(0, 310, 0);
    this.modeLabel = this.createLabel('CurrentMode', this.settingsPanel, '', 23, new Color(225, 232, 255, 225));
    this.modeLabel.node.setPosition(0, 245, 0);
    const standard = this.createButton('StandardMode', this.settingsPanel, '标准 UI', 390, 86, new Color(91, 164, 218, 255), 30);
    standard.setPosition(0, 165, 0); standard.on(Button.EventType.CLICK, () => this.setUiMode('standard'), this);
    const large = this.createButton('LargeMode', this.settingsPanel, '大字模式', 390, 86, new Color(174, 126, 211, 255), 30);
    large.setPosition(0, 65, 0); large.on(Button.EventType.CLICK, () => this.setUiMode('large'), this);
    const sound = this.createButton('SoundToggle', this.settingsPanel, '音效', 390, 82, new Color(78, 139, 180, 255), 28);
    sound.setPosition(0, -40, 0); sound.on(Button.EventType.CLICK, this.toggleSound, this);
    this.soundLabel = sound.getChildByName('SoundToggleLabel')?.getComponent(Label) ?? null;
    const music = this.createButton('MusicToggle', this.settingsPanel, '音乐', 390, 82, new Color(112, 112, 184, 255), 28);
    music.setPosition(0, -135, 0); music.on(Button.EventType.CLICK, this.toggleMusic, this);
    this.musicLabel = music.getChildByName('MusicToggleLabel')?.getComponent(Label) ?? null;
    const tutorial = this.createButton('ReviewTutorial', this.settingsPanel, '重新查看教学', 390, 82, new Color(146, 111, 184, 255), 27);
    tutorial.setPosition(0, -230, 0); tutorial.on(Button.EventType.CLICK, this.resetTutorial, this);
    const close = this.createButton('CloseSettings', this.settingsPanel, '关闭', 240, 70, new Color(255, 177, 118, 255), 25);
    close.setPosition(0, -325, 0); close.on(Button.EventType.CLICK, () => { if (this.settingsPanel) this.settingsPanel.active = false; }, this);
    this.settingsPanel.active = false;
  }

  private buildInfoPanel(): void {
    this.infoPanel = this.createPanel('InfoPanel', this.node, 760, 980, new Color(31, 36, 82, 246));
    this.infoPanel.addComponent(UIOpacity);
    this.infoTitle = this.createLabel('InfoTitle', this.infoPanel, '', 44, Color.WHITE);
    this.infoTitle.node.setPosition(0, 400, 0);
    this.infoContent = this.createLabel('InfoContent', this.infoPanel, '', 27, new Color(233, 239, 255, 240));
    this.infoContent.node.setPosition(0, 20, 0);
    this.infoContent.node.getComponent(UITransform)?.setContentSize(650, 690);
    this.infoContent.lineHeight = 45;
    this.infoContent.enableWrapText = true;
    const close = this.createButton('CloseInfo', this.infoPanel, '返回主页', 300, 82, new Color(255, 177, 118, 255), 27);
    close.setPosition(0, -415, 0);
    close.on(Button.EventType.CLICK, () => { if (this.infoPanel) this.infoPanel.active = false; }, this);
    this.infoPanel.active = false;
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
    this.updateAudioLabels();
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

  private updateAudioLabels(): void {
    if (this.soundLabel) this.soundLabel.string = `音效：${AudioManager.soundEnabled ? '开' : '关'}`;
    if (this.musicLabel) this.musicLabel.string = `音乐：${AudioManager.musicEnabled ? '开' : '关'}`;
  }

  private toggleSound(): void {
    AudioManager.setSoundEnabled(!AudioManager.soundEnabled);
    AudioManager.playSound('ui');
    this.updateAudioLabels();
  }

  private toggleMusic(): void {
    AudioManager.setMusicEnabled(!AudioManager.musicEnabled);
    this.updateAudioLabels();
  }

  private resetTutorial(): void {
    StorageService.setNumber('cloudBounceTutorialSeen', 0);
    if (this.statusLabel) this.statusLabel.string = '教学已重置，下次开始游戏会重新显示';
    AudioManager.playSound('ui');
  }

  private openRanking(): void {
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    const lines = ranking.length === 0
      ? ['还没有本地成绩', '', '完成一次云端旅程后，成绩会出现在这里。']
      : ranking.slice(0, 10).map((score, index) => `${index + 1 < 10 ? '0' : ''}${index + 1}    ${score} 分`);
    this.openInfo('本地排行榜 · 前十', lines.join('\n'));
  }

  private openStats(): void {
    const stats = ProgressionService.load();
    const minutes = Math.floor(stats.playTimeSeconds / 60);
    const seconds = Math.floor(stats.playTimeSeconds % 60);
    this.openInfo('累计统计', [
      `游戏次数        ${stats.games}`,
      `跳跃次数        ${stats.jumps}`,
      `落云次数        ${stats.landings}`,
      `累计金币        ${stats.coins}`,
      `累计星星        ${stats.stars}`,
      `最高分          ${stats.bestScore}`,
      `最高高度        ${stats.bestHeight}m`,
      `最高 Combo      ${stats.bestCombo}`,
      `游戏时长        ${minutes}分 ${seconds}秒`,
    ].join('\n'));
  }

  private openInfo(title: string, content: string): void {
    if (!this.infoPanel || !this.infoTitle || !this.infoContent) return;
    this.infoTitle.string = title;
    this.infoContent.string = content;
    this.infoPanel.active = true;
    this.infoPanel.setScale(DisplaySettings.getUiScale() * 0.92, DisplaySettings.getUiScale() * 0.92, 1);
    Tween.stopAllByTarget(this.infoPanel);
    tween(this.infoPanel).to(0.18, { scale: new Vec3(DisplaySettings.getUiScale(), DisplaySettings.getUiScale(), 1) }, { easing: 'backOut' }).start();
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
    this.addPressFeedback(node);
    return node;
  }

  private addPressFeedback(node: Node): void {
    const restoreScale = new Vec3();
    node.on(Node.EventType.TOUCH_START, () => {
      node.getScale(restoreScale);
      node.setScale(restoreScale.x * 0.94, restoreScale.y * 0.94, 1);
    }, this);
    const restore = (): void => node.setScale(restoreScale);
    node.on(Node.EventType.TOUCH_END, restore, this);
    node.on(Node.EventType.TOUCH_CANCEL, restore, this);
  }

  private createLabel(name: string, parent: Node, text: string, size: number, color: Color): Label {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(420, Math.max(60, size + 20));
    const label = node.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size + 8; label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER; return label;
  }

  private createNode(name: string, parent: Node): Node { const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node; }
  private mix(a: Color, b: Color, t: number): Color { return new Color(Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t), Math.round(a.b + (b.b - a.b) * t), 255); }
}
