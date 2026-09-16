import {
  Button, Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform,
  Vec2, Vec3, VerticalTextAlignment,
} from 'cc';
import { SKINS, SkinDefinition } from '../core/GameConfig';

function hexColor(hexString: string, alpha = 255): Color {
  const color = new Color();
  Color.fromHEX(color, hexString);
  color.a = alpha;
  return color;
}

// 《蹦蹦云》统一 UI 设计系统。
// 所有设计令牌 1:1 取自 HTML 原版 css/styles.css 实测值（用户钦定的视觉基准），勿凭感觉修改。
export class UiKit {
  // —— 渐变（135° 对角在竖屏上以垂直色带近似，128 段静态绘制一次）——
  static readonly PANEL_GRADIENT = ['#1a1a2e', '#16213e'];
  static readonly RANK_PANEL_GRADIENT = ['#1a1a2e', '#16213e', '#0f3460'];
  static readonly PRIMARY_GRADIENT: readonly [string, string] = ['#667eea', '#764ba2'];
  static readonly START_GRADIENT = ['#f093fb', '#f5576c', '#ff6b6b'];
  // 强调双色（粉→红，HTML btn-secondary）
  static readonly ACCENT_GRADIENT: readonly [string, string] = ['#f093fb', '#f5576c'];
  static readonly PROGRESS_GRADIENT = ['#f093fb', '#ffd166'];
  static readonly GOLD = '#ffd700';
  static readonly COMBO_RED = '#ff6b6b';

  // —— 卡片（HTML §2.5：白 10% 底 + 白 15% 边）——
  static readonly CARD_BACKGROUND = new Color(255, 255, 255, 26);
  static readonly CARD_BORDER = new Color(255, 255, 255, 38);
  static readonly CARD_ACCENTS: Record<string, [string, string]> = {
    skin: ['#4facfe', '#00f2fe'],
    rank: ['#ffd700', '#ffaa00'],
    skill: ['#a18cd1', '#fbc2eb'],
    stats: ['#667eea', '#764ba2'],
    settings: ['#89f7fe', '#66a6ff'],
    share: ['#43e97b', '#38f9d7'],
  };

  // —— 文字阴影（HTML §1.5：标题 0 4px 30px 黑 30%；HUD 分数 0 2px 12px 黑 50%）——
  static readonly TITLE_SHADOW = new Color(0, 0, 0, 77);
  static readonly HUD_TEXT_SHADOW = new Color(0, 0, 0, 128);
  static readonly COMBO_SHADOW = new Color(255, 100, 100, 102);

  // —— 技能图标专属渐变（HTML §1.2 六色）——
  static readonly SKILL_GRADIENTS: Record<string, [string, string]> = {
    shield: ['#74b9ff', '#0984e3'],
    magnet: ['#fd79a8', '#e84393'],
    slowmo: ['#a29bfe', '#6c5ce7'],
    ghost: ['#dfe6e9', '#b2bec3'],
    doubleJump: ['#55efc4', '#00b894'],
    timeWarp: ['#fdcb6e', '#e17055'],
  };

