import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UITransform, Vec3, math } from 'cc';
import { GAME } from '../core/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
  @property(Node)
  visual: Node | null = null;

  @property(SpriteFrame)
  playerSpriteFrame: SpriteFrame | null = null;

  velocity = new Vec3();
  radius = GAME.playerRadius * GAME.collisionScale;
  onGround = false;
  inputDirection = 0;

  onLoad(): void {
    this.ensureVisual();
  }

  update(): void {
    if (!this.visual) return;
    const tempoJumpVelocity = GAME.jumpVelocity * GAME.tempoScale;
    const velocityRatio = math.clamp(this.velocity.y / tempoJumpVelocity, -1.25, 1.4);
    const stretch = Math.min(0.15, Math.abs(velocityRatio) * 0.11);
    const risingSquash = velocityRatio > 0 ? stretch : -stretch * 0.45;
    this.visual.setScale(
      (1 - risingSquash) * GAME.playerVisualScale,
      (1 + risingSquash) * GAME.playerVisualScale,
      1,
    );
    this.visual.setRotationFromEuler(0, 0, math.clamp(-this.velocity.x * 0.025, -8, 8));
  }

  setSpriteFrame(frame: SpriteFrame | null): void {
    this.playerSpriteFrame = frame;
    this.ensureVisual();
  }

  reset(position: Vec3): void {
    this.node.setPosition(position);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
  }

  setInputDirection(direction: number): void {
    this.inputDirection = Math.sign(direction);
  }

  jump(multiplier = 1): void {
    this.velocity.y = GAME.jumpVelocity * GAME.tempoScale * multiplier;
    this.onGround = false;
  }

  simulate(dt: number, viewportWidth: number): void {
    const targetVX = this.inputDirection * GAME.horizontalSpeed;
    this.velocity.x = math.lerp(this.velocity.x, targetVX, Math.min(1, GAME.horizontalAcceleration * dt / GAME.horizontalSpeed));
    if (this.inputDirection === 0) this.velocity.x *= Math.pow(GAME.horizontalDamping, dt * 60);

    this.velocity.y -= GAME.gravity * GAME.tempoScale * GAME.tempoScale * dt;
    const pos = this.node.position.clone();
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;

    const half = viewportWidth * 0.5;
    if (pos.x < -half - this.radius) pos.x = half + this.radius;
    if (pos.x > half + this.radius) pos.x = -half - this.radius;
    this.node.setPosition(pos);
  }

  private ensureVisual(): void {
    if (!this.visual) {
      this.visual = new Node('PlayerVisual');
      this.visual.parent = this.node;
      this.visual.layer = this.node.layer;
    }
    const transform = this.visual.getComponent(UITransform) ?? this.visual.addComponent(UITransform);
    transform.setContentSize(this.radius * 2, this.radius * 2.25);
    if (this.playerSpriteFrame) {
      const sprite = this.visual.getComponent(Sprite) ?? this.visual.addComponent(Sprite);
      sprite.spriteFrame = this.playerSpriteFrame;
      sprite.enabled = true;
      const oldGraphics = this.visual.getComponent(Graphics);
      if (oldGraphics) oldGraphics.enabled = false;
      return;
    }
    const oldSprite = this.visual.getComponent(Sprite);
    if (oldSprite) oldSprite.enabled = false;
    const graphics = this.visual.getComponent(Graphics) ?? this.visual.addComponent(Graphics);
    graphics.enabled = true;
    graphics.clear();
    graphics.fillColor = new Color(255, 220, 120, 42);
    graphics.roundRect(-43, -49, 86, 94, 34);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 150);
    graphics.ellipse(-40, -2, 13, 24);
    graphics.ellipse(40, -2, 13, 24);
    graphics.fill();
    graphics.fillColor = new Color(235, 155, 76, 145);
    graphics.roundRect(-32, -32, 64, 72, 24);
    graphics.fill();
    graphics.fillColor = new Color(255, 222, 102, 255);
    graphics.roundRect(-32, -36, 64, 72, 24);
    graphics.fill();
    graphics.fillColor = new Color(255, 246, 190, 150);
    graphics.ellipse(-10, 18, 16, 10);
    graphics.fill();
    graphics.fillColor = new Color(96, 76, 120, 255);
    graphics.circle(-11, 8, 4);
    graphics.circle(11, 8, 4);
    graphics.fill();
    graphics.fillColor = Color.WHITE;
    graphics.circle(-10, 9, 1.3);
    graphics.circle(12, 9, 1.3);
    graphics.fill();
    graphics.fillColor = new Color(255, 137, 153, 115);
    graphics.ellipse(-20, -3, 7, 4);
    graphics.ellipse(20, -3, 7, 4);
    graphics.fill();
    graphics.strokeColor = new Color(255, 159, 28, 255);
    graphics.lineWidth = 3;
    graphics.moveTo(-10, -10);
    graphics.quadraticCurveTo(0, -18, 10, -10);
    graphics.stroke();
  }
}
