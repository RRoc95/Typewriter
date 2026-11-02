import { describe, expect, it } from 'vitest'
import {
  clampSettings,
  DEFAULT_SETTINGS,
  MAX_FONT_SIZE,
  MAX_INTERVAL_SEC,
  MIN_FONT_SIZE,
  MIN_INTERVAL_SEC
} from '../../src/shared/settings'

describe('clampSettings', () => {
  it('空对象回落默认值', () => {
    expect(clampSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('非对象输入也回落默认值', () => {
    expect(clampSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(clampSettings('nope')).toEqual(DEFAULT_SETTINGS)
  })

  it('保存间隔被夹到 3–600 秒', () => {
    expect(clampSettings({ autosave: { intervalSec: 1 } }).autosave.intervalSec).toBe(MIN_INTERVAL_SEC)
    expect(clampSettings({ autosave: { intervalSec: 99999 } }).autosave.intervalSec).toBe(MAX_INTERVAL_SEC)
    expect(clampSettings({ autosave: { intervalSec: 30 } }).autosave.intervalSec).toBe(30)
  })

  it('字号被夹到 12–40 并取整', () => {
    expect(clampSettings({ font: { size: 4 } }).font.size).toBe(MIN_FONT_SIZE)
    expect(clampSettings({ font: { size: 999 } }).font.size).toBe(MAX_FONT_SIZE)
    expect(clampSettings({ font: { size: 18.6 } }).font.size).toBe(19)
  })

  it('非法枚举值回落默认', () => {
    const settings = clampSettings({ theme: 'not-a-theme', paperTexture: 'x', sound: { preset: 'y' } })
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(settings.paperTexture).toBe(DEFAULT_SETTINGS.paperTexture)
    expect(settings.sound.preset).toBe(DEFAULT_SETTINGS.sound.preset)
  })

  it('剥离未知键', () => {
    const settings = clampSettings({ evil: 'x', __proto__: { polluted: true } }) as Record<string, unknown>
    expect(settings.evil).toBeUndefined()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('自定义字体只保留合法条目', () => {
    const settings = clampSettings({
      customFonts: [
        { id: '0123456789abcdef', family: 'My Font', fileName: 'a.ttf', addedAt: 1 },
        { id: 'bad', family: 'Nope', fileName: 'b.ttf' },
        { id: 'aaaaaaaaaaaaaaaa', family: '', fileName: 'c.ttf' }
      ]
    })
    expect(settings.customFonts).toHaveLength(1)
    expect(settings.customFonts[0].family).toBe('My Font')
  })

  it('窗口矩形不合法时置空', () => {
    expect(clampSettings({ window: { bounds: { x: 0, y: 0, width: 10, height: 10 } } }).window.bounds).toBeNull()
    expect(
      clampSettings({ window: { bounds: { x: 10, y: 20, width: 1200, height: 800 } } }).window.bounds
    ).toEqual({ x: 10, y: 20, width: 1200, height: 800 })
  })

  it('最近文件去重并限制 10 条', () => {
    const list = Array.from({ length: 14 }, (_, i) => `C:\\a\\${i}.txt`)
    const settings = clampSettings({ recent: [...list, list[0]] })
    expect(settings.recent).toHaveLength(10)
    expect(new Set(settings.recent).size).toBe(10)
  })
})
