import { _decorator, Color, Component, Graphics, Node, Prefab, Sprite, SpriteFrame, UITransform, instantiate, Vec3, math } from 'cc';
import { CloudType, GAME } from '../core/GameConfig';
import { CloudPlatform } from './CloudPlatform';
const { ccclass, property } = _decorator;

@ccclass('CloudManager')
export class CloudManager extends Component {
  @property(Prefab)
  cloudPrefab: Prefab | null = null;

  @property(SpriteFrame) normalSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) springSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) fragileSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) movingSpriteFrame: SpriteFrame | null = null;

  @property
  enableSpecialClouds = true;

  readonly clouds: CloudPlatform[] = [];
  onCloudSpawned: ((cloud: CloudPlatform) => void) | null = null;
  private lastX = 0;
  private specialStreak = 0;

  reset(viewportWidth: number, startY: number): void {
    for (const cloud of this.clouds) cloud.node.destroy();
    this.clouds.length = 0;
    this.lastX = 0;
    this.specialStreak = 0;

    for (let y = startY; y < 1000; y += GAME.cloudGap) {
      this.spawn(y, viewportWidth, y === startY ? 'normal' : undefined);
    }
  }

  spawn(y: number, viewportWidth: number, forcedType?: CloudType): CloudPlatform {
    const node = this.cloudPrefab ? instantiate(this.cloudPrefab) : new Node('Cloud');
    node.parent = this.node;
    const cloud = node.getComponent(CloudPlatform) ?? node.addComponent(CloudPlatform);
    const maxX = Math.max(0, viewportWidth * 0.5 - GAME.cloudWidth * 0.6);
    const x = math.clamp(this.lastX + (Math.random() - 0.5) * 180, -maxX, maxX);
    this.lastX = x;
    const type = forcedType ?? this.randomType();
    this.specialStreak = type === 'normal' ? 0 : this.specialStreak + 1;
    const visualVariant = type === 'normal' ? Math.floor(Math.random() * 3) : 1;
    const widthScale = type === 'normal' ? [0.90, 1, 1.08][visualVariant] : 1;
    cloud.configure(type, new Vec3(x, y, 0), widthScale, visualVariant);
    if (!this.cloudPrefab) this.ensureVisual(node, cloud);
    this.clouds.push(cloud);
    this.onCloudSpawned?.(cloud);
    return cloud;
  }

  ensureAhead(topY: number, viewportWidth: number): void {
    let highest = this.clouds.reduce((value, cloud) => Math.max(value, cloud.node.position.y), -Infinity);
    while (highest < topY) {
      highest += GAME.cloudGap + Math.random() * 40;
      this.spawn(highest, viewportWidth);
    }
  }

  cleanup(bottomY: number): void {
    for (let i = this.clouds.length - 1; i >= 0; i -= 1) {
      if (this.clouds[i].node.position.y < bottomY) {
        this.clouds[i].node.destroy();
        this.clouds.splice(i, 1);
      }
    }
  }

  private randomType(): CloudType {
    if (!this.enableSpecialClouds) return 'normal';
    if (this.specialStreak >= 2) return 'normal';
    const random = Math.random();
    // 沿用浏览器旧版的保守分布：普通 75%、弹簧 5%、脆弱 10%、移动 10%。
    if (random < 0.05) return 'spring';
    if (random < 0.15) return 'fragile';
    if (random < 0.25) return 'moving';
    return 'normal';
  }

  private ensureVisual(node: Node, cloud: CloudPlatform): void {
    const { type } = cloud;
    node.layer = this.node.layer;
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(cloud.width, cloud.height);
    const frame = type === 'spring' ? this.springSpriteFrame
      : type === 'fragile' ? this.fragileSpriteFrame
        : type === 'moving' ? this.movingSpriteFrame : this.normalSpriteFrame;
    if (frame) {
      const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
      sprite.spriteFrame = frame;
      sprite.enabled = true;
      const oldGraphics = node.getComponent(Graphics);
      if (oldGraphics) oldGraphics.enabled = false;
      return;
    }
    const oldSprite = node.getComponent(Sprite);
    if (oldSprite) oldSprite.enabled = false;
    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.enabled = true;
    const color = type === 'spring' ? new Color(255, 215, 126, 255)
      : type === 'fragile' ? new Color(255, 190, 205, 255)
        : type === 'moving' ? new Color(185, 205, 255, 255) : new Color(248, 252, 255, 255);
    const shadow = type === 'spring' ? new Color(235, 151, 72, 90)
      : type === 'fragile' ? new Color(231, 112, 148, 82)
        : type === 'moving' ? new Color(89, 116, 210, 80) : new Color(87, 122, 177, 62);
    const variant = cloud.visualVariant;
    const widthRatio = cloud.width / GAME.cloudWidth;
    const cloudlets = variant === 0
      ? [[-41, 0, 22], [-14, 9, 29], [18, 11, 27], [43, 0, 21]]
      : variant === 2
        ? [[-48, -1, 22], [-23, 7, 26], [5, 13, 32], [38, 4, 25], [52, -3, 18]]
        : [[-44, 0, 24], [-17, 10, 30], [19, 11, 28], [46, 0, 22]];
    graphics.clear();
    graphics.fillColor = shadow;
    graphics.ellipse(0, -16, 60 * widthRatio, 11);
    graphics.fill();
    graphics.fillColor = new Color(color.r, color.g, color.b, 48);
    graphics.ellipse(0, 1, 70 * widthRatio, 29);
    graphics.fill();
    graphics.fillColor = color;
    for (const [cloudX, cloudY, radius] of cloudlets) graphics.circle(cloudX * widthRatio, cloudY, radius * 0.88);
    graphics.roundRect(-55 * widthRatio, -16, 110 * widthRatio, 30, 15);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, variant === 2 ? 140 : variant === 0 ? 92 : 115);
    graphics.ellipse((variant === 2 ? -6 : -18) * widthRatio, variant === 0 ? 18 : 21, variant === 2 ? 25 : 19, 5.5);
    if (variant !== 0) graphics.ellipse(25 * widthRatio, 18, 13, 4);
    graphics.fill();
    graphics.lineWidth = 3;
    if (type === 'spring') {
      graphics.strokeColor = new Color(238, 120, 65, 230);
      graphics.moveTo(-22, -7); graphics.lineTo(-12, 5); graphics.lineTo(-2, -7);
      graphics.lineTo(8, 5); graphics.lineTo(18, -7); graphics.stroke();
    } else if (type === 'fragile') {
      graphics.strokeColor = new Color(205, 80, 120, 180);
      graphics.moveTo(-20, 12); graphics.lineTo(-5, 0); graphics.lineTo(3, 8);
      graphics.lineTo(18, -7); graphics.moveTo(3, 8); graphics.lineTo(13, 15); graphics.stroke();
    } else if (type === 'moving') {
      graphics.strokeColor = new Color(78, 105, 196, 220);
      graphics.moveTo(-26, 0); graphics.lineTo(26, 0); graphics.stroke();
      graphics.moveTo(-26, 0); graphics.lineTo(-16, 8); graphics.moveTo(-26, 0); graphics.lineTo(-16, -8);
      graphics.moveTo(26, 0); graphics.lineTo(16, 8); graphics.moveTo(26, 0); graphics.lineTo(16, -8); graphics.stroke();
    } else {
      graphics.strokeColor = new Color(167, 202, 236, 150);
      graphics.moveTo(-30, -4); graphics.quadraticCurveTo(0, 8, 30, -4); graphics.stroke();
    }
  }
}
