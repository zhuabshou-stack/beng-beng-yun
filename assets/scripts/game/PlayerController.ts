import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, math } from 'cc';
import { GAME, SKINS, SkinDefinition } from '../core/GameConfig';
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

  onLoad(): void {
    this.ensureVisual();
  }

  update(dt: number): void {
    if (!this.visual) return;
    this.jumpStretchRemaining = Math.max(0, this.jumpStretchRemaining - Math.max(0, dt));
    const stretchProgress = GAME.jumpStretchDuration > 0 ? this.jumpStretchRemaining / GAME.jumpStretchDuration : 0;
    const stretch = 1 + (this.jumpStretchAmount - 1) * stretchProgress;
    this.visual.setScale(
      GAME.playerVisualScale / Math.sqrt(stretch),
      GAME.playerVisualScale * stretch,
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
    this.drawSkinFeature(graphics, skin);
  }

  // 皮肤专属识别特征：每款皮肤有可辨识的造型差异（纯矢量绘制）
  private drawSkinFeature(graphics: Graphics, skin: SkinDefinition): void {
    const accent = Color.fromHEX(new Color(), skin.accentColor);
    const glow = Color.fromHEX(new Color(), skin.glowColor);
    switch (skin.feature) {
      case 'sunRays': {
        // 小太阳：头顶放射光芒
        graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 210);
        graphics.lineWidth = 4;
        for (let i = 0; i < 7; i += 1) {
          const angle = Math.PI * (0.12 + (i / 6) * 0.76);
          const inner = 34;
          const outer = 46 + (i % 2) * 7;
          graphics.moveTo(Math.cos(angle) * inner, 30 + Math.sin(angle) * inner * 0.6);
          graphics.lineTo(Math.cos(angle) * outer, 30 + Math.sin(angle) * outer * 0.6);
        }
        graphics.stroke();
        break;
      }
      case 'iceCrystals': {
        // 冰晶蓝：身侧漂浮冰晶
        graphics.fillColor = new Color(glow.r, glow.g, glow.b, 230);
        const crystals: Array<[number, number, number]> = [[-32, 36, 7], [27, 42, 5], [37, 12, 6]];
        for (const [cx, cy, size] of crystals) {
          graphics.moveTo(cx, cy + size); graphics.lineTo(cx + size * 0.6, cy);
          graphics.lineTo(cx, cy - size); graphics.lineTo(cx - size * 0.6, cy); graphics.fill();
        }
        break;
      }
      case 'petals': {
        // 樱花粉：头顶五瓣樱花
        graphics.fillColor = new Color(255, 183, 197, 235);
        for (let i = 0; i < 5; i += 1) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          graphics.circle(Math.cos(angle) * 9, 44 + Math.sin(angle) * 9, 5.5); graphics.fill();
        }
        graphics.fillColor = new Color(255, 214, 90, 255);
        graphics.circle(0, 44, 4); graphics.fill();
        break;
      }
      case 'leafWings': {
        // 翡翠绿：叶脉翅膀 + 头顶叶芽
        graphics.strokeColor = new Color(82, 190, 128, 220);
        graphics.lineWidth = 2;
        graphics.moveTo(-40, 12); graphics.lineTo(-40, -14);
        graphics.moveTo(40, 12); graphics.lineTo(40, -14);
        graphics.stroke();
        graphics.fillColor = new Color(82, 190, 128, 235);
        graphics.ellipse(0, 46, 6, 10);
        graphics.fill();
        graphics.strokeColor = new Color(255, 255, 255, 160);
        graphics.lineWidth = 1.5;
        graphics.moveTo(0, 38); graphics.lineTo(0, 54);
        graphics.stroke();
        break;
      }
      case 'moonRing': {
        // 暗夜紫：头顶月牙环 + 星星瞳孔
        graphics.strokeColor = new Color(222, 201, 255, 230);
        graphics.lineWidth = 5;
        graphics.arc(0, 44, 14, Math.PI * 0.15, Math.PI * 0.85, false);
        graphics.stroke();
        graphics.fillColor = new Color(255, 243, 176, 255);
        for (const ex of [-11, 11]) {
          graphics.moveTo(ex, 13);
          for (let i = 1; i < 8; i += 1) {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const radius = i % 2 === 0 ? 5 : 2.2;
            graphics.lineTo(ex + Math.cos(angle) * radius, 8 + Math.sin(angle) * radius);
          }
          graphics.fill();
        }
        break;
      }
      case 'flameCrest': {
        // 烈焰红：头顶三层火苗
        const flames: Array<[number, Color]> = [
          [22, new Color(255, 120, 50, 235)],
          [15, new Color(255, 170, 60, 245)],
          [8, new Color(255, 230, 120, 255)],
        ];
        for (const [height, color] of flames) {
          graphics.fillColor = color;
          graphics.moveTo(-10, 32);
          graphics.quadraticCurveTo(-4, 32 + height * 0.5, 0, 32 + height);
          graphics.quadraticCurveTo(4, 32 + height * 0.5, 10, 32);
          graphics.fill();
        }
        break;
      }
      case 'boltMark': {
        // 闪电黄：胸前闪电标
        graphics.fillColor = new Color(255, 255, 255, 235);
        graphics.moveTo(4, 18); graphics.lineTo(-8, 0); graphics.lineTo(-1, 0);
        graphics.lineTo(-4, -14); graphics.lineTo(9, 6); graphics.lineTo(1, 6); graphics.lineTo(4, 18);
        graphics.fill();
        break;
      }
      case 'candySprinkle': {
        // 软糖豆：身上彩色糖粒
        const sprinkleColors = [
          new Color(126, 217, 255, 235), new Color(255, 214, 90, 235),
          new Color(255, 138, 168, 235), new Color(160, 231, 229, 235), new Color(178, 190, 255, 235),
        ];
        const spots: Array<[number, number]> = [[-18, 20], [16, 26], [-6, -2], [20, -6], [-22, -12]];
        spots.forEach(([sx, sy], i) => {
          graphics.fillColor = sprinkleColors[i % sprinkleColors.length];
          graphics.roundRect(sx, sy, 10, 4.5, 2.2);
          graphics.fill();
        });
        break;
      }
      case 'visor': {
        // 小宇航：深色面罩 + 高光
        graphics.fillColor = new Color(38, 52, 84, 235);
        graphics.roundRect(-26, 0, 52, 22, 11);
        graphics.fill();
        graphics.strokeColor = new Color(143, 168, 216, 255);
        graphics.lineWidth = 2.5;
        graphics.roundRect(-26, 0, 52, 22, 11);
        graphics.stroke();
        graphics.strokeColor = new Color(255, 255, 255, 180);
        graphics.lineWidth = 3;
        graphics.moveTo(-18, 6); graphics.quadraticCurveTo(-8, 16, 2, 14);
        graphics.stroke();
        break;
      }
      case 'inkBrush': {
        // 水墨侠：墨点 + 额头笔锋
        graphics.fillColor = new Color(74, 74, 69, 200);
        graphics.circle(-24, 14, 3.5); graphics.fill();
        graphics.circle(24, -8, 2.5); graphics.fill();
        graphics.strokeColor = new Color(74, 74, 69, 235);
        graphics.lineWidth = 5;
        graphics.moveTo(-14, 34);
        graphics.quadraticCurveTo(0, 42, 14, 34);
        graphics.stroke();
        break;
      }
      default:
        break;
    }
  }
}
