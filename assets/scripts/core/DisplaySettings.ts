import { GAME } from './GameConfig';
import { StorageService } from '../platform/StorageService';

export type UiMode = 'standard' | 'large';

const UI_MODE_KEY = 'cloudBounceUiMode';

export class DisplaySettings {
  static getUiMode(): UiMode {
    return StorageService.getJSON<UiMode>(UI_MODE_KEY, 'standard') === 'large' ? 'large' : 'standard';
  }

  static setUiMode(mode: UiMode): void {
    StorageService.setJSON<UiMode>(UI_MODE_KEY, mode);
  }

  static getUiScale(mode = this.getUiMode()): number {
    return GAME.uiScale * (mode === 'large' ? GAME.accessibilityUiScale : 1);
  }
}
