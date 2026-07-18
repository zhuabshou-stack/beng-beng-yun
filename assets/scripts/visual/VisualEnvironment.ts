import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UITransform, Vec3, view } from 'cc';
import { GAME } from '../core/GameConfig';
const { ccclass } = _decorator;

export interface EnvironmentFrames {
  sky: SpriteFrame | null;
  farMountains: SpriteFrame | null;
  midMountains: SpriteFrame | null;
  nearMountains: SpriteFrame | null;
  ambientClouds: SpriteFrame | null;
}

interface StarPoint {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
}

interface AmbientCloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alpha: number;
}

@ccclass('VisualEnvironment')
export class VisualEnvironment extends Component {
  private cameraNode: Node | null = null;
  private skyGraphics: Graphics | null = null;
  private starsGraphics: Graphics | null = null;
  private ambientGraphics: Graphics | null = null;
  private mountainNodes: Node[] = [];
  private stars: StarPoint[] = [];
  private ambientClouds: AmbientCloud[] = [];
  private elapsed = 0;
  private width = 0;
  private height = 0;

  configure(cameraNode: Node, frames: EnvironmentFrames): void {
    this.cameraNode = cameraNode;
    this.node.layer = cameraNode.parent?.layer ?? this.node.layer;
    this.build(frames);
  }

  update(dt: number): void {
    if (!this.cameraNode || !this.skyGraphics || !this.starsGraphics || !this.ambientGraphics) return;
    this.elapsed += Math.min(dt, 1 / 20);
    const cameraY = this.cameraNode.position.y;
    this.node.setPosition(0, cameraY, 0);

    const visible = view.getVisibleSize();
    const visibleHeight = visible.height * GAME.cameraVisibleHeight;
    if (Math.abs(visible.width - this.width) > 1 || Math.abs(visibleHeight - this.height) > 1) {
      this.width = visible.width;
      this.height = visibleHeight;
      this.redrawStaticLayers();
      this.seedAtmosphere();
    }

    for (let i = 0; i < this.mountainNodes.length; i += 1) {
      const drift = Math.sin(cameraY * 0.0008 + i * 1.7) * (5 + i * 4);
      this.mountainNodes[i].setPosition(drift, 0, 0);
    }
    this.drawStars(dt);
    this.drawAmbientClouds(dt);
  }

  private build(frames: EnvironmentFrames): void {
    this.node.removeAllChildren();
    this.skyGraphics = this.createGraphicsNode('SkyGradient', this.node);
    if (frames.sky) this.createSpriteLayer('SkySprite', frames.sky, this.node);

    const starNode = this.createNode('Stars', this.node);
    this.starsGraphics = starNode.addComponent(Graphics);

    const mountainFrames = [frames.farMountains, frames.midMountains, frames.nearMountains];
    const mountainNames = ['FarMountains', 'MidMountains', 'NearMountains'];
    this.mountainNodes = mountainNames.map((name, index) => {
      const node = this.createNode(name, this.node);
      if (mountainFrames[index]) this.createSpriteLayer(`${name}Sprite`, mountainFrames[index], node);
      else node.addComponent(Graphics);
      return node;
    });

    const ambientNode = this.createNode('AmbientClouds', this.node);
    this.ambientGraphics = ambientNode.addComponent(Graphics);
    if (frames.ambientClouds) this.createSpriteLayer('AmbientCloudSprite', frames.ambientClouds, ambientNode);

    const visible = view.getVisibleSize();
    this.width = visible.width;
    this.height = visible.height * GAME.cameraVisibleHeight;
    this.redrawStaticLayers();
    this.seedAtmosphere();
  }

  private redrawStaticLayers(): void {
    this.drawSky();
    const colors = [
      new Color(79, 82, 154, 68),
      new Color(102, 91, 166, 96),
      new Color(120, 106, 176, 125),
    ];
    for (let i = 0; i < this.mountainNodes.length; i += 1) {
      const graphics = this.mountainNodes[i].getComponent(Graphics);
      if (graphics) this.drawMountainLayer(graphics, i, colors[i]);
    }
  }

  private drawSky(): void {
    const graphics = this.skyGraphics;
    if (!graphics) return;
    graphics.clear();
    const bands = 64;
    const stops = [
      new Color(83, 101, 196, 255),
      new Color(119, 155, 231, 255),
      new Color(179, 207, 245, 255),
      new Color(255, 204, 221, 255),
    ];
    for (let i = 0; i < bands; i += 1) {
      const t = i / (bands - 1);
      const segment = Math.min(2, Math.floor(t * 3));
      const local = t * 3 - segment;
      graphics.fillColor = this.mix(stops[segment], stops[segment + 1], local);
      const bandHeight = this.height / bands + 2;
      graphics.rect(-this.width * 0.5 - 8, -this.height * 0.5 + i * this.height / bands - 1, this.width + 16, bandHeight);
      graphics.fill();
    }
    for (let i = 6; i >= 1; i -= 1) {
      graphics.fillColor = new Color(255, 224, 193, 5 + i * 3);
      graphics.circle(this.width * 0.28, this.height * 0.26, 55 + i * 35);
      graphics.fill();
    }
  }

