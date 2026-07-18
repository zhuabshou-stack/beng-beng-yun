import { sys } from 'cc';

declare const tt: any;

export class DouyinBridge {
  static get isDouyin(): boolean {
    return typeof tt !== 'undefined' && !!tt;
  }

  static share(title = '蹦蹦云｜向上跳跃，收集星光'): void {
    if (!this.isDouyin || typeof tt.shareAppMessage !== 'function') return;
    tt.shareAppMessage({ title });
  }

  static vibrateShort(): void {
    if (!this.isDouyin || typeof tt.vibrateShort !== 'function') return;
    tt.vibrateShort({});
  }

  static onShow(callback: () => void): void {
    if (this.isDouyin && typeof tt.onShow === 'function') tt.onShow(callback);
  }

  static onHide(callback: () => void): void {
    if (this.isDouyin && typeof tt.onHide === 'function') tt.onHide(callback);
  }

  static offHide(callback: () => void): void {
    if (this.isDouyin && typeof tt.offHide === 'function') tt.offHide(callback);
  }

  static platformName(): string {
    return this.isDouyin ? 'douyin' : sys.platform;
  }

  static getSafeAreaInsets(designWidth = 1080, designHeight = 1920): { top: number; right: number; bottom: number; left: number } {
    if (!this.isDouyin || typeof tt.getSystemInfoSync !== 'function') {
      return { top: 32, right: 24, bottom: 24, left: 24 };
    }
    try {
      const info = tt.getSystemInfoSync();
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
