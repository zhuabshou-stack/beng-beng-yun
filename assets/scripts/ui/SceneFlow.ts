import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export type ViewName = 'splash' | 'home' | 'game' | 'pause' | 'result' | 'skin' | 'skill' | 'rank' | 'stats' | 'settings';

@ccclass('SceneFlow')
export class SceneFlow extends Component {
  @property(Node) splashView: Node | null = null;
  @property(Node) homeView: Node | null = null;
  @property(Node) gameView: Node | null = null;
  @property(Node) pauseView: Node | null = null;
  @property(Node) resultView: Node | null = null;
  @property(Node) skinView: Node | null = null;
  @property(Node) skillView: Node | null = null;
  @property(Node) rankView: Node | null = null;
  @property(Node) statsView: Node | null = null;
  @property(Node) settingsView: Node | null = null;

  current: ViewName = 'splash';

  onLoad(): void {
    this.show('splash');
  }

  show(name: ViewName): void {
    this.current = name;
    const map: Record<ViewName, Node | null> = {
      splash: this.splashView,
      home: this.homeView,
      game: this.gameView,
      pause: this.pauseView,
      result: this.resultView,
      skin: this.skinView,
      skill: this.skillView,
      rank: this.rankView,
      stats: this.statsView,
      settings: this.settingsView,
    };
    for (const key of Object.keys(map) as ViewName[]) {
      if (map[key]) map[key]!.active = key === name;
    }
  }
}
