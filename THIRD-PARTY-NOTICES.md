# 第三方资源与许可

本项目以 MIT 许可发布。以下第三方作品的版权归其各自作者所有。

## Typewriter Nocturne（MIT）

- 仓库：https://github.com/Chaosnap/Typewriter-Nocturne
- 版权：Copyright © Typewriter Nocturne contributors
- 许可：MIT

本项目的以下文件**原样移植或改编**自该项目，保留其版权声明：

| 本项目文件 | 来源 | 改动 |
|---|---|---|
| `src/renderer/src/stage/machine/typewriter-machine.js` | `lib/nocturne/machine/typewriter-machine.js` | 仅让机身漆面颜色读取 `spec.theme.body`（原为硬编码的黑色珐琅），其余未改 |
| `src/renderer/src/stage/machine/textures.js` | `lib/nocturne/machine/textures.js` | 未改 |
| `src/renderer/src/stage/stageLayout.ts` | `app/nocturne/stage-layout.ts` | 未改（类型与实现一致） |
| `src/renderer/src/stage/paper.ts` | 纸纤维配方来自 `textures.js` 的 `paperTexture()` | 改成 512×512 可平铺方块，去掉原图里烘焙的纵向明暗 |
| `src/renderer/src/assets/mark.svg` | `assets/nocturne/icon.svg` | 未改，用作标题栏标记与应用图标 |

## 字体

| 字体 | 许可 |
|---|---|
| Courier Prime | SIL Open Font License 1.1 |
| Special Elite | SIL Open Font License 1.1 |
| Cutive Mono | SIL Open Font License 1.1 |

## 运行时依赖

Electron（MIT）、React（MIT）、three.js（MIT）、zustand（MIT）、Vite（MIT）。完整列表见 `package.json`。

## MIT 许可全文

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
