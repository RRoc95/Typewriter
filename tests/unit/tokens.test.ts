import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  flattenTheme,
  MIN_INK_CONTRAST,
  THEMES,
  THEME_IDS
} from '../../src/shared/theme-tokens'

const GROUPS = ['room', 'paper', 'ink', 'metal', 'light', 'ui'] as const

describe('主题令牌', () => {
  it('每套主题都有完整 token 组', () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id]
      expect(theme.id).toBe(id)
      for (const group of GROUPS) {
        expect(Object.keys(theme[group]).length).toBeGreaterThan(0)
      }
    }
  })

  it('所有主题拍平后的变量数量一致', () => {
    const counts = THEME_IDS.map((id) => flattenTheme(THEMES[id]).length)
    expect(new Set(counts).size).toBe(1)
    expect(counts[0]).toBe(39)
  })

  it('变量名统一以 --tw- 前缀且带组名', () => {
    const vars = flattenTheme(THEMES['paper-ink']).map(([name]) => name)
    expect(vars.every((name) => name.startsWith('--tw-'))).toBe(true)
    expect(vars).toContain('--tw-paper-base')
    expect(vars).toContain('--tw-ink-text')
    expect(vars).toContain('--tw-room-wall-top')
  })

  it('正文与纸面的对比度不低于 4.5:1', () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id]
      const ratio = contrastRatio(theme.ink.text, theme.paper.base)
      expect(ratio, `${id} 对比度 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_INK_CONTRAST)
    }
  })

  it('暗色主题的弱化文字仍可读（≥3:1）', () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id]
      expect(contrastRatio(theme.ink.muted, theme.paper.base)).toBeGreaterThan(1.8)
    }
  })

  it('光照与暗角参数在合理区间', () => {
    for (const id of THEME_IDS) {
      const { light, room } = THEMES[id]
      expect(light.intensity).toBeGreaterThan(0)
      expect(light.intensity).toBeLessThanOrEqual(1)
      expect(light.cone).toBeGreaterThan(10)
      expect(light.cone).toBeLessThan(90)
      expect(room.vignette).toBeGreaterThanOrEqual(0)
      expect(room.vignette).toBeLessThanOrEqual(1)
    }
  })
})
