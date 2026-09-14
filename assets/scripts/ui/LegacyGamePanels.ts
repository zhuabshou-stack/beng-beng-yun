import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Mask,
  Node, ScrollView, Tween, UITransform, Vec3, VerticalTextAlignment, tween, view,
} from 'cc';
import { GAME, SKILLS, SKINS, SkillId } from '../core/GameConfig';
import { LegacyProgression } from '../core/LegacyProgression';
import { GameManager } from '../game/GameManager';
import { StorageService } from '../platform/StorageService';
import { UiKit } from './UiKit';
const { ccclass } = _decorator;

@ccclass('LegacyGamePanels')
export class LegacyGamePanels extends Component {
  onHomeRequested: (() => void) | null = null;
  private gameManager: GameManager | null = null;
  private overlay: Node | null = null;
  private levelPanel: Node | null = null;
  private toast: Label | null = null;
  private toastRemaining = 0;

  configure(gameManager: GameManager): void {
    this.gameManager = gameManager;
    this.buildToast();
    this.buildLevelPanel();
  }

  update(dt: number): void {
    if (!this.toast || this.toastRemaining <= 0) return;
    this.toastRemaining = Math.max(0, this.toastRemaining - dt);
    this.toast.node.active = this.toastRemaining > 0;
  }

  showToast(message: string): void {
    if (!this.toast) return;
    this.toast.string = message;
    this.toast.node.active = true;
    this.toastRemaining = 1.5;
    this.toast.node.setScale(0.82, 0.82, 1);
    tween(this.toast.node).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
  }

  showSkills(): void {
    const panel = this.openOverlay('GameSkillOverlay', '⚡ 技能商店', 972, 1210);
    const data = LegacyProgression.loadSkills();
    const active = LegacyProgression.loadActiveSkills();
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    SKILLS.forEach((skill, index) => {
      const entry = data[skill.id];
      const card = this.createPanel(`Skill_${skill.id}`, panel, 848, 185, new Color(255, 255, 255, active.indexOf(skill.id) >= 0 ? 34 : 14), 39);
      card.setPosition(0, 415 - index * 210, 0);
      const iconBlock = this.createNode(`IconBlock_${skill.id}`, card);
      iconBlock.addComponent(UITransform).setContentSize(122, 122);
      iconBlock.setPosition(-330, 0, 0);
      const iconArt = iconBlock.addComponent(Graphics);
      const gradient = UiKit.SKILL_GRADIENTS[skill.id] ?? UiKit.PRIMARY_GRADIENT;
      UiKit.fillRoundedVerticalGradient(iconArt, 122, 122, 33, gradient);
      this.createLabel(`Icon_${skill.id}`, iconBlock, skill.icon, 52, Color.WHITE).node.setPosition(0, 0, 0);
      const title = this.createLabel(`Title_${skill.id}`, card, `${skill.name}  Lv.${entry.level}`, 41, Color.WHITE);
      title.horizontalAlign = HorizontalTextAlignment.LEFT; title.node.getComponent(UITransform)?.setContentSize(400, 50); title.node.setPosition(-60, 52, 0);
      const desc = this.createLabel(`Desc_${skill.id}`, card, skill.description, 33, new Color(255, 255, 255, 145));
      desc.horizontalAlign = HorizontalTextAlignment.LEFT; desc.node.getComponent(UITransform)?.setContentSize(420, 70); desc.node.setPosition(-85, -30, 0);
      const actionText = entry.owned ? (active.indexOf(skill.id) >= 0 ? '🟢 已装备' : '⚪ 装备')
        : skill.unlockLevel > (this.gameManager?.currentLevel ?? 1) ? `通关${skill.unlockLevel}关` : `${skill.coinCost} 💰`;
      const action = this.createGradientButton(`Action_${skill.id}`, card, actionText, 290, 80, 40, 26);
      action.setPosition(270, 25, 0);
      action.on(Button.EventType.CLICK, () => this.skillAction(skill.id, coins), this);
    });
    this.addClose(panel, -530, 848);
  }

