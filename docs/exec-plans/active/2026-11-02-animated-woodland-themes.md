# 三套木屋主题与柔和火焰动画

Status: active
Created: 2026-11-02T17:40:43+08:00
Last Updated: 2026-11-02T17:44:28+08:00

本 ExecPlan 是 living document，遵循根目录 `PLANS.md`。

## Purpose / Big Picture

用户在现有面板中可选择「炉火旅店」「雨夜木屋」「烛光书房」，对应已选定的三张设计图；背景呈现木材、壁炉或烛灯，火焰轻微摆动。切换主题及重启后保留选择，正文与原生编辑状态保持正常。

## Progress

- [x] 2026-11-02T17:40:43+08:00 — 检查干净工作树、主题令牌、设置校验、舞台几何与已有 Electron 测试。
- [ ] 生成可直接使用的三套无 UI 背景、木纹及透明火焰素材，检查定位。
- [x] 2026-11-02T17:44:28+08:00 — 扩展主题、快捷键轮换、背景组件、缩略图与动画生命周期；素材定位等待生成结果。
- [ ] 完成类型、lint、单测、Electron 行为及视觉验证。
- [ ] 复查差异、文档及素材来源，归档本计划。

## Surprises & Discoveries

- Observation: 纸张和机器从 `stageLayout.ts` 共享几何；专注/经典模式的纸张占满舞台。
  Evidence: `Stage.tsx`、`stageLayout.ts`。
  Impact: 背景跟随 viewport；专注/经典模式无需继续播放被遮住的火焰。
- Observation: 设置主题白名单直接引用 `THEME_IDS`，主题选择面板直接遍历 `THEME_LIST`。
  Evidence: `src/shared/settings.ts`、`ui/Studio.tsx`。
  Impact: 新主题 ID 可直接持久化，不需要 IPC 或设置版本迁移。

- Observation: `App.tsx` 的主题快捷键使用了独立的五主题常量。
  Evidence: 首次 typecheck 在 `App.tsx:391` 发现主题类型不匹配。
  Impact: 改为共享 `THEME_IDS`，将新增主题纳入快捷键轮换。

## Decision Log

- Decision: 使用 ImageGen 生成的实际栅格素材，透明火焰独立叠加，通过 CSS transform/opacity 做轻微摆动与亮度变化。
  Rationale: 保留用户选中的画面气质，并避免每帧更新 React 或新增渲染依赖。
  Trade-offs: 属于细腻循环特效，并非流体火焰模拟或视频。
  Date/Author: 2026-11-02 / Codex。
- Decision: 三个新主题沿用 Paper & Ink 的纸张和机身相关令牌，只更换环境及界面外壳配色。
  Rationale: 用户要求打字机先不动。
  Trade-offs: 不对现有机身造型进行额外调整。
  Date/Author: 2026-11-02 / Codex。

## Outcomes & Retrospective

实施中，待行为与视觉验证后记录结果。

## Context and Orientation

`src/shared/theme-tokens.ts` 定义主题 ID 和颜色；`theme/applyTheme.ts` 将其应用到文档根元素及原生标题栏。`Stage.tsx` 布置房间、纸张、独立 textarea 与机器。`ui/Studio.tsx` 的 `ThemeThumb` 和主题列表展示预设。`settings.ts` 负责配置白名单，主进程保存设置。已有 E2E 使用真实 Electron 和隔离 `TW_USER_DATA`。

选定视觉参考依次对应炉火、雨夜与书房。仓库内的正式素材和完整生成提示词位于 `src/renderer/src/assets/rooms/` 与 `generation-prompts.json`，可据此核对实现，原始本地设计记录不作为公共仓库依赖。

## Scope, Non-Goals, Constraints and Approval Boundaries

**In scope:** 三套主题、必要生成素材、木质外壳、环境火焰动画、缩略图、验证和说明。

**Non-goals:** 修改打字机模型、编辑内核、保存流程、IPC、打包依赖；发布或安装。

**Constraints:** 保留 textarea 身份和撤销/IME 行为；背景不遮盖正文；轻量模式、减少动态效果、不可见页面停止动画；不新增依赖；保持所有既有主题可用。

