import { _decorator, Component, Label, ProgressBar } from 'cc';
import { GameManager } from '../game/GameManager';
const { ccclass, property } = _decorator;

@ccclass('HUDController')
export class HUDController extends Component {
  @property(GameManager) gameManager: GameManager | null = null;
  @property(Label) scoreLabel: Label | null = null;
  @property(Label) bestLabel: Label | null = null;
  @property(Label) coinLabel: Label | null = null;
  @property(Label) comboLabel: Label | null = null;
  @property(ProgressBar) levelProgress: ProgressBar | null = null;

  update(): void {
    const game = this.gameManager;
    if (!game) return;
    const data = game.data;
    if (this.scoreLabel) this.scoreLabel.string = `${Math.floor(data.score)}`;
    if (this.bestLabel) this.bestLabel.string = `最佳 ${data.bestScore}`;
    if (this.coinLabel) this.coinLabel.string = `${data.totalCoins}`;
    if (this.comboLabel) {
      this.comboLabel.string = data.combo >= 2 ? `${data.combo} 连击` : '';
      this.comboLabel.node.active = data.combo >= 2;
    }
    if (this.levelProgress) this.levelProgress.progress = Math.min(1, data.score / 200);
  }
}