  showRanking(): void {
    const panel = this.openOverlay('GameRankOverlay', '🏆 排行榜', 752, 1180);
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    if (ranking.length === 0) this.createLabel('RankEmpty', panel, '还没有记录\n快去跳一跳吧！☁️', 39, new Color(255, 255, 255, 110)).node.setPosition(0, 20, 0);
    else ranking.slice(0, 10).forEach((score, index) => {
      const rowColor = index === 0 ? new Color(255, 215, 0, 20)
        : index === 1 ? new Color(192, 192, 192, 15)
          : index === 2 ? new Color(205, 127, 50, 13)
            : new Color(255, 255, 255, 8);
      const row = this.createPanel(`Rank_${index}`, panel, 628, 111, rowColor, 33);
      row.setPosition(0, 415 - index * 125, 0);
      this.createLabel(`Pos_${index}`, row, index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`, 36, Color.WHITE).node.setPosition(-240, 0, 0);
      this.createLabel(`Player_${index}`, row, '玩家', 41, new Color(255, 255, 255, 205)).node.setPosition(-65, 0, 0);
      this.createLabel(`Score_${index}`, row, `${score}`, 44, new Color(255, 215, 0, 255)).node.setPosition(222, 0, 0);
    });
    this.addClose(panel, -490, 628);
  }

  showSkins(): void {
    const panel = this.openOverlay('GameSkinOverlay', '🎨 选择皮肤', 972, 1210);
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    const selected = StorageService.getNumber('cloudBounceSkin', 0);
    // 10 款皮肤滚动视窗（与主页皮肤面板同构）
    const viewNode = this.createNode('SkinScrollView', panel);
    viewNode.addComponent(UITransform).setContentSize(848, 880);
    viewNode.setPosition(0, -75, 0);
    const mask = viewNode.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_STENCIL;
    const maskArt = viewNode.getComponent(Graphics) ?? viewNode.addComponent(Graphics);
    maskArt.roundRect(-424, -440, 848, 880, 24);
    maskArt.fill();
    const content = this.createNode('SkinContent', viewNode);
    const contentTransform = content.addComponent(UITransform);
    contentTransform.setAnchorPoint(0.5, 1);
    contentTransform.setContentSize(848, Math.ceil(SKINS.length / 3) * 415 + 20);
    content.setPosition(0, 440, 0);
    const scrollView = viewNode.addComponent(ScrollView);
    scrollView.content = content;
    scrollView.horizontal = false;
    scrollView.vertical = true;
    SKINS.forEach((skin, index) => {
      const item = this.createPanel(`Skin_${skin.id}`, content, 264, 380, new Color(255, 255, 255, selected === index ? 36 : 15), 51);
      item.setPosition((index % 3 - 1) * 292, -210 - Math.floor(index / 3) * 415, 0);
      if (selected === index) {
        const selectedBorder = item.getComponent(Graphics);
        if (selectedBorder) {
          selectedBorder.strokeColor = new Color(255, 215, 0, 230);
          selectedBorder.lineWidth = 5;
          selectedBorder.roundRect(-128, -186, 256, 372, 49);
          selectedBorder.stroke();
        }
      }
      const preview = this.createNode(`Preview_${skin.id}`, item);
      preview.setPosition(0, 78, 0);
      preview.setScale(2.3, 2.3, 1);
      const art = preview.addComponent(Graphics);
      UiKit.drawCharacter(art, skin);
      this.createLabel(`Name_${skin.id}`, item, skin.name, 33, Color.WHITE).node.setPosition(0, -40, 0);
      const unlocked = coins >= skin.unlockCost;
      this.createLabel(`State_${skin.id}`, item, unlocked ? (selected === index ? '✅ 使用中' : '点击使用') : `🔒 ${skin.unlockCost}币`, 28, new Color(255, 220, 130, unlocked ? 255 : 110)).node.setPosition(0, -115, 0);
      const button = item.addComponent(Button); button.interactable = unlocked;
      if (unlocked) item.on(Button.EventType.CLICK, () => {
        StorageService.setNumber('cloudBounceSkin', index);
        if (this.gameManager) {
          this.gameManager.data.selectedSkin = index;
          this.gameManager.player?.setSkinIndex(index);
        }
        this.showSkins();
      }, this);
      this.addPressFeedback(item);
    });
    this.addClose(panel, -520, 848);
  }

  showLevelComplete(level: number): void {
    if (!this.levelPanel) return;
    this.levelPanel.active = true;
    this.levelPanel.getChildByName('CompleteLevel')!.getComponent(Label)!.string = `第 ${level} 关完成`;
    this.levelPanel.setScale(0.9, 0.9, 1);
    tween(this.levelPanel).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
  }

  private buildLevelPanel(): void {
    this.levelPanel = this.createPanel('LevelComplete', this.node, 886, 1250, new Color(26, 26, 54, 248), 66);
    this.levelPanel.setPosition(0, 0, 0);
    this.createLabel('Celebration', this.levelPanel, '🎉', 164, Color.WHITE).node.setPosition(0, 390, 0);
    const completeTitle = this.createLabel('CompleteTitle', this.levelPanel, '通关成功!', 93, Color.WHITE);
    UiKit.styleLabel(completeTitle);
    completeTitle.node.setPosition(0, 190, 0);
    this.createLabel('CompleteLevel', this.levelPanel, '第 1 关完成', 50, new Color(255, 255, 255, 175)).node.setPosition(0, 80, 0);
    this.createLabel('CompleteReward', this.levelPanel, `+${GAME.levelRewardCoins} 🪙 通关奖励`, 39, new Color(255, 215, 0, 220)).node.setPosition(0, 0, 0);
    const next = this.createGradientButton('NextLevelButton', this.levelPanel, '下一关 ▶', 753, 152, 76, 44);
    next.setPosition(0, -170, 0); next.on(Button.EventType.CLICK, () => { this.levelPanel!.active = false; this.gameManager?.continueNextLevel(); }, this);
    const home = this.createGradientButton('CompleteHomeButton', this.levelPanel, '🏠 回到主页', 753, 125, 62, 44, UiKit.ACCENT_GRADIENT);
    home.setPosition(0, -350, 0); home.on(Button.EventType.CLICK, () => this.onHomeRequested?.(), this);
    this.levelPanel.active = false;
  }

  private buildToast(): void {
    this.toast = this.createLabel('SkillEffectToast', this.node, '', 32, Color.WHITE);
    this.toast.node.setPosition(0, 0, 0);
    this.toast.node.active = false;
  }

  private skillAction(id: SkillId, coins: number): void {
    const data = LegacyProgression.loadSkills();
    let message = '';
    if (data[id].owned) message = LegacyProgression.toggleActive(id).reason;
    else {
      const result = LegacyProgression.buySkill(id, coins, this.gameManager?.currentLevel ?? 1);
      message = result.reason;
      if (result.bought) StorageService.setNumber('cloudBounceCoins', result.coins);
    }
    this.gameManager?.onSkillStateChanged?.();
    this.showSkills();
    this.showToast(message);
  }

  private openOverlay(name: string, title: string, width: number, height: number): Node {
    this.closeOverlay();
    this.overlay = this.createNode(name, this.node);
    const visible = view.getVisibleSize();
    this.overlay.addComponent(UITransform).setContentSize(visible.width, visible.height);
    // HTML §3.1：遮罩黑 50%
    const veil = this.overlay.addComponent(Graphics); veil.fillColor = new Color(0, 0, 0, 128); veil.rect(-visible.width * 0.5, -visible.height * 0.5, visible.width, visible.height); veil.fill();
    // HTML §3.1 面板：渐变底 + 投影 + 白 10% 边
    const panel = this.createNode(`${name}Panel`, this.overlay);
    panel.addComponent(UITransform).setContentSize(width, height);
    const panelArt = panel.addComponent(Graphics);
    UiKit.drawDropShadow(panelArt, width, height, 45, 22, 128);
    UiKit.fillRoundedVerticalGradient(panelArt, width, height, 45, UiKit.PANEL_GRADIENT);
    panelArt.strokeColor = new Color(255, 255, 255, 26); panelArt.lineWidth = 3;
    panelArt.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, 43); panelArt.stroke();
    const titleLabel = this.createLabel(`${name}Title`, panel, title, 42, Color.WHITE);
    UiKit.styleLabel(titleLabel);
    titleLabel.node.setPosition(0, height * 0.5 - 76, 0);
    panel.setScale(0.92, 0.92, 1); tween(panel).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    return panel;
  }

  private addClose(panel: Node, y: number, width = 848): void {
    const close = this.createButton('CloseOverlay', panel, '关闭', width, 122, new Color(255, 255, 255, 26), 34);
    close.setPosition(0, y, 0); close.on(Button.EventType.CLICK, this.closeOverlay, this);
  }

  private createGradientButton(name: string, parent: Node, text: string, width: number, height: number, radius: number, fontSize: number, colors: readonly [string, string] = UiKit.PRIMARY_GRADIENT): Node {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(width, height);
    const art = node.addComponent(Graphics);
    UiKit.drawDropShadow(art, width, height, radius, 12, 90);
    UiKit.fillRoundedVerticalGradient(art, width, height, radius, colors);
    art.strokeColor = new Color(255, 255, 255, 51); art.lineWidth = 2;
    art.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, Math.max(1, radius - 2)); art.stroke();
    const label = this.createLabel(`${name}Label`, node, text, fontSize, Color.WHITE);
    UiKit.styleLabel(label, { shadow: false });
    node.addComponent(Button); this.addPressFeedback(node); return node;
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    Tween.stopAllByTarget(this.overlay); this.overlay.destroy(); this.overlay = null;
  }

  private createButton(name: string, parent: Node, text: string, width: number, height: number, color: Color, size: number): Node {
    const node = this.createPanel(name, parent, width, height, color, Math.min(32, height * 0.4));
    node.addComponent(Button); this.createLabel(`${name}Label`, node, text, size, Color.WHITE); this.addPressFeedback(node); return node;
  }

  private createPanel(name: string, parent: Node, width: number, height: number, color: Color, radius: number): Node {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(width, height);
    const art = node.addComponent(Graphics); art.fillColor = color; art.roundRect(-width / 2, -height / 2, width, height, radius); art.fill();
    art.strokeColor = new Color(255, 255, 255, 42); art.lineWidth = 2; art.roundRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, Math.max(1, radius - 1)); art.stroke();
    return node;
  }

  private addPressFeedback(node: Node): void {
    const base = new Vec3();
    node.on(Node.EventType.TOUCH_START, () => { node.getScale(base); node.setScale(base.x * 0.95, base.y * 0.95, 1); }, this);
    const restore = (): void => node.setScale(base);
    node.on(Node.EventType.TOUCH_END, restore, this); node.on(Node.EventType.TOUCH_CANCEL, restore, this);
  }

  private createLabel(name: string, parent: Node, text: string, size: number, color: Color): Label {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(620, Math.max(62, size + 18));
    const label = node.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size + 8; label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER; return label;
  }

  private createNode(name: string, parent: Node): Node {
    const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node;
  }
}
