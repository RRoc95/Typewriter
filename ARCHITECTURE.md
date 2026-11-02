# ARCHITECTURE.md — Typewriter 当前架构

本文描述当前源码、构建配置和测试中的实现。适用范围是根 `package.json` 管理的一个 Electron 应用；操作规则和命令由 [AGENTS.md](AGENTS.md) 维护。

## 1. 系统定位与运行边界

Typewriter 是支持 Windows 和 macOS 的本地纯文本编辑器。Electron 主进程管理窗口、原生菜单、文件与设置，React 渲染层管理界面、原生文本编辑、three.js 装饰和 Web Audio 音效。应用数据写入本地文件，没有服务端工程。

`electron.vite.config.ts` 以 `src/main/index.ts`、`src/preload/index.ts`、`src/renderer/index.html` 为三个构建入口。主进程和预加载输出为 CommonJS 的 `out/main/index.cjs` 与 `out/preload/index.cjs`，渲染资源写入 `out/renderer/`；`package.json` 的 `main` 指向构建后的主入口。

## 2. 分层与依赖方向

```text
renderer: App / editor / autosave / stage / audio / UI
    → window.api（preload/index.ts；类型见 preload/api.d.ts）
    → Electron IPC（shared/ipc.ts 的 CH 与数据契约）
    → main/ipc/* → main/services/*、security/pathGuard.ts
    → 本地文件、系统对话框、Electron 窗口能力

main、preload、renderer → src/shared/* 的共享定义
```

- `src/main/ipc/handle.ts` 将其包装的处理器异常转换为 `R<T>` 的成功或错误结果，不返回异常堆栈。启动载荷 `CH.STARTUP` 独立注册，直接返回 `StartupPayload`。
- `src/preload/index.ts` 通过 `contextBridge` 暴露固定的 `window.api` 方法、只读平台标识与事件订阅；订阅方法返回取消函数。拖拽文件经 `webUtils.getPathForFile` 取得路径。
- `src/shared/ipc.ts` 定义通道与文件、保存、会话等载荷，`settings.ts` 定义设置与校验，`menu.ts` 同时供原生和可见菜单使用，`theme-tokens.ts` 供主题与标题栏使用。
- `tsconfig.node.json` 和 `tsconfig.web.json` 分开声明 Node 与 DOM 环境；测试由 `tsconfig.test.json` 检查。渲染层的系统 I/O 经桥调用主进程。

## 3. 启动与应用生命周期

1. `src/main/index.ts` 在请求单实例锁前读取可选的 `TW_USER_DATA`，用它覆盖 Electron `userData` 位置；同时设置 `TW_E2E=1` 时，系统文档路径也指向该临时目录内的 `Documents/`。第二实例把窗口唤起，并可转交支持扩展名的文件参数。
2. `app.whenReady()` 后载入设置、尝试创建并授权自动保存目录、授权 `userData`，拒绝会话权限请求，注册业务 IPC，并检查会话记录及启动文件。
3. `src/main/window.ts` 恢复可见屏幕内的窗口位置，加载预加载脚本；开发时读取 `ELECTRON_RENDERER_URL`，构建后加载本地 HTML。Windows 使用标题栏 overlay，Mac 使用 `hiddenInset` 与原生窗口按钮；窗口在 `ready-to-show` 显示，页面加载完成后启动主进程自动保存时钟，关闭后停止时钟。
4. `src/renderer/src/main.tsx` 以 React `StrictMode` 挂载 `App`。`App.tsx` 注册字体，通过桥获取设置、应用目录和最近文件，建立初始标签与编辑引擎；就绪后拉取一次性启动载荷。
5. 关窗及显式退出均经过渲染层保存/失败确认。`before-quit` 记录退出意图；`closeReady(true)` 销毁窗口，有退出意图时继续退出，取消则清除意图。Windows 最后窗口关闭后退出，Mac 继续驻留并在 `activate` 时使用最新设置重开窗口。
6. Mac 的 `open-file` 监听在 ready 前注册；冷启动文件经一次性启动载荷读取，运行时转交现有窗口，无窗口时创建窗口后拉取载荷。菜单增加 Mac 应用菜单，公共操作使用 `CmdOrCtrl`，重做及快捷键显示由共享菜单函数处理。每个窗口的 `before-input-event` 从同一菜单规格解析应用命令并阻止重复处理；普通文字、组字与原生编辑角色沿用既有输入路径。

## 4. 编辑、标签与舞台

`App.tsx` 用 `Map<tabId, HTMLTextAreaElement>` 持有各页元素，初始内容单独保存在 seeds 中。`editor/Editor.tsx` 只在首次挂载写入初值；标签切换通过 `hidden` 显示或隐藏元素。`state/store.ts` 保存标签路径、编码、mtime、dirty 等元信息及当前页投影，正文来源始终是对应元素的 `value`。

一个 `editor/engine.ts` 实例连接到当前页。切页时先分离旧元素的监听器，再连接新元素，重算字数与光标并重置当前保存状态。切页、关页等操作在检测到 dirty 时发起保存；修改这些路径要同时检查保存返回值和异步切页时序。

