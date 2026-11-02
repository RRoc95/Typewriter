# Windows/macOS 兼容与公开构建验证

Status: completed
Created: 2026-11-02T16:47:05+08:00
Last Updated: 2026-11-02T21:56:00+08:00

本 ExecPlan 是 living document。执行过程中持续更新进度、发现、决策、验证与结果，遵循根 `PLANS.md`。

## Purpose / Big Picture

让用户在 Windows 与 macOS 使用本地纯文本编辑器，分别获得 NSIS 安装包与 Mac DMG/ZIP。源码发布到用户 RRoc95 的公开 GitHub 项目，以真实 GitHub Actions 成功运行和可下载产物证明 Windows x64、macOS arm64 与 macOS x64 能完成测试、构建和打包。

## Progress

- [x] 2026-11-02T16:47:05+08:00 — 检查平台代码、测试与打包配置；确认 GitHub 账号 RRoc95，Typewriter 名称尚未使用；初始化本地 Git 并保存源码基线 `1d07e8e`。
- [x] 2026-11-02T16:59:00+08:00 — 实现平台窗口、退出/重开、open-file、快捷键、路径和字体适配；单测 62 项通过、1 项系统字体测试条件跳过，lint 通过；E2E 待执行。
- [x] 2026-11-02T17:13:08+08:00 — 本机 typecheck、lint、build、62 项单测和 8 项 Electron E2E 通过；arm64 DMG/ZIP 生成成功，最终目录产物 11 项启动断言、文本文件关联、随包许可证均验证通过。
- [x] 2026-11-02T21:03:00+08:00 — 纳入用户新增主题；最新 typecheck/lint、74 项单测（1 条件跳过）、11 项本机 E2E 和 Mac arm64 打包产物的 11 项启动断言通过，包内新素材、文件关联与许可证已核对。
- [x] 2026-11-02T21:18:00+08:00 — 完成软件 WebGL 性能与初始化失败适配；程序提交 53f2270 的本机完整 12 项 E2E 通过（1.6 分钟），重新生成 arm64 DMG/ZIP 并通过更严格的 11 项产物断言，实际 WebGL 上下文存活。
- [x] 2026-11-02T21:26:00+08:00 — macOS arm64 云端 job 125296083200 成功；74 单测通过、1 条件跳过，12 项 E2E、DMG/ZIP、11 项产物断言与上传完成，安装包归档约 202 MiB。
- [x] 2026-11-02T21:31:00+08:00 — Windows x64 云端 job 125296083230 成功，NSIS/ZIP 和启动验证、上传完成；Intel Mac 的 10 项 E2E 通过，综合用例总预算耗尽、主题快捷键遇到绘制时序问题，继续修复并验证。
- [x] 2026-11-02T21:45:00+08:00 — 最新提交 48d99a4 的三项云端 job 均通过 E2E 并进入打包；本机正常 Metal 图形后端的完整 12 项 E2E 也通过（35.2 秒）。
- [x] 2026-11-02T21:56:00+08:00 — 公开仓库已核对；程序提交 `48d99a4` 的 [三平台 Actions](https://github.com/RRoc95/Typewriter/actions/runs/41454312178) 全部成功，三组非空安装包归档对应同一源码且未过期，上传后的元数据与实际 job 日志均已核对。
- [x] 2026-11-02T21:56:00+08:00 — 使用文档、架构、最终验证和下载链接已更新；归档本计划，保留独立的木屋主题活动计划。

## Surprises & Discoveries

- Observation: Intel SwiftShader 使用 Subzero 后端，综合用例在 300 秒内走到重启恢复后才耗尽预算；原生命令已送达但 CSS 主题属性仍是旧值。
  Evidence: run 41451058765 的 Intel job 为 10 passed / 2 failed；快捷键日志包含正确的 Meta+Shift+T。App 的 CSS 主题与 Machine3D 重建均使用 passive effect；安装的 React 实现先执行子树的 passive effects，再执行父组件的 effects。
  Impact: 视觉主题在 layout effect 中先更新，音频/专注同步继续在 passive effect；原生输入测试等待页面绘制后再断言；仅 Intel Mac CI 的综合场景用例总预算改为 600 秒，单项断言仍为 15 秒。

- Observation: 软件 WebGL 的最高档 VSM 阴影使托管桌面交互极慢；退出保存测试也可能被后台自动保存提前满足。
  Evidence: run 41448784694 的 Windows 三主题完整用例通过但耗时 4.7 分钟，多标签页总预算耗尽；Intel 多次点击超时；arm64 退出测试观测到 saved 而非 dirty。本机检测 SwiftShader 后使用模型现有 low 规格，11 项流程从 3.2 分钟降至 1.3 分钟，仍全部通过。
  Impact: 根据实际软件渲染器选择低成本阴影规格，保留完整模型和真实动画；补正 createMachine 的可空返回类型和失败标记，产物验证要求存活的实际 WebGL 上下文；新增初始化失败的回归流程。退出测试关闭自动保存以单独验证退出时落盘。

- Observation: 全量 SwiftShader 同时承担窗口合成和 WebGL 时，托管 Intel Mac 的多个操作等不到动画帧；Windows 还会异步裁剪超出桌面的窗口。
  Evidence: run 41446412524 的 Intel 点击稳定性检查超时，Windows 原生/页面尺寸不同步；本机软件 GPU 进程持续占用多个 CPU 核心。
  Impact: 按 Chromium 官方文档将 CI 改为 swiftshader-webgl 并禁用 GPU 合成，仍执行真实 WebGL；测试按宿主 workArea 调整尺寸并等待页面确认。
- Observation: macOS 处理过的命令快捷键能触发 before-input-event 的 keyDown，但 keyUp 不再经过该监听器。
  Evidence: 本机输入探针收到有效 Meta+S/Meta+Shift+T keyDown、实际命令已完成，等待 keyUp 的诊断用例超时。
  Impact: 快捷键测试等待 keyDown 确认送达，仍发送松键事件，并继续断言保存结果和每次主题切换。

- Observation: CDP 键盘事件到达 DOM，但没有经过 Electron before-input-event，也没有派发自定义菜单命令；原生 sendInputEvent 能经过该入口。
  Evidence: 独立输入探针中两种 CDP 大小写组合的 commands 均为空；原生输入在命令路由启用时发送一次 themeNext，禁用后不再发送。
  Impact: 命令层从共享 MENU 处理原生输入并阻止重复；E2E 用原生输入验证应用快捷键，禁用自动保存后验证保存键，保留 DOM 输入验证 textarea 撤销。
- Observation: 托管桌面的 CSS 动画时间停住，且模拟大于原生显示尺寸的 viewport 导致不稳定交互。
  Evidence: run 41442095703 中 Windows/arm64 的 transform 不变，Intel 在已点击按钮后等待导航超时。
  Impact: 使用 Playwright 标准的后台节流控制、显式窗口/页面激活、初始 load 完成和实际原生 viewport；动画帧差异断言保持不变。

- Observation: 首次远端运行在慢速 runner 暴露标签标题与自动保存竞争、退出遇到进行中写入，以及 Intel Mac 虚拟 GPU 上下文失败。
  Evidence: run 41418855410；Windows 与 arm64 的标签断言为“未命名”、退出等待超时；Intel 完成打包但出现 WebGL context BindToCurrentSequence 错误。
  Impact: 首次保存等待配置间隔；保存快照更新草稿标题，显式保存串行等待并刷新最新内容；CI 测试使用真实软件 WebGL，不跳过渲染和控制台检查。
- Observation: 用户在等待期间新增三套木屋主题、背景素材与原生窗口活动事件，并明确要求纳入此次发布。
  Evidence: 2026-11-02 用户确认“包含，按当前代码继续适配和验证”；工作区 roomScenes、RoomBackdrop、rooms.css 与主题 E2E。
  Impact: 以当前工作区为新的发布基准，保留这些功能和另一个活动计划，重新运行完整验证。

- Observation: 本机 Electron postinstall 后只留下部分解压内容，运行时缺失；环境中的跳过下载变量未设置。
  Evidence: 缓存 ZIP 114344775 字节、585 项，SHA-256 与包内 checksums.json 相符，包含 app 可执行文件；用系统 unzip 恢复后可实际启动 Electron。
  Impact: 此为本机安装问题；不更改全局设置或放宽测试，CI 继续以正常 npm ci 验证。

- Observation: 原有单测在 macOS 上有 4 项 Windows 路径授权测试失败。
  Evidence: 基线 npm test 为 4 failed / 49 passed / 2 skipped；改用显式平台路径规则后为 62 passed / 1 skipped。
  Impact: 同一主机同时验证 Windows 与 POSIX 规则，避免宿主 node:path 语义造成误判。

- Observation: `dist` 显式指定 portable，但 builder 配置声明 NSIS；现有单测和字体 E2E 写死 Windows 路径。
  Evidence: `package.json`、`electron-builder.yml`、`tests/unit/pathGuard.test.ts`、`tests/e2e/smoke.spec.ts`。
  Impact: 明确平台打包脚本，改用平台路径语义和随依赖分发的字体测试资源。
- Observation: 主进程窗口关闭后总退出、标题栏颜色同步无平台判断、菜单快捷键固定 Ctrl。
  Evidence: `src/main/index.ts`、`src/main/window.ts`、`src/shared/menu.ts`。
  Impact: 适配 macOS 生命周期、原生窗口控件与 Command 操作。
- Observation: 初始目录无 Git 元数据；已安装 GitHub CLI 且账号与连接器均为 RRoc95。
  Evidence: 本地 Git 基线提交；账号只用于确定目标仓库，不记录凭证。
  Impact: 新建公开仓库属于用户明确要求，使用 CLI 创建和 Git 推送；连接器没有仓库创建接口。

## Decision Log

- Decision: 纯 Markdown 与 LICENSE 变更不触发重新打包，代码/配置变更仍运行完整矩阵。
  Rationale: 文档归档不改变程序产物，保留最近一次实际程序构建的证据。
  Trade-offs: 文档本身通过本地链接、格式与范围检查验证。
  Date/Author: 2026-11-02 / Codex。

- Decision: 保留现有 Electron/React 架构与原生 textarea，按平台调整窗口、生命周期、菜单、路径和测试。
  Rationale: 平台兼容不需要替换编辑内核或增加运行时依赖。
  Trade-offs: 各平台仍需原生桌面环境验证；保持无关保存逻辑不变。
  Date/Author: 2026-11-02 / Codex。
- Decision: 使用 Windows x64 NSIS，以及 macOS arm64/x64 各自的 DMG/ZIP，在原生 GitHub runner 打包。
  Rationale: 覆盖 Windows 和两类 Mac；避免 portable 脚本冲突。没有签名证书，构建不要求付费证书或发布密钥。
  Trade-offs: 产物没有开发者签名或公证，首次运行需要系统允许；不自动发布 GitHub Release。
  Date/Author: 2026-11-02 / Codex。

## Outcomes & Retrospective

已完成 Windows/macOS 适配，并纳入用户新增的三套主题与素材。公开仓库 [RRoc95/Typewriter](https://github.com/RRoc95/Typewriter) 的 [run 41454312178](https://github.com/RRoc95/Typewriter/actions/runs/41454312178) 已全部成功：Windows x64、macOS arm64、macOS x64 均完成检查、E2E、打包、11 项真实产物启动断言和上传。本机正常 Metal 与软件 WebGL 后端的完整 12 项流程也均通过。

CI 暴露并修复了保存时序、原生命令输入和软件 WebGL 的性能与绘制同步问题。最终保留全部功能断言，针对 Intel 软件后端的综合流程使用实际可完成的总时间预算。安装包未配置开发者签名与 Mac 公证；真实输入法候选框、DPI 和安装界面仍按 README 手工清单验收，未将这些未执行步骤宣称为通过。

## Context and Orientation

根包通过 electron-vite 分别构建主进程、预加载层与渲染层。`src/main/index.ts` 管理应用事件，`window.ts` 创建窗口，`menu.ts` 与 `src/shared/menu.ts` 管理原生和可见菜单。`src/preload/` 暴露 `window.api`；`App.tsx` 持有各标签的原生 textarea 与当前保存控制器。`src/main/security/pathGuard.ts` 管理路径授权，渲染层 `autosave/target.ts` 计算保存路径。`tests/unit/` 是纯逻辑测试，`tests/e2e/smoke.spec.ts` 通过 Playwright 驱动真实 Electron，`scripts/verify-pack.mjs` 验证打包应用。构建输出与测试产物均由 `.gitignore` 排除。

## Scope, Non-Goals, Constraints and Approval Boundaries

**In scope:** macOS/Windows 兼容、相关测试、打包脚本和配置、GitHub Actions、公开仓库推送、同步维护文档。

**Non-goals:** 云同步、账号、编辑内核重写、无关保存状态机重构、付费证书、自动更新和自动 Release。

**Constraints:** 保持本地纯文本、原生撤销和 IME、进程隔离及既有 Windows 行为；保留第三方声明。测试使用隔离数据目录，避免向用户真实文档目录写入草稿。

**Approval boundaries:** 用户明确授权创建公开项目、上传源码和运行 Actions；这些操作直接执行。凭证不进入源码和日志。新增付费服务、购买证书或覆盖既有远端历史没有授权，不执行。

## Plan of Work

先适配主进程生命周期与窗口、平台路径和快捷键，再修改测试以验证两端行为。使用原有测试框架补充实际差异测试并移除 Windows 字体硬依赖。接着统一打包脚本和三项 CI 矩阵；本地先验证 arm64 Mac 产物，再推送公开项目，依据 Actions 的实际日志修复失败，核对三项产物后更新文档并归档。

## Milestones

### Milestone 1 — 两个平台的编辑和系统操作兼容

支持 Command/Ctrl 操作、Mac 原生窗口控件、关闭窗口后重新激活、显式退出、正确的路径授权语义。相关逻辑单测、类型检查和 lint 通过；本机 Electron E2E 验证编辑、保存、菜单、字体及窗口生命周期。

### Milestone 2 — 本机生成并启动 Mac 产物

提供明确的 Windows/macOS 打包命令，生成本机 macOS arm64 DMG/ZIP 并启动打包后的 app 验证输入、字体、主题和场景。构建脚本不隐式发布 Release。

### Milestone 3 — 公开仓库和 Actions 有实际成功证据

`RRoc95/Typewriter` 为公开项目；Windows x64、Mac arm64、Mac x64 在 Actions 各自执行检查、E2E、打包、产物启动验证和上传。记录运行链接与产物名称；不以仅添加 workflow 代替实际运行。

## Concrete Steps

Working directory: repository root.

1. `npm ci --no-audit --no-fund` 安装锁文件依赖。
2. 修改平台代码、相关测试、打包配置及 `.github/workflows/build.yml`，同步文档。
3. 依次执行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run e2e`；通过后运行 `npm run dist:mac -- --arm64` 与 `npm run verify`。
4. 核对 `git diff --check` 与最终文件范围，提交后用已登录的 GitHub CLI 创建公开仓库并推送 `main`。
5. 读取 Actions jobs、失败日志与产物；只对有新诊断的失败修复重跑。通过后归档计划并提交验证记录。

## Validation and Acceptance

- Command: `npm ci --no-audit --no-fund`
  Working directory: repository root
  Expected: 依赖与 Electron 二进制安装完成，锁文件保持一致。
  Result: passed
  Evidence: npm ci 安装 495 个包，耗时 38 秒。
  Notes: None.
- Procedure: 本地自动化、macOS 打包及产物验证
  Working directory: repository root
  Expected: 类型、lint、逻辑测试、真实窗口行为与产物断言通过。
  Result: passed
  Evidence: 最新 typecheck、lint、build 均通过；单测 74 passed / 1 skipped；CI=true npm run e2e 为 12 passed（1.5 分钟），正常 Metal 后端为 12 passed（35.2 秒）；dist:mac -- --arm64 生成最新 DMG/ZIP；CI=true npm run verify 11 项通过，实际软件 WebGL 上下文存活，五种文本关联、全部房间素材和两份许可证存在。hdiutil verify 与 unzip -tq 均通过。
  Notes: Windows 与 Intel Mac 验证由 Actions 完成。
- Procedure: GitHub Actions 三平台构建与产物检查
  Working directory: `RRoc95/Typewriter`
  Expected: 同一源码提交的三项 job 成功，产物可见且非空。
  Result: passed
  Evidence: 仓库为 public；程序提交 48d99a4 的运行 41454312178 为 completed/success，三项 job 均为 success。Windows 单测 75 passed，E2E 11 passed / 1 Mac 专用用例跳过；两种 Mac 均为单测 74 passed / 1 系统字体条件跳过，E2E 12 passed。三端各 11 项打包产物断言通过，三组安装包和诊断归档均非空、未过期且对应同一 SHA。
  Notes: 真实 IME 候选框与安装交互仍属于手工验收。

## Idempotence and Recovery

源码基线已在本地 Git 保存。构建产物可从源码重建，测试使用临时数据目录。已存在的远端先读取再决定下一步，不覆盖历史、不强推；失败提交以修复提交推进。Actions 失败先读取具体日志，再调整代码或环境并重跑受影响项。没有购买、付费服务或其他不可逆数据迁移。

## Artifacts and Notes

最终程序 SHA：`48d99a4d0a10b0497508d7ed71c5534eda1eb5f2`。公开仓库：[RRoc95/Typewriter](https://github.com/RRoc95/Typewriter)；成功运行：[41454312178](https://github.com/RRoc95/Typewriter/actions/runs/41454312178)。

| 目标 | 最终远端证据与下载 |
| --- | --- |
| Windows x64 | job 125306990792 成功；75 单测通过，11 E2E 通过 / 1 Mac 用例跳过；NSIS/ZIP 和 11 项产物断言通过；[下载](https://github.com/RRoc95/Typewriter/actions/runs/41454312178/artifacts/13146738051)，236844911 字节 |
| macOS arm64 | job 125306990795 成功；74 单测通过 / 1 字体条件跳过，12 E2E 通过；DMG/ZIP 和 11 项产物断言通过；[下载](https://github.com/RRoc95/Typewriter/actions/runs/41454312178/artifacts/13146039900)，211748218 字节 |
| macOS x64 | job 125306990545 成功；74 单测通过 / 1 字体条件跳过，12 E2E 通过；DMG/ZIP 和 11 项产物断言通过；[下载](https://github.com/RRoc95/Typewriter/actions/runs/41454312178/artifacts/13146643660)，220154215 字节 |

三组安装包归档已核对为未过期，保留至 2026-11-16；诊断截图归档保留至 2026-11-09。三端类型检查、lint 与构建均通过。Windows E2E 耗时 3.4 分钟，arm64 为 5.0 分钟，Intel 为 7.5 分钟。

本机最新 arm64 DMG/ZIP 位于 `release/`，`verify` 的 11 项断言通过；DMG 的 `hdiutil verify` 返回 checksum VALID，ZIP 的 `unzip -tq` 返回 No errors detected。仓库基线为 `1d07e8e`；历史失败及修复保留于进度和发现部分。

## Interfaces and Dependencies

保持 `src/shared/ipc.ts` 与 `src/preload/api.d.ts` 的桥类型同步；新增平台信息用于渲染层快捷键展示。维持 `SaveRequest`、设置文件版本、主题与菜单共享定义的兼容性。现有依赖可从 npm 获取；优先不添加运行时依赖。

## Revision Note

- 2026-11-02T21:56:00+08:00 — 记录最终三平台成功运行、产物元数据和本机双后端验证，归档兼容与公开构建计划；保留独立的木屋主题计划。

- 2026-11-02T19:53:00+08:00 — 纳入用户新主题和素材；根据真实 CI 失败修复保存时序并配置 CI 软件 WebGL，增加五项控制器回归测试。

- 2026-11-02T16:47:05+08:00 — 根据平台代码和实际账号信息建立计划，明确三平台打包与公开 Actions 的验收标准。
