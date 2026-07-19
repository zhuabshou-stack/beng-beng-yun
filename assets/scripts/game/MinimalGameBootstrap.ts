import {
  _decorator, Button, Camera, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  SpriteFrame, UIOpacity, UITransform, Vec3, VerticalTextAlignment, director, math, view,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { AudioManager } from '../core/AudioManager';
import { DisplaySettings } from '../core/DisplaySettings';
import { SceneNavigator } from '../ui/SceneNavigator';
import { BootSceneBootstrap } from '../ui/BootSceneBootstrap';
import { HomeSceneBootstrap } from '../ui/HomeSceneBootstrap';
import { CameraRig } from './CameraRig';
import { CloudManager } from './CloudManager';
import { CollectibleManager } from './CollectibleManager';
import { GameManager } from './GameManager';
import { PlayerController } from './PlayerController';
import { DreamyHUD } from '../visual/DreamyHUD';
import { VisualEffects } from '../visual/VisualEffects';
import { VisualEnvironment } from '../visual/VisualEnvironment';
import { StorageService } from '../platform/StorageService';
import { LegacyGamePanels } from '../ui/LegacyGamePanels';
const { ccclass, property } = _decorator;

@ccclass('MinimalGameBootstrap')
export class MinimalGameBootstrap extends Component {
  @property(SpriteFrame) playerSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) cloudNormalSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) cloudSpringSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) cloudFragileSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) cloudMovingSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) skySpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) farMountainsSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) midMountainsSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) nearMountainsSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) ambientCloudsSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) homeIconSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) pauseIconSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) coinIconSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) coinSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) starSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) logoSpriteFrame: SpriteFrame | null = null;

  private gameManager: GameManager | null = null;
  private cameraRig: CameraRig | null = null;
  private player: PlayerController | null = null;
  private world: Node | null = null;
  private worldOpacity: UIOpacity | null = null;
  private hudNode: Node | null = null;
  private resultPanel: Node | null = null;
  private tutorialPanel: Node | null = null;
  private entryOverlay: Node | null = null;
  private entryLabel: Label | null = null;
  private entryActive = false;
  private entryTime = 0;
  private runtimeRole: 'Boot' | 'Home' | 'Game' = 'Game';

  onLoad(): void {
    this.runtimeRole = this.resolveRuntimeRole();
    if (this.runtimeRole === 'Boot') {
      const boot = this.node.getComponent(BootSceneBootstrap) ?? this.node.addComponent(BootSceneBootstrap);
      boot.logoSpriteFrame = this.logoSpriteFrame;
      return;
    }
    if (this.runtimeRole === 'Home') {
      const home = this.node.getComponent(HomeSceneBootstrap) ?? this.node.addComponent(HomeSceneBootstrap);
      home.logoSpriteFrame = this.logoSpriteFrame;
      return;
    }

    const canvasTransform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    canvasTransform.setContentSize(1080, 1920);

    const cameraNode = this.node.getChildByName('Camera') ?? this.createNode('Camera');
    const camera = cameraNode.getComponent(Camera) ?? cameraNode.addComponent(Camera);
    camera.orthoHeight = 960 * GAME.cameraVisibleHeight;

    const background = this.createNode('Background');
    background.setSiblingIndex(0);
    const environment = background.addComponent(VisualEnvironment);

    this.world = this.createNode('World');
    this.worldOpacity = this.world.addComponent(UIOpacity);
    const clouds = this.createNode('Clouds', this.world);
    const collectibles = this.createNode('Collectibles', this.world);
    const effects = this.createNode('Effects', this.world);
    const playerNode = this.createNode('Player', this.world);
    this.player = playerNode.addComponent(PlayerController);
    this.player.setSpriteFrame(this.playerSpriteFrame);

    const cloudManager = clouds.addComponent(CloudManager);
    cloudManager.normalSpriteFrame = this.cloudNormalSpriteFrame;
    cloudManager.springSpriteFrame = this.cloudSpringSpriteFrame;
    cloudManager.fragileSpriteFrame = this.cloudFragileSpriteFrame;
    cloudManager.movingSpriteFrame = this.cloudMovingSpriteFrame;
    cloudManager.enableSpecialClouds = true;

    const collectibleManager = collectibles.addComponent(CollectibleManager);
    collectibleManager.configure(this.coinSpriteFrame, this.starSpriteFrame);
    cloudManager.onCloudSpawned = (cloud) => collectibleManager.considerCloud(cloud);

    this.cameraRig = cameraNode.getComponent(CameraRig) ?? cameraNode.addComponent(CameraRig);
    this.cameraRig.target = playerNode;
    this.cameraRig.viewportHeight = view.getVisibleSize().height * GAME.cameraVisibleHeight;

    const controller = this.createNode('GameController');
    this.gameManager = controller.addComponent(GameManager);
    this.gameManager.player = this.player;
    this.gameManager.cloudManager = cloudManager;
    this.gameManager.collectibleManager = collectibleManager;
    this.gameManager.cameraRig = this.cameraRig;
    this.gameManager.touchArea = this.node;
    this.gameManager.refreshViewport();

    environment.configure(cameraNode, {
      sky: this.skySpriteFrame,
      farMountains: this.farMountainsSpriteFrame,
      midMountains: this.midMountainsSpriteFrame,
      nearMountains: this.nearMountainsSpriteFrame,
      ambientClouds: this.ambientCloudsSpriteFrame,
    });

    const visualEffects = effects.addComponent(VisualEffects);
    visualEffects.configure(this.player, this.gameManager, this.world);
    this.gameManager.onLandingFeedback = (feedback) => visualEffects.playLandingFeedback(feedback);
    this.gameManager.onCollectibleFeedback = (type, position) => visualEffects.playCollectibleFeedback(type, position);
    this.gameManager.onMilestone = (score, position) => visualEffects.playMilestoneFeedback(score, position);
    this.gameManager.onRunStarted = (position) => visualEffects.playStartFeedback(position);
    this.gameManager.onRestartRequested = () => this.restart();

    this.hudNode = this.createNode('UI');
    const hud = this.hudNode.addComponent(DreamyHUD);
    hud.configure(this.gameManager, this.cameraRig, {
      homeIcon: this.homeIconSpriteFrame,
      pauseIcon: this.pauseIconSpriteFrame,
      coinIcon: this.coinIconSpriteFrame,
    });
    const panels = this.hudNode.addComponent(LegacyGamePanels);
    panels.configure(this.gameManager);
    panels.onHomeRequested = () => this.returnHome();
    hud.onHomeRequested = () => this.returnHome();
    hud.onSkillsRequested = () => panels.showSkills();
    hud.onRankingRequested = () => panels.showRanking();
    hud.onSkinsRequested = () => panels.showSkins();
    this.gameManager.onLevelComplete = (level, position) => {
      visualEffects.playLevelCompleteFeedback(level, position);
      panels.showLevelComplete(level);
    };
    this.gameManager.onSkillToast = (message) => panels.showToast(message);

    this.buildEntryOverlay();
    this.buildResultPanel();
    this.buildTutorialPanel();
  }

  start(): void {
    if (this.runtimeRole !== 'Game') return;
    if (StorageService.getNumber('cloudBounceTutorialSeen', 0) === 0) {
      if (this.tutorialPanel) this.tutorialPanel.active = true;
    } else {
      this.beginEntry();
    }
  }

  update(dt: number): void {
    if (this.runtimeRole !== 'Game') return;
    const cameraY = this.cameraRig?.node.position.y ?? 0;
    this.entryOverlay?.setPosition(0, cameraY, 0);
    this.resultPanel?.setPosition(0, cameraY, 0);
    this.tutorialPanel?.setPosition(0, cameraY, 0);
    if (this.entryActive) this.updateEntry(Math.min(dt, 1 / 30));

    if (this.resultPanel && this.gameManager?.phase === 'gameover' && !this.resultPanel.active) {
      const data = this.gameManager.data;
      const score = this.resultPanel.getChildByName('ResultScore')?.getComponent(Label);
      if (score) score.string = `分数 ${Math.floor(data.score)}`;
      const stats = this.resultPanel.getChildByName('ResultStats')?.getComponent(Label);
      if (stats) stats.string = `高度 ${Math.floor(data.heightMeters)}m   金币 ${data.runCoins}   星星 ${data.stars}\n最高连击 ${data.maxCombo}`;
      this.resultPanel.active = true;
    }
  }

  private beginEntry(): void {
    if (!this.gameManager || !this.player) return;
    this.gameManager.prepareRun(true);
    this.entryTime = 0;
    this.entryActive = true;
    if (this.entryOverlay) this.entryOverlay.active = true;
    if (this.hudNode) this.hudNode.active = false;
    if (this.worldOpacity) this.worldOpacity.opacity = 145;
    this.player.node.setScale(0.72, 0.72, 1);
  }

  private updateEntry(dt: number): void {
    this.entryTime += dt;
    const progress = math.clamp01(this.entryTime / 0.86);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (this.worldOpacity) this.worldOpacity.opacity = Math.round(145 + eased * 110);
    this.player?.node.setScale(0.72 + eased * 0.28, 0.72 + eased * 0.28, 1);
    if (this.entryLabel) {
      this.entryLabel.string = progress < 0.28 ? '3' : progress < 0.54 ? '2' : progress < 0.78 ? '1' : '出发';
      const pulse = 0.92 + Math.sin(this.entryTime * 21) * 0.06;
      this.entryLabel.node.setScale(pulse, pulse, 1);
    }
    if (progress < 1) return;
    this.entryActive = false;
    if (this.entryOverlay) this.entryOverlay.active = false;
    if (this.hudNode) this.hudNode.active = true;
    this.player?.node.setScale(1, 1, 1);
    this.gameManager?.beginPreparedRun();
  }

  private buildEntryOverlay(): void {
    this.entryOverlay = this.createNode('GameEntryOverlay');
    this.entryLabel = this.createLabel('CountdownLabel', this.entryOverlay, '3', 92, Vec3.ZERO);
    this.entryLabel.color = Color.WHITE;
  }

  private buildResultPanel(): void {
    this.resultPanel = this.createGraphicsNode('ResultPanel', 660, 560);
    this.resultPanel.setScale(DisplaySettings.getUiScale(), DisplaySettings.getUiScale(), 1);
    const panel = this.resultPanel.addComponent(Graphics);
    panel.fillColor = new Color(38, 39, 92, 238);
    panel.roundRect(-330, -280, 660, 560, 54); panel.fill();
    panel.strokeColor = new Color(255, 255, 255, 70); panel.lineWidth = 3;
    panel.roundRect(-326, -276, 652, 552, 51); panel.stroke();
    this.createLabel('Title', this.resultPanel, '本次云端旅程结束', 50, new Vec3(0, 180, 0));
    this.createLabel('ResultScore', this.resultPanel, '分数 0', 43, new Vec3(0, 92, 0));
    const resultStats = this.createLabel('ResultStats', this.resultPanel, '高度 0m   金币 0   星星 0\n最高连击 0', 25, new Vec3(0, 0, 0));
    resultStats.lineHeight = 36;
    resultStats.node.getComponent(UITransform)?.setContentSize(580, 105);
    const restart = this.createButton('RestartButton', this.resultPanel, '重新开始', 310, 90, new Color(255, 177, 106, 255), 32);
    restart.setPosition(0, -115, 0); restart.on(Button.EventType.CLICK, this.restart, this);
    const home = this.createButton('ResultHomeButton', this.resultPanel, '返回主页', 260, 72, new Color(104, 128, 191, 255), 25);
    home.setPosition(0, -205, 0); home.on(Button.EventType.CLICK, this.returnHome, this);
    this.resultPanel.active = false;
  }

  private buildTutorialPanel(): void {
    this.tutorialPanel = this.createGraphicsNode('FirstGameTutorial', 700, 720);
    this.tutorialPanel.setScale(DisplaySettings.getUiScale(), DisplaySettings.getUiScale(), 1);
    const panel = this.tutorialPanel.addComponent(Graphics);
    panel.fillColor = new Color(34, 39, 94, 244);
    panel.roundRect(-350, -360, 700, 720, 54); panel.fill();
    panel.strokeColor = new Color(255, 255, 255, 72); panel.lineWidth = 3;
    panel.roundRect(-346, -356, 692, 712, 51); panel.stroke();
    this.createLabel('TutorialTitle', this.tutorialPanel, '第一次云端旅行', 48, new Vec3(0, 260, 0));
    const steps = this.createLabel('TutorialSteps', this.tutorialPanel,
      '① 按住屏幕左侧 / 右侧控制方向\n\n② 落在云朵上会自动再次起跳\n\n③ 连续落云累积 Combo\n\n④ 弹簧云跳得更高，找准落点', 27, new Vec3(0, 35, 0));
    steps.node.getComponent(UITransform)?.setContentSize(610, 390);
    steps.lineHeight = 42;
    const begin = this.createButton('TutorialBegin', this.tutorialPanel, '明白了，出发', 380, 94, new Color(255, 170, 112, 255), 31);
    begin.setPosition(0, -255, 0);
    begin.on(Button.EventType.CLICK, this.finishTutorial, this);
    this.tutorialPanel.active = false;
  }

  private finishTutorial(): void {
    StorageService.setNumber('cloudBounceTutorialSeen', 1);
    if (this.tutorialPanel) this.tutorialPanel.active = false;
    AudioManager.playSound('ui');
    this.beginEntry();
  }

  private restart(): void {
    if (!this.gameManager) return;
    if (this.resultPanel) this.resultPanel.active = false;
    this.gameManager.startRun();
  }

  private returnHome(): void {
    this.gameManager?.returnToHome();
    SceneNavigator.home();
  }

  private resolveRuntimeRole(): 'Boot' | 'Home' | 'Game' {
    // Initial-scene components may enter onLoad before Director exposes that
    // scene globally. The owning node already has the authoritative scene.
    const sceneName = this.node.scene?.name ?? director.getScene()?.name;
    if (sceneName === 'Boot' || sceneName === 'Home') return sceneName;
    return 'Game';
  }

  private createButton(name: string, parent: Node, text: string, width: number, height: number, color: Color, size: number): Node {
    const node = this.createGraphicsNode(name, width, height, parent);
    const graphics = node.addComponent(Graphics); graphics.fillColor = color; graphics.roundRect(-width / 2, -height / 2, width, height, Math.min(38, height * 0.42)); graphics.fill();
    node.addComponent(Button); this.createLabel(`${name}Label`, node, text, size, Vec3.ZERO); this.addPressFeedback(node); return node;
  }

  private addPressFeedback(node: Node): void {
    node.on(Node.EventType.TOUCH_START, () => node.setScale(0.94, 0.94, 1), this);
    const restore = (): void => node.setScale(1, 1, 1);
    node.on(Node.EventType.TOUCH_END, restore, this);
    node.on(Node.EventType.TOUCH_CANCEL, restore, this);
  }

  private createNode(name: string, parent: Node = this.node): Node {
    const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node;
  }

  private createGraphicsNode(name: string, width: number, height: number, parent: Node = this.node): Node {
    const node = this.createNode(name, parent); node.addComponent(UITransform).setContentSize(width, height); return node;
  }

  private createLabel(name: string, parent: Node, text: string, fontSize: number, position: Vec3): Label {
    const node = this.createNode(name, parent); node.setPosition(position); node.addComponent(UITransform).setContentSize(680, 90);
    const label = node.addComponent(Label); label.string = text; label.fontSize = fontSize; label.lineHeight = fontSize + 10; label.color = Color.WHITE;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER; return label;
  }
}
