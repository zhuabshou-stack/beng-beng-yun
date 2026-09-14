import {
  Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform,
  Vec2, Vec3, VerticalTextAlignment,
} from 'cc';

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
  static readonly PRIMARY_GRADIENT = ['#667eea', '#764ba2'];
  static readonly START_GRADIENT = ['#f093fb', '#f5576c', '#ff6b6b'];
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
}
