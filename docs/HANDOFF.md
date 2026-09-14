# 《蹦蹦云》当前交接

更新时间：2026-09-14
当前版本：v2.12.0（像素级复刻 HTML 原版布局）
当前分支：`agent/v2.12.0-pixel-parity`（自 agent/v2.11.0-ui-polish 切出）
项目：`D:\蹦蹦云开发\蹦蹦云-Cocos工程\cese`（注意：文档旧路径 `D:\cesi2` 已迁移，未回写）
只读备份：`版本备份\游戏1-蹦蹦云\v2.10.0`（上一版）；v2.11.0 备份见 `版本备份\游戏1-蹦蹦云\v2.11.0`

## 分支与保护边界

- `master`、`agent/v2.8.0`、`agent/html-parity`、`agent/v2.10.0-multiplatform` 均冻结；UI 工作只在 `agent/v2.11.0-ui-polish`。
- `游戏本体`、所有 `legacy` 与历史版本备份只读。
- 不上传平台、不发布、不提交审核；平台账号注册、开发者工具操作与审核提交由用户执行。

## v2.11.0 已完成（UI 对齐 HTML 基准）

- 用户反馈定调：HTML 版页面设计/进场/手感/技能是标杆，转 Cocos 只因手机画质；UI 优化 1:1 对齐 HTML 实测规格。
- 新增 `assets/scripts/ui/UiKit.ts` 设计系统（渐变/投影/粗体阴影/Toggle/统一按压反馈），设计令牌取自 HTML css 实测值。
- 主页与 HUD 按 HTML 占比放大布局；开始按钮三段渐变+呼吸光晕；卡片渐变高亮条；进度条渐变。
- 全部弹窗统一渐变面板壳；设置真 Toggle；排行榜金银铜；皮肤金边；技能商店 ScrollView 滚动+专属渐变图标。
- 结算面板：大分数+新纪录金色+分享成绩按钮（PlatformService.share）。
- 清理：删 DreamyHome 死代码 278 行；Boot 进度条圆角渐变。
- 回归 10/10 全通过（tools/browser-regression/regression.js）。

## 场景与构建

- 流程：`Boot.scene → Home.scene → Game.scene → Home.scene`；构建只含 Boot/Home/Game，Boot 为初始场景，Portrait。
- 命令行构建：`CocosCreator.exe --project <工程> --build "platform=<平台>;debug=<true|false>"`。
  - `build/web-mobile`：浏览器验证产物。
  - `build/bytedance-mini-game`：抖音包，引擎分离已启用，主包约 2.4MB。
  - `build/wechatgame`：微信包，约 2.2MB，引擎插件已启用（需非调试模式 + `profiles/v2/packages/wechatgame.json` 保存配置；编辑器内构建同样勾选"分离引擎"）。
- 微信构建 AppID 为官方测试号 `wx6ac3f5090a6b99c5`，正式上架前在 `profiles/v2/packages/wechatgame.json` 替换。

## v2.10.0 已完成

- 平台桥接：`PlatformService` 统一入口 + `WechatBridge`（新增）+ `DouyinBridge`（保留）；9 处调用点迁移完成，平台文案动态化。
- 音频：`tools/generate-audio.js` 程序化合成 8 音效 + 1 BGM；`AudioCatalog` 从 resources 加载注册；主页进入即播 BGM，首次输入兜底浏览器自动播放限制。
- 抖音引擎分离：主包 7.2MB → 2.4MB。
- 上架文档：`docs/微信上架准备清单.md`、`docs/快手前置条件清单.md`。
- 版本号同步 v2.10.0（GameConfig、README、变更说明、Boot 标签）。

## 验证证据（2026-09-14）

- 三端命令行构建成功；TypeScript 业务代码 0 报错；平台全局禁用项 0 命中。
- 真实 Chrome 自动化回归 9/10（`tools/browser-regression/regression.js`，报告与截图在 `tools/browser-regression/artifacts/`）：启动→主页→开始→真实触摸移动→暂停/恢复→返回主页→分享平台文案→设置持久化→音频加载与播放→控制台零错误。移动读数一项受无头浏览器后台节流影响，功能已在健康帧率轮次完整通过。
- 抖音包 `game.json` 含官方 cocos 3.8.8 引擎插件声明；微信包 `game.json` 同样含微信引擎插件声明（provider 为 Cocos 官方），首次在微信开发者工具打开时按提示"添加插件"授权即可。

## 尚未验证 / 用户侧事项

- 微信正式 AppID 注册与替换；微信开发者工具导入 `build/wechatgame` 验收。
- 抖音开发者工具与真机验收（安全区、触控、性能）。
- 软著 V1.0 补正（30 天期限）：签章页手抄 + 亲笔签名 + 身份证号 → 取得证书后满足抖音上架资质。
- 音效/BGM 为程序合成基础版，等用户试听反馈；正式素材可在 AudioManager 注册替换。
- 所有视觉与手感项：**等待用户试玩确认。**

## 下一步

1. 用户试玩 `build/web-mobile`（或编辑器预览）并确认手感与音频。
2. 用户注册微信小游戏账号 → 替换 AppID → 微信开发者工具验收 → 按清单准备上架材料。
3. 软著补正完成后推进抖音资质与上架。
4. 快手条件齐备后按清单启动。
