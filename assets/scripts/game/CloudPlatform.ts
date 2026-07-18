import { _decorator, Component, Node, Vec3 } from 'cc';
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

  configure(type: CloudType, position: Vec3, widthScale = 1, visualVariant = 0): void {
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
    this.originX = position.x;
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
