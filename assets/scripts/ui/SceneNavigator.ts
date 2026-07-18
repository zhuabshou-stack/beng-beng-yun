import { director } from 'cc';

export type GameSceneName = 'Boot' | 'Home' | 'Game';

export class SceneNavigator {
  private static loading = false;

  static preload(scene: GameSceneName, onProgress?: (progress: number) => void, onReady?: () => void): void {
    director.preloadScene(
      scene,
      (completed, total) => onProgress?.(total > 0 ? completed / total : 0),
      (error) => {
        if (error) return;
        onProgress?.(1);
        onReady?.();
      },
    );
  }

  static load(scene: GameSceneName): void {
    if (this.loading) return;
    this.loading = true;
    director.loadScene(scene, () => {
      this.loading = false;
    });
  }

  static home(): void { this.load('Home'); }
  static game(): void { this.load('Game'); }
}
