import {
  _decorator,
  Color,
  Component,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UIOpacity,
  UITransform,
  Vec3,
  VerticalTextAlignment,
  math,
} from 'cc';
import { GAME } from '../core/GameConfig';
import { CollectibleType } from '../game/Collectible';
import { GameManager, LandingFeedback } from '../game/GameManager';
import { PlayerController } from '../game/PlayerController';
const { ccclass } = _decorator;

interface TrailDot {
  node: Node;
  graphics: Graphics;
  opacity: UIOpacity;
  life: number;
  active: boolean;
}

interface BurstParticle {
  node: Node;
  graphics: Graphics;
  opacity: UIOpacity;
  velocity: Vec3;
  life: number;
  active: boolean;
}

interface FloatText {
  node: Node;
  label: Label;
  opacity: UIOpacity;
  life: number;
  active: boolean;
}

@ccclass('VisualEffects')
export class VisualEffects extends Component {
  private player: PlayerController | null = null;
  private gameManager: GameManager | null = null;
  private world: Node | null = null;
  private readonly trail: TrailDot[] = [];
  private readonly particles: BurstParticle[] = [];
  private readonly floatTexts: FloatText[] = [];
  private trailCursor = 0;
  private particleCursor = 0;
  private floatTextCursor = 0;
  private trailTimer = 0;
  private shakeMagnitude = 0;
  private readonly particlePosition = new Vec3();
  private readonly floatTextPosition = new Vec3();

  configure(player: PlayerController, gameManager: GameManager, world: Node): void {
    this.player = player;
    this.gameManager = gameManager;
    this.world = world;
    if (this.trail.length === 0) this.buildTrailPool();
    if (this.particles.length === 0) this.buildParticlePool(GAME.effectParticlePoolSize);
    if (this.floatTexts.length === 0) this.buildFloatTextPool(GAME.effectFloatTextPoolSize);
  }

  update(dt: number): void {
    if (!this.player || !this.gameManager || !this.world) return;
    const step = Math.min(dt, 1 / 30);
    if (this.gameManager.phase === 'playing') {
      const highSpeed = this.player.isDashing() || Math.abs(this.player.velocity.y) > GAME.jumpVelocity * GAME.tempoScale * 1.22;
      this.trailTimer += step;
      const trailInterval = highSpeed ? 0.026 : this.gameManager.data.combo >= 3 ? 0.036 : 0.048;
      if (this.trailTimer >= trailInterval) {
        this.trailTimer = 0;
        this.spawnTrailDot(highSpeed);
      }
    }
    this.updateTrail(step);
    this.updateParticles(step);
    this.updateFloatTexts(step);
    this.updateShake(step);
  }

  playLandingFeedback(feedback: LandingFeedback): void {
    const { type, combo, position, precise, repeated, scoreGain } = feedback;
    const spring = type === 'spring';
    const color = spring ? new Color(255, 205, 92, 255) : new Color(245, 251, 255, 235);
    // 落地粉尘与起跳光点分层，普通跳克制，弹簧云明显增强。
    this.emitBurst(position, color, spring ? 8 : 5, spring ? 230 : 145, 'radial');
    this.emitBurst(position, color, spring ? 14 : 3, spring ? 360 : 205, 'up');
    if (spring) this.showFloatText(position, `弹簧跃升  +${scoreGain}`, new Color(255, 222, 112, 255));
    else if (precise) this.showFloatText(position, `精准落点  +${scoreGain}`, new Color(172, 244, 255, 255));
    else if (!repeated) this.showFloatText(position, `+${scoreGain}`, new Color(255, 255, 255, 235));
    if (combo >= 5) {
      this.emitBurst(position, new Color(255, 224, 128, 245), combo >= 8 ? 8 : 4, 250, 'up');
    }
    const comboShake = combo >= 8 ? 5 : combo >= 5 ? 3.8 : 0;
    this.requestShake(Math.max(spring ? 7.5 : 1.25, comboShake));
  }

  playDashFeedback(tier: 8 | 12, position: Vec3): void {
    const color = tier === 12 ? new Color(255, 157, 229, 255) : new Color(255, 224, 112, 255);
    this.emitBurst(position, color, tier === 12 ? 26 : 20, tier === 12 ? 440 : 360, 'up');
    this.showFloatText(position, tier === 12 ? 'COMBO 12 · 星光冲刺' : 'COMBO 8 · 云上冲刺', color);
    this.requestShake(tier === 12 ? 8 : 6);
  }