  private drawMountainLayer(graphics: Graphics, layer: number, color: Color): void {
    graphics.clear();
    graphics.fillColor = color;
    const base = -this.height * 0.5 + this.height * (0.12 + layer * 0.07);
    const amplitude = 52 + layer * 28;
    const step = 28;
    graphics.moveTo(-this.width * 0.55, -this.height * 0.55);
    for (let x = -this.width * 0.55; x <= this.width * 0.55 + step; x += step) {
      const wave = Math.sin(x * (0.006 + layer * 0.0018) + layer * 1.9) * amplitude;
      const ridge = Math.sin(x * (0.014 + layer * 0.002) + layer * 0.7) * amplitude * 0.32;
      graphics.lineTo(x, base + wave + ridge);
    }
    graphics.lineTo(this.width * 0.55, -this.height * 0.55);
    graphics.close();
    graphics.fill();
  }

  private seedAtmosphere(): void {
    this.stars = Array.from({ length: 56 }, (_, index) => ({
      x: (Math.random() - 0.5) * this.width,
      y: (Math.random() - 0.15) * this.height,
      radius: 1.2 + Math.random() * 3.2,
      phase: Math.random() * Math.PI * 2 + index,
      speed: 0.7 + Math.random() * 1.3,
    }));
    this.ambientClouds = Array.from({ length: 9 }, () => ({
      x: (Math.random() - 0.5) * (this.width + 420),
      y: (Math.random() - 0.45) * this.height,
      width: 150 + Math.random() * 260,
      height: 38 + Math.random() * 55,
      speed: (10 + Math.random() * 18) * (Math.random() < 0.5 ? -1 : 1),
      alpha: 18 + Math.random() * 24,
    }));
  }

  private drawStars(dt: number): void {
    const graphics = this.starsGraphics;
    if (!graphics) return;
    graphics.clear();
    for (const star of this.stars) {
      star.y += 4 * star.speed * dt;
      if (star.y > this.height * 0.55) star.y = -this.height * 0.55;
      const pulse = 0.55 + Math.sin(this.elapsed * star.speed * 2.2 + star.phase) * 0.35;
      const alpha = Math.round(70 + pulse * 150);
      graphics.fillColor = new Color(255, 247, 225, alpha);
      graphics.circle(star.x, star.y, star.radius * (0.75 + pulse * 0.4));
      graphics.fill();
      if (star.radius > 3.2) {
        graphics.strokeColor = new Color(255, 255, 255, Math.round(alpha * 0.75));
        graphics.lineWidth = 1.2;
        graphics.moveTo(star.x - 7, star.y);
        graphics.lineTo(star.x + 7, star.y);
        graphics.moveTo(star.x, star.y - 7);
        graphics.lineTo(star.x, star.y + 7);
        graphics.stroke();
      }
    }
  }

  private drawAmbientClouds(dt: number): void {
    const graphics = this.ambientGraphics;
    if (!graphics) return;
    graphics.clear();
    for (const cloud of this.ambientClouds) {
      cloud.x += cloud.speed * dt;
      const edge = this.width * 0.5 + cloud.width;
      if (cloud.speed > 0 && cloud.x > edge) cloud.x = -edge;
      if (cloud.speed < 0 && cloud.x < -edge) cloud.x = edge;
      graphics.fillColor = new Color(255, 255, 255, Math.round(cloud.alpha));
      graphics.ellipse(cloud.x, cloud.y, cloud.width * 0.5, cloud.height * 0.5);
      graphics.ellipse(cloud.x - cloud.width * 0.2, cloud.y + cloud.height * 0.2, cloud.width * 0.28, cloud.height * 0.58);
      graphics.ellipse(cloud.x + cloud.width * 0.22, cloud.y + cloud.height * 0.18, cloud.width * 0.24, cloud.height * 0.48);
      graphics.fill();
    }
  }

  private createNode(name: string, parent: Node): Node {
    const node = new Node(name);
    node.parent = parent;
    node.layer = this.node.layer;
    return node;
  }

  private createGraphicsNode(name: string, parent: Node): Graphics {
    return this.createNode(name, parent).addComponent(Graphics);
  }

  private createSpriteLayer(name: string, frame: SpriteFrame, parent: Node): Node {
    const node = this.createNode(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(this.width || 1080, this.height || 1920);
    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = frame;
    return node;
  }

  private mix(a: Color, b: Color, t: number): Color {
    return new Color(
      Math.round(a.r + (b.r - a.r) * t),
      Math.round(a.g + (b.g - a.g) * t),
      Math.round(a.b + (b.b - a.b) * t),
      Math.round(a.a + (b.a - a.a) * t),
    );
  }
}
