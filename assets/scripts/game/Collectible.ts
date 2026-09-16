import { _decorator, Color, Component, Graphics, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

export type CollectibleType = 'coin' | 'star' | 'feather' | 'tornado' | 'giant';

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
    this.radius = type === 'star' || type === 'tornado' || type === 'giant' ? 20 : type === 'feather' ? 20 : 12;
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
    this.node.setRotationFromEuler(0, 0, this.type === 'star' ? this.elapsed * 34 : Math.sin(this.elapsed * 2) * (this.type === 'feather' ? 17 : 7));
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
    else if (this.type === 'star') this.drawStar(graphics);
    else if (this.type === 'tornado') this.drawTornado(graphics);
    else if (this.type === 'giant') this.drawGiant(graphics);
    else this.drawFeather(graphics);
  }

  private drawTornado(graphics: Graphics): void {
    graphics.strokeColor = new Color(120, 190, 255, 220);
    graphics.lineWidth = 5;
    graphics.arc(0, 10, 18, 0, Math.PI * 1.4, false);
    graphics.stroke();
    graphics.arc(0, -4, 12, Math.PI, Math.PI * 2.3, false);
    graphics.stroke();
    graphics.arc(0, -16, 7, 0, Math.PI * 1.5, false);
    graphics.stroke();
    graphics.fillColor = new Color(200, 235, 255, 200);
    graphics.circle(0, 20, 4);
    graphics.fill();
  }

  private drawGiant(graphics: Graphics): void {
    graphics.fillColor = new Color(196, 146, 255, 42);
    graphics.circle(0, 0, 30);
    graphics.fill();
    graphics.fillColor = new Color(255, 243, 176, 255);
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      graphics.circle(Math.cos(angle) * 16, Math.sin(angle) * 16, 6);
      graphics.fill();
    }
    graphics.fillColor = new Color(255, 138, 168, 255);
    graphics.circle(0, 0, 8);
    graphics.fill();
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

  private drawFeather(graphics: Graphics): void {
    graphics.fillColor = new Color(116, 185, 255, 52);
    graphics.ellipse(0, 0, 17, 35);
    graphics.fill();
    graphics.fillColor = new Color(116, 185, 255, 255);
    graphics.ellipse(-2, 2, 8, 24);
    graphics.fill();
    graphics.strokeColor = new Color(238, 248, 255, 230);
    graphics.lineWidth = 2;
    graphics.moveTo(2, 27);
    graphics.lineTo(-4, -28);
    graphics.moveTo(-2, 13); graphics.lineTo(-13, 5);
    graphics.moveTo(-3, 2); graphics.lineTo(9, -8);
    graphics.moveTo(-4, -10); graphics.lineTo(-13, -17);
    graphics.stroke();
  }
}
