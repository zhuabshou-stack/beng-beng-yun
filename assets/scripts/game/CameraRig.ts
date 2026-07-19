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
  private dashLagRemaining = 0;
  private dashCatchRemaining = 0;

  reset(): void {
    const pos = this.node.position.clone();
    pos.y = 0;
    this.node.setPosition(pos);
    this.highestY = 0;
    this.springLagRemaining = 0;
    this.springCatchRemaining = 0;
    this.dashLagRemaining = 0;
    this.dashCatchRemaining = 0;
  }

  notifySpringBounce(): void {
    this.springLagRemaining = GAME.springCameraLag;
    this.springCatchRemaining = GAME.springCameraCatch;
  }

  notifyDash(): void {
    this.dashLagRemaining = GAME.dashCameraLag;
    this.dashCatchRemaining = GAME.dashCameraCatch;
  }

  lateUpdate(dt: number): void {
    if (!this.target) return;
    let followRate = GAME.cameraFollowRate * GAME.tempoScale;
    if (this.dashLagRemaining > 0) {
      this.dashLagRemaining = Math.max(0, this.dashLagRemaining - dt);
      followRate = GAME.springCameraLagRate;
    } else if (this.dashCatchRemaining > 0) {
      this.dashCatchRemaining = Math.max(0, this.dashCatchRemaining - dt);
      followRate = GAME.dashCameraCatchRate;
    } else if (this.springLagRemaining > 0) {
      this.springLagRemaining = Math.max(0, this.springLagRemaining - dt);
      followRate = GAME.springCameraLagRate * GAME.tempoScale;
    } else if (this.springCatchRemaining > 0) {
      this.springCatchRemaining = Math.max(0, this.springCatchRemaining - dt);
      followRate = GAME.springCameraCatchRate * GAME.tempoScale;
    }
    const targetLine = this.node.position.y + this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    if (this.target.position.y <= targetLine) return;
    const wantedY = this.target.position.y - this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    const pos = this.node.position.clone();
    const distance = wantedY - pos.y;
    const smoothedStep = distance * (1 - Math.exp(-followRate * dt));
    const maximumStep = GAME.cameraMaxFollowSpeed * dt;
    pos.y += Math.min(maximumStep, Math.max(0, smoothedStep));
    this.node.setPosition(pos);
    this.highestY = Math.max(this.highestY, pos.y);
  }
}
