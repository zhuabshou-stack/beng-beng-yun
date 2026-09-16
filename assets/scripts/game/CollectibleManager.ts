import { _decorator, Component, Node, SpriteFrame, Vec3 } from 'cc';
import { GAME } from '../core/GameConfig';
import { CloudPlatform } from './CloudPlatform';
import { Collectible, CollectibleType } from './Collectible';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('CollectibleManager')
export class CollectibleManager extends Component {
  @property(SpriteFrame) coinSpriteFrame: SpriteFrame | null = null;
  @property(SpriteFrame) starSpriteFrame: SpriteFrame | null = null;

  private readonly active: Collectible[] = [];
  private readonly coinPool: Collectible[] = [];
  private readonly starPool: Collectible[] = [];
  private readonly featherPool: Collectible[] = [];
  private readonly tornadoPool: Collectible[] = [];
  private readonly giantPool: Collectible[] = [];
  private readonly spawnPosition = new Vec3();

  configure(coinSpriteFrame: SpriteFrame | null, starSpriteFrame: SpriteFrame | null): void {
    this.coinSpriteFrame = coinSpriteFrame;
    this.starSpriteFrame = starSpriteFrame;
    if (this.coinPool.length + this.starPool.length + this.featherPool.length + this.tornadoPool.length + this.giantPool.length + this.active.length === 0) {
      this.prewarm('coin', 18);
      this.prewarm('star', 6);
      this.prewarm('feather', 4);
      this.prewarm('tornado', 2);
      this.prewarm('giant', 2);
    }
  }

  reset(): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) this.releaseAt(i);
  }

  considerCloud(cloud: CloudPlatform): void {
    // 起始落脚云不放收集物，避免开局直接重叠；金币与星星互斥，控制同屏数量。
    if (cloud.node.position.y < -250) return;
    const starChance = cloud.node.position.y < 500 ? GAME.initialStarSpawnChance : GAME.starSpawnChance;
    if (Math.random() < starChance) this.spawnAboveCloud('star', cloud, 70);
    if (Math.random() < GAME.coinSpawnChance) this.spawnAboveCloud('coin', cloud, 60);
    if (Math.random() < GAME.featherSpawnChance) this.spawnAboveCloud('feather', cloud, 70);
    if (Math.random() < GAME.tornadoCollectChance) this.spawnAboveCloud('tornado', cloud, 78);
    if (Math.random() < GAME.giantCollectChance) this.spawnAboveCloud('giant', cloud, 78);
  }

  collectTouching(
    player: PlayerController,
    onCollected: (type: CollectibleType, position: Vec3) => void,
  ): void {
    const playerPosition = player.node.position;
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const item = this.active[i];
      const dx = playerPosition.x - item.node.position.x;
      const dy = playerPosition.y - item.node.position.y;
      const collisionRadius = player.radius + item.radius;
      if (dx * dx + dy * dy > collisionRadius * collisionRadius) continue;
      const feedbackPosition = item.node.position.clone();
      const type = item.type;
      this.releaseAt(i);
      onCollected(type, feedbackPosition);
    }
  }

  cleanup(bottomY: number): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      if (this.active[i].node.position.y < bottomY) this.releaseAt(i);
    }
  }

  attractTowards(target: Vec3, radius: number, speed: number, dt: number): void {
    for (const item of this.active) {
      const position = item.node.position;
      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 0.001 || distance > radius) continue;
      const step = Math.min(distance, speed * dt);
      const next = position.clone();
      next.x += dx / distance * step;
      next.y += dy / distance * step;
      item.node.setPosition(next);
    }
  }

  private spawnAboveCloud(type: CollectibleType, cloud: CloudPlatform, verticalOffset: number): void {
    this.spawnPosition.set(
      cloud.node.position.x + (Math.random() - 0.5) * 100,
      cloud.node.position.y + verticalOffset,
      0,
    );
    this.spawn(type, this.spawnPosition);
  }

  private prewarm(type: CollectibleType, count: number): void {
    const pool = this.poolFor(type);
    for (let i = 0; i < count; i += 1) pool.push(this.createItem(type));
  }

  private spawn(type: CollectibleType, position: Vec3): void {
    const pool = this.poolFor(type);
    const item = pool.pop() ?? this.createItem(type);
    item.configure(type, position, this.coinSpriteFrame, this.starSpriteFrame);
    this.active.push(item);
  }

  private createItem(type: CollectibleType): Collectible {
    const node = new Node(type === 'coin' ? 'Coin' : type === 'star' ? 'Star' : type === 'tornado' ? 'Tornado' : type === 'giant' ? 'Giant' : 'Feather');
    node.parent = this.node;
    node.layer = this.node.layer;
    node.active = false;
    return node.addComponent(Collectible);
  }

  private poolFor(type: CollectibleType): Collectible[] {
    return type === 'coin' ? this.coinPool : type === 'star' ? this.starPool : type === 'tornado' ? this.tornadoPool : type === 'giant' ? this.giantPool : this.featherPool;
  }

  private releaseAt(index: number): void {
    const item = this.active[index];
    this.active.splice(index, 1);
    item.collect();
    const pool = this.poolFor(item.type);
    pool.push(item);
  }
}
