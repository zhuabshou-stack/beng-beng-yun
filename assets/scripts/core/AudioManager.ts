import { AudioClip, AudioSource, Node, director, isValid } from 'cc';
import { StorageService } from '../platform/StorageService';

export type SoundCue = 'ui' | 'jump' | 'spring' | 'coin' | 'star' | 'combo' | 'milestone' | 'gameOver';

const SOUND_KEY = 'cloudBounceSound';
const MUSIC_KEY = 'cloudBounceMusic';

export class AudioManager {
  private static root: Node | null = null;
  private static effects: AudioSource | null = null;
  private static music: AudioSource | null = null;
  private static readonly clips = new Map<SoundCue, AudioClip>();
  private static musicClip: AudioClip | null = null;

  static get soundEnabled(): boolean {
    return StorageService.getNumber(SOUND_KEY, 1) !== 0;
  }

  static get musicEnabled(): boolean {
    return StorageService.getNumber(MUSIC_KEY, 1) !== 0;
  }

  static setSoundEnabled(enabled: boolean): void {
    StorageService.setNumber(SOUND_KEY, enabled ? 1 : 0);
  }

  static setMusicEnabled(enabled: boolean): void {
    StorageService.setNumber(MUSIC_KEY, enabled ? 1 : 0);
    this.ensureSources();
    if (!this.music) return;
    if (!enabled) this.music.stop();
    else this.startMusic();
  }

  // 正式素材接入点：由后续资源配置注册，不在代码中下载或硬编码来源不明音频。
  static registerSound(cue: SoundCue, clip: AudioClip | null): void {
    if (clip) this.clips.set(cue, clip);
    else this.clips.delete(cue);
  }

  static registerMusic(clip: AudioClip | null): void {
    this.musicClip = clip;
    if (this.music) this.music.stop();
    this.startMusic();
  }

  static play(cue: SoundCue, volume = 1): void {
    if (!this.soundEnabled) return;
    const clip = this.clips.get(cue);
    if (!clip) return;
    this.ensureSources();
    this.effects?.playOneShot(clip, volume);
  }

  static playSound(cue: SoundCue, volume = 1): void {
    this.play(cue, volume);
  }

  static startMusic(): void {
    if (!this.musicEnabled || !this.musicClip) return;
    this.ensureSources();
    if (!this.music) return;
    this.music.clip = this.musicClip;
    this.music.loop = true;
    if (!this.music.playing) this.music.play();
  }

  private static ensureSources(): void {
    if (this.root && isValid(this.root, true) && this.effects && this.music) return;
    const scene = director.getScene();
    if (!scene) return;
    this.root = new Node('AudioManager');
    this.root.parent = scene;
    director.addPersistRootNode(this.root);
    this.effects = this.root.addComponent(AudioSource);
    this.music = this.root.addComponent(AudioSource);
  }
}
