import { _decorator, Component, Node, Vec3 } from 'cc';
import { GAME } from '../core/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('CameraRig')
export class CameraRig extends Component {
  @property(Node)
  target: Node | null = null;

  viewportHeight = 1280;
  highestY = 0;
  private followScale = 1;

  reset(): void {
    const pos = this.node.position.clone();
    pos.y = 0;
    this.node.setPosition(pos);
    this.highestY = 0;
    this.followScale = 1;
  }

  setComboFollowScale(scale: number): void {
    this.followScale = Math.max(1, Math.min(GAME.comboCameraFollowMax, scale));
  }

  lateUpdate(dt: number): void {
    if (!this.target) return;
    const frameDt = Math.min(Math.max(0, dt), GAME.physicsMaxFrameDelta);
    const followRate = GAME.cameraFollowRate * GAME.tempoScale * this.followScale;
    const targetLine = this.node.position.y + this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    if (this.target.position.y <= targetLine) return;
    const wantedY = this.target.position.y - this.viewportHeight * (0.5 - GAME.cameraLineRatio);
    const pos = this.node.position.clone();
    const distance = wantedY - pos.y;
    const smoothedStep = distance * (1 - Math.exp(-followRate * frameDt));
    const maximumStep = GAME.cameraMaxFollowSpeed * frameDt;
    pos.y += Math.min(maximumStep, Math.max(0, smoothedStep));
    this.node.setPosition(pos);
    this.highestY = Math.max(this.highestY, pos.y);
  }
}
