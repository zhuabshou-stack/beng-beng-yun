import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, math } from 'cc';
import { GAME, SKINS, SkinDefinition } from '../core/GameConfig';
import { UiKit } from '../ui/UiKit';
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
  tempoScale = 1;
  private skinIndex = 0;
  private jumpStretchRemaining = 0;
  private jumpStretchAmount: number = GAME.jumpStretchBase;
  private giantFactor = 1;

  onLoad(): void {
    this.ensureVisual();
  }

  update(dt: number): void {
    if (!this.visual) return;
    this.jumpStretchRemaining = Math.max(0, this.jumpStretchRemaining - Math.max(0, dt));
    const stretchProgress = GAME.jumpStretchDuration > 0 ? this.jumpStretchRemaining / GAME.jumpStretchDuration : 0;
    const stretch = 1 + (this.jumpStretchAmount - 1) * stretchProgress;
    this.visual.setScale(
      (GAME.playerVisualScale / Math.sqrt(stretch)) * this.giantFactor,
      GAME.playerVisualScale * stretch * this.giantFactor,
      1,
    );
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

  // 巨型化：碰撞半径与视觉同步放大（落点更宽）
  setGiant(on: boolean): void {
    this.giantFactor = on ? GAME.giantScale : 1;
    this.radius = GAME.playerRadius * GAME.collisionScale * this.giantFactor;
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
    this.tempoScale = 1;
    this.jumpStretchRemaining = 0;
  }

  setInputDirection(direction: number): void {
    this.inputDirection = Math.sign(direction);
  }

  setTempoScale(scale: number): void {
    this.tempoScale = math.clamp(scale, 1, GAME.comboTempoMax);
  }

  jump(multiplier = 1, combo = 0): void {
    this.velocity.y = GAME.jumpVelocity * GAME.tempoScale * this.tempoScale * multiplier;
    this.onGround = false;
    this.jumpStretchAmount = Math.min(
      GAME.jumpStretchMax,
      GAME.jumpStretchBase + Math.max(0, combo - 1) * GAME.jumpStretchComboStep,
    );
    this.jumpStretchRemaining = GAME.jumpStretchDuration;
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

    const tempo = GAME.tempoScale * this.tempoScale;
    this.velocity.y -= GAME.gravity * tempo * tempo * dt * gravityScale;
    const pos = this.node.position.clone();
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;

    const boundaryHalfWidth = Math.max(this.radius, GAME.playerVisualHalfWidth * GAME.playerVisualScale);
    const maximumX = Math.max(0, viewportWidth * 0.5 - boundaryHalfWidth);
    if (pos.x < -maximumX) {
      pos.x = -maximumX;
      if (this.velocity.x < 0) this.velocity.x = 0;
    } else if (pos.x > maximumX) {
      pos.x = maximumX;
      if (this.velocity.x > 0) this.velocity.x = 0;
    }
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
    graphics.enabled = true;
    graphics.clear();
    UiKit.drawCharacter(graphics, skin);
  }

}
