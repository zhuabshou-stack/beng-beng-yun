import { _decorator, Component } from 'cc';
import { GameManager } from '../game/GameManager';
import { SceneFlow } from './SceneFlow';
const { ccclass, property } = _decorator;

@ccclass('GameSceneController')
export class GameSceneController extends Component {
  @property(GameManager) gameManager: GameManager | null = null;
  @property(SceneFlow) flow: SceneFlow | null = null;

  update(): void {
    if (this.gameManager?.phase === 'gameover') this.flow?.show('result');
    if (this.gameManager?.phase === 'complete') this.flow?.show('result');
  }

  pause(): void {
    this.gameManager?.pause();
    this.flow?.show('pause');
  }

  resume(): void {
    this.gameManager?.resume();
    this.flow?.show('game');
  }

  home(): void {
    this.gameManager?.pause();
    this.flow?.show('home');
  }
}
