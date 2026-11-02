import { flattenTheme, THEMES, type ThemeId } from '../../../shared/theme-tokens'
import { roomSceneFor } from '../stage/roomScenes'

let titleTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 一帧内批量更新颜色及外壳属性；舞台可替换背景装饰，始终保留 textarea，
 * 使原生撤销栈、输入法状态和滚动位置不因切换主题而丢失。
 */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES[id]
  const root = document.documentElement
  for (const [name, value] of flattenTheme(theme)) {
    root.style.setProperty(name, value)
  }
  root.dataset.theme = id
  root.dataset.gobo = theme.light.gobo
  root.dataset.mode = theme.mode
  const scene = roomSceneFor(id)
  root.dataset.room = String(Boolean(scene))

  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(() => {
    void window.api.theme.titleBar({ color: theme.ui.frame, symbolColor: theme.ui.text })
  }, 120)
}

export function applyFont(family: string, size: number, lineHeight: number): void {
  const root = document.documentElement
  root.style.setProperty(
    '--tw-editor-font',
    `"${family}", "Source Han Serif SC", "Noto Serif SC", "Songti SC", "PingFang SC", SimSun, Consolas, monospace`
  )
  root.style.setProperty('--tw-editor-size', `${size}px`)
  root.style.setProperty('--tw-editor-lh', `${lineHeight}px`)
}

export function applyDecor(decor: 'full' | 'classic'): void {
  document.documentElement.dataset.decor = decor
}

export function applyTexture(texture: string): void {
  document.documentElement.dataset.paperTexture = texture
}

export function applyPaperWidth(width: 'letter' | 'full'): void {
  document.documentElement.dataset.paperWidth = width
}