**Approval boundaries:** None. 当前请求授权本地实现与验证，不涉及外部写入。

## Plan of Work

首先生成干净的环境与透明火焰素材。接着在共享主题定义中加入三个 ID，在渲染层建立素材与火焰位置映射，挂载于现有 viewport 背后。使用 CSS 实现木质外壳与火焰变换，用可见性事件暂停动画。缩略图复用房间图片，保持旧主题渲染。最后验证切换、重启、输入及动画降级，捕获真实 Electron 图像与参考比较。

## Milestones

### Milestone 1 — 三套可用素材

三张背景无文字、纸张、机器，火焰单独透明，所有产物在 `src/renderer/src/assets/rooms/`；检查火焰定位与图像质量。

### Milestone 2 — 可切换的动态主题

面板可选择全部八个主题，三个新主题保留纸张/机身，新主题正确恢复、旧主题无素材残留。动画仅在完整舞台和可见页面运行。

### Milestone 3 — 验证与交付

检查真实 Electron 输入、撤销、主题切换、重新打开、面板/尺寸/专注模式，以及火焰动态与减少动态效果。记录截图对照并修复可操作问题。

## Concrete Steps

Working directory: repository root.

1. 生成与接入素材，运行 `npm run typecheck` 和 `npm run lint`。
2. 运行 `npm test`，检查主题颜色与设置接受新的主题值。
3. 运行 `npm run build` 后 `npm run e2e`，检查真实应用与新增场景。
4. 用测试截图在与设计参考相同画幅下比对；再检查 `git diff --check` 与修改范围。

## Validation and Acceptance

- Command: `npm run typecheck`
  Working directory: repository root
  Expected: 三份 TypeScript 配置通过。
  Result: passed
  Evidence: 2026-11-02 首轮命令退出 0；素材尚未齐全，后续仍需实际构建。
  Notes: None.
- Command: `npm run lint`
  Working directory: repository root
  Expected: 无 lint 错误。
  Result: passed
  Evidence: 2026-11-02 首轮命令退出 0；素材尚未齐全，后续仍需实际构建。
  Notes: None.
- Command: `npm test`
  Working directory: repository root
  Expected: 单测通过，新增主题能接受和保持颜色对比度。
  Result: passed
  Evidence: npm test — 8 files passed; 65 passed, 1 skipped (system font conditional).
  Notes: None.
- Command: `npm run build && npm run e2e`
  Working directory: repository root
  Expected: 构建通过，真实 Electron 的新旧流程与动画生命周期通过。
  Result: not run
  Evidence: 待实施。
  Notes: 手工真实 IME 与 Windows 平台不以模拟事件替代。
- Procedure: 在参考图画幅下对照三套真实截图，检查窄窗口、面板和专注模式。
  Working directory: repository root
  Expected: 无背景重叠正文、火焰错位、控制遮挡或图像拉伸问题。
  Result: not run
  Evidence: 待实施。
  Notes: 本机 macOS 原生窗口按钮属于平台差异。

## Idempotence and Recovery

新增素材保留生成原件，不覆盖已有资产。测试设置与文稿隔离于临时目录。只恢复本任务修改即可回滚，原主题和设置契约兼容；无不可逆动作。保留另一个活动计划。

## Artifacts and Notes

设计图位于上述参考目录，实际运行截图将保存在 `artifacts/`，正式素材随源码打包。素材来源及完整生成提示词留在资源目录说明中。

## Interfaces and Dependencies

扩展 `ThemeId`，不更改 IPC 和 SettingsV1。环境图片和动画配置属于 renderer；共享令牌不引用 DOM 或图片模块。使用现有 React、Vite、CSS，无新增依赖。

## Revision Note

- 2026-11-02T17:40:43+08:00 — 创建计划，确认三套已选图与动画范围。

- 2026-11-02T17:44:28+08:00 — 完成主题与生命周期实现，修复快捷键硬编码；首轮 typecheck/lint/单测通过，待素材和真实 Electron 验证。
