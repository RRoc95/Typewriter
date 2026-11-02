# 打字机 · Typewriter

[![Build Windows and macOS](https://github.com/RRoc95/Typewriter/actions/workflows/build.yml/badge.svg)](https://github.com/RRoc95/Typewriter/actions/workflows/build.yml)

支持 Windows 和 macOS 的本地纯文本（`.txt`）编辑器，视觉与交互借鉴 [Typewriter Nocturne](https://github.com/Chaosnap/Typewriter-Nocturne) 一类「打字机 / 沉浸写作」软件的语汇：纸面从滚筒里吐出来，字锤随光标沿滑轨移动，灯只照亮一页纸，声音是机器自己的声音。

但它首先是一个能用的编辑器：一个原生 `textarea`，中文输入法零干预，纯文本，不联网，不碰你的内容。

---

## 一、交付物

在 [GitHub Actions](https://github.com/RRoc95/Typewriter/actions/workflows/build.yml) 打开成功运行，在 Artifacts 下载对应平台的压缩包。构建产物保留 14 天；也可按下文从源码构建。

| 平台 | 构建产物 | 使用方式 |
| --- | --- | --- |
| Windows x64 | `Typewriter-1.0.0-windows-x64-Setup.exe` | 用户级 NSIS 安装，无需管理员权限 |
| Windows x64 | `Typewriter-1.0.0-windows-x64.zip` | 解压后运行 `Typewriter.exe` |
| macOS Apple Silicon | `Typewriter-1.0.0-macOS-arm64.dmg` / `.zip` | 打开 DMG，将 `Typewriter.app` 拖入 Applications；ZIP 可直接解压 |
| macOS Intel | `Typewriter-1.0.0-macOS-x64.dmg` / `.zip` | 使用 Intel 版本的应用 |

Windows 使用安装包和目录 ZIP，不再使用每次启动都自解压的 portable 目标。macOS 使用原生窗口按钮，关闭最后一个窗口后继续驻留，点击 Dock 可重开；Command+Q 退出前先保存文稿。

产物暂未使用开发者证书签名，Mac 也未公证。Windows 可能显示 SmartScreen；macOS 首次打开可在系统设置的“隐私与安全性”中允许该应用。请只运行自己从本项目获取或构建的产物。

---

## 二、技术选型

| 决策 | 选择 | 依据 |
|---|---|---|
| 运行时 | **Electron 40.10.2**（精确锁定） | 共用 Chromium 与 Node.js，在 Windows 和 macOS 提供原生桌面能力 |
| 构建 | **electron-vite 6** + Vite 8 | main/preload/renderer 三段构建，主进程与预加载输出 CJS，渲染层走标准 Vite |
| 前端 | **React 19 + TypeScript**，状态用 zustand | 侧栏与主题需要响应式；舞台与编辑器是命令式 DOM，React 只挂一次，不参与每帧 |
| 编辑内核 | **原生 `<textarea>`** | ① 中文输入法走 Chromium 原生组字，零 JS 干预——这是不可让渡的硬要求；② 原生撤销栈与上屏单元天然对齐；③ 纯文本不需要布局引擎；④ 零依赖 |
| 舞台 | **three.js 实时 3D 机身 + CSS 纸张** | 机身、滚筒、旋钮、滑轨、字锤、色带盘、键床全部程序化建模，PBR 材质 + 软阴影 + PMREM 环境反射；模型与版式直接移植自 Typewriter Nocturne（MIT），见 `THIRD-PARTY-NOTICES.md` |
| 启动 | **3D 场景按需懒加载** | three.js 与模型单独成 chunk，首屏加载编辑器，窗口先出现再挂 3D；软件 WebGL 使用轻量渲染规格保留完整机身 |
| 音效 | **Web Audio 实时合成** | 无音频素材的体积与授权问题；可参数化成多套音色、可随机抖动、可按打字头位置做立体声 |
| 打包 | **electron-builder 26** | Windows 生成 NSIS + ZIP；macOS 分别生成 arm64/x64 的 DMG + ZIP |

**为什么不用 CodeMirror 6**：它提供的高亮、虚拟滚动、多光标我们一个都不用，却要接管 DOM，牺牲墨迹层与光标坐标的可控性。纯文本 < 2 MB 时 textarea 完全够用。

**刻意不引入的依赖**：electron-store（自己写约 120 行原子 JSON）、sharp（图标用 Electron 自身 `capturePage` 生成 ICO）、任何原生模块（免 rebuild）。

---

## 三、功能范围与交互方式

### 1. 可切换的打字机风格主题

**范围**：8 套主题，每套是一组设计令牌（房间、纸面、墨色、机械件、灯光、UI 字体），共 39 个 CSS 自定义属性。三套木屋主题另配本地背景与火焰素材。

| 主题 | 气质 |
|---|---|
| Paper & Ink | 象牙洋葱纸、铜制机身、一盏台灯 |
| Midnight Study | 夜纸、深房间、台灯只照亮一页 |
| Moonlit Poetry | 冷白直纹纸、月光穿过方窗格 |
| Sepia Underwood | 泛黄牛皮纸、铸铁重机、强聚光 |
| Green Baize | 绿呢书桌、墨绿珐琅机身、罩灯 |
| 炉火旅店 | 栗木梁柱、石砌壁炉、柔和炉火 |
| 雨夜木屋 | 胡桃木墙、雨夜窗景、灯笼烛焰 |
| 烛光书房 | 蜂蜜色橡木护墙板、铜烛台、安静暖光 |

木屋主题沿用 Paper & Ink 的纸张与打字机。火焰和局部光晕做轻微循环动画；系统开启「减少动态效果」、大文件轻量模式、专注/经典模式或窗口隐藏时停止动画。所有素材随应用提供，无需联网。

叠加两个正交维度：**6 种纸纹**（素纸／直纹／布纹／绒面／羊皮／方格）× **2 种纸宽**（信纸 760px／铺满滚筒）。

**交互**：顶栏「打字机面板」→「主题」标签页点卡片，即时切换；`Ctrl+Shift+T` 轮换下一套。另设「无装饰」开关，一键退化为素面白纸。

**关键约束**：切换主题批量更新 `:root` 的 CSS 变量与主题属性，按需替换背景装饰，**不重建编辑器元素**。E2E 检查新主题切换前后 textarea 是同一元素，并验证内容、原生撤销与重做；真实输入法组字还需按下方手工清单验收。

### 2. 多种打字音效，可单选

**范围**：4 套合成音色 + 1 项关闭。

| 预设 | 手感 |
|---|---|
| Underwood | 老式重击：低频厚、余震长 |
| Nocturne（默认） | 柔和：闷响、短促、不刺耳 |
| Modern | 干脆：高频亮、几乎无尾音 |
| Quiet | 极轻：像隔着一层纸 |

单次击键 = 白噪声爆发 + 带通 + 指数包络 + 3 路机身正弦谐振 + 金属泛音 + 延迟二次撞击，每声做 ±5% 频率／±12% 峰值抖动，避免"机关枪"式重复感。区分普通字、空格、回车（擒纵双击 + 走纸噪声）、退格、制表、页边铃。

**交互**：面板内单选，每项带「试听」；音量滑块实时生效；可选按打字头的横向位置做**立体声定位**，回车音滑回中央。选「关闭」会真的 `AudioContext.close()` 释放音频设备。

**页边铃**：一行打到第 68 列响一次铃——**只提示，不改文本，不做自动硬换行**。

### 3. 内置字体列表 + 加载自定义字体

**范围**：
- **内置 3 款拉丁字体**（OFL，随包分发，约 200 KB）：Courier Prime、Special Elite、Cutive Mono。
- **系统字体探测**：canvas 度量对比法，候选含宋体／楷体／仿宋／黑体／等线／思源宋体／Consolas／Georgia 等 20 余族，中文优先排序。
- **自定义字体**：`.ttf/.otf/.ttc/.woff/.woff2`，≤ 12 MB。

**交互**：面板「字体」标签页，每行左边是字体名（界面字体，过长省略），右边用**它自己的字形**渲染「永 Aa 123」，一眼就能看出中文能不能排、哪些款是同一路数；顶部搜索框前缀过滤。

自定义字体全链路：选文件 → 主进程校验 sfnt 魔数、解析 `name` 表取族名 → 复制进 `%APPDATA%\Typewriter\fonts\<id>.<ext>` → 渲染层经 IPC 取字节构造 `FontFace` 注册 → 写入设置，重启自动重新注册 → 删除时移除文件与字体对象，若正被使用则回退默认字体。

### 4. 自动保存（间隔与路径可配置）

**范围**：
- **间隔** 3/5/10/30/60/180 秒可选，默认 10 秒；也可关闭。
- **路径优先级**：① 已打开或另存为过的文件 → **原地覆盖**；② 自定义目录 → `<目录>/<标题>-<时间戳>.txt`；③ 默认 `文档\打字机\未命名-YYYYMMDD-HHmmss.txt`。
- 时间戳在一次会话内固定一次，不会每次保存都产生新文件。
- **原子写入**：同目录临时文件 → 写入 → `fsync` → `rename`；目标被 WPS／杀软短暂占用时退避重试 3 次。
- **编码**：读时识别 BOM（UTF-8 / UTF-8 BOM / UTF-16LE），内存统一 `\n`；写时保留原编码，换行符可选「保持原样 / CRLF / LF」。
- **不静默覆盖**：写前比对 mtime，发现文件被外部修改就报冲突并暂停自动保存，提示另存为或重新打开。
- **崩溃哨兵**：每次成功保存写一条 `session.json`，正常退出删除；异常退出后启动会提示上次会话可能未完成。
- 失败按 1/3/9/27 秒退避，第 5 次转「保存失败」，状态栏红字可点击重试。

**交互**：状态栏常驻状态灯——`● 已保存 14:30:12` / `○ 未保存` / `◐ 保存中…` / `！保存失败（点击重试）`，悬停显示完整路径。`Ctrl+S` 立即保存。

**为什么时钟在主进程**：窗口最小化或后台时，Chromium 会把渲染层的定时器节流到分钟级；只有主进程的 Node 定时器可靠。

### 5. 3D 舞台（视觉主语）

机身是真的 3D：three.js 程序化建模，正交相机把 1 单位对齐 1 CSS 像素，所以模型与纸张严丝合缝。**模型、版式与纸纤维配方都直接移植自 Typewriter Nocturne（MIT）**，不是照着截图重画。

分层（后→前）：房间渐变 → three.js 画布（机身 / 滚筒 / 字锤 / 纸面遮挡体 / 纸卷边）→ 纸张 DOM → 墨迹压印 → 聚光锥（multiply）→ 灯丝辉光（screen）→ 纸夹 → 正文。

- **版式单源**：`stageLayout.ts` 一处算出纸张、滚筒、压纸杆与正文区的位置，DOM 与 3D 读同一份数据，所以文字永远不会被机身盖住。
- **字锤**：沿滑轨逐格位移（`headX` 阻尼跟随），每次击键触发 `strike` 0→1.15→0 的击打行程与 `sway` 微摆，色带盘同步转动，回车时滚筒转 1/26 圈并把字锤送回行首。
- **纸**：纸纤维用开源项目的 `paperTexture()` 配方生成 512×512 可平铺纹理；纸张绕过滚筒的那一段（curl）由 3D 画出来。
- **光照**：PMREM 环境反射 + 主题光源（台灯 / 月光 / 车灯）+ 只给压纸杆一带的阴影贴图，避免整页阴影的每帧全屏开销。
- **墨迹压印**：刚敲下的字符先重、略散，420 ms 内收敛为标准印刷体（最多 3 个并发）。
- **纸夹滚动条**：随滚动滑下、按速度倾斜，可拖拽。

**性能底线**：3D 只在有输入时跑 rAF，静置 240 ms 后自动停帧；无输入时 CPU 归零；`prefers-reduced-motion` 下关闭呼吸动画。

> 正文层永远不做 3D 变换——任何 `rotateX` 都会让 Chromium 双线性采样文字，字发虚、光标与字形错位、输入法候选框偏移。3D 只负责机身与装饰层。

### 6. 菜单栏与多标签页

**菜单栏**：标题栏左侧常驻「文件 / 编辑 / 查看」，样式与主题一致（不是 Windows 原生菜单）。菜单项与快捷键由 `src/shared/menu.ts` 一份规格驱动——原生菜单负责截获快捷键与编辑动作，界面里的可见菜单负责点击，两边不会各写一套。

**多标签页**：每个标签页对应一个**独立的 textarea**，切标签只是显示/隐藏，所以撤销栈、输入法组字状态、滚动位置都留在各自的元素上，不会串页——这是刻意不做「单 textarea 换内容」的原因，那种做法会让 Ctrl+Z 把上一篇的内容撤进这一篇。

- 标签名：已落盘的文件显示文件名，未落盘的取正文首行（`titleFromText`）；有未保存改动时标签上亮一个琥珀点。
- 新建 `Ctrl+N`、关闭 `Ctrl+W`、下一个/上一个 `Ctrl+Tab` / `Ctrl+Shift+Tab`，`+` 按钮与中键关闭都可用。
- 切换或关闭标签前会先落盘当前页，所以任何时刻只有「当前这一页」可能是脏的。
- 关掉最后一个标签会自动补一个空白标签，不会留下空窗口。

### 7. 编辑器外壳

打开 / 保存 / 另存为 / 最近文件（菜单与欢迎页）/ 拖拽打开 / 关窗拦截 / 页内查找 / 专注模式 / 字数统计 / 字号与行距 / 窗口尺寸位置记忆 / 跟随主题的标题栏 / 原生右键菜单。

**字数**按网文口径：中文与中文标点每字计 1，拉丁与数字连续串计 n 字 + 1 词，空白不计；同时给出段落数与预计阅读分钟。

**查找**用 `webContents.findInPage`，对 textarea 内容有效，免费获得全部匹配高亮与自动滚动（textarea 上无法自绘高亮）。

**字号**只改 `font-size`，不使用 `setZoomFactor`——zoom 会连带缩放舞台，纸厚与透视比例会全乱。

---

## 四、快捷键

下表为 Windows 快捷键；Mac 的常用操作使用 Command 替代 Ctrl，重做为 Command+Shift+Z，退出为 Command+Q。切页仍使用 Control+Tab / Control+Shift+Tab。界面会显示当前平台的实际修饰键。

| 操作 | 快捷键 |
|---|---|
| 新建标签页 / 打开 / 保存 / 另存为 | `Ctrl+N` / `Ctrl+O` / `Ctrl+S` / `Ctrl+Shift+S` |
| 关闭标签页 / 下一个 / 上一个 | `Ctrl+W` / `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| 查找 | `Ctrl+F` |
| 打字机面板 | `Ctrl+,` |
| 专注模式 | `Ctrl+Shift+F` |
| 下一套主题 | `Ctrl+Shift+T` |
| 放大 / 缩小 / 重置字号 | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| 撤销 / 重做 / 剪切 / 复制 / 粘贴 / 全选 | 标准 Windows 快捷键 |
| 关闭面板 / 查找条 | `Esc` |

---

## 五、数据位置

设置、自定义字体和会话记录位于 Electron 的应用数据目录；未命名草稿默认写入系统文档目录下的 `打字机/`，已有文件继续原地保存。

| 内容 | Windows | macOS |
| --- | --- | --- |
| 设置、字体、会话记录 | `%APPDATA%/Typewriter/` | `~/Library/Application Support/Typewriter/` |
| 默认未命名草稿 | 系统文档目录下的 `打字机/` | `~/Documents/打字机/` |

开发模式的应用目录名称由 Electron 应用名决定；可通过“关于打字机”查看实际配置目录。测试设置 `TW_USER_DATA` 与 `TW_E2E=1` 后，文档目录一并隔离到临时目录，不写入真实用户文档。

---

## 六、开发与构建

需要 Node.js 24 与 npm。仓库提供 `.nvmrc`，已有 nvm 时可先执行 `nvm use`。Windows 与 macOS 应在各自的系统上生成安装包；运行 Electron 需要桌面会话。

```bash
npm ci               # 按锁文件安装开发依赖及 Electron
npm run dev          # 开发启动与热更新
npm run typecheck    # 主进程、渲染层、测试的类型检查
npm run lint
npm test             # Vitest 单元测试
npm run build        # 生成 out/，E2E 前先执行
npm run e2e          # Playwright 驱动真实 Electron
npm run icon         # 生成 Windows ICO 和 macOS 高分辨率图标源
npm run dist:win     # 在 Windows 构建 NSIS 安装包和 ZIP
npm run dist:mac -- --arm64  # 在 Mac 构建 Apple Silicon DMG/ZIP
npm run dist:mac -- --x64    # 在 Mac 构建 Intel DMG/ZIP
npm run dist         # 构建当前平台的默认目标
npm run pack:dir     # 生成当前平台的应用目录
npm run verify       # 启动当前平台/架构的目录产物并做运行时断言
```

输出均位于 `release/`；构建脚本使用 `--publish never`，不会自动发布 Release。`verify` 也可传入明确的应用可执行路径：

```bash
npm run verify -- release/win-unpacked/Typewriter.exe
npm run verify -- release/mac-arm64/Typewriter.app/Contents/MacOS/Typewriter
```

GitHub Actions 使用 `windows-2025`、`macos-15` 和 `macos-15-intel` 原生 runner，分别检查 Windows x64、macOS arm64 与 macOS x64。每项构建都执行类型检查、lint、单测、Electron E2E、打包、产物启动验证，并上传安装包和诊断截图。

---

## 七、验证

自动化结果以 [Actions 运行记录](https://github.com/RRoc95/Typewriter/actions/workflows/build.yml) 为准，不依赖历史测试数字。

- `npm run typecheck` / `npm run lint`：检查三端类型和现有代码规则；配色令牌仍需代码审查确认。
- `npm test`：验证设置、主题、文本、保存状态机、Windows/POSIX 路径授权、保存目标和平台快捷键。真实系统字体测试按本机字体是否存在条件执行。
- `npm run e2e`：验证输入、主题与动画、实际草稿落盘、跨平台字体加载、标签、菜单、保存快捷键与退出前保存，以及 WebGL 不可用时的编辑和专注模式；Mac 另测关窗后重开和 Dock 打开文件。
- `npm run verify`：启动真正打包的应用，断言窗口、输入、主题、字体、光标、3D 挂载和控制台错误，并生成 `artifacts/packaged.png`。

**手工验收清单**（建议按顺序过一遍）：

1. 在 Windows 微软拼音和 macOS 拼音中分别连续输入 20 次，候选框位置正确、不重复上屏、不丢字。
2. 组字过程中按 `Esc` 或切窗口，回来继续输入无异常。
3. 300 KB 文本输入延迟 < 50 ms；2 MB 以上自动进入「大文件模式」并关掉墨迹与字锤。
4. 长文滚动流畅，纸夹跟随、倾斜自然。
5. 打开 8 套主题 × 6 种纸纹 × 2 种纸宽，遍历无闪烁、无白屏；木屋主题检查火焰定位及系统「减少动态效果」下的静态回退。
6. 静音后任务管理器里应用 CPU 占用为 0。
7. 自动保存进行时用 WPS 打开目标文件，不报错；手动改目标文件后再自动保存，应提示冲突而非覆盖。
8. 任务管理器强杀进程后重启，出现「上次会话未正常结束」提示。
9. 导入 12 MB 中文字体，重启后仍在列表且可选中。
10. 150% / 200% DPI 下，字锤与光标的水平误差 < 1.5 px。
11. 双屏拔插后窗口回到可见区域，不会跑到屏幕外。
12. 拖一个 txt 到窗口上能打开；拖一个二进制文件被拒绝并提示。
13. 有未保存内容时点关闭，先自动保存再退出；保存失败时弹「仍然退出 / 返回继续编辑」。
14. 安装包双击不弹 UAC，装完桌面快捷方式可启动；卸载后配置目录仍然保留。

---

## 八、素材与许可

机身 3D 模型、舞台版式、纸纤维配方、标题栏标记都直接来自 [Typewriter Nocturne](https://github.com/Chaosnap/Typewriter-Nocturne)（MIT），原样移植或最小改动，版权归其作者所有。逐文件对照见 [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md)。

内置三款拉丁字体均为 SIL OFL 1.1。

---

## 九、明确不做

打印与导出图片、分栏、Markdown 渲染、语法高亮、拼写检查、云同步与账号、插件系统、正则替换、真实分页、**自动硬换行**。

（最后一条值得单独说明：第 68 列只响铃提醒，绝不改动文本。写网文的人对"编辑器偷偷插入换行"零容忍。）

---

## 十、已知限制

- 标签页数量没有硬上限，但每页都是一个独立 textarea；同时开 20 个以上大文件会明显吃内存。
- 单文件上限 8 MB；超过 2 MB 自动降级特效以保证输入延迟。
- 超过 60 万字符时放弃逐键精确测量光标，字锤改为跟随估算位置。
- 产物未做开发者签名与 Mac 公证，首次运行可能需要系统允许。
- 自动化构建覆盖 Windows x64 与两类 Mac；真实中文输入法、DPI、安装/卸载交互需要手工验收。
- Linux 未纳入打包与验收范围。