  playMilestoneFeedback(score: number, position: Vec3): void {
    this.emitBurst(position, new Color(255, 243, 170, 255), 20, 300, 'radial');
    this.showFloatText(position, `里程碑 ${score} 分`, new Color(255, 243, 170, 255));
  }

  playLevelCompleteFeedback(level: number, position: Vec3): void {
    this.emitBurst(position, new Color(179, 229, 255, 255), 28, 350, 'radial');
    this.showFloatText(position, `第 ${level} 段旅程完成`, new Color(201, 235, 255, 255));
  }

  playStartFeedback(position: Vec3): void {
    this.emitBurst(position, new Color(255, 238, 158, 245), 12, 230, 'radial');
    this.emitBurst(position, new Color(255, 255, 255, 235), 7, 260, 'up');
  }

  playCollectibleFeedback(type: CollectibleType, position: Vec3): void {
    const star = type === 'star';
    this.emitBurst(
      position,
      star ? new Color(255, 225, 105, 255) : new Color(255, 196, 72, 255),
      star ? 14 : 9,
      star ? 260 : 190,
      'radial',
    );
    if (star) this.requestShake(2);
  }

  private buildTrailPool(): void {
    for (let i = 0; i < GAME.effectTrailPoolSize; i += 1) {
      const node = new Node(`Trail_${i}`);
      node.parent = this.node;
      node.layer = this.node.layer;
      const graphics = node.addComponent(Graphics);
      graphics.fillColor = new Color(255, 199, 109, 210);
      graphics.circle(0, 0, 23);
      graphics.fill();
      const opacity = node.addComponent(UIOpacity);
      opacity.opacity = 0;
      node.active = false;
      this.trail.push({ node, graphics, opacity, life: 0, active: false });
    }
  }