  static sampleGradient(colors: readonly (string | Color)[], t: number): Color {
    const clamped = Math.max(0, Math.min(1, t));
    const scaled = clamped * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(scaled));
    const local = colors.length === 1 ? 0 : scaled - index;
    const from = colors[index] instanceof Color ? colors[index] as Color : hexColor(colors[index] as string);
    const to = colors[index + 1] instanceof Color ? colors[index + 1] as Color : hexColor(colors[index + 1] as string);
    return new Color(
      Math.round(from.r + (to.r - from.r) * local),
      Math.round(from.g + (to.g - from.g) * local),
      Math.round(from.b + (to.b - from.b) * local),
      Math.round(from.a + (to.a - from.a) * local),
    );
  }

  // 垂直渐变填充：以节点中心为原点，覆盖 width×height
  static fillVerticalGradient(graphics: Graphics, width: number, height: number, colors: readonly (string | Color)[], segments = 128): void {
    graphics.clear();
    const bandHeight = height / segments;
    for (let i = 0; i < segments; i += 1) {
      const t = i / (segments - 1);
      graphics.fillColor = UiKit.sampleGradient(colors, t);
      graphics.rect(-width * 0.5, height * 0.5 - (i + 1) * bandHeight, width, bandHeight + 2);
      graphics.fill();
    }
  }

  // 水平渐变填充（用于进度条填充、卡片顶部高亮条等横条）
  static fillHorizontalGradient(graphics: Graphics, x: number, y: number, width: number, height: number, colors: readonly (string | Color)[], radius = 0, segments = 48): void {
    const bandWidth = width / segments;
    for (let i = 0; i < segments; i += 1) {
      const t = i / (segments - 1);
      graphics.fillColor = UiKit.sampleGradient(colors, t);
      if (radius > 0) {
        graphics.roundRect(x + i * bandWidth, y, bandWidth + 1, height, Math.min(radius, bandWidth * 0.5));
      } else {
        graphics.rect(x + i * bandWidth, y, bandWidth + 1, height);
      }
      graphics.fill();
    }
  }

  // 圆角矩形内的垂直渐变：逐层 roundRect 自顶向下叠色，四角始终保持圆角（用于按钮/面板底）
  static fillRoundedVerticalGradient(graphics: Graphics, width: number, height: number, radius: number, colors: readonly (string | Color)[], layers = 24): void {
    const step = height / layers;
    for (let i = 0; i < layers; i += 1) {
      graphics.fillColor = UiKit.sampleGradient(colors, i / (layers - 1));
      graphics.roundRect(-width * 0.5, -height * 0.5 + i * step, width, height - i * step, radius);
      graphics.fill();
    }
  }

  // 圆角矩形内的水平渐变：逐层 roundRect 自左向右叠色，两端保持圆角；以 (centerX, centerY) 为中心
  static fillRoundedHorizontalGradient(graphics: Graphics, centerX: number, centerY: number, width: number, height: number, radius: number, colors: readonly (string | Color)[], layers = 24): void {
    const step = width / layers;
    const left = centerX - width * 0.5;
    for (let i = 0; i < layers; i += 1) {
      graphics.fillColor = UiKit.sampleGradient(colors, i / (layers - 1));
      graphics.roundRect(left, centerY - height * 0.5, width - i * step, height, radius);
      graphics.fill();
    }
  }

  // 多层偏移低透明圆角矩形模拟投影；需在面板本体填充之前调用（本体覆盖中部）
  static drawDropShadow(graphics: Graphics, width: number, height: number, radius: number, offsetY = 16, alpha = 96): void {
    for (let layer = 3; layer >= 1; layer -= 1) {
      graphics.fillColor = new Color(0, 0, 0, Math.round(alpha / layer));
      const grow = layer * 7;
      graphics.roundRect(
        -width * 0.5 - grow * 0.35,
        -height * 0.5 - offsetY - grow * 0.25,
        width + grow * 0.7,
        height + grow * 0.7,
        radius + grow,
      );
      graphics.fill();
    }
  }

  // 文字样式：粗体 + 投影（HTML 版标题 800/900 字重与文字阴影的 Cocos 等价物）
  static styleLabel(label: Label, options?: { bold?: boolean; shadowColor?: Color; shadow?: boolean }): Label {
    if (options?.bold !== false) label.isBold = true;
    if (options?.shadow !== false) {
      label.enableShadow = true;
      label.shadowColor = options?.shadowColor ?? UiKit.TITLE_SHADOW;
      const depth = Math.max(2, Math.round(label.fontSize / 12));
      label.shadowOffset = new Vec2(0, -depth);
    }
    return label;
  }

  static label(parent: Node, name: string, text: string, fontSize: number, color: Color, options?: { bold?: boolean; shadowColor?: Color; shadow?: boolean; width?: number }): Label {
    const node = new Node(name);
    node.parent = parent;
    node.layer = parent.layer;
    const transform = node.addComponent(UITransform);
    transform.setContentSize(options?.width ?? 640, Math.max(66, fontSize + 20));
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    return UiKit.styleLabel(label, options);
  }

  // 统一按压反馈：保存基准缩放再压缩，还原不破坏预缩放节点（对齐 DreamyHUD 版正确实现）
  static pressFeedback(node: Node, scale = 0.96): void {
    const restore = new Vec3();
    node.on(Node.EventType.TOUCH_START, () => {
      node.getScale(restore);
      node.setScale(restore.x * scale, restore.y * scale, 1);
    });
    const restoreScale = (): void => node.setScale(restore);
    node.on(Node.EventType.TOUCH_END, restoreScale);
    node.on(Node.EventType.TOUCH_CANCEL, restoreScale);
  }

  // 开关控件（HTML §3.2：轨道 50×28、滑块 22，开=主渐变；尺寸按 1080 设计放大 2.57 倍）
  static createToggle(parent: Node, centerX: number, centerY: number, isOn: boolean, onChange: (setOn: (on: boolean) => void) => void): Node {
    const track = new Node('Toggle');
    track.parent = parent;
    track.layer = parent.layer;
    track.addComponent(UITransform).setContentSize(128, 72);
    track.setPosition(centerX, centerY, 0);
    const art = track.addComponent(Graphics);
    const draw = (on: boolean): void => {
      art.clear();
      if (on) {
        UiKit.fillRoundedVerticalGradient(art, 128, 72, 36, UiKit.PRIMARY_GRADIENT);
      } else {
        art.fillColor = new Color(255, 255, 255, 38);
        art.roundRect(-64, -36, 128, 72, 36);
        art.fill();
      }
      art.fillColor = Color.WHITE;
      art.circle(on ? 28 : -28, 0, 28);
      art.fill();
    };
    draw(isOn);
    const button = track.addComponent(Button);
    button.transition = Button.Transition.NONE;
    track.on(Button.EventType.CLICK, () => onChange(draw));
    return track;
  }

  // —— 皮肤稀有度（1 普通 → 4 传说）——
  static readonly SKIN_RARITY_NAMES = ['', '普通', '稀有', '史诗', '传说'];
  static readonly SKIN_RARITY_COLORS = [
    new Color(255, 255, 255, 255),
    new Color(170, 185, 205, 200),
    new Color(110, 203, 255, 220),
    new Color(199, 146, 255, 220),
    new Color(255, 215, 0, 230),
  ];
  // 完整角色绘制（身体/翅膀/眼睛/腮红/嘴 + 皮肤专属特征）。
  // PlayerController 的游戏内角色与皮肤商店预览共用这一份实现，坐标为角色局部系（约 ±50）。
  static drawCharacter(graphics: Graphics, skin: SkinDefinition): void {
    const body = Color.fromHEX(new Color(), skin.bodyColor);
    const middle = Color.fromHEX(new Color(), skin.midColor);
    const accent = Color.fromHEX(new Color(), skin.accentColor);
    const eyes = Color.fromHEX(new Color(), skin.eyeColor);
    const blush = Color.fromHEX(new Color(), skin.blushColor);
    const wings = Color.fromHEX(new Color(), skin.wingColor);
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
    UiKit.drawSkinFeature(graphics, skin);
  }

  // 皮肤专属识别特征：每款皮肤有可辨识的造型差异（纯矢量绘制）
  private static drawSkinFeature(graphics: Graphics, skin: SkinDefinition): void {
    const accent = Color.fromHEX(new Color(), skin.accentColor);
    const glow = Color.fromHEX(new Color(), skin.glowColor);
    switch (skin.feature) {
      case 'sunRays': {
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
        graphics.fillColor = new Color(glow.r, glow.g, glow.b, 230);
        const crystals: Array<[number, number, number]> = [[-32, 36, 7], [27, 42, 5], [37, 12, 6]];
        for (const [cx, cy, size] of crystals) {
          graphics.moveTo(cx, cy + size); graphics.lineTo(cx + size * 0.6, cy);
          graphics.lineTo(cx, cy - size); graphics.lineTo(cx - size * 0.6, cy); graphics.fill();
        }
        break;
      }
      case 'petals': {
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
        graphics.fillColor = new Color(255, 255, 255, 235);
        graphics.moveTo(4, 18); graphics.lineTo(-8, 0); graphics.lineTo(-1, 0);
        graphics.lineTo(-4, -14); graphics.lineTo(9, 6); graphics.lineTo(1, 6); graphics.lineTo(4, 18);
        graphics.fill();
        break;
      }
      case 'candySprinkle': {
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
