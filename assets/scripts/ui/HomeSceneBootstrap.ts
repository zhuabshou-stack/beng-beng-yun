import {
  _decorator, Button, Camera, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, Tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment, math, tween, view,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { GAME, SKILLS, SKINS, SkillId } from '../core/GameConfig';
import { LegacyProgression } from '../core/LegacyProgression';
import { DouyinBridge } from '../platform/DouyinBridge';
import { StorageService } from '../platform/StorageService';
import { SceneNavigator } from './SceneNavigator';
const { ccclass, property } = _decorator;

interface HomeParticle { node: Node; phase: number; speed: number; }
interface HomeCloud { node: Node; speed: number; width: number; }

@ccclass('HomeSceneBootstrap')
export class HomeSceneBootstrap extends Component {
  @property(SpriteFrame)
  logoSpriteFrame: SpriteFrame | null = null;

  private coinLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private overlay: Node | null = null;
  private elapsed = 0;
  private starting = false;
  private startTransitionTime = 0;
  private gameSceneReady = false;
  private transitionOverlay: Node | null = null;
  private transitionOpacity: UIOpacity | null = null;
  private viewportWidth = 1080;
  private viewportHeight = 1920;
  private readonly particles: HomeParticle[] = [];
  private readonly clouds: HomeCloud[] = [];

  onLoad(): void {
    const visible = view.getVisibleSize();
    this.viewportWidth = visible.width;
    this.viewportHeight = visible.height;
    this.node.getComponent(UITransform)?.setContentSize(visible.width, visible.height);
    const camera = this.node.getChildByName('Camera')?.getComponent(Camera);
    if (camera) camera.orthoHeight = visible.height * 0.5;
    this.buildBackground();
    this.buildHome();
  }

  onEnable(): void {
    this.refreshCoins();
  }

  update(dt: number): void {
    const step = Math.min(dt, 1 / 30);
    this.elapsed += step;
    for (const particle of this.particles) {
      const pulse = 0.72 + Math.sin(this.elapsed * particle.speed + particle.phase) * 0.25;
      particle.node.setScale(pulse, pulse, 1);
    }
    for (const cloud of this.clouds) {
      const pos = cloud.node.position.clone();
      pos.x += cloud.speed * step;
      const edge = this.viewportWidth * 0.5 + cloud.width;
      if (cloud.speed > 0 && pos.x > edge) pos.x = -edge;
      if (cloud.speed < 0 && pos.x < -edge) pos.x = edge;
      cloud.node.setPosition(pos);
    }
    if (this.starting) {
      this.startTransitionTime += Math.min(dt, 0.1);
      const progress = math.clamp01(this.startTransitionTime / 0.42);
      if (this.transitionOpacity) this.transitionOpacity.opacity = Math.round(255 * progress);
      if (this.gameSceneReady && this.startTransitionTime >= 0.42) {
        this.starting = false;
        SceneNavigator.game();
      }
    }
  }

  private buildHome(): void {
    const topCoin = this.createPanel('CoinBadge', this.node, 180, 70, new Color(0, 0, 0, 82), 35);
    topCoin.setPosition(-430, 865, 0);
    this.coinLabel = this.createLabel('CoinCount', topCoin, '💰 0', 29, new Color(255, 215, 0, 255));
    const settings = this.createButton('SettingsButton', this.node, '⚙', 70, 70, new Color(255, 255, 255, 38), 31, 35);
    settings.setPosition(450, 865, 0);
    settings.on(Button.EventType.CLICK, () => this.openSettings(), this);

    const logo = this.createNode('LogoArea', this.node);
    logo.setPosition(0, 590, 0);
    logo.addComponent(UITransform).setContentSize(650, 330);
    if (this.logoSpriteFrame) {
      const art = this.createNode('LogoSprite', logo);
      art.addComponent(UITransform).setContentSize(190, 140);
      const sprite = art.addComponent(Sprite); sprite.spriteFrame = this.logoSpriteFrame;
      art.setPosition(0, 82, 0);
    } else {
      const icon = this.createLabel('LogoCloud', logo, '☁️', 96, Color.WHITE);
      icon.node.setPosition(0, 96, 0);
    }
    this.createLabel('GameTitle', logo, '蹦蹦云', 82, Color.WHITE).node.setPosition(0, 5, 0);
    this.createLabel('Subtitle', logo, '向上跳跃，收集星光 ✨', 28, new Color(255, 255, 255, 190)).node.setPosition(0, -67, 0);
    this.createLabel('TapHint', logo, '点击下方按钮开始冒险', 20, new Color(255, 255, 255, 92)).node.setPosition(0, -112, 0);

    const start = this.createButton('StartButton', this.node, '🚀  开始游戏', 660, 100, new Color(245, 87, 108, 255), 36, 44);
    start.setPosition(0, 310, 0);
    start.on(Button.EventType.CLICK, this.startGame, this);

    const entries: Array<{ name: string; icon: string; label: string; desc: string; action: () => void; accent: Color }> = [
      { name: 'SkinCard', icon: '🎨', label: '皮肤', desc: '更换角色外观', action: () => this.openSkins(), accent: new Color(79, 172, 254, 255) },
      { name: 'RankCard', icon: '🏆', label: '排行榜', desc: '查看最高分', action: () => this.openRanking(), accent: new Color(255, 190, 40, 255) },
      { name: 'SkillCard', icon: '⚡', label: '技能商店', desc: '购买强力技能', action: () => this.openSkills(), accent: new Color(176, 137, 219, 255) },
      { name: 'StatsCard', icon: '📊', label: '我的统计', desc: '查看游戏数据', action: () => this.openStats(), accent: new Color(120, 120, 220, 255) },
      { name: 'SettingsCard', icon: '🔧', label: '设置', desc: '音效与选项', action: () => this.openSettings(), accent: new Color(102, 166, 255, 255) },
      { name: 'ShareCard', icon: '📱', label: '分享', desc: '邀请好友挑战', action: () => this.share(), accent: new Color(67, 233, 123, 255) },
    ];
    entries.forEach((entry, index) => {
      const card = this.createFeatureCard(entry.name, entry.icon, entry.label, entry.desc, entry.accent);
      card.setPosition(index % 2 === 0 ? -170 : 170, 140 - Math.floor(index / 2) * 175, 0);
      card.on(Button.EventType.CLICK, entry.action, this);
    });

    this.statusLabel = this.createLabel('HomeStatus', this.node, '👆 按住屏幕左侧或右侧移动', 22, new Color(255, 255, 255, 175));
    this.statusLabel.node.setPosition(0, -620, 0);
    this.createLabel('Version', this.node, `v${GAME.version} · HTML 高清复刻`, 18, new Color(255, 255, 255, 76)).node.setPosition(0, -850, 0);
    this.buildTransitionOverlay();
  }

  private buildBackground(): void {
    const background = this.createNode('HomeBackground', this.node);
    background.setSiblingIndex(0);
    background.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    const graphics = background.addComponent(Graphics);
    const colors = [new Color(15, 12, 41), new Color(48, 43, 99), new Color(36, 36, 62)];
    for (let i = 0; i < 48; i += 1) {
      const t = i / 47;
      const segment = Math.min(1, Math.floor(t * 2));
      const local = t * 2 - segment;
      graphics.fillColor = this.mix(colors[segment], colors[segment + 1], local);
      const bandHeight = this.viewportHeight / 48;
      graphics.rect(-this.viewportWidth * 0.5, this.viewportHeight * 0.5 - (i + 1) * bandHeight, this.viewportWidth, bandHeight + 2); graphics.fill();
    }
    for (let i = 0; i < 50; i += 1) {
      const star = this.createNode(`HomeParticle_${i}`, background);
      star.setPosition(
        -this.viewportWidth * 0.47 + ((i * 181) % Math.max(1, this.viewportWidth * 0.94)),
        -this.viewportHeight * 0.47 + ((i * 277) % Math.max(1, this.viewportHeight * 0.94)),
        0,
      );
      const art = star.addComponent(Graphics);
      art.fillColor = new Color(255, 255, 255, 30 + (i % 5) * 18);
      art.circle(0, 0, 1.5 + (i % 4)); art.fill();
      this.particles.push({ node: star, phase: i * 0.71, speed: 0.8 + (i % 6) * 0.17 });
    }
    for (let i = 0; i < 6; i += 1) {
      const width = 150 + (i % 3) * 54;
      const cloud = this.createNode(`AmbientCloud_${i}`, background);
      cloud.setPosition(-470 + i * 180, -520 + ((i * 317) % 1200), 0);
      const art = cloud.addComponent(Graphics);
      art.fillColor = new Color(255, 255, 255, 12 + (i % 3) * 5);
      art.ellipse(0, 0, width * 0.5, 28); art.ellipse(-width * 0.2, 12, width * 0.25, 30); art.ellipse(width * 0.2, 10, width * 0.22, 26); art.fill();
      this.clouds.push({ node: cloud, width, speed: (8 + i * 2) * (i % 2 === 0 ? 1 : -1) });
    }
  }

  private openSkins(): void {
    const panel = this.openOverlay('SkinOverlay', '🎨 选择皮肤', 880, 1100);
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    const selected = StorageService.getNumber('cloudBounceSkin', 0);
    SKINS.forEach((skin, index) => {
      const item = this.createPanel(`Skin_${skin.id}`, panel, 230, 235, new Color(255, 255, 255, selected === index ? 34 : 16), 24);
      item.setPosition((index % 3 - 1) * 260, 260 - Math.floor(index / 3) * 275, 0);
      const preview = this.createNode(`Preview_${skin.id}`, item);
      preview.setPosition(0, 48, 0);
      const art = preview.addComponent(Graphics);
      art.fillColor = Color.fromHEX(new Color(), skin.accentColor); art.circle(0, 0, 45); art.fill();
      art.fillColor = Color.fromHEX(new Color(), skin.midColor); art.circle(-7, 8, 37); art.fill();
      art.fillColor = Color.fromHEX(new Color(), skin.eyeColor); art.circle(-12, 10, 4); art.circle(12, 10, 4); art.fill();
      this.createLabel(`Name_${skin.id}`, item, skin.name, 25, Color.WHITE).node.setPosition(0, -28, 0);
      const unlocked = coins >= skin.unlockCost;
      this.createLabel(`Lock_${skin.id}`, item, unlocked ? (selected === index ? '✅ 使用中' : '点击使用') : `🔒 ${skin.unlockCost} 币`, 18, unlocked ? new Color(255, 229, 140, 255) : new Color(255, 255, 255, 100)).node.setPosition(0, -75, 0);
      const button = item.addComponent(Button);
      button.interactable = unlocked;
      if (unlocked) item.on(Button.EventType.CLICK, () => { StorageService.setNumber('cloudBounceSkin', index); this.openSkins(); }, this);
      this.addPressFeedback(item);
    });
    this.addCloseButton(panel, -455);
  }

  private openSkills(): void {
    const panel = this.openOverlay('SkillOverlay', '⚡ 技能商店', 900, 1500);
    const data = LegacyProgression.loadSkills();
    const active = LegacyProgression.loadActiveSkills();
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    SKILLS.forEach((skill, index) => {
      const entry = data[skill.id];
      const card = this.createPanel(`Skill_${skill.id}`, panel, 760, 165, new Color(255, 255, 255, active.indexOf(skill.id) >= 0 ? 32 : 15), 24);
      card.setPosition(0, 480 - index * 185, 0);
      this.createLabel(`Icon_${skill.id}`, card, skill.icon, 47, Color.WHITE).node.setPosition(-315, 28, 0);
      const title = this.createLabel(`Title_${skill.id}`, card, `${skill.name}  Lv.${entry.level}`, 28, Color.WHITE);
      title.horizontalAlign = HorizontalTextAlignment.LEFT; title.node.setPosition(-175, 39, 0);
      const desc = this.createLabel(`Desc_${skill.id}`, card, skill.description, 19, new Color(255, 255, 255, 150));
      desc.horizontalAlign = HorizontalTextAlignment.LEFT; desc.node.setPosition(-70, -20, 0); desc.node.getComponent(UITransform)?.setContentSize(520, 50);
      const actionText = entry.owned ? (active.indexOf(skill.id) >= 0 ? '🟢 已装备' : '⚪ 点击装备')
        : skill.unlockLevel > 1 ? `通关 ${skill.unlockLevel} 关`
          : `需要 ${skill.coinCost} 💰`;
      const action = this.createButton(`Action_${skill.id}`, card, actionText, 235, 62, new Color(102, 126, 234, 210), 19, 22);
      action.setPosition(245, 38, 0);
      action.on(Button.EventType.CLICK, () => this.handleSkillAction(skill.id, coins), this);
    });
    this.addCloseButton(panel, -665);
  }

  private handleSkillAction(id: SkillId, coins: number): void {
    const data = LegacyProgression.loadSkills();
    let message = '';
    if (data[id].owned) message = LegacyProgression.toggleActive(id).reason;
    else {
      const result = LegacyProgression.buySkill(id, coins);
      message = result.reason;
      if (result.bought) StorageService.setNumber('cloudBounceCoins', result.coins);
    }
    this.refreshCoins();
    this.openSkills();
    if (this.statusLabel) this.statusLabel.string = message;
  }

  private openRanking(): void {
    const panel = this.openOverlay('RankOverlay', '🏆 排行榜', 820, 1180);
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    if (ranking.length === 0) {
      this.createLabel('RankEmpty', panel, '🎮 暂无记录\n快去玩游戏创造你的分数吧！', 29, new Color(255, 255, 255, 110)).node.setPosition(0, 60, 0);
    } else ranking.slice(0, 10).forEach((score, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      const row = this.createPanel(`Rank_${index}`, panel, 680, 72, new Color(255, 255, 255, index < 3 ? 20 : 8), 18);
      row.setPosition(0, 385 - index * 82, 0);
      this.createLabel(`RankPos_${index}`, row, medal, 26, index === 0 ? new Color(255, 215, 0) : Color.WHITE).node.setPosition(-260, 0, 0);
      this.createLabel(`RankName_${index}`, row, '玩家', 23, new Color(255, 255, 255, 205)).node.setPosition(-70, 0, 0);
      this.createLabel(`RankScore_${index}`, row, `${score}`, 26, new Color(255, 215, 0, 255)).node.setPosition(240, 0, 0);
    });
    this.addCloseButton(panel, -490);
  }

  private openStats(): void {
    const panel = this.openOverlay('StatsOverlay', '📊 我的统计', 820, 820);
    const skills = LegacyProgression.loadSkills();
    const rows = [
      ['🪙 总金币', `${StorageService.getNumber('cloudBounceCoins', 0)}`],
      ['🏅 最高分', `${StorageService.getNumber('cloudBounceBest', 0)}`],
      ['🎮 已解锁皮肤', `${SKINS.filter((skin) => StorageService.getNumber('cloudBounceCoins', 0) >= skin.unlockCost).length}/${SKINS.length}`],
      ['⚡ 已购技能', `${Object.keys(skills).filter((id) => skills[id as SkillId].owned).length}/${SKILLS.length}`],
    ];
    rows.forEach(([label, value], index) => {
      const row = this.createPanel(`Stat_${index}`, panel, 670, 92, new Color(255, 255, 255, 8), 16);
      row.setPosition(0, 190 - index * 112, 0);
      const left = this.createLabel(`StatLabel_${index}`, row, label, 25, new Color(255, 255, 255, 175));
      left.horizontalAlign = HorizontalTextAlignment.LEFT; left.node.setPosition(-160, 0, 0);
      const right = this.createLabel(`StatValue_${index}`, row, value, 30, Color.WHITE);
      right.horizontalAlign = HorizontalTextAlignment.RIGHT; right.node.setPosition(210, 0, 0);
    });
    this.addCloseButton(panel, -300);
  }

  private openSettings(): void {
    const panel = this.openOverlay('SettingsOverlay', '⚙️ 设置', 760, 790);
    const rows: Array<{ label: string; value: string; action?: () => void }> = [
      { label: '🔊 音效', value: AudioManager.soundEnabled ? '开' : '关', action: () => { AudioManager.setSoundEnabled(!AudioManager.soundEnabled); this.openSettings(); } },
      { label: '🎵 音乐', value: AudioManager.musicEnabled ? '开' : '关', action: () => { AudioManager.setMusicEnabled(!AudioManager.musicEnabled); this.openSettings(); } },
      { label: '🌙 深色模式', value: '始终开启' },
    ];
    rows.forEach((row, index) => {
      const item = this.createPanel(`Setting_${index}`, panel, 620, 105, new Color(255, 255, 255, 8), 18);
      item.setPosition(0, 145 - index * 125, 0);
      const label = this.createLabel(`SettingLabel_${index}`, item, row.label, 26, new Color(255, 255, 255, 215));
      label.horizontalAlign = HorizontalTextAlignment.LEFT; label.node.setPosition(-145, 0, 0);
      const value = this.createLabel(`SettingValue_${index}`, item, row.value, 23, new Color(180, 195, 255, 220));
      value.horizontalAlign = HorizontalTextAlignment.RIGHT; value.node.setPosition(200, 0, 0);
      if (row.action) { item.addComponent(Button); item.on(Button.EventType.CLICK, row.action, this); this.addPressFeedback(item); }
    });
    this.addCloseButton(panel, -300);
  }

  private openOverlay(name: string, title: string, width: number, height: number): Node {
    this.closeOverlay();
    this.overlay = this.createNode(name, this.node);
    this.overlay.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    const veil = this.overlay.addComponent(Graphics); veil.fillColor = new Color(0, 0, 0, 178); veil.rect(-this.viewportWidth * 0.5, -this.viewportHeight * 0.5, this.viewportWidth, this.viewportHeight); veil.fill();
    const panel = this.createPanel(`${name}Panel`, this.overlay, width, height, new Color(26, 26, 46, 250), 48);
    this.createLabel(`${name}Title`, panel, title, 43, Color.WHITE).node.setPosition(0, height * 0.5 - 85, 0);
    panel.setScale(0.92, 0.92, 1);
    tween(panel).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    return panel;
  }

  private addCloseButton(panel: Node, y: number): void {
    const close = this.createButton('CloseButton', panel, '关闭', 320, 78, new Color(255, 255, 255, 28), 26, 28);
    close.setPosition(0, y, 0);
    close.on(Button.EventType.CLICK, this.closeOverlay, this);
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    Tween.stopAllByTarget(this.overlay);
    this.overlay.destroy();
    this.overlay = null;
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.startTransitionTime = 0;
    this.gameSceneReady = false;
    if (this.transitionOverlay) this.transitionOverlay.active = true;
    if (this.transitionOpacity) this.transitionOpacity.opacity = 0;
    if (this.statusLabel) this.statusLabel.string = '准备开始...';
    SceneNavigator.preload('Game', undefined, () => { this.gameSceneReady = true; });
  }

  private buildTransitionOverlay(): void {
    this.transitionOverlay = this.createNode('TransitionOverlay', this.node);
    this.transitionOverlay.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    const art = this.transitionOverlay.addComponent(Graphics);
    art.fillColor = new Color(255, 255, 255, 245);
    art.rect(-this.viewportWidth * 0.5, -this.viewportHeight * 0.5, this.viewportWidth, this.viewportHeight); art.fill();
    art.fillColor = new Color(245, 87, 108, 80);
    for (let i = 0; i < 22; i += 1) {
      const angle = i * 2.399;
      const radius = 60 + (i % 6) * 68;
      art.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 5 + (i % 4) * 3); art.fill();
    }
    this.transitionOpacity = this.transitionOverlay.addComponent(UIOpacity);
    this.transitionOpacity.opacity = 0;
    this.transitionOverlay.active = false;
  }

  private share(): void {
    DouyinBridge.share(`蹦蹦云 | 我的最高分是 ${StorageService.getNumber('cloudBounceBest', 0)} 分！`);
    if (this.statusLabel) this.statusLabel.string = DouyinBridge.isDouyin ? '已打开分享入口' : '分享功能将在抖音环境启用';
  }

  private refreshCoins(): void {
    if (this.coinLabel) this.coinLabel.string = `💰 ${StorageService.getNumber('cloudBounceCoins', 0)}`;
  }

  private createFeatureCard(name: string, icon: string, title: string, desc: string, accent: Color): Node {
    const card = this.createPanel(name, this.node, 320, 150, new Color(255, 255, 255, 24), 30);
    card.addComponent(Button);
    const stripe = card.getComponent(Graphics)!; stripe.fillColor = accent; stripe.roundRect(-160, 69, 320, 6, 3); stripe.fill();
    this.createLabel(`${name}Icon`, card, icon, 44, Color.WHITE).node.setPosition(0, 33, 0);
    this.createLabel(`${name}Title`, card, title, 25, Color.WHITE).node.setPosition(0, -16, 0);
    this.createLabel(`${name}Desc`, card, desc, 17, new Color(255, 255, 255, 125)).node.setPosition(0, -50, 0);
    this.addPressFeedback(card);
    return card;
  }

  private createButton(name: string, parent: Node, text: string, width: number, height: number, color: Color, fontSize: number, radius: number): Node {
    const node = this.createPanel(name, parent, width, height, color, radius);
    node.addComponent(Button);
    this.createLabel(`${name}Label`, node, text, fontSize, Color.WHITE);
    this.addPressFeedback(node);
    return node;
  }

  private createPanel(name: string, parent: Node, width: number, height: number, color: Color, radius: number): Node {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color; graphics.roundRect(-width * 0.5, -height * 0.5, width, height, radius); graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 38); graphics.lineWidth = 2;
    graphics.roundRect(-width * 0.5 + 1, -height * 0.5 + 1, width - 2, height - 2, Math.max(1, radius - 1)); graphics.stroke();
    return node;
  }

  private addPressFeedback(node: Node): void {
    const base = new Vec3();
    node.on(Node.EventType.TOUCH_START, () => { node.getScale(base); node.setScale(base.x * 0.96, base.y * 0.96, 1); }, this);
    const restore = (): void => node.setScale(base);
    node.on(Node.EventType.TOUCH_END, restore, this);
    node.on(Node.EventType.TOUCH_CANCEL, restore, this);
  }

  private createLabel(name: string, parent: Node, text: string, size: number, color: Color): Label {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(640, Math.max(62, size + 18));
    const label = node.addComponent(Label);
    label.string = text; label.fontSize = size; label.lineHeight = size + 9; label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER;
    return label;
  }

  private createNode(name: string, parent: Node): Node {
    const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node;
  }

  private mix(a: Color, b: Color, t: number): Color {
    const value = math.clamp01(t);
    return new Color(Math.round(a.r + (b.r - a.r) * value), Math.round(a.g + (b.g - a.g) * value), Math.round(a.b + (b.b - a.b) * value), 255);
  }
}
