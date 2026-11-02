# PLANS.md — Execution Plans

本文件定义所有工程统一使用的执行计划（ExecPlan）契约。ExecPlan 是面向复杂任务的自包含、可执行、可验证、可恢复的 living document，使不了解既往对话的人只凭当前工作树和计划文件就能继续工作并证明结果。

本文件是固定模板。项目内不得增删、翻译或改写其内容，也不得加入实际项目名、项目专属命令或路径、真实日期或本地规则。项目特有的计划触发条件和工作约束写入根 `AGENTS.md`，执行计划索引和本地生命周期说明写入 `docs/exec-plans/README.md`。标准发生变化时，应从权威模板整体替换本文件。

## 1. How to use ExecPlans and PLANS.md

- 在编写或执行 ExecPlan 前完整阅读本文件，并严格使用下方骨架。
- 当根 `AGENTS.md` 要求，或任务具有多阶段、跨组件、迁移、显著未知、较高风险或需要跨会话延续等特征时，创建 ExecPlan。简单、局部、低风险且可一次验证的工作无需为了形式创建计划。
- 将活动计划保存为 `docs/exec-plans/active/YYYY-MM-DD-short-title.md`，并在 `docs/exec-plans/README.md` 登记。文件名中的 `short-title` 使用简短的小写 kebab-case。
- 调研时持续补全上下文、约束、接口、命令和验收方式。不要依赖聊天记录、执行者记忆或无法访问的材料。
- 实施时持续推进安全、已授权且范围内的工作，不把“下一步是什么”交回用户。只有遇到权限边界、外部写入、破坏性或不可逆操作、真实外部协调，或会实质改变范围与设计的缺失信息时才暂停确认。
- 进入新里程碑或做出重大工具使用选择前，向用户简短说明本阶段目的；连续的小步骤不重复播报。
- 每个重要进展、发现、失败、决策或改向都应立即更新计划。计划必须始终反映真实状态，不能在任务结束后一次性回填。
- 计划不会扩大任务授权。未经明确要求，不得因计划自动提交、推送、部署、购买、发送消息或改变共享外部状态。
- 完成或取消后，补全结果与验证，将状态改为 `completed` 或 `cancelled`，移动到 `docs/exec-plans/completed/`，并同步更新索引。

## 2. Non-negotiable requirements

每份 ExecPlan 必须满足：

- **自包含**：包含完成任务需要的目标、现状、术语、路径、约束、假设和操作说明。
- **面向新读者**：假设执行者第一次接触仓库；首次出现非通用术语时立即解释，并指出其在仓库中的具体表现。
- **结果导向**：先说明完成后用户或调用方能做什么，以及如何观察到结果；不能只把修改文件或新增类型当作成果。
- **范围明确**：写明范围、非目标、约束和授权边界，不把关键设计选择留给执行者临场猜测。
- **可执行**：使用仓库相对路径，指出文件、模块、符号和工作目录，给出准确命令与预期现象。
- **可验证**：每个里程碑都能独立证明；验收覆盖用户可观察行为、关键失败路径和必要的自动化检查。
- **持续更新**：`Progress`、`Surprises & Discoveries`、`Decision Log`、`Validation and Acceptance` 与 `Outcomes & Retrospective` 必须保持最新。
- **安全且可恢复**：步骤尽量幂等；对部分失败、数据或外部状态变化说明重试、清理、回滚和授权要求。
- **证据真实**：记录实际命令和结果。失败、跳过或环境阻塞也是证据，不得改写成成功。
- **简洁而充分**：每条规则只表达一次；保留完成任务所必需的上下文，删除重复说明和无关背景。

## 3. Formatting rules

- ExecPlan 文件本身是普通 Markdown，不在最外层包代码围栏。
- 使用清晰的标题层级和短段落。`Progress` 必须使用复选框；其他章节以叙述为主，只在结构确实更清楚时使用列表。
- 命令放入带语言标记的代码围栏，注明工作目录，并写出简短的预期结果或成功判据。
- 时间使用带时区的 RFC 3339 格式，例如 `YYYY-MM-DDTHH:MM:SS+08:00`。
- 只保留能证明结论的短日志、响应、diff 或测试摘要。不得记录真实密钥、Token、Cookie、个人隐私、完整生产载荷、大段日志、二进制内容或 base64 数据。
- 在开始实施前替换所有模板占位符。无法确认的非关键事实写成明确假设；会改变设计或授权边界的未知项必须先解决。
- 所有章节均保留。确实无内容时写 `None.` 并说明判断依据，不要删除章节。

## 4. Lifecycle

```text
docs/exec-plans/active/YYYY-MM-DD-short-title.md
docs/exec-plans/completed/YYYY-MM-DD-short-title.md
```

1. **Create**：从下方骨架创建活动计划，完成调研，填写所有占位符，并登记索引。
2. **Execute**：按里程碑推进；每个停止点更新 living sections、实际验证和剩余工作。
3. **Revise**：计划与事实不一致时先修订相关章节，并在 `Revision Note` 记录原因和影响。
4. **Complete**：对照目的记录结果、偏差、验证证据、遗留风险和恢复状态。
5. **Archive**：移动到 `completed/`，将索引条目从 Active 更新为 Completed 或 Cancelled。历史计划不因模板更新而重写。

## 5. ExecPlan skeleton

复制以下骨架创建计划。不要把外层四反引号复制到计划文件中。

````markdown
# <简短、结果导向的任务标题>

Status: active
Created: <YYYY-MM-DDTHH:MM:SS+00:00>
Last Updated: <YYYY-MM-DDTHH:MM:SS+00:00>

