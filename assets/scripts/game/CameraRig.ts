import { _decorator, Component, Node, Vec3 } from 'cc';
import { GAME } from '../core/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('CameraRig')
export class CameraRig extends Component {
  @property(Node)
  target: Node | null = null;

  viewportHeight = 1280;
  highestY = 0;
  private springLagRemaining = 0;
  private springCatchRemaining = 0;

  reset(): void {
    const pos = this.node.position.clone();
    pos.y = 0;
    this.node.setPosition(pos);
    this.highestY = 0;
    this.springLagRemaining = 0;
    this.springCatchRemaining = 0;
  }

  notifySpringBounce(): void {
    this.springLagRemaining = GAME.springCameraLag;
    this.springCatchRemaining = GAME.springCameraCatch;
  }

  lateUpdate(dt: number): void {
    if (!this.target) return;
    let followRate = GAME.cameraFollowRate * GAME.tempoScale;
    if (this.springLagRemaining > 0) {
      this.springLagRemaining = Math.max(0, this.springLagRemaining - dt);
      followRate = 2.2 * GAME.tempoScale;
    } else if (this.springCatchRemaining > 0) {
      this.springCatchRemaining = Math.max(0, this.springCatchRemaining - dt);
      followRate = 6.2 * GAME.tempoScale;
    }
    const targetLine = this.node.position.y + this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    if (this.target.position.y <= targetLine) return;
    const wantedY = this.target.position.y - this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    const pos = this.node.position.clone();
    pos.y += (wantedY - pos.y) * Math.min(1, dt * followRate);
    this.node.setPosition(pos);
    this.highestY = Math.max(this.highestY, pos.y);
  }
}
