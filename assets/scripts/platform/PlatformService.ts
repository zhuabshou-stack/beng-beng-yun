import { DouyinBridge } from './DouyinBridge';
import { WechatBridge } from './WechatBridge';

export type PlatformName = 'douyin' | 'wechat' | 'kuaishou' | 'web';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

declare const ks: any;

// 业务代码唯一平台入口：统一分享、震动、前后台与安全区能力。
// 平台判定顺序：快手（ks 原生对象）→ 微信（wx）→ 抖音（tt）→ 浏览器降级。
// 快手运行时经官方 kwaiadapter 模拟 wx，分享等能力与微信共用 WechatBridge。
export class PlatformService {
  static get platform(): PlatformName {
    if (typeof ks !== 'undefined' && !!ks) return 'kuaishou';
    if (WechatBridge.isWechat) return 'wechat';
    if (DouyinBridge.isDouyin) return 'douyin';
    return 'web';
  }

  static platformLabel(): string {
    switch (this.platform) {
      case 'douyin':
        return '抖音';
      case 'wechat':
        return '微信';
      case 'kuaishou':
        return '快手';
      default:
        return '浏览器';
    }
  }

  static share(title = '蹦蹦云｜向上跳跃，收集星光'): void {
    if (this.platform === 'douyin') DouyinBridge.share(title);
    else WechatBridge.share(title);
  }

  static vibrateShort(): void {
    if (this.platform === 'douyin') DouyinBridge.vibrateShort();
    else WechatBridge.vibrateShort();
  }

  static onShow(callback: () => void): void {
    if (this.platform === 'douyin') DouyinBridge.onShow(callback);
    else WechatBridge.onShow(callback);
  }

  static onHide(callback: () => void): void {
    if (this.platform === 'douyin') DouyinBridge.onHide(callback);
    else WechatBridge.onHide(callback);
  }

  static offHide(callback: () => void): void {
    if (this.platform === 'douyin') DouyinBridge.offHide(callback);
    else WechatBridge.offHide(callback);
  }

  static getSafeAreaInsets(designWidth = 1080, designHeight = 1920): SafeAreaInsets {
    if (this.platform === 'douyin') return DouyinBridge.getSafeAreaInsets(designWidth, designHeight);
    return WechatBridge.getSafeAreaInsets(designWidth, designHeight);
  }
}