本 ExecPlan 是 living document。执行过程中必须持续更新 `Progress`、`Surprises & Discoveries`、`Decision Log`、`Validation and Acceptance` 与 `Outcomes & Retrospective`，并遵循仓库根目录 `PLANS.md`。

## Purpose / Big Picture

说明这项工作为何重要、完成后用户或调用方能做什么，以及如何快速观察到新行为。避免只列文件、函数或内部实现。

## Progress

- [x] <YYYY-MM-DDTHH:MM:SS+00:00> — <已经完成且可验证的事项>。
- [ ] <YYYY-MM-DDTHH:MM:SS+00:00> — <下一项具体事项>。
- [ ] <YYYY-MM-DDTHH:MM:SS+00:00> — <部分完成事项；写明已完成和剩余内容>。

每个停止点都更新本节。拆分事项时保留已完成事实，不丢失进度历史。

## Surprises & Discoveries

- Observation: <实施中发现的意外行为、限制、缺陷或机会>。
  Evidence: <仓库路径、命令或简短输出>。
  Impact: <它如何影响计划、实现或风险>。

没有发现时写 `None.`。

## Decision Log

- Decision: <做出的设计、范围或风险决定>。
  Rationale: <为何符合目标和约束>。
  Trade-offs: <放弃的方案及代价>。
  Date/Author: <YYYY-MM-DD / name or agent>。

## Outcomes & Retrospective

对照 `Purpose / Big Picture` 总结已实现结果、未完成项、验证结论、遗留风险和经验。活动计划尚无阶段结果时写明将在何时更新，不要虚构结论。

## Context and Orientation

面向不了解仓库的读者说明当前实现。列出关键仓库相对路径、入口、模块职责、调用或数据流、相关文档和必要术语。说明当前行为如何产生，以及本任务要改变的缺口。

## Scope, Non-Goals, Constraints and Approval Boundaries

**In scope:** <实现目标必须完成的内容>。

**Non-goals:** <明确不做的相邻工作>。

**Constraints:** <架构、兼容性、性能、安全、隐私、依赖、时间或环境限制>。

**Approval boundaries:** <需要确认的外部写入、破坏性或不可逆动作、成本、部署、通知、共享数据变化或范围扩张；没有则写 None，并说明为何>。

## Plan of Work

用叙述方式说明修改顺序和因果关系。对每项编辑指出文件、模块或符号、行为变化及其依赖。说明为何选择该路径，不要粘贴大段预期代码，也不要只给缺少上下文的任务清单。

## Milestones

### Milestone 1 — <可观察结果>

说明本里程碑的范围、将修改的区域、完成后新增的行为、要运行的验证，以及看到什么才算通过。每个里程碑必须独立可验收，并增量推进整体目标。

### Milestone 2 — <可观察结果>

按相同格式描述后续里程碑。存在显著未知时可设置明确的原型里程碑，写出要验证的假设、保留或丢弃原型的标准，以及原型不会进入生产路径的边界。

## Concrete Steps

注明每组命令的准确工作目录、执行顺序和预期现象。执行后把实际结果同步到 `Progress` 和 `Validation and Acceptance`。

Working directory: `<repository-relative directory or repository root>`

1. <要执行的动作>：

   ```bash
   <exact command>
   ```

   Expected: <关键输出、状态或成功判据>。

2. <下一动作及涉及的文件、模块或符号>。

## Validation and Acceptance

按风险从窄到宽说明验证。必须包含用户可观察的验收方式、关键失败路径和最终范围检查；只运行与变更风险相称的检查。

写入或补丁工具报告成功不等于内容正确。重新读取关键文件或检查最终 diff，确认实际内容、范围和语法与计划一致。

- Command: `<exact command>`
  Working directory: `<path>`
  Expected: <可检查的结果>
  Result: <not run | passed | failed | skipped>
  Evidence: <简短实际输出或观察>
  Notes: <阻塞、替代检查或剩余风险；没有则写 None>

对手工或外部验证使用相同字段，将 `Command` 替换为 `Procedure`。不得仅写“测试通过”或“代码已修改”。

## Idempotence and Recovery

说明哪些步骤可以安全重复，如何识别中断位置并继续，部分失败后如何重试或清理，以及如何回滚。列出任何不可逆动作和保护条件；没有不可逆动作时写 `None.`。完成后应使工作区和外部状态处于明确、可解释的状态。

## Artifacts and Notes

保存最重要的短测试摘要、响应样例、diff 片段或原型结论。只保留证明进度或决策所需的内容；没有则写 `None.`。

## Interfaces and Dependencies

明确最终必须存在或保持兼容的 API、类型、函数、模块、表、事件、状态机和外部服务契约。写出稳定的仓库相对路径和符号名。新增或升级依赖时说明必要性、兼容性、锁文件影响和授权状态；没有变化则写 `None.`。

## Revision Note

- <YYYY-MM-DDTHH:MM:SS+00:00> — <本次修订了什么、为什么，以及对范围、里程碑或验证的影响>。
````

## 6. Completion check

归档前确认：

- `Progress` 与实际状态一致，所有必要事项已完成，或明确记录取消和原因。
- `Surprises & Discoveries`、`Decision Log` 和 `Revision Note` 覆盖实施中影响方案的事实与选择。
- `Validation and Acceptance` 记录实际结果和证据，不保留未解释的 `not run`。
- `Outcomes & Retrospective` 对照最初目的说明成果、偏差、遗留风险和经验。
- 所有路径、命令、接口、依赖、恢复方式和授权边界与最终状态一致。
- 状态、文件位置及 `docs/exec-plans/README.md` 索引已经同步。
