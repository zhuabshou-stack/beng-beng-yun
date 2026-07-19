import { _decorator, Component, Node, Tween, Vec3, tween } from 'cc';
import { CloudType, GAME } from '../core/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('CloudPlatform')
export class CloudPlatform extends Component {
  @property
  type: CloudType = 'normal';

  width: number = GAME.cloudWidth * GAME.collisionScale;
  height: number = GAME.cloudHeight * GAME.collisionScale;
  visualVariant = 0;
  broken = false;
  private phase = Math.random() * Math.PI * 2;
  private originX = 0;
  private readonly restingScale = new Vec3(1, 1, 1);

  configure(type: CloudType, position: Vec3, widthScale = 1, visualVariant = 0): void {
    Tween.stopAllByTarget(this.node);
    this.type = type;
    this.width = GAME.cloudWidth * widthScale * GAME.collisionScale;
    this.height = GAME.cloudHeight * GAME.collisionScale;
    this.visualVariant = visualVariant;
    this.broken = false;
    this.node.active = true;
    this.node.setPosition(position);
    this.node.setRotationFromEuler(0, 0, type === 'normal' ? (visualVariant - 1) * 1.35 : 0);
    // 只缩小绘制节点；width/height 仍保持原碰撞尺寸，避免改变可达性。
    const visualScaleX = type === 'normal' ? 0.90 : 0.94;
    const visualScaleY = type === 'normal' ? 0.88 : 0.92;
    this.node.setScale(visualScaleX * GAME.cloudVisualScale, visualScaleY * GAME.cloudVisualScale, 1);
    this.node.getScale(this.restingScale);
    this.originX = position.x;
  }

  playLandingBounce(spring: boolean): void {
    Tween.stopAllByTarget(this.node);
    const compressed = new Vec3(this.restingScale.x * 1.06, this.restingScale.y * (spring ? 0.68 : 0.78), 1);
    const overshoot = new Vec3(this.restingScale.x * 0.97, this.restingScale.y * (spring ? 1.16 : 1.08), 1);
    tween(this.node)
      .to(spring ? 0.07 : 0.055, { scale: compressed }, { easing: 'quadOut' })
      .to(spring ? 0.12 : 0.09, { scale: overshoot }, { easing: 'backOut' })
      .to(0.1, { scale: this.restingScale.clone() }, { easing: 'quadInOut' })
      .start();
  }

  update(dt: number): void {
    if (this.type !== 'moving' || this.broken) return;
    this.phase += dt * 1.8;
    const pos = this.node.position.clone();
    pos.x = this.originX + Math.sin(this.phase) * 72;
    this.node.setPosition(pos);
  }

  breakApart(): void {
    if (this.type !== 'fragile' || this.broken) return;
    this.broken = true;
    this.node.active = false;
  }
}
