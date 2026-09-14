import {
  _decorator, BlockInputEvents, Button, Camera, Color, Component, EventTouch, Graphics,
  HorizontalTextAlignment, input, Input, Label, Mask, Node, ScrollView, Sprite, SpriteFrame,
  Tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment, math, tween, view,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { GAME, SKILLS, SKINS, SkillId } from '../core/GameConfig';
import { LegacyProgression } from '../core/LegacyProgression';
import { PlatformService } from '../platform/PlatformService';
import { StorageService } from '../platform/StorageService';
import { SceneNavigator } from './SceneNavigator';
import { UiKit } from './UiKit';
const { ccclass, property } = _decorator;

interface HomeParticle { node: Node; phase: number; speed: number; }
interface HomeCloud { node: Node; speed: number; width: number; }

const HOME_DARK_MODE_KEY = 'cloudBounceDarkMode';
const START_TRANSITION_SECONDS = 0.78;

@ccclass('HomeSceneBootstrap')
export class HomeSceneBootstrap extends Component {
  @property(SpriteFrame)
  logoSpriteFrame: SpriteFrame | null = null;

  private coinLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private overlay: Node | null = null;
  private homeContent: Node | null = null;
  private homeContentOpacity: UIOpacity | null = null;
  private startButton: Button | null = null;
  private homeBackground: Graphics | null = null;
  private darkMode = true;
  private elapsed = 0;
  private starting = false;
  private gameSceneReady = false;
  private transitionAnimationReady = false;
  private sceneLoadRequested = false;
  private transitionOverlay: Node | null = null;
  private transitionOpacity: UIOpacity | null = null;
  private viewportWidth = 1080;
  private viewportHeight = 1920;
  private readonly particles: HomeParticle[] = [];
  private readonly clouds: HomeCloud[] = [];
  // 浏览器端自动播放受限：进入主页先尝试播 BGM，并把首次任意输入作为播放兜底时机。
  private readonly handleAudioUnlock = (): void => AudioManager.startMusic();

  onLoad(): void {
    this.darkMode = StorageService.getJSON<boolean>(HOME_DARK_MODE_KEY, true) !== false;
    const visible = view.getVisibleSize();
    this.viewportWidth = visible.width;
    this.viewportHeight = visible.height;
    this.node.getComponent(UITransform)?.setContentSize(visible.width, visible.height);
    const camera = this.node.getChildByName('Camera')?.getComponent(Camera);
    if (camera) camera.orthoHeight = visible.height * 0.5;
    this.buildBackground();
    this.buildHome();
    input.on(Input.EventType.TOUCH_START, this.handleAudioUnlock);
    input.on(Input.EventType.KEY_DOWN, this.handleAudioUnlock);
  }

  onEnable(): void {
    this.refreshCoins();
    AudioManager.startMusic();
  }

  protected onDestroy(): void {
    input.off(Input.EventType.TOUCH_START, this.handleAudioUnlock);
    input.off(Input.EventType.KEY_DOWN, this.handleAudioUnlock);
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
    this.tryEnterGame();
  }

  private buildHome(): void {
    this.homeContent = this.createNode('HomeContent', this.node);
    this.homeContentOpacity = this.homeContent.addComponent(UIOpacity);
    const topCoin = this.createPanel('CoinBadge', this.homeContent, 240, 86, new Color(0, 0, 0, 82), 43);
    topCoin.setPosition(-440, 880, 0);
    // HTML §2.2：金币徽章金色描边 + 金字
    const coinBorder = topCoin.getComponent(Graphics);
    if (coinBorder) {
      coinBorder.strokeColor = new Color(255, 215, 0, 51);
      coinBorder.lineWidth = 3;
      coinBorder.roundRect(-117, -40, 234, 80, 40);
      coinBorder.stroke();
    }
    this.coinLabel = this.createLabel('CoinCount', topCoin, '💰 0', 34, new Color(255, 215, 0, 255));
    UiKit.styleLabel(this.coinLabel, { shadowColor: new Color(0, 0, 0, 102) });
    const settings = this.createButton('SettingsButton', this.homeContent, '⚙', 80, 80, new Color(255, 255, 255, 38), 40, 38);
    settings.setPosition(450, 880, 0);
    settings.on(Button.EventType.CLICK, () => this.openSettings(), this);

    const logo = this.createNode('LogoArea', this.homeContent);
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
    const gameTitle = this.createLabel('GameTitle', logo, '蹦蹦云', 82, Color.WHITE);
    UiKit.styleLabel(gameTitle, { shadowColor: new Color(0, 0, 0, 77) });
    gameTitle.node.setPosition(0, 5, 0);
    this.createLabel('Subtitle', logo, '向上跳跃，收集星光 ✨', 28, new Color(255, 255, 255, 190)).node.setPosition(0, -67, 0);
    this.createLabel('TapHint', logo, '点击下方按钮开始冒险', 20, new Color(255, 255, 255, 92)).node.setPosition(0, -112, 0);

    const start = this.createStartButton();
    start.setPosition(0, 310, 0);
    start.on(Button.EventType.CLICK, this.startGame, this);
    this.startButton = start.getComponent(Button);

    const entries: Array<{ name: string; icon: string; label: string; desc: string; action: () => void; accent: readonly [string, string] }> = [
      { name: 'SkinCard', icon: '🎨', label: '皮肤', desc: '更换角色外观', action: () => this.openSkins(), accent: UiKit.CARD_ACCENTS.skin },
      { name: 'RankCard', icon: '🏆', label: '排行榜', desc: '查看最高分', action: () => this.openRanking(), accent: UiKit.CARD_ACCENTS.rank },
      { name: 'SkillCard', icon: '⚡', label: '技能商店', desc: '购买强力技能', action: () => this.openSkills(), accent: UiKit.CARD_ACCENTS.skill },
      { name: 'StatsCard', icon: '📊', label: '我的统计', desc: '查看游戏数据', action: () => this.openStats(), accent: UiKit.CARD_ACCENTS.stats },
      { name: 'SettingsCard', icon: '🔧', label: '设置', desc: '音效与选项', action: () => this.openSettings(), accent: UiKit.CARD_ACCENTS.settings },
      { name: 'ShareCard', icon: '📱', label: '分享', desc: '邀请好友挑战', action: () => this.share(), accent: UiKit.CARD_ACCENTS.share },
    ];
    entries.forEach((entry, index) => {
      const card = this.createFeatureCard(entry.name, entry.icon, entry.label, entry.desc, entry.accent);
      card.setPosition(index % 2 === 0 ? -262 : 262, 120 - Math.floor(index / 2) * 265, 0);
      card.on(Button.EventType.CLICK, entry.action, this);
    });

    this.statusLabel = this.createLabel('HomeStatus', this.homeContent, '👆 按住屏幕左侧或右侧移动', 24, new Color(255, 255, 255, 175));
    this.statusLabel.node.setPosition(0, -700, 0);
    this.createLabel('Version', this.homeContent, `v${GAME.version} · HTML 高清复刻`, 18, new Color(255, 255, 255, 76)).node.setPosition(0, -870, 0);
    this.playHomeEntrance();
    this.buildTransitionOverlay();
  }

  // 开始按钮：HTML §2.4 三段渐变 + 外发光投影 + 常驻呼吸光晕 + 按下 0.97
  private createStartButton(): Node {
    const node = this.createNode('StartButton', this.homeContent);
    node.addComponent(UITransform).setContentSize(1000, 130);
    const glow = this.createNode('StartGlow', node);
    const glowArt = glow.addComponent(Graphics);
    for (let layer = 3; layer >= 1; layer -= 1) {
      glowArt.fillColor = new Color(240, 147, 251, Math.round(30 / layer));
      const grow = layer * 12;
      glowArt.roundRect(-500 - grow, -65 - grow, 1000 + grow * 2, 130 + grow * 2, 52 + grow);
      glowArt.fill();
    }
    const glowOpacity = glow.addComponent(UIOpacity);
    tween(glowOpacity).repeatForever(tween().to(1.25, { opacity: 90 }).to(1.25, { opacity: 255 })).start();
    const background = this.createNode('StartBackground', node);
    const art = background.addComponent(Graphics);
    UiKit.drawDropShadow(art, 1000, 130, 40, 18, 110);
    UiKit.fillRoundedVerticalGradient(art, 1000, 130, 40, UiKit.START_GRADIENT);
    art.strokeColor = new Color(255, 255, 255, 51);
    art.lineWidth = 3;
    art.roundRect(-497, -62, 994, 124, 38);
    art.stroke();
    const label = UiKit.label(node, 'StartButtonLabel', '🚀  开始游戏', 52, Color.WHITE, { shadowColor: new Color(0, 0, 0, 77) });
    label.node.setPosition(0, 0, 0);
    node.addComponent(Button);
    UiKit.pressFeedback(node, 0.97);
    return node;
  }

  // 入场：logo 落下淡入 + 卡片依次浮现（HTML floatUp / cardIn 的等价物）
  private playHomeEntrance(): void {
    const content = this.homeContent;
    if (!content) return;
    const logo = content.getChildByName('LogoArea');
    if (logo) {
      const logoTarget = logo.position.clone();
      logo.setPosition(logoTarget.x, logoTarget.y - 30, 0);
      const logoOpacity = logo.addComponent(UIOpacity);
      logoOpacity.opacity = 0;
      tween(logoOpacity).to(1, { opacity: 255 }).start();
      tween(logo).to(1, { position: logoTarget }, { easing: 'cubicOut' }).start();
    }
    const cards = ['SkinCard', 'RankCard', 'SkillCard', 'StatsCard', 'SettingsCard', 'ShareCard'];
    cards.forEach((name, index) => {
      const card = content.getChildByName(name);
      if (!card) return;
      const target = card.position.clone();
      card.setPosition(target.x, target.y - 20, 0);
      card.setScale(0.95, 0.95, 1);
      const opacity = card.addComponent(UIOpacity);
      opacity.opacity = 0;
      tween(opacity).delay(0.15 + index * 0.08).to(0.45, { opacity: 255 }).start();
      tween(card).delay(0.15 + index * 0.08).to(0.45, { position: target, scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    });
  }

  private buildBackground(): void {
    const background = this.createNode('HomeBackground', this.node);
    background.setSiblingIndex(0);
    background.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    const graphics = background.addComponent(Graphics);
    this.homeBackground = graphics;
    this.redrawHomeGradient();
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

  private redrawHomeGradient(): void {
    const graphics = this.homeBackground;
    if (!graphics) return;
    const colors = this.darkMode
      ? [new Color(15, 12, 41), new Color(48, 43, 99), new Color(36, 36, 62)]
      : [new Color(91, 134, 229), new Color(126, 175, 236), new Color(177, 210, 238)];
    UiKit.fillVerticalGradient(graphics, this.viewportWidth, this.viewportHeight, colors, 128);
  }

  private openSkins(): void {
    const panel = this.openOverlay('SkinOverlay', '🎨 选择皮肤', 880, 1100);
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    const selected = StorageService.getNumber('cloudBounceSkin', 0);
    SKINS.forEach((skin, index) => {
      const isSelected = selected === index;
      const unlocked = coins >= skin.unlockCost;
      const item = this.createPanel(`Skin_${skin.id}`, panel, 230, 235, new Color(255, 255, 255, isSelected ? 34 : 16), 24);
      item.setPosition((index % 3 - 1) * 260, 260 - Math.floor(index / 3) * 275, 0);
      // HTML §3.3：选中 = #ffd700 边框 + 金色透明底
      if (isSelected) {
        const selectedBorder = item.getComponent(Graphics);
        if (selectedBorder) {
          selectedBorder.strokeColor = new Color(255, 215, 0, 230);
          selectedBorder.lineWidth = 5;
          selectedBorder.roundRect(-111, -113, 222, 226, 22);
          selectedBorder.stroke();
        }
      }
      if (!unlocked) item.addComponent(UIOpacity).opacity = 128;
      const preview = this.createNode(`Preview_${skin.id}`, item);
      preview.setPosition(0, 48, 0);
      const art = preview.addComponent(Graphics);
      art.fillColor = Color.fromHEX(new Color(), skin.accentColor); art.circle(0, 0, 45); art.fill();
      art.fillColor = Color.fromHEX(new Color(), skin.midColor); art.circle(-7, 8, 37); art.fill();
      art.fillColor = Color.fromHEX(new Color(), skin.eyeColor); art.circle(-12, 10, 4); art.circle(12, 10, 4); art.fill();
      this.createLabel(`Name_${skin.id}`, item, skin.name, 25, Color.WHITE).node.setPosition(0, -28, 0);
      this.createLabel(`Lock_${skin.id}`, item, unlocked ? (isSelected ? '✅ 使用中' : '点击使用') : `🔒 ${skin.unlockCost} 币`, 18, unlocked ? new Color(255, 229, 140, 255) : new Color(255, 255, 255, 100)).node.setPosition(0, -75, 0);
      const button = item.addComponent(Button);
      button.interactable = unlocked;
      if (unlocked) item.on(Button.EventType.CLICK, () => { StorageService.setNumber('cloudBounceSkin', index); this.openSkins(); }, this);
      this.addPressFeedback(item);
    });
    this.addCloseButton(panel, -455);
  }

  private openSkills(): void {
    const panel = this.openOverlay('SkillOverlay', '⚡ 技能商店', 900, 1180);
    const data = LegacyProgression.loadSkills();
    const active = LegacyProgression.loadActiveSkills();
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    // HTML §3.5：横卡列表放进可滚动视窗（修复小屏溢出）
    const viewNode = this.createNode('SkillScrollView', panel);
    viewNode.addComponent(UITransform).setContentSize(800, 860);
    viewNode.setPosition(0, -60, 0);
    const mask = viewNode.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_STENCIL;
    const maskArt = viewNode.getComponent(Graphics) ?? viewNode.addComponent(Graphics);
    maskArt.roundRect(-400, -430, 800, 860, 24);
    maskArt.fill();
    const content = this.createNode('SkillContent', viewNode);
    const contentTransform = content.addComponent(UITransform);
    contentTransform.setAnchorPoint(0.5, 1);
    contentTransform.setContentSize(800, SKILLS.length * 190 + 20);
    content.setPosition(0, 430, 0);
    const scrollView = viewNode.addComponent(ScrollView);
    scrollView.content = content;
    scrollView.horizontal = false;
    scrollView.vertical = true;
    SKILLS.forEach((skill, index) => {
      const entry = data[skill.id];
      const equipped = active.indexOf(skill.id) >= 0;
      const card = this.createPanel(`Skill_${skill.id}`, content, 760, 165, new Color(255, 255, 255, equipped ? 32 : 15), 24);
      card.setPosition(0, -102 - index * 190, 0);
      // HTML §3.5：图标 44×44 专属渐变底
      const iconBlock = this.createNode(`IconBlock_${skill.id}`, card);
      iconBlock.addComponent(UITransform).setContentSize(110, 110);
      iconBlock.setPosition(-295, 0, 0);
      const iconArt = iconBlock.addComponent(Graphics);
      const gradient = UiKit.SKILL_GRADIENTS[skill.id] ?? UiKit.PRIMARY_GRADIENT;
      UiKit.fillRoundedVerticalGradient(iconArt, 110, 110, 30, gradient);
      this.createLabel(`Icon_${skill.id}`, iconBlock, skill.icon, 47, Color.WHITE).node.setPosition(0, 0, 0);
      const title = this.createLabel(`Title_${skill.id}`, card, `${skill.name}  Lv.${entry.level}`, 28, Color.WHITE);
      UiKit.styleLabel(title, { shadow: false });
      title.horizontalAlign = HorizontalTextAlignment.LEFT;
      title.node.getComponent(UITransform)?.setContentSize(340, 40);
      title.node.setPosition(-55, 45, 0);
      const desc = this.createLabel(`Desc_${skill.id}`, card, skill.description, 19, new Color(255, 255, 255, 150));
      desc.horizontalAlign = HorizontalTextAlignment.LEFT;
      desc.node.getComponent(UITransform)?.setContentSize(360, 60);
      desc.node.setPosition(-70, -25, 0);
      const actionText = entry.owned ? (equipped ? '🟢 已装备' : '⚪ 点击装备')
        : skill.unlockLevel > 1 ? `通关 ${skill.unlockLevel} 关`
          : `需要 ${skill.coinCost} 💰`;
      const action = this.createGradientButton(`Action_${skill.id}`, card, actionText, 250, 66, 33, 22);
      action.setPosition(240, 20, 0);
      action.on(Button.EventType.CLICK, () => this.handleSkillAction(skill.id, coins), this);
    });
    this.addCloseButton(panel, -510);
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
    // HTML §3.4：排行榜标题金色
    const titleLabel = panel.getChildByName('RankOverlayTitle')?.getComponent(Label);
    if (titleLabel) titleLabel.color = new Color(255, 215, 0, 255);
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    if (ranking.length === 0) {
      this.createLabel('RankEmpty', panel, '🎮 暂无记录\n快去玩游戏创造你的分数吧！', 29, new Color(255, 255, 255, 110)).node.setPosition(0, 60, 0);
    } else ranking.slice(0, 10).forEach((score, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      // HTML §3.4：前三名整行金/银/铜底色
      const rowColor = index === 0 ? new Color(255, 215, 0, 20)
        : index === 1 ? new Color(192, 192, 192, 15)
          : index === 2 ? new Color(205, 127, 50, 13)
            : new Color(255, 255, 255, 8);
      const row = this.createPanel(`Rank_${index}`, panel, 680, 72, rowColor, 18);
      row.setPosition(0, 385 - index * 82, 0);
      this.createLabel(`RankPos_${index}`, row, medal, 26, index === 0 ? new Color(255, 215, 0) : Color.WHITE).node.setPosition(-260, 0, 0);
      this.createLabel(`RankName_${index}`, row, '玩家', 23, new Color(255, 255, 255, 205)).node.setPosition(-70, 0, 0);
      const scoreLabel = this.createLabel(`RankScore_${index}`, row, `${score}`, 26, new Color(255, 215, 0, 255));
      UiKit.styleLabel(scoreLabel, { shadow: false });
      scoreLabel.node.setPosition(240, 0, 0);
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
    // HTML §3.2：行 = 左标签 + 右开关（无文字值）
    const rows: Array<{ label: string; value: () => boolean; apply: (next: boolean) => void }> = [
      { label: '🔊 音效', value: () => AudioManager.soundEnabled, apply: (next) => AudioManager.setSoundEnabled(next) },
      { label: '🎵 音乐', value: () => AudioManager.musicEnabled, apply: (next) => AudioManager.setMusicEnabled(next) },
      {
        label: '🌙 深色模式', value: () => this.darkMode, apply: (next) => {
          this.darkMode = next;
          StorageService.setJSON(HOME_DARK_MODE_KEY, this.darkMode);
          this.redrawHomeGradient();
        },
      },
    ];
    rows.forEach((row, index) => {
      const y = 225 - index * 165;
      const label = this.createLabel(`SettingLabel_${index}`, panel, row.label, 32, new Color(255, 255, 255, 204));
      UiKit.styleLabel(label, { shadow: false });
      label.horizontalAlign = HorizontalTextAlignment.LEFT;
      label.node.getComponent(UITransform)?.setContentSize(400, 60);
      label.node.setPosition(-280, y, 0);
      UiKit.createToggle(panel, 265, y, row.value(), (setOn) => {
        const next = !row.value();
        row.apply(next);
        setOn(next);
      });
      // 命名为 Setting_N，便于自动化回归定位
      const toggleNode = panel.children[panel.children.length - 1];
      toggleNode.name = `Setting_${index}`;
    });
    this.addCloseButton(panel, -300);
  }

  private openOverlay(name: string, title: string, width: number, height: number): Node {
    this.closeOverlay();
    this.overlay = this.createNode(name, this.node);
    this.overlay.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    this.overlay.addComponent(BlockInputEvents);
    this.blockTouchPropagation(this.overlay);
    // HTML §3.1：遮罩黑 50% + 面板渐变底/圆角 24/白 10% 边/大投影
    const veil = this.overlay.addComponent(Graphics);
    veil.fillColor = new Color(0, 0, 0, 128);
    veil.rect(-this.viewportWidth * 0.5, -this.viewportHeight * 0.5, this.viewportWidth, this.viewportHeight);
    veil.fill();
    const panel = this.createNode(`${name}Panel`, this.overlay);
    panel.addComponent(UITransform).setContentSize(width, height);
    const panelArt = panel.addComponent(Graphics);
    UiKit.drawDropShadow(panelArt, width, height, 48, 24, 128);
    UiKit.fillRoundedVerticalGradient(panelArt, width, height, 48, UiKit.PANEL_GRADIENT);
    panelArt.strokeColor = new Color(255, 255, 255, 26);
    panelArt.lineWidth = 3;
    panelArt.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, 46);
    panelArt.stroke();
    const titlelabel = this.createLabel(`${name}Title`, panel, title, 43, Color.WHITE);
    UiKit.styleLabel(titlelabel);
    titlelabel.node.setPosition(0, height * 0.5 - 85, 0);
    panel.setScale(0.92, 0.92, 1);
    tween(panel).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    return panel;
  }

  private addCloseButton(panel: Node, y: number): void {
    // HTML §3.1 关闭按钮：整宽灰底圆角 14
    const close = this.createButton('CloseButton', panel, '关闭', 480, 96, new Color(255, 255, 255, 26), 28, 34);
    close.setPosition(0, y, 0);
    close.on(Button.EventType.CLICK, this.closeOverlay, this);
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    const closing = this.overlay;
    this.overlay = null;
    Tween.stopAllByTarget(closing);
    // 保留输入阻断到本次触摸派发结束，避免关闭后同一次 TOUCH_END 命中下层按钮。
    this.scheduleOnce(() => closing.destroy(), 0);
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.gameSceneReady = false;
    this.transitionAnimationReady = false;
    this.sceneLoadRequested = false;
    if (this.startButton) this.startButton.interactable = false;
    if (this.transitionOverlay) this.transitionOverlay.active = true;
    if (this.transitionOpacity) this.transitionOpacity.opacity = 0;
    if (this.statusLabel) this.statusLabel.string = '准备开始...';
    this.playStartTransition();
    SceneNavigator.preload('Game', undefined, () => { this.gameSceneReady = true; });
  }

  private buildTransitionOverlay(): void {
    this.transitionOverlay = this.createNode('TransitionOverlay', this.node);
    this.transitionOverlay.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    this.transitionOverlay.addComponent(BlockInputEvents);
    this.blockTouchPropagation(this.transitionOverlay);
    const art = this.transitionOverlay.addComponent(Graphics);
    art.fillColor = new Color(28, 36, 78, 150);
    art.rect(-this.viewportWidth * 0.5, -this.viewportHeight * 0.5, this.viewportWidth, this.viewportHeight); art.fill();
    for (let side = -1; side <= 1; side += 2) {
      const cloud = this.createNode(side < 0 ? 'TransitionCloudLeft' : 'TransitionCloudRight', this.transitionOverlay);
      cloud.addComponent(UITransform).setContentSize(620, 260);
      cloud.setPosition(side * (this.viewportWidth * 0.5 + 330), side * 95, 0);
      const cloudArt = cloud.addComponent(Graphics);
      cloudArt.fillColor = new Color(255, 255, 255, 225);
      cloudArt.ellipse(0, 0, 310, 74);
      cloudArt.ellipse(-145, 45, 150, 100);
      cloudArt.ellipse(120, 40, 175, 108);
      cloudArt.fill();
    }
    const prompt = this.createLabel('TransitionPrompt', this.transitionOverlay, '☁️ 蹦蹦云 · 出发！', 42, Color.WHITE);
    prompt.node.setPosition(0, -225, 0);
    this.transitionOpacity = this.transitionOverlay.addComponent(UIOpacity);
    this.transitionOpacity.opacity = 0;
    this.transitionOverlay.active = false;
  }

  private playStartTransition(): void {
    if (!this.transitionOverlay) return;
    const left = this.transitionOverlay.getChildByName('TransitionCloudLeft');
    const right = this.transitionOverlay.getChildByName('TransitionCloudRight');
    const prompt = this.transitionOverlay.getChildByName('TransitionPrompt');
    if (this.homeContent && this.homeContentOpacity) {
      Tween.stopAllByTarget(this.homeContent);
      Tween.stopAllByTarget(this.homeContentOpacity);
      tween(this.homeContent)
        .to(START_TRANSITION_SECONDS * 0.68, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'sineIn' })
        .start();
      tween(this.homeContentOpacity)
        .to(START_TRANSITION_SECONDS * 0.72, { opacity: 0 }, { easing: 'sineIn' })
        .start();
    }
    if (this.transitionOpacity) {
      Tween.stopAllByTarget(this.transitionOpacity);
      tween(this.transitionOpacity)
        .to(0.16, { opacity: 255 })
        .delay(START_TRANSITION_SECONDS - 0.32)
        .to(0.16, { opacity: 0 })
        .call(() => {
          this.transitionAnimationReady = true;
          this.tryEnterGame();
        })
        .start();
    }
    if (left) {
      tween(left)
        .to(0.42, { position: new Vec3(-95, 95, 0) }, { easing: 'quadOut' })
        .to(0.36, { position: new Vec3(this.viewportWidth * 0.5 + 360, 95, 0) }, { easing: 'quadIn' })
        .start();
    }
    if (right) {
      tween(right)
        .to(0.42, { position: new Vec3(95, -95, 0) }, { easing: 'quadOut' })
        .to(0.36, { position: new Vec3(-this.viewportWidth * 0.5 - 360, -95, 0) }, { easing: 'quadIn' })
        .start();
    }
    if (prompt) {
      const opacity = prompt.getComponent(UIOpacity) ?? prompt.addComponent(UIOpacity);
      opacity.opacity = 0;
      tween(opacity).to(0.18, { opacity: 255 }).delay(0.28).to(0.22, { opacity: 0 }).start();
    }
  }

  private tryEnterGame(): void {
    if (!this.starting || this.sceneLoadRequested || !this.gameSceneReady || !this.transitionAnimationReady) return;
    this.sceneLoadRequested = true;
    this.starting = false;
    SceneNavigator.game();
  }

  private share(): void {
    PlatformService.share(`蹦蹦云 | 我的最高分是 ${StorageService.getNumber('cloudBounceBest', 0)} 分！`);
    if (this.statusLabel) this.statusLabel.string = PlatformService.platform === 'web' ? '分享功能将在小游戏环境启用' : '已打开分享入口';
  }

  private refreshCoins(): void {
    if (this.coinLabel) this.coinLabel.string = `💰 ${StorageService.getNumber('cloudBounceCoins', 0)}`;
  }

  private createFeatureCard(name: string, icon: string, title: string, desc: string, accent: readonly [string, string]): Node {
    const card = this.createPanel(name, this.homeContent ?? this.node, 500, 230, UiKit.CARD_BACKGROUND, 36);
    card.addComponent(Button);
    const stripe = card.getComponent(Graphics)!; UiKit.fillHorizontalGradient(stripe, -250, 79, 500, 9, accent, 4);
    this.createLabel(`${name}Icon`, card, icon, 60, Color.WHITE).node.setPosition(0, 55, 0);
    const cardTitle = this.createLabel(`${name}Title`, card, title, 30, Color.WHITE);
    UiKit.styleLabel(cardTitle, { shadow: false });
    cardTitle.node.setPosition(0, -16, 0);
    this.createLabel(`${name}Desc`, card, desc, 20, new Color(255, 255, 255, 128)).node.setPosition(0, -62, 0);
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

  // 渐变胶囊按钮：UiKit 投影 + 渐变底 + 高光描边（HTML .btn 规格）
  private createGradientButton(name: string, parent: Node, text: string, width: number, height: number, radius: number, fontSize: number, colors: readonly [string, string] = UiKit.PRIMARY_GRADIENT): Node {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(width, height);
    const art = node.addComponent(Graphics);
    UiKit.drawDropShadow(art, width, height, radius, 10, 80);
    UiKit.fillRoundedVerticalGradient(art, width, height, radius, colors);
    art.strokeColor = new Color(255, 255, 255, 51);
    art.lineWidth = 2;
    art.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, Math.max(1, radius - 2));
    art.stroke();
    const label = UiKit.label(node, `${name}Label`, text, fontSize, Color.WHITE, { shadow: false });
    label.node.setPosition(0, 0, 0);
    node.addComponent(Button);
    UiKit.pressFeedback(node, 0.95);
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

  private blockTouchPropagation(node: Node): void {
    const stop = (event: EventTouch): void => {
      event.propagationStopped = true;
    };
    node.on(Node.EventType.TOUCH_START, stop, this);
    node.on(Node.EventType.TOUCH_MOVE, stop, this);
    node.on(Node.EventType.TOUCH_END, stop, this);
    node.on(Node.EventType.TOUCH_CANCEL, stop, this);
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
