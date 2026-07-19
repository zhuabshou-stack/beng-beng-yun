import { _decorator, Component, Node, Vec3 } from 'cc';
import { GAME } from '../core/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('CameraRig')
export class CameraRig extends Component {
  @property(Node)
  target: Node | null = null;

  viewportHeight = 1280;
  highestY = 0;

  reset(): void {
    const pos = this.node.position.clone();
    pos.y = 0;
    this.node.setPosition(pos);
    this.highestY = 0;
  }

  lateUpdate(dt: number): void {
    if (!this.target) return;
    const followRate = GAME.cameraFollowRate * GAME.tempoScale;
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
