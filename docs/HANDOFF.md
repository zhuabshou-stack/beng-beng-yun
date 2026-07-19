# 《蹦蹦云》当前交接

更新时间：2026-07-19
当前版本：v2.9.2 HTML 高一致度迁移试玩版
当前分支：`agent/html-parity`
起点提交：`ee11e1c12532754493f5ee62016f7d6bcd18590e`
项目：`D:\cesi2\蹦蹦云-Cocos工程\cese`
只读备份：`D:\cesi2\版本备份\游戏1-蹦蹦云\v2.9.2`

## 分支和保护边界

- `master` 保持不动。
- `agent/v2.8.0` 保留为备份，不再修改。
- HTML 迁移只在 `agent/html-parity`。
- 不合并 master，等待用户试玩确认。
- `D:\cesi2\游戏本体`、所有 `legacy` 和历史 `版本备份` 只读。

## 正式场景与构建

- 流程：`Boot.scene → Home.scene → Game.scene → Home.scene`。
- 正式构建只包含 Boot、Home、Game；Boot 是初始场景。
- `Main.scene` 和 `HomeShell.scene` 保留但不参与正式构建。
- Portrait 竖屏。
- 浏览器目录：`D:\cesi2\蹦蹦云-Cocos工程\cese\build\web-mobile-html-parity`。
- 抖音开发者工具导入目录：`D:\cesi2\蹦蹦云-Cocos工程\cese\build\bytedance-mini-game`。
- `build/`、`profiles/`、`library/`、`temp/`、`local/` 不提交 Git。

## 已完成迁移

- 首页、游戏、暂停、结算、关卡完成、皮肤、技能、排行、统计、设置和首次教学页面。
- 旧版跳跃/水平移动/镜头/云生成/碰撞/Combo/分数/高度/关卡目标。
- 普通、弹簧、脆弱、移动四种云。
- 金币、星星、羽毛；六套皮肤；护盾、磁铁、慢动作、幽灵、二段跳、时光倒流。
- 旧版落云、弹簧、Combo、收集、里程碑粒子/浮字/拖尾/震屏。
- 最高分、金币、前十排行、皮肤、技能和设置持久化；兼容旧存储键。
- 保留 SceneNavigator、StorageService、DouyinBridge、AudioManager 和固定对象池。

## 关键参数

| 项目 | v2.9.2 |
|---|---:|
| 参考帧率 / 世界比例 | 60 FPS / ×2 |
| 重力 / 起跳速度 | 2160 / 1680 |
| 水平速度 / 加速度 | 720 / 2160 |
| 松手阻尼 | `0.92^(dt×60)` |
| 玩家半径 / 云尺寸 | 36 / 140×40 |
| 云间距 | 100～140 |
| 弹簧倍率 | 2.0 |
| 镜头线 / 跟随率 | 0.40 / 2.45 |
| 四种云概率 | 75% / 5% / 10% / 10% |
| 星星 / 金币 / 羽毛 | 25% / 35% / 8% |
| 对象池 | 拖尾 20、粒子 128、浮字 12；收集物预热 28，本次抽样扩至 29 后稳定 |

## 存档键

保留：

- `cloudBounceBest`
- `cloudBounceCoins`
- `cloudBounceRanking`
- `cloudBounceSkin`
- `cloudBounceSkills`
- `cloudBounceActiveSkills`
- `cloudBounceSound`
- `cloudBounceMusic`

兼容读取 v2.8.0 的累计统计与 UI 模式键，但 HTML 复刻页只显示旧版已有项目。

## 验证记录

- TypeScript 与差异检查通过；Creator 导入新增脚本并正式生成 meta。
- web-mobile 与 bytedance-mini-game 最终构建均成功。
- 浏览器真实交互覆盖所有主要页面、暂停/继续、自然结算、返回主页和刷新后排行保存。
- 同一运行抽样包含四种云、金币、星星、羽毛。
- Game 节点在最终 20 秒抽样中由 289 回落并稳定为 288；固定特效池未扩张；应用脚本异常 0。
- 抖音包根目录存在 `game.js`、`game.json`、`project.config.json`。
- 未上传、未发布、未提交审核。

## 尚未迁移/未验证

- 正式音频文件未提供；AudioManager 只保留明确的素材替换接口。
- 正式抖音排行榜、广告、云存档、支付和商业化不在旧 HTML 闭环内，未新增。
- 抖音开发者工具和真实手机最终画面、触控、安全区、性能仍需用户侧验证。
- 全部手感和视觉项目：**等待用户试玩确认。**

## 下一步

停止继续开发，不合并 master。用户试玩后只根据明确反馈在 `agent/html-parity` 微调；未经确认不开始下一版本。
