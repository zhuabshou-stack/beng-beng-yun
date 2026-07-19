import { _decorator, Component, Node, Tween, UIOpacity, Vec3 } from 'cc';
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
  private brokenElapsed = 0;
  private phase = Math.random() * Math.PI * 2;
  private originX = 0;
  private minimumX = -Infinity;
  private maximumX = Infinity;
  private readonly restingScale = new Vec3(1, 1, 1);

  configure(type: CloudType, position: Vec3, widthScale = 1, visualVariant = 0): void {
    Tween.stopAllByTarget(this.node);
    this.type = type;
    this.width = GAME.cloudWidth * widthScale * GAME.collisionScale;
    this.height = GAME.cloudHeight * GAME.collisionScale;
    this.visualVariant = visualVariant;
    this.broken = false;
    this.brokenElapsed = 0;
    this.node.active = true;
    this.node.setPosition(position);
    this.node.setRotationFromEuler(0, 0, type === 'normal' ? (visualVariant - 1) * 1.35 : 0);
    this.node.setScale(GAME.cloudVisualScale, GAME.cloudVisualScale, 1);
    const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    opacity.opacity = 255;
    this.node.getScale(this.restingScale);
    this.originX = position.x;
  }

  setHorizontalBounds(minimumX: number, maximumX: number): void {
    this.minimumX = minimumX;
    this.maximumX = maximumX;
    this.originX = Math.max(minimumX, Math.min(maximumX, this.originX));
    const pos = this.node.position.clone();
    pos.x = Math.max(minimumX, Math.min(maximumX, pos.x));
    this.node.setPosition(pos);
  }

  playLandingBounce(spring: boolean): void {
    void spring;
    Tween.stopAllByTarget(this.node);
    this.node.setScale(this.restingScale);
  }

  update(dt: number): void {
    if (this.broken) {
      this.brokenElapsed += dt;
      const opacity = this.node.getComponent(UIOpacity);
      if (opacity) opacity.opacity = Math.round(Math.max(0, 1 - this.brokenElapsed * 2) * 255);
      if (this.brokenElapsed > 20 / GAME.legacyReferenceFps) {
        const pos = this.node.position.clone();
        pos.y -= 360 * dt;
        this.node.setPosition(pos);
      }
      if (this.brokenElapsed >= 0.5) this.node.active = false;
      return;
    }
    if (this.type !== 'moving') return;
    this.phase += dt * GAME.movingCloudAngularSpeed;
    const pos = this.node.position.clone();
    pos.x = Math.max(
      this.minimumX,
      Math.min(this.maximumX, this.originX + Math.sin(this.phase) * GAME.movingCloudAmplitude),
    );
    this.node.setPosition(pos);
  }

  breakApart(): void {
    if (this.type !== 'fragile' || this.broken) return;
    this.broken = true;
    this.brokenElapsed = 0;
  }
}
