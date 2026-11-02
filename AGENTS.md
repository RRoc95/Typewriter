# AGENTS.md

适用于整个 Typewriter 源码目录；更近目录的有效指令在其作用域内优先。以本文件作为 Codex 的项目入口，`CLAUDE.md` 导入同一份规则。

## 1. 项目定位与目录

Typewriter 是面向 Windows 的本地纯文本 Electron 编辑器，使用 React、TypeScript、zustand、three.js 和 Web Audio。根 `package.json` 管理全部源码、测试与构建；主进程、预加载层和渲染层属于同一个应用工程。

| 路径 | 任务入口 |
| --- | --- |
| `src/main/` | 应用生命周期、窗口、原生菜单、IPC、文件与设置服务 |
| `src/preload/` | `window.api` 桥实现及类型声明 |
| `src/shared/` | IPC、菜单、设置、文本工具和主题令牌的共享定义 |
| `src/renderer/src/` | `App.tsx` 编排，以及编辑器、保存控制器、舞台、音效和界面 |
| `tests/unit/`、`tests/e2e/` | Vitest 逻辑测试与 Playwright Electron 测试 |
| `scripts/`、`build/` | 打包验证、截图与图标脚本，以及打包资源 |

运行流程和修改落点见 [ARCHITECTURE.md](ARCHITECTURE.md)。`out/`、`release/`、`artifacts/` 是生成目录，不作为源码修改入口。

## 2. 开始任务前

- 明确请求是解释、审查还是实施，并写出可观察的完成条件。先读相关架构段落，再检查实际入口、调用方、契约和现有测试；按发现扩大调查。
- 有 Git 时先检查 `git status --short`，保留用户改动；源码包没有 Git 元数据时，记录拟修改文件的初始内容，并用文件清单或哈希核对最终范围，不擅自初始化仓库。
- 命令以 `package.json` 及对应配置为依据，行为以实现和测试为依据。README 提供产品背景；发现其描述与代码不一致时说明差异，不把历史验收数字当作本次证据。

## 3. 自治与执行边界

- 对已授权的构建、修改或修复请求，持续完成相关调查、实施、验证和交付；解释、诊断、规划或审查请求按其范围报告。局部选择沿用现有模式。
- 在已有授权内直接完成本地编辑和非破坏性检查。只有不可恢复的破坏性动作、尚未授权的外部写入，或会实质影响正确性与范围且无法从仓库消除的未知项，才需要补充输入；同时完成不依赖该输入的工作。
- 文档任务限定为文档变更。发现应用缺陷或脚本冲突时记录相关限制，按用户请求处理，不顺带修改依赖、打包配置、应用代码或生成产物。
- 验证从直接受影响的行为开始，失败后先区分实现问题、既有问题和环境缺失。必要检查通过后结束验证；仅在新改动、失败或未解决风险出现时扩大或重跑。

## 4. 何时使用 ExecPlan

跨主进程与渲染层的保存流程改造、IPC 或持久化契约迁移、打包链路调整，以及多阶段、显著未知或跨会话工作，遵循 [PLANS.md](PLANS.md) 创建并维护 ExecPlan。简单、局部且可一次验证的改动使用简短工作步骤即可。

首次需要持久计划时创建 `docs/exec-plans/README.md` 索引，并使用 `docs/exec-plans/active/` 与 `docs/exec-plans/completed/` 管理生命周期。保留既有计划历史；项目约束写在本文件，`PLANS.md` 保持标准模板原文。

## 5. 仓库级不变量

- **进程边界**：渲染层通过 `window.api` 调用系统能力，保持 `contextIsolation`、`sandbox` 开启及 `nodeIntegration` 关闭。IPC 改动同步检查 `src/shared/ipc.ts`、`src/preload/api.d.ts`、桥实现、主进程处理器和调用方；共享模块保持两端可用。
- **编辑与输入法**：正文由每个标签页独立、非受控的原生 `textarea` 持有，zustand 保存元信息。保留原生撤销栈与 IME 组字行为；切主题不重建编辑元素，组字期间避免程序化改值。页边铃只提示，不自动插入硬换行；正文层不做 3D 变换。
- **文件与保存**：文件 I/O 留在主进程，保留路径规范化、写入授权、mtime 冲突检查与同目录原子写入。内存文本统一 LF，写盘沿用编码并按设置处理 EOL。修改保存或切页流程时验证失败与保存中继续编辑，不能只看成功提示。
- **视觉与命令定义**：主题从 `src/shared/theme-tokens.ts` 经 `applyTheme.ts` 应用，菜单与快捷键规格归 `src/shared/menu.ts`。保持 DOM 纸张与 3D 舞台共享 `stageLayout.ts`；配色优先使用现有令牌，这是约定而非 ESLint 自动保证。
- **范围与许可**：保持本地纯文本产品定位；上传文稿、云同步或编辑内核替换须属于明确请求。改动移植的机身、纹理、版式或字体资源时保留 [第三方声明](THIRD-PARTY-NOTICES.md)，避免无关格式化。

