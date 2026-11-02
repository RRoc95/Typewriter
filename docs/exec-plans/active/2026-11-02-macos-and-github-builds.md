# Windows/macOS 兼容与公开构建验证

Status: active
Created: 2026-11-02T16:47:05+08:00
Last Updated: 2026-11-02T17:10:15+08:00

本 ExecPlan 是 living document。执行过程中持续更新进度、发现、决策、验证与结果，遵循根 `PLANS.md`。

## Purpose / Big Picture

让用户在 Windows 与 macOS 使用本地纯文本编辑器，分别获得 NSIS 安装包与 Mac DMG/ZIP。源码发布到用户 RRoc95 的公开 GitHub 项目，以真实 GitHub Actions 成功运行和可下载产物证明 Windows x64、macOS arm64 与 macOS x64 能完成测试、构建和打包。

## Progress

- [x] 2026-11-02T16:47:05+08:00 — 检查平台代码、测试与打包配置；确认 GitHub 账号 RRoc95，Typewriter 名称尚未使用；初始化本地 Git 并保存源码基线 `1d07e8e`。
- [x] 2026-11-02T16:59:00+08:00 — 实现平台窗口、退出/重开、open-file、快捷键、路径和字体适配；单测 62 项通过、1 项系统字体测试条件跳过，lint 通过；E2E 待执行。
- [ ] 本机类型检查、lint、62 项单测和 8 项 Electron E2E 已通过；macOS arm64 DMG 已生成，ZIP 与产物启动验证继续进行。
- [ ] 创建公开 GitHub 仓库，推送源码并观察三平台 Actions 结果，修复实际失败。
- [ ] 核对产物、更新使用文档与架构说明，归档计划并交付仓库和运行链接。

## Surprises & Discoveries

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

- Decision: 保留现有 Electron/React 架构与原生 textarea，按平台调整窗口、生命周期、菜单、路径和测试。
  Rationale: 平台兼容不需要替换编辑内核或增加运行时依赖。
  Trade-offs: 各平台仍需原生桌面环境验证；保持无关保存逻辑不变。
  Date/Author: 2026-11-02 / Codex。
- Decision: 使用 Windows x64 NSIS，以及 macOS arm64/x64 各自的 DMG/ZIP，在原生 GitHub runner 打包。
  Rationale: 覆盖 Windows 和两类 Mac；避免 portable 脚本冲突。没有签名证书，构建不要求付费证书或发布密钥。
  Trade-offs: 产物没有开发者签名或公证，首次运行需要系统允许；不自动发布 GitHub Release。
  Date/Author: 2026-11-02 / Codex。

## Outcomes & Retrospective

已完成平台实现及本机 8 项真实 Electron 流程。公开仓库 https://github.com/RRoc95/Typewriter 已创建；待推送与远端三平台构建完成后补全结果。

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
  Result: not run
  Evidence: typecheck、lint、build 均通过；单测 62 passed / 1 skipped，E2E 8 passed（25 秒）；打包与产物验证尚未全部结束。
  Notes: Windows 与 Intel Mac 验证由 Actions 完成。
- Procedure: GitHub Actions 三平台构建与产物检查
  Working directory: `RRoc95/Typewriter`
  Expected: 同一源码提交的三项 job 成功，产物可见且非空。
  Result: not run
  Evidence: 待公开仓库创建和推送。
  Notes: 真实 IME 候选框与安装交互仍属于手工验收。

## Idempotence and Recovery

源码基线已在本地 Git 保存。构建产物可从源码重建，测试使用临时数据目录。已存在的远端先读取再决定下一步，不覆盖历史、不强推；失败提交以修复提交推进。Actions 失败先读取具体日志，再调整代码或环境并重跑受影响项。没有购买、付费服务或其他不可逆数据迁移。

## Artifacts and Notes

本地行为：`npm run typecheck` passed；`npm run build` passed；`npm run e2e` 8 passed（25 秒）。

本地初轮：`npm run lint` passed；`npm test` 62 passed / 1 skipped（真实 TTC 字体不存在）。

基线：`1d07e8e`。实际检查摘要、GitHub 运行和产物链接随进度添加，不保存凭证或大段日志。

## Interfaces and Dependencies

保持 `src/shared/ipc.ts` 与 `src/preload/api.d.ts` 的桥类型同步；新增平台信息用于渲染层快捷键展示。维持 `SaveRequest`、设置文件版本、主题与菜单共享定义的兼容性。现有依赖可从 npm 获取；优先不添加运行时依赖。

## Revision Note

- 2026-11-02T16:47:05+08:00 — 根据平台代码和实际账号信息建立计划，明确三平台打包与公开 Actions 的验收标准。