输入路径为 `beforeinput`/`input`/composition 事件 → 引擎回调 → dirty 与统计更新，以及 `stage/bus.ts` 的光标、击键、滚动事件。`imeGuard.ts` 记录组字状态；组字中的 `input` 只刷新光标，`compositionend` 触发变更和击键回调。第 68 列页边铃不写入换行；Tab 使用原生编辑命令插入制表符。

`stage/Stage.tsx` 使用 CSS 纸张承载正文，`stageLayout.ts` 为纸张和机器共享几何数据，`Machine3D.tsx` 经 `lazy` 加载。主题应用更新根 CSS 变量和数据属性，机身模型可重新 build，编辑元素继续保留。舞台直接响应事件绘制光标与墨迹；机身动画在稳定并空闲后停止请求帧，卸载时释放场景资源。音效由 `audio/AudioEngine.ts` 合成，静音预设关闭音频上下文。

三套木屋主题在 `stage/roomScenes.ts` 映射本地背景、透明火焰和源图坐标。`RoomBackdrop.tsx` 在 viewport 内将图像等比缩放到舞台高度、分别锚定左右边缘，纸张和机器覆盖在其上；面板开合时背景与舞台一起调整。火焰使用 CSS transform/opacity 循环，无逐帧 React 更新；隐藏页面、轻量及非完整舞台暂停动画，系统减少动态效果禁用动画。`styles/rooms.css` 仅对木屋主题应用木质外壳。

## 5. 文件、保存与会话

`main/ipc/file.ts` 的 `readDocument` 先规范化路径，检查文件类型与 8 MiB 读取上限，再读入字节并检查二进制特征。`services/encoding.ts` 识别 UTF-8、UTF-8 BOM、UTF-16LE BOM，`shared/text.ts` 检测原换行形式并统一内存文本为 LF。成功打开的文件获得单文件授权。

保存的代表路径如下：

```text
main/services/autosaveClock.ts 每秒发送 tick，窗口失焦另发 blur tick
    → App 订阅 → autosave/controller.ts 的 runTick / saveDocument
    → 从当前 textarea 读取文本，计算 hash、目标路径、编码、EOL 和期望 mtime
    → window.api.files.save → main/ipc/file.ts
    → pathGuard 写入授权与 mtime 检查 → encodeText → atomicWrite
    → 返回路径、mtime、字节数 → 更新元信息、保存状态与 session 记录
```

- `autosave/target.ts` 的目标优先级是已有文件路径、用户固定目录、`AppInfo.defaultAutosaveDir`；默认目录由主进程定义为系统文档目录下的 `打字机`。草稿名包含标题和标签的固定 `draftStamp`。当前目标计算没有 `userData/drafts` 回落分支。
- `autosave/machine.ts` 是无 I/O 的纯状态转换，包含保存代号、pending hash、错误和重试时间；`controller.ts` 持有当前页的全局保存状态与单个进行中的保存 Promise；显式保存等待现有写入，再刷新最新内容，保存期间新增编辑继续保持 dirty。首次自动保存等待配置的完整间隔，首次落盘也同步草稿首行标题。当前 `runTick` 自行按间隔与 phase 调度，没有使用状态机的 `TICK`/`RETRY` 事件；状态机单测不能证明实际调度的退避行为。
- `SaveRequest` 带编码、EOL 和可空的 `expectMtimeMs`；已有文件的实际 mtime 与期望相差超过 1200 ms 时返回 `ECONFLICT`。控制器显示错误提示，失败结果与是否继续切页、重试或退出分别由调用路径处理。
- `services/atomicWrite.ts` 在目标同目录创建临时文件，写入、同步、关闭后 rename；对占用相关错误最多尝试三次 rename，rename 失败时清理临时文件。写入或同步阶段失败不经过这段清理。自动保存、设置与会话记录复用此服务。
- `services/session.ts` 的 `session.json` 只保存目标路径、hash、长度等元信息，不含正文备份。启动时读取目标并比较 hash，记录可能中断的会话；界面显示通知后清除记录，不能将此机制当作未保存正文的恢复功能。

## 6. 设置、字体与安全边界

设置路径为 `app.getPath('userData')/settings.json`。`services/settingsStore.ts` 缓存设置，读取和 patch 后均经 `shared/settings.ts` 的 `clampSettings` 限定已知字段与取值；损坏设置尝试重命名留档。设置和会话写入的部分失败在服务内被吞掉，不能把成功 IPC 响应等同于每类数据已持久化。

`services/fontService.ts` 通过原生对话框导入本地字体，检查扩展名、12 MiB 大小上限与魔数，以随机 ID 复制到 `userData/fonts/`，把元信息写入设置。渲染层通过桥读取字节，再由 `fonts/loader.ts` 注册 `FontFace`；内置字体由 `fonts/catalog.ts` 从依赖资源加载。字体解析实现与对应测试位于 `services/sfnt.ts` 和 `tests/unit/sfnt.test.ts`。

