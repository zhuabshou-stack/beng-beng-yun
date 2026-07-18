import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ParallaxBackground')
export class ParallaxBackground extends Component {
  @property(Node) farLayer: Node | null = null;
  @property(Node) midLayer: Node | null = null;
  @property(Node) nearLayer: Node | null = null;
  @property(Node) cameraRig: Node | null = null;

  update(): void {
    const y = this.cameraRig?.position.y ?? 0;
    if (this.farLayer) this.farLayer.setPosition(0, y * 0.08, 0);
    if (this.midLayer) this.midLayer.setPosition(0, y * 0.18, 0);
    if (this.nearLayer) this.nearLayer.setPosition(0, y * 0.34, 0);
  }
}
