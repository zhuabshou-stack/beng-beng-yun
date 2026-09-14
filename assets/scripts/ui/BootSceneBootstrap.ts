import {
  _decorator, Camera, Color, Component, Graphics, HorizontalTextAlignment, Label, Node,
  Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, VerticalTextAlignment, math, view,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { AudioCatalog } from '../core/AudioCatalog';
import { SceneNavigator } from './SceneNavigator';
import { UiKit } from './UiKit';
const { ccclass, property } = _decorator;

interface BootSpark {
  node: Node;
  angle: number;
  radius: number;
  speed: number;
}

@ccclass('BootSceneBootstrap')
export class BootSceneBootstrap extends Component {
  @property(SpriteFrame)
  logoSpriteFrame: SpriteFrame | null = null;

  private elapsed = 0;
  private loadProgress = 0;
  private displayProgress = 0;
  private ready = false;
  private leaving = false;
  private leavingTime = 0;
  private rootOpacity: UIOpacity | null = null;
  private logo: Node | null = null;
  private logoOpacity: UIOpacity | null = null;
  private progressLabel: Label | null = null;
  private progressGraphics: Graphics | null = null;
  private viewportWidth = 1080;
  private viewportHeight = 1920;
  private readonly sparks: BootSpark[] = [];

  onLoad(): void {
    const visible = view.getVisibleSize();
    this.viewportWidth = visible.width;
    this.viewportHeight = visible.height;
    this.node.getComponent(UITransform)?.setContentSize(visible.width, visible.height);
    this.rootOpacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    const camera = this.node.getChildByName('Camera')?.getComponent(Camera);
    if (camera) camera.orthoHeight = visible.height * 0.5;
    this.build();
  }

  start(): void {
    AudioCatalog.preload();
    SceneNavigator.preload('Home', (progress) => { this.loadProgress = progress; }, () => { this.ready = true; });
  }

  update(dt: number): void {
    const step = Math.min(dt, 0.1);
    this.elapsed += step;
    this.displayProgress = math.lerp(this.displayProgress, this.ready ? 1 : Math.max(0.15, this.loadProgress), Math.min(1, step * 12));
    this.animateLogo();
    this.animateSparks(step);
    this.drawProgress();
    if (!this.leaving && this.ready && this.elapsed >= 0.55 && this.displayProgress >= 0.985) {
      this.leaving = true;
      this.leavingTime = 0;
    }
    if (this.leaving) {
      this.leavingTime += step;
      if (this.rootOpacity) this.rootOpacity.opacity = Math.round(255 * (1 - math.clamp01(this.leavingTime / 0.4)));
      if (this.leavingTime >= 0.4) {
        this.leaving = false;
        SceneNavigator.home();
      }
    }
  }

  private build(): void {
    const background = this.createNode('BootBackground', this.node);
    background.addComponent(UITransform).setContentSize(this.viewportWidth, this.viewportHeight);
    const bg = background.addComponent(Graphics);
    const colors = [new Color(15, 12, 41), new Color(48, 43, 99), new Color(36, 36, 62)];
    for (let i = 0; i < 36; i += 1) {
      const t = i / 35;
      const segment = Math.min(1, Math.floor(t * 2));
      const local = t * 2 - segment;
      bg.fillColor = this.mix(colors[segment], colors[segment + 1], local);
      const bandHeight = this.viewportHeight / 36;
      bg.rect(-this.viewportWidth * 0.5, -this.viewportHeight * 0.5 + i * bandHeight, this.viewportWidth, bandHeight + 2);
      bg.fill();
    }

    const fog = this.createNode('OpeningClouds', this.node);
    const fogGraphics = fog.addComponent(Graphics);
    fogGraphics.fillColor = new Color(255, 255, 255, 55);
    for (let i = 0; i < 8; i += 1) {
      const x = -560 + i * 160;
      fogGraphics.ellipse(x, -360 + (i % 3) * 52, 210, 72);
      fogGraphics.ellipse(x + 70, -322 + (i % 2) * 35, 130, 85);
    }
    fogGraphics.fill();

    this.logo = this.createNode('BrandLogo', this.node);
    this.logo.addComponent(UITransform).setContentSize(620, 330);
    this.logoOpacity = this.logo.addComponent(UIOpacity);
    if (this.logoSpriteFrame) {
      const sprite = this.logo.addComponent(Sprite);
      sprite.spriteFrame = this.logoSpriteFrame;
    } else {
      const art = this.logo.addComponent(Graphics);
      art.fillColor = new Color(255, 255, 255, 235);
      art.circle(-130, -6, 56); art.circle(-65, 34, 82); art.circle(26, 44, 94); art.circle(126, -4, 62);
      art.roundRect(-158, -57, 316, 96, 46); art.fill();
      art.strokeColor = new Color(174, 132, 215, 210); art.lineWidth = 5;
      art.moveTo(-80, -8); art.quadraticCurveTo(0, 28, 80, -8); art.stroke();
    }
    this.logo.setPosition(0, 92, 0);
    this.createLabel('BrandTitle', this.logo, '蹦蹦云', 86, Color.WHITE).node.setPosition(0, -12, 0);
    this.createLabel('BrandSubtitle', this.logo, '向上跳跃，收集星光 ✨', 25, new Color(255, 255, 255, 165)).node.setPosition(0, -92, 0);

    const sparkRoot = this.createNode('GatheringLight', this.node);
    for (let i = 0; i < 22; i += 1) {
      const node = this.createNode(`BootSpark_${i}`, sparkRoot);
      const graphics = node.addComponent(Graphics);
      graphics.fillColor = new Color(255, 247, 204, 120 + (i % 4) * 25);
      graphics.circle(0, 0, 2.5 + (i % 3)); graphics.fill();
      this.sparks.push({ node, angle: i * 0.73, radius: 210 + (i % 6) * 38, speed: 0.7 + (i % 5) * 0.12 });
    }

    const progress = this.createNode('LoadingProgress', this.node);
    progress.setPosition(0, -360, 0);
    progress.addComponent(UITransform).setContentSize(520, 90);
    this.progressGraphics = progress.addComponent(Graphics);
    this.progressLabel = this.createLabel('LoadingLabel', progress, '正在加载...  0%', 22, new Color(255, 255, 255, 185));
    this.progressLabel.node.setPosition(0, 30, 0);
    this.createLabel('VersionLabel', this.node, `v${GAME.version}`, 17, new Color(255, 255, 255, 110)).node.setPosition(462, -902, 0);
  }

  private animateLogo(): void {
    if (!this.logo || !this.logoOpacity) return;
    const reveal = math.clamp01(this.elapsed / 0.72);
    const eased = 1 - Math.pow(1 - reveal, 3);
    this.logoOpacity.opacity = Math.round(255 * eased);
    const pulse = 1 + Math.sin(this.elapsed * Math.PI * 2) * 0.012;
    this.logo.setScale((0.78 + eased * 0.22) * pulse, (0.78 + eased * 0.22) * pulse, 1);
    this.logo.setPosition(0, 92 + Math.sin(this.elapsed * Math.PI * 2) * 12, 0);
  }

  private animateSparks(dt: number): void {
    const gather = 1 - math.clamp01(this.elapsed / 1.35) * 0.58;
    for (const spark of this.sparks) {
      spark.angle += spark.speed * dt;
      const radius = spark.radius * gather;
      spark.node.setPosition(Math.cos(spark.angle) * radius, 80 + Math.sin(spark.angle) * radius * 0.55, 0);
    }
  }

  private drawProgress(): void {
    if (!this.progressGraphics || !this.progressLabel) return;
    const width = 440;
    this.progressGraphics.clear();
    this.progressGraphics.fillColor = new Color(255, 255, 255, 48);
    this.progressGraphics.roundRect(-width * 0.5, -18, width, 14, 7); this.progressGraphics.fill();
    const progressWidth = width * this.displayProgress;
    if (progressWidth > 1) {
      // 填充段同样保持圆角，避免 0%/100% 时四角穿出
      UiKit.fillRoundedHorizontalGradient(this.progressGraphics, -width * 0.5 + progressWidth * 0.5, -11, progressWidth, 14, 7, UiKit.START_GRADIENT);
    }
    this.progressLabel.string = `正在加载...  ${Math.round(this.displayProgress * 100)}%`;
  }

  private createLabel(name: string, parent: Node, text: string, size: number, color: Color): Label {
    const node = this.createNode(name, parent);
    node.addComponent(UITransform).setContentSize(680, Math.max(62, size + 20));
    const label = node.addComponent(Label);
    label.string = text; label.fontSize = size; label.lineHeight = size + 8; label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER;
    return label;
  }

  private createNode(name: string, parent: Node): Node {
    const node = new Node(name); node.parent = parent; node.layer = this.node.layer; return node;
  }

  private mix(a: Color, b: Color, t: number): Color {
    return new Color(Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t), Math.round(a.b + (b.b - a.b) * t), 255);
  }
}