`window.ts` 开启上下文隔离与沙箱，关闭 Node 集成和 webview，拒绝新窗口与页面导航；`index.ts` 拒绝会话权限。`security/pathGuard.ts` 维护授权目录与单文件集合，按宿主平台选择 Windows 或 POSIX 路径规则。Windows 拒绝 UNC/设备名并忽略授权路径大小写；POSIX 保留合法文件名与大小写，目录授权检查完整分隔符边界。保存与 reveal 处理器检查授权，打开路径会经校验后新增授权。新增 IPC 需要按具体处理器验证输入，TypeScript 类型不会替代运行时校验。

## 7. 构建、资源与修改落点

`electron-builder.yml` 从 `out/**/*` 与 `package.json` 打包到 `release/`。Windows x64 生成 NSIS 和 ZIP，用户级安装且卸载保留应用数据；Mac 按所选 arm64/x64 架构生成 DMG 和 ZIP，使用高分辨率图标源，当前不做开发者签名或公证。`dist` 选择当前平台，显式平台命令见 [命令说明](AGENTS.md#7-常用命令)，均不自动发布 Release。`pack:dir` 仅生成宿主平台的应用目录。

`.github/workflows/build.yml` 在 Windows、Apple Silicon Mac 与 Intel Mac 原生 runner 使用 Node.js 24，依次执行类型检查、lint、单测、Electron E2E、图标生成、打包和产物启动验证，上传安装包/归档与诊断截图。`TW_E2E=1` 且处于 CI 时使用 SwiftShader 软件 WebGL，窗口合成不经过 SwiftShader，同时使用 Playwright 常规的后台节流控制以适配虚拟桌面。正常应用使用系统图形后端；装饰动画由原生窗口活动状态控制暂停。

`Machine3D.tsx` 根据实际 WebGL 渲染器选择模型已有的规格：SwiftShader、llvmpipe 等软件渲染器使用 `low`，保留完整模型并省去高成本阴影，硬件渲染器使用 `high`。创建失败时明确标记 WebGL 不可用并保留正文编辑；切换专注模式不会清理空的渲染器。产物检查要求实际存在且未丢失的 WebGL 上下文，仍检查场景、字体、输入和控制台错误。

`App.tsx` 在 layout effect 中应用共享主题、字体和纸张 CSS，先给出可见主题状态，再执行子树中耗时的模型重建；音频与专注状态保持 passive effect 同步。原生快捷键测试等待页面绘制后验证结果。

| 修改内容 | 优先查看 |
| --- | --- |
| IPC 或文件格式 | `src/shared/ipc.ts`、`src/preload/api.d.ts`、`src/preload/index.ts`、`src/main/ipc/` 与调用方 |
| 保存、冲突、切页 | `src/renderer/src/autosave/`、`src/renderer/src/App.tsx`、`src/renderer/src/state/store.ts`、`src/main/ipc/file.ts` 与 `src/main/services/atomicWrite.ts` |
| 输入法、撤销、光标 | `src/renderer/src/editor/`、`src/renderer/src/App.tsx` 与 `src/renderer/src/styles/stage.css` |
| 主题、菜单、布局 | `src/shared/theme-tokens.ts`、`src/shared/menu.ts`、`src/renderer/src/theme/` 与 `src/renderer/src/stage/` |
| 启动、窗口、打包 | `src/main/index.ts`、`src/main/window.ts`、`electron.vite.config.ts`、`electron-builder.yml` 与 `scripts/verify-pack.mjs` |

移植的机身、纹理、版式和标记资源归属见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

## 8. 验证

可执行命令、工作目录与平台前提统一见 [AGENTS.md 的常用命令](AGENTS.md#7-常用命令)。

- `tests/unit/` 覆盖设置裁剪、主题令牌与对比度、文本工具、目标路径、保存状态转换、字体解析和路径守卫。控制器测试以延迟的文件桥响应验证并发保存、退出前刷新、失败重试和草稿标题；Node 单测不执行实际窗口或主进程文件 I/O，真实落盘由 E2E 覆盖。
- `tests/e2e/smoke.spec.ts` 使用真实 Electron，覆盖输入、主题结构稳定、字数、自动保存状态栏路径、预置自定义字体的加载/应用、多标签与菜单。测试需要已有 `out/`，字体用例使用依赖内的 WOFF2。自动保存与快捷键用例读取实际落盘内容；显式退出验证先保存，Mac 另测 Dock 激活与打开文件。测试完成通过 close 事件跟踪并清理应用。
- `scripts/verify-pack.mjs` 按当前平台和架构选择目录产物并使用隔离数据目录启动，断言窗口、输入、字体、主题、光标、3D 挂载和控制台错误，并写入截图；它不验证安装与卸载过程。
- 类型检查与 lint 验证对应配置的约束，构建验证三端产物生成。IME 候选框、撤销栈、保存冲突、DPI 和安装行为需要按 [README 手工清单](README.md) 在目标环境补充实际验收。
