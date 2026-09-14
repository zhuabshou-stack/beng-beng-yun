declare const wx: any;

// 微信小游戏桥接：与 DouyinBridge 保持同构的方法与降级行为。
// 快手官方开发者工具会把微信包自动适配出 wx 对象，因此快手运行时也复用本实现。
export class WechatBridge {
  static get isWechat(): boolean {
    return typeof wx !== 'undefined' && !!wx;
  }

  static share(title = '蹦蹦云｜向上跳跃，收集星光'): void {
    if (!this.isWechat || typeof wx.shareAppMessage !== 'function') return;
    wx.shareAppMessage({ title });
  }

  static vibrateShort(): void {
    if (!this.isWechat || typeof wx.vibrateShort !== 'function') return;
    wx.vibrateShort({ type: 'light' });
  }

  static onShow(callback: () => void): void {
    if (this.isWechat && typeof wx.onShow === 'function') wx.onShow(callback);
  }

  static onHide(callback: () => void): void {
    if (this.isWechat && typeof wx.onHide === 'function') wx.onHide(callback);
  }

  static offHide(callback: () => void): void {
    if (this.isWechat && typeof wx.offHide === 'function') wx.offHide(callback);
  }

  // 安全区换算与抖音版一致：平台 safeArea 为屏幕像素坐标，需换算到设计分辨率。
  static getSafeAreaInsets(designWidth = 1080, designHeight = 1920): { top: number; right: number; bottom: number; left: number } {
    if (!this.isWechat || typeof wx.getSystemInfoSync !== 'function') {
      return { top: 32, right: 24, bottom: 24, left: 24 };
    }
    try {
      const info = wx.getSystemInfoSync();
      const safe = info.safeArea;
      const screenWidth = Number(info.screenWidth || info.windowWidth || designWidth);
      const screenHeight = Number(info.screenHeight || info.windowHeight || designHeight);
      if (!safe || screenWidth <= 0 || screenHeight <= 0) return { top: 32, right: 24, bottom: 24, left: 24 };
      const scaleX = designWidth / screenWidth;
      const scaleY = designHeight / screenHeight;
      return {
        top: Math.max(0, Number(safe.top || 0) * scaleY),
        right: Math.max(0, (screenWidth - Number(safe.right || screenWidth)) * scaleX),
        bottom: Math.max(0, (screenHeight - Number(safe.bottom || screenHeight)) * scaleY),
        left: Math.max(0, Number(safe.left || 0) * scaleX),
      };
    } catch {
      return { top: 32, right: 24, bottom: 24, left: 24 };
    }
  }
}