  private buildParticlePool(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const node = new Node(`EffectParticle_${i}`);
      node.parent = this.node;
      node.layer = this.node.layer;
      const graphics = node.addComponent(Graphics);
      const opacity = node.addComponent(UIOpacity);
      opacity.opacity = 0;
      node.active = false;
      this.particles.push({ node, graphics, opacity, velocity: new Vec3(), life: 0, active: false });
    }
  }

  private buildFloatTextPool(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const node = new Node(`FloatText_${i}`);
      node.parent = this.node;
      node.layer = this.node.layer;
      const transform = node.addComponent(UITransform);
      transform.setContentSize(240, 70);
      const label = node.addComponent(Label);
      label.fontSize = 30;
      label.lineHeight = 38;
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
      label.verticalAlign = VerticalTextAlignment.CENTER;
      label.enableWrapText = false;
      const opacity = node.addComponent(UIOpacity);
      opacity.opacity = 0;
      node.active = false;
      this.floatTexts.push({ node, label, opacity, life: 0, active: false });
    }
  }

  getPoolStats(): { trail: number; particles: number; activeParticles: number; floatTexts: number; activeFloatTexts: number } {
    return {
      trail: this.trail.length,
      particles: this.particles.length,
      activeParticles: this.particles.reduce((total, particle) => total + (particle.active ? 1 : 0), 0),
      floatTexts: this.floatTexts.length,
      activeFloatTexts: this.floatTexts.reduce((total, item) => total + (item.active ? 1 : 0), 0),
    };
  }

  private showFloatText(position: Vec3, value: string, color: Color): void {
    if (this.floatTexts.length === 0) return;
    let item = this.floatTexts[this.floatTextCursor];
    for (let i = 0; i < this.floatTexts.length; i += 1) {
      const index = (this.floatTextCursor + i) % this.floatTexts.length;
      if (!this.floatTexts[index].active) {
        item = this.floatTexts[index];
        this.floatTextCursor = (index + 1) % this.floatTexts.length;
        break;
      }
    }
    item.label.string = value;
    item.label.color = color;
    item.node.active = true;
    item.node.setPosition(position.x, position.y + 58, position.z);
    item.node.setScale(0.82, 0.82, 1);
    item.opacity.opacity = 255;
    item.life = 1;
    item.active = true;
  }

  private updateFloatTexts(dt: number): void {
    for (const item of this.floatTexts) {
      if (!item.active) continue;
      item.life -= dt * 1.75;
      if (item.life <= 0) {
        item.active = false;
        item.node.active = false;
        continue;
      }
      item.node.getPosition(this.floatTextPosition);
      this.floatTextPosition.y += 72 * dt;
      item.node.setPosition(this.floatTextPosition);
      const scale = 0.82 + (1 - item.life) * 0.22;
      item.node.setScale(scale, scale, 1);
      item.opacity.opacity = Math.round(math.clamp01(item.life) * 255);
    }
  }

  private spawnTrailDot(highSpeed: boolean): void {
    if (!this.player || !this.gameManager || this.trail.length === 0) return;
    const dot = this.trail[this.trailCursor];
    this.trailCursor = (this.trailCursor + 1) % this.trail.length;
    const heated = this.gameManager.data.combo >= 3;
    dot.graphics.clear();
    dot.graphics.fillColor = highSpeed ? new Color(255, 247, 190, 245)
      : heated ? new Color(255, 226, 130, 235) : new Color(255, 199, 109, 205);
    dot.graphics.circle(0, 0, highSpeed ? 28 : heated ? 25 : 22);
    dot.graphics.fill();
    dot.node.active = true;
    dot.node.setPosition(this.player.node.position);
    dot.node.setScale(highSpeed ? 0.9 : heated ? 0.8 : 0.7, highSpeed ? 0.9 : heated ? 0.8 : 0.7, 1);
    dot.opacity.opacity = highSpeed ? 175 : heated ? 145 : 100;
    dot.life = 1;
    dot.active = true;
  }

  private updateTrail(dt: number): void {
    for (const dot of this.trail) {
      if (!dot.active) continue;
      dot.life -= dt * 2.7;
      if (dot.life <= 0) {
        dot.active = false;
        dot.node.active = false;
        continue;
      }
      const scale = 0.25 + dot.life * 0.47;
      dot.node.setScale(scale, scale, 1);
      dot.opacity.opacity = Math.round(dot.life * 120);
    }
  }

  private emitBurst(position: Vec3, color: Color, count: number, speed: number, pattern: 'radial' | 'up'): void {
    for (let i = 0; i < count; i += 1) {
      const particle = this.acquireParticle();
      const angle = pattern === 'up' ? Math.PI * (0.18 + Math.random() * 0.64) : Math.random() * Math.PI * 2;
      const particleSpeed = speed * (0.48 + Math.random() * 0.52);
      particle.node.active = true;
      particle.node.setPosition(position);
      particle.node.setScale(1, 1, 1);
      particle.graphics.clear();
      particle.graphics.fillColor = color;
      particle.graphics.circle(0, 0, 3 + Math.random() * 4);
      particle.graphics.fill();
      particle.opacity.opacity = 255;
      particle.velocity.set(Math.cos(angle) * particleSpeed, Math.sin(angle) * particleSpeed + (pattern === 'up' ? 45 : 15), 0);
      particle.life = 1;
      particle.active = true;
    }
  }

  private acquireParticle(): BurstParticle {
    for (let i = 0; i < this.particles.length; i += 1) {
      const index = (this.particleCursor + i) % this.particles.length;
      if (!this.particles[index].active) {
        this.particleCursor = (index + 1) % this.particles.length;
        return this.particles[index];
      }
    }
    const particle = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.particles.length;
    return particle;
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.life -= dt * 2.4;
      if (particle.life <= 0) {
        particle.active = false;
        particle.node.active = false;
        continue;
      }
      particle.velocity.y -= 320 * dt;
      particle.node.getPosition(this.particlePosition);
      this.particlePosition.x += particle.velocity.x * dt;
      this.particlePosition.y += particle.velocity.y * dt;
      particle.node.setPosition(this.particlePosition);
      const scale = 0.35 + particle.life * 0.8;
      particle.node.setScale(scale, scale, 1);
      particle.opacity.opacity = Math.round(particle.life * 235);
    }
  }

  private requestShake(magnitude: number): void {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  private updateShake(dt: number): void {
    if (!this.world) return;
    if (this.shakeMagnitude <= 0.1) {
      this.shakeMagnitude = 0;
      this.world.setPosition(Vec3.ZERO);
      return;
    }
    const x = (Math.random() - 0.5) * this.shakeMagnitude;
    const y = (Math.random() - 0.5) * this.shakeMagnitude;
    this.world.setPosition(x, y, 0);
    this.shakeMagnitude = math.lerp(this.shakeMagnitude, 0, Math.min(1, dt * 12));
  }
}
