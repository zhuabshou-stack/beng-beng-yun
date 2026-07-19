import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, math } from 'cc';
import { GAME, SKINS } from '../core/GameConfig';
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
  private skinIndex = 0;

  onLoad(): void {
    this.ensureVisual();
  }

  update(): void {
    if (!this.visual) return;
    this.visual.setScale(GAME.playerVisualScale, GAME.playerVisualScale, 1);
    this.visual.setRotationFromEuler(0, 0, 0);
  }

  setSpriteFrame(frame: SpriteFrame | null): void {
    this.playerSpriteFrame = frame;
    this.ensureVisual();
  }

  setSkinIndex(index: number): void {
    this.skinIndex = Math.max(0, Math.floor(index)) % SKINS.length;
    this.ensureVisual();
  }

  setGhostVisual(active: boolean): void {
    if (!this.visual) return;
    const opacity = this.visual.getComponent(UIOpacity) ?? this.visual.addComponent(UIOpacity);
    opacity.opacity = active ? 130 : 255;
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

  simulate(dt: number, viewportWidth: number, gravityScale = 1): void {
    if (this.inputDirection !== 0) {
      this.velocity.x = math.clamp(
        this.velocity.x + this.inputDirection * GAME.horizontalAcceleration * dt,
        -GAME.horizontalSpeed,
        GAME.horizontalSpeed,
      );
    } else {
      this.velocity.x *= Math.pow(GAME.horizontalDamping, dt * GAME.legacyReferenceFps);
    }

    this.velocity.y -= GAME.gravity * GAME.tempoScale * GAME.tempoScale * dt * gravityScale;
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
    const skin = SKINS[this.skinIndex] ?? SKINS[0];
    const body = Color.fromHEX(new Color(), skin.bodyColor);
    const middle = Color.fromHEX(new Color(), skin.midColor);
    const accent = Color.fromHEX(new Color(), skin.accentColor);
    const eyes = Color.fromHEX(new Color(), skin.eyeColor);
    const blush = Color.fromHEX(new Color(), skin.blushColor);
    const wings = Color.fromHEX(new Color(), skin.wingColor);
    graphics.enabled = true;
    graphics.clear();
    graphics.fillColor = new Color(body.r, body.g, body.b, 42);
    graphics.roundRect(-43, -49, 86, 94, 34);
    graphics.fill();
    graphics.fillColor = new Color(wings.r, wings.g, wings.b, 150);
    graphics.ellipse(-40, -2, 13, 24);
    graphics.ellipse(40, -2, 13, 24);
    graphics.fill();
    graphics.fillColor = new Color(accent.r, accent.g, accent.b, 145);
    graphics.roundRect(-32, -32, 64, 72, 24);
    graphics.fill();
    graphics.fillColor = middle;
    graphics.roundRect(-32, -36, 64, 72, 24);
    graphics.fill();
    graphics.fillColor = new Color(255, 246, 190, 150);
    graphics.ellipse(-10, 18, 16, 10);
    graphics.fill();
    graphics.fillColor = eyes;
    graphics.circle(-11, 8, 4);
    graphics.circle(11, 8, 4);
    graphics.fill();
    graphics.fillColor = Color.WHITE;
    graphics.circle(-10, 9, 1.3);
    graphics.circle(12, 9, 1.3);
    graphics.fill();
    graphics.fillColor = new Color(blush.r, blush.g, blush.b, 115);
    graphics.ellipse(-20, -3, 7, 4);
    graphics.ellipse(20, -3, 7, 4);
    graphics.fill();
    graphics.strokeColor = accent;
    graphics.lineWidth = 3;
    graphics.moveTo(-10, -10);
    graphics.quadraticCurveTo(0, -18, 10, -10);
    graphics.stroke();
  }
}
