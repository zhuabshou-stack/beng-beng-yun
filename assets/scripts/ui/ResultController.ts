import { _decorator, Component, Label } from 'cc';
import { GameManager } from '../game/GameManager';
import { SceneFlow } from './SceneFlow';
import { PlatformService } from '../platform/PlatformService';
const { ccclass, property } = _decorator;

@ccclass('ResultController')
export class ResultController extends Component {
  @property(GameManager) gameManager: GameManager | null = null;
  @property(SceneFlow) flow: SceneFlow | null = null;
  @property(Label) scoreLabel: Label | null = null;
  @property(Label) bestLabel: Label | null = null;
  @property(Label) detailLabel: Label | null = null;

  onEnable(): void {
    const data = this.gameManager?.data;
    if (!data) return;
    if (this.scoreLabel) this.scoreLabel.string = `${Math.floor(data.score)}`;
    if (this.bestLabel) this.bestLabel.string = `历史最佳 ${data.bestScore}`;
    if (this.detailLabel) this.detailLabel.string = `⭐ ${data.stars}   💰 ${data.runCoins}   🔥 ${data.maxCombo}   🏔 ${Math.floor(data.heightMeters)}m`;
  }

  replay(): void {
    this.gameManager?.startRun();
    this.flow?.show('game');
  }

  home(): void { this.flow?.show('home'); }
  share(): void { PlatformService.share(`我在蹦蹦云跳到了 ${Math.floor(this.gameManager?.data.score ?? 0)} 分！`); }
}