## 6. 按需阅读

- [ARCHITECTURE.md](ARCHITECTURE.md)：进程依赖、编辑与保存流程、持久化边界及验证落点。
- [README.md](README.md)：产品交互、手工 IME、DPI、文件冲突与安装验收清单；运行结果需要重新验证。
- [PLANS.md](PLANS.md)：复杂工作开始前完整阅读的计划契约。
- 类型与规则改动查看 `tsconfig.node.json`、`tsconfig.web.json`、`tsconfig.test.json` 和 `eslint.config.js`；发布相关任务查看 `electron.vite.config.ts`、`electron-builder.yml` 与实际 npm 脚本。

## 7. 常用命令

所有命令在仓库根目录执行。需要应用工具链时先用 `npm ci` 按锁文件安装开发依赖；Electron 启动还需要对应二进制和桌面环境。完整路径与字体验收使用 Windows：`pathGuard` 单测使用 Windows 绝对路径，字体 E2E 直接读取 `C:\Windows\Fonts\georgia.ttf`，sfnt 单测会按系统字体存在与否条件跳过。E2E 的 `TW_USER_DATA` 隔离设置和字体等应用数据，自动保存草稿仍写入系统文档目录下的 `打字机`。

| 命令 | 用途与前提 |
| --- | --- |
| `npm run dev` | electron-vite 开发启动与热更新 |
| `npm start` | 预览已构建的应用，先执行构建 |
| `npm run typecheck` | 依次检查主进程/预加载/共享、渲染层及测试三份 TS 配置 |
| `npm run lint` | 执行现有 ESLint 配置 |
| `npm test` | 执行 `tests/unit/**/*.test.ts`，检查实际用例数、失败和跳过 |
| `npm test -- tests/unit/machine.test.ts tests/unit/target.test.ts` | 保存状态与路径逻辑的定向测试示例 |
| `npm run build` | 将三端构建到 `out/main/`、`out/preload/`、`out/renderer/` |
| `npm run e2e` | 先构建，再启动真实 Electron；脚本不自动构建，完整套件需要上述 Windows 字体 |
| `npm run icon` | 启动 Electron，重新生成 `build/icon.ico`；仅用于图标变更 |
| `npm run pack:dir` | 构建后按宿主平台输出应用目录；Windows 输出用于产物验证的目录 |
| `npm run dist` | 构建后显式执行 `electron-builder --win portable` |
| `npm run verify -- release/win-unpacked/Typewriter.exe` | 在 Windows 验证已有目录产物；先创建 `artifacts/` 供截图写入 |

打包存在已知定义差异：`electron-builder.yml` 声明 NSIS，但 `dist` 脚本显式选择 portable。处理发布任务时先核实要求的目标与实际输出，不能把当前 `dist` 描述成 NSIS 安装包构建。

纯文档改动检查链接、格式、事实及修改范围。TypeScript 逻辑改动运行类型检查、lint 和相关单测；编辑、IPC、窗口或舞台行为改动再构建并执行相关 E2E，IME 与 DPI 使用 README 的手工步骤补充。打包变更需要实际目标产物与产物验证。缺失环境时记录未验证项，不用跳过的检查证明通过。

## 8. 完成定义

- 请求的行为或文档已经落实，并覆盖直接相关的失败情形；必要检查有实际命令、结果与成功信号，明确列出失败、跳过和环境阻塞。
- 重新读取所有新增或修改文件；有 Git 时检查 diff 和 `git diff --check`，无 Git 时与初始文件清单或内容对照，确认范围且保留无关文件。
- 变更影响命令、契约或架构时同步对应文档；使用 ExecPlan 时更新进度、验证与索引。交付说明结果、验证及剩余限制，不声称未执行的检查成功。
