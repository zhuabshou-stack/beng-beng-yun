import { _decorator, Color, Component, Graphics, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

export type CollectibleType = 'coin' | 'star';

@ccclass('Collectible')
export class Collectible extends Component {
  type: CollectibleType = 'coin';
  radius = 22;
  collected = false;
  private elapsed = 0;
  private readonly origin = new Vec3();
  private readonly animatedPosition = new Vec3();

  configure(
    type: CollectibleType,
    position: Vec3,
    coinSpriteFrame: SpriteFrame | null,
    starSpriteFrame: SpriteFrame | null,
  ): void {
    this.type = type;
    this.radius = type === 'star' ? 26 : 22;
    this.collected = false;
    this.elapsed = Math.random() * Math.PI * 2;
    this.origin.set(position);
    this.node.setPosition(position);
    this.node.setScale(1, 1, 1);
    this.node.active = true;
    this.applyVisual(type === 'star' ? starSpriteFrame : coinSpriteFrame);
  }

  update(dt: number): void {
    if (this.collected || !this.node.active) return;
    this.elapsed += Math.min(dt, 1 / 20);
    this.animatedPosition.set(this.origin);
    this.animatedPosition.y += Math.sin(this.elapsed * 3.4) * 8;
    this.node.setPosition(this.animatedPosition);
    const pulse = 1 + Math.sin(this.elapsed * 4.2) * (this.type === 'star' ? 0.08 : 0.05);
    this.node.setScale(pulse, pulse, 1);
    this.node.setRotationFromEuler(0, 0, this.type === 'star' ? this.elapsed * 34 : Math.sin(this.elapsed * 2) * 7);
  }

  collect(): void {
    this.collected = true;
    this.node.active = false;
  }

  private applyVisual(frame: SpriteFrame | null): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(this.radius * 2.8, this.radius * 2.8);
    if (frame) {
      const sprite = this.node.getComponent(Sprite) ?? this.node.addComponent(Sprite);
      sprite.spriteFrame = frame;
      sprite.enabled = true;
      const graphics = this.node.getComponent(Graphics);
      if (graphics) graphics.enabled = false;
      return;
    }

    const sprite = this.node.getComponent(Sprite);
    if (sprite) sprite.enabled = false;
    const graphics = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    graphics.enabled = true;
    graphics.clear();
    if (this.type === 'coin') this.drawCoin(graphics);
    else this.drawStar(graphics);
  }

  private drawCoin(graphics: Graphics): void {
    graphics.fillColor = new Color(255, 213, 92, 42);
    graphics.circle(0, 0, 31);
    graphics.fill();
    graphics.fillColor = new Color(238, 154, 45, 255);
    graphics.circle(0, -2, 22);
    graphics.fill();
    graphics.fillColor = new Color(255, 221, 92, 255);
    graphics.circle(0, 1, 21);
    graphics.fill();
    graphics.strokeColor = new Color(255, 249, 201, 245);
    graphics.lineWidth = 3;
    graphics.circle(0, 1, 14);
    graphics.stroke();
    graphics.fillColor = new Color(255, 255, 224, 190);
    graphics.ellipse(-7, 9, 6, 3);
    graphics.fill();
  }

  private drawStar(graphics: Graphics): void {
    graphics.fillColor = new Color(255, 225, 112, 38);
    graphics.circle(0, 0, 36);
    graphics.fill();
    graphics.fillColor = new Color(255, 223, 104, 255);
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI * 0.5 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 26 : 11;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.close();
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 226, 210);
    graphics.circle(-6, 8, 4);
    graphics.fill();
  }
}
