import { flattenTheme, THEMES, type ThemeId } from '../../../shared/theme-tokens'

let titleTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 切换主题 = 一帧内批量改 CSS 自定义属性。DOM 结构完全不动，
 * 因此 textarea 的撤销栈、输入法状态、滚动位置都不会被打断。
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

  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(() => {
    void window.api.theme.titleBar({ color: theme.ui.frame, symbolColor: theme.ui.text })
  }, 120)
}

export function applyFont(family: string, size: number, lineHeight: number): void {
  const root = document.documentElement
  root.style.setProperty(
    '--tw-editor-font',
    `"${family}", "Source Han Serif SC", "Noto Serif SC", SimSun, Consolas, monospace`
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
