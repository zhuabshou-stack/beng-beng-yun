import { AudioClip, resources } from 'cc';
import { AudioManager, SoundCue } from './AudioManager';

// resources/audio 下的音效清单：[音效枚举, 加载路径]。
// Cocos 3.8 中 wav 导入后 AudioClip 的资源路径即 `audio/<文件名>`（无子资源后缀）。
const SOUND_FILES: ReadonlyArray<readonly [SoundCue, string]> = [
  ['ui', 'audio/ui'],
  ['jump', 'audio/jump'],
  ['spring', 'audio/spring'],
  ['coin', 'audio/coin'],
  ['star', 'audio/star'],
  ['combo', 'audio/combo'],
  ['milestone', 'audio/milestone'],
  ['gameOver', 'audio/gameOver'],
  ['explode', 'audio/explode'],
];

const MUSIC_PATH = 'audio/bgm';

// 统一从 resources 分包加载音频并注册进 AudioManager。
// 单个文件失败只降级为无声，不阻塞游戏流程；全部加载完成后尝试启动 BGM。
export class AudioCatalog {
  private static started = false;

  static preload(): void {
    if (this.started) return;
    this.started = true;
    let pending = SOUND_FILES.length + 1;
    const settle = (): void => {
      pending -= 1;
      if (pending === 0) AudioManager.startMusic();
    };
    for (const [cue, path] of SOUND_FILES) {
      resources.load(path, AudioClip, (err, clip) => {
        if (err || !clip) {
          console.warn(`[AudioCatalog] 音效加载失败: ${path}`);
        } else {
          AudioManager.registerSound(cue, clip);
        }
        settle();
      });
    }
    resources.load(MUSIC_PATH, AudioClip, (err, clip) => {
      if (err || !clip) {
        console.warn(`[AudioCatalog] BGM 加载失败: ${MUSIC_PATH}`);
      } else {
        AudioManager.registerMusic(clip);
      }
      settle();
    });
  }
}
