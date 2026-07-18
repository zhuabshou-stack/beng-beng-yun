import { _decorator, Component, ProgressBar, tween } from 'cc';
import { SceneFlow } from './SceneFlow';
const { ccclass, property } = _decorator;

@ccclass('SplashController')
export class SplashController extends Component {
  @property(SceneFlow) flow: SceneFlow | null = null;
  @property(ProgressBar) progressBar: ProgressBar | null = null;

  start(): void {
    if (!this.progressBar) {
      this.scheduleOnce(() => this.flow?.show('home'), 1.2);
      return;
    }
    this.progressBar.progress = 0;
    tween(this.progressBar)
      .to(1.2, { progress: 1 })
      .call(() => this.flow?.show('home'))
      .start();
  }
}
