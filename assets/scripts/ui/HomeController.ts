import { _decorator, Component, Label } from 'cc';
import { SceneFlow } from './SceneFlow';
import { GameManager } from '../game/GameManager';
import { PlatformService } from '../platform/PlatformService';
const { ccclass, property } = _decorator;

@ccclass('HomeController')
export class HomeController extends Component {
  @property(SceneFlow) flow: SceneFlow | null = null;
  @property(GameManager) gameManager: GameManager | null = null;
  @property(Label) coinLabel: Label | null = null;

  onEnable(): void {
    if (this.coinLabel && this.gameManager) this.coinLabel.string = `${this.gameManager.data.totalCoins}`;
  }

  play(): void {
    this.gameManager?.startRun();
    this.flow?.show('game');
  }

  openSkin(): void { this.flow?.show('skin'); }
  openSkill(): void { this.flow?.show('skill'); }
  openRank(): void { this.flow?.show('rank'); }
  openStats(): void { this.flow?.show('stats'); }
  openSettings(): void { this.flow?.show('settings'); }
  share(): void { PlatformService.share(); }
}
