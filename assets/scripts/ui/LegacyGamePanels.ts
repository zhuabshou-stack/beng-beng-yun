import {
  _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Tween, UITransform, Vec3, VerticalTextAlignment, tween, view,
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
    const panel = this.openOverlay('GameSkillOverlay', '⚡ 技能商店', 840, 1450);
    const data = LegacyProgression.loadSkills();
    const active = LegacyProgression.loadActiveSkills();
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    SKILLS.forEach((skill, index) => {
      const entry = data[skill.id];
      const card = this.createPanel(`Skill_${skill.id}`, panel, 710, 160, new Color(255, 255, 255, active.indexOf(skill.id) >= 0 ? 34 : 14), 23);
      card.setPosition(0, 460 - index * 178, 0);
      this.createLabel(`Icon_${skill.id}`, card, skill.icon, 43, Color.WHITE).node.setPosition(-285, 30, 0);
      const title = this.createLabel(`Title_${skill.id}`, card, `${skill.name}  Lv.${entry.level}`, 26, Color.WHITE);
      title.horizontalAlign = HorizontalTextAlignment.LEFT; title.node.setPosition(-135, 42, 0);
      const desc = this.createLabel(`Desc_${skill.id}`, card, skill.description, 17, new Color(255, 255, 255, 145));
      desc.horizontalAlign = HorizontalTextAlignment.LEFT; desc.node.setPosition(-50, -15, 0); desc.node.getComponent(UITransform)?.setContentSize(470, 48);
      const actionText = entry.owned ? (active.indexOf(skill.id) >= 0 ? '🟢 已装备' : '⚪ 装备')
        : skill.unlockLevel > (this.gameManager?.currentLevel ?? 1) ? `通关${skill.unlockLevel}关` : `${skill.coinCost} 💰`;
      const action = this.createButton(`Action_${skill.id}`, card, actionText, 205, 58, new Color(102, 126, 234, 230), 18);
      action.setPosition(230, 42, 0);
      action.on(Button.EventType.CLICK, () => this.skillAction(skill.id, coins), this);
    });
    this.addClose(panel, -640);
  }

  showRanking(): void {
    const panel = this.openOverlay('GameRankOverlay', '🏆 排行榜', 780, 1120);
    const ranking = StorageService.getJSON<number[]>('cloudBounceRanking', []);
    if (ranking.length === 0) this.createLabel('RankEmpty', panel, '还没有记录\n快去跳一跳吧！☁️', 29, new Color(255, 255, 255, 110)).node.setPosition(0, 20, 0);
    else ranking.slice(0, 10).forEach((score, index) => {
      const row = this.createPanel(`Rank_${index}`, panel, 650, 70, new Color(255, 255, 255, index < 3 ? 18 : 7), 16);
      row.setPosition(0, 370 - index * 80, 0);
      this.createLabel(`Pos_${index}`, row, index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`, 25, Color.WHITE).node.setPosition(-250, 0, 0);
      this.createLabel(`Player_${index}`, row, '玩家', 22, new Color(255, 255, 255, 205)).node.setPosition(-70, 0, 0);
      this.createLabel(`Score_${index}`, row, `${score}`, 26, new Color(255, 215, 0, 255)).node.setPosition(235, 0, 0);
    });
    this.addClose(panel, -465);
  }

  showSkins(): void {
    const panel = this.openOverlay('GameSkinOverlay', '🎨 选择皮肤', 840, 1050);
    const coins = StorageService.getNumber('cloudBounceCoins', 0);
    const selected = StorageService.getNumber('cloudBounceSkin', 0);
    SKINS.forEach((skin, index) => {
      const item = this.createPanel(`Skin_${skin.id}`, panel, 215, 220, new Color(255, 255, 255, selected === index ? 36 : 15), 22);
      item.setPosition((index % 3 - 1) * 235, 245 - Math.floor(index / 3) * 260, 0);
      const preview = this.createNode(`Preview_${skin.id}`, item);
      preview.setPosition(0, 42, 0);
      const art = preview.addComponent(Graphics);
      art.fillColor = Color.fromHEX(new Color(), skin.midColor); art.circle(0, 0, 40); art.fill();
      art.fillColor = Color.fromHEX(new Color(), skin.eyeColor); art.circle(-11, 8, 4); art.circle(11, 8, 4); art.fill();
      this.createLabel(`Name_${skin.id}`, item, skin.name, 23, Color.WHITE).node.setPosition(0, -25, 0);
      const unlocked = coins >= skin.unlockCost;
      this.createLabel(`State_${skin.id}`, item, unlocked ? (selected === index ? '✅ 使用中' : '点击使用') : `🔒 ${skin.unlockCost}币`, 17, new Color(255, 220, 130, unlocked ? 255 : 110)).node.setPosition(0, -70, 0);
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
    this.addClose(panel, -425);
  }

  showLevelComplete(level: number): void {
    if (!this.levelPanel) return;
    this.levelPanel.active = true;
    this.levelPanel.getChildByName('CompleteLevel')!.getComponent(Label)!.string = `第 ${level} 关完成`;
    this.levelPanel.setScale(0.9, 0.9, 1);
    tween(this.levelPanel).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
  }

  private buildLevelPanel(): void {
    this.levelPanel = this.createPanel('LevelComplete', this.node, 700, 720, new Color(26, 26, 54, 248), 50);
    this.levelPanel.setPosition(0, 0, 0);
    this.createLabel('Celebration', this.levelPanel, '🎉', 88, Color.WHITE).node.setPosition(0, 230, 0);
    this.createLabel('CompleteTitle', this.levelPanel, '通关成功!', 54, Color.WHITE).node.setPosition(0, 130, 0);
    this.createLabel('CompleteLevel', this.levelPanel, '第 1 关完成', 28, new Color(255, 255, 255, 175)).node.setPosition(0, 65, 0);
    this.createLabel('CompleteReward', this.levelPanel, `+${GAME.levelRewardCoins} 🪙 通关奖励`, 25, new Color(255, 215, 0, 220)).node.setPosition(0, 5, 0);
    const next = this.createButton('NextLevelButton', this.levelPanel, '下一关 ▶', 390, 92, new Color(102, 126, 234, 255), 30);
    next.setPosition(0, -105, 0); next.on(Button.EventType.CLICK, () => { this.levelPanel!.active = false; this.gameManager?.continueNextLevel(); }, this);
    const home = this.createButton('CompleteHomeButton', this.levelPanel, '🏠 回到主页', 330, 78, new Color(245, 87, 108, 255), 24);
    home.setPosition(0, -225, 0); home.on(Button.EventType.CLICK, () => this.onHomeRequested?.(), this);
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

  private addClose(panel: Node, y: number): void {
    const close = this.createButton('CloseOverlay', panel, '关闭', 300, 72, new Color(255, 255, 255, 28), 24);
    close.setPosition(0, y, 0); close.on(Button.EventType.CLICK, this.closeOverlay, this);
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
