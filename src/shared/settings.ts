import type { CustomFont } from './ipc'
import {
  PAPER_WIDTHS,
  TEXTURE_IDS,
  THEME_IDS,
  type PaperWidth,
  type TextureId,
  type ThemeId
} from './theme-tokens'

export const SOUND_PRESETS = ['underwood', 'nocturne', 'modern', 'quiet', 'silent'] as const
export type SoundPresetId = (typeof SOUND_PRESETS)[number]

export const EOL_MODES = ['preserve', 'crlf', 'lf'] as const
export type EolMode = (typeof EOL_MODES)[number]

export const DECOR_MODES = ['full', 'classic'] as const
export type DecorMode = (typeof DECOR_MODES)[number]

export const INTERVAL_CHOICES = [3, 5, 10, 30, 60, 180] as const

export type Bounds = { x: number; y: number; width: number; height: number }

export type SettingsV1 = {
  version: 1
  theme: ThemeId
  decor: DecorMode
  paperTexture: TextureId
  paperWidth: PaperWidth
  focus: boolean
  font: {
    family: string
    size: number
    lineHeightRatio: number
  }
  customFonts: CustomFont[]
  sound: {
    preset: SoundPresetId
    volume: number
    bell: boolean
    pan: boolean
  }
  autosave: {
    enabled: boolean
    intervalSec: number
    fixedDir: string | null
    eol: EolMode
  }
  window: {
    bounds: Bounds | null
    maximized: boolean
  }
  recent: string[]
  lastDir: string | null
}

/** 大文件阈值：超过后自动降级特效。 */
export const LARGE_DOC_CHARS = 2_000_000
/** 打开文件的硬上限。 */
export const MAX_FILE_BYTES = 8 * 1024 * 1024
export const MIN_INTERVAL_SEC = 3
export const MAX_INTERVAL_SEC = 600
export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 40

export const DEFAULT_SETTINGS: SettingsV1 = {
  version: 1,
  theme: 'paper-ink',
  decor: 'full',
  paperTexture: 'plain',
  paperWidth: 'letter',
  focus: false,
  font: { family: 'Courier Prime', size: 18, lineHeightRatio: 1.72 },
  customFonts: [],
  sound: { preset: 'nocturne', volume: 0.65, bell: true, pan: true },
  autosave: { enabled: true, intervalSec: 10, fixedDir: null, eol: 'preserve' },
  window: { bounds: null, maximized: false },
  recent: [],
  lastDir: null
}

const rec = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function num(v: unknown, min: number, max: number, fallback: number, round = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  const clamped = Math.min(max, Math.max(min, v))
  return round ? Math.round(clamped) : clamped
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function str(v: unknown, fallback: string, maxLen = 200): string {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, maxLen) : fallback
}

function bounds(v: unknown): Bounds | null {
  const o = rec(v)
  const x = o.x
  const y = o.y
  const width = o.width
  const height = o.height
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    width < 480 ||
    height < 360 ||
    width > 12000 ||
    height > 12000
  ) {
    return null
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

function customFonts(v: unknown): CustomFont[] {
  if (!Array.isArray(v)) return []
  const out: CustomFont[] = []
  for (const item of v) {
    const o = rec(item)
    if (typeof o.id !== 'string' || !/^[a-f0-9]{16}$/.test(o.id)) continue
    if (typeof o.family !== 'string' || !o.family) continue
    if (typeof o.fileName !== 'string' || !o.fileName) continue
    out.push({
      id: o.id,
      family: o.family.slice(0, 120),
      fileName: o.fileName.slice(0, 200),
      addedAt: typeof o.addedAt === 'number' ? o.addedAt : 0
    })
    if (out.length >= 64) break
  }
  return out
}

function recent(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string' || item.length < 3 || item.length > 1024) continue
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= 10) break
  }
  return out
}

/** 把任意来源的对象收敛成合法的 SettingsV1；未知键一律丢弃。 */
export function clampSettings(input: unknown): SettingsV1 {
  const root = rec(input)
  const font = rec(root.font)
  const sound = rec(root.sound)
  const autosave = rec(root.autosave)
  const win = rec(root.window)

  return {
    version: 1,
    theme: pick(root.theme, THEME_IDS, DEFAULT_SETTINGS.theme),
    decor: pick(root.decor, DECOR_MODES, DEFAULT_SETTINGS.decor),
    paperTexture: pick(root.paperTexture, TEXTURE_IDS, DEFAULT_SETTINGS.paperTexture),
    paperWidth: pick(root.paperWidth, PAPER_WIDTHS, DEFAULT_SETTINGS.paperWidth),
    focus: bool(root.focus, DEFAULT_SETTINGS.focus),
    font: {
      family: str(font.family, DEFAULT_SETTINGS.font.family, 120),
      size: num(font.size, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_SETTINGS.font.size, true),
      lineHeightRatio: num(font.lineHeightRatio, 1.2, 2.6, DEFAULT_SETTINGS.font.lineHeightRatio)
    },
    customFonts: customFonts(root.customFonts),
    sound: {
      preset: pick(sound.preset, SOUND_PRESETS, DEFAULT_SETTINGS.sound.preset),
      volume: num(sound.volume, 0, 1, DEFAULT_SETTINGS.sound.volume),
      bell: bool(sound.bell, DEFAULT_SETTINGS.sound.bell),
      pan: bool(sound.pan, DEFAULT_SETTINGS.sound.pan)
    },
    autosave: {
      enabled: bool(autosave.enabled, DEFAULT_SETTINGS.autosave.enabled),
      intervalSec: num(
        autosave.intervalSec,
        MIN_INTERVAL_SEC,
        MAX_INTERVAL_SEC,
        DEFAULT_SETTINGS.autosave.intervalSec,
        true
      ),
      fixedDir: typeof autosave.fixedDir === 'string' && autosave.fixedDir.length > 2 ? autosave.fixedDir : null,
      eol: pick(autosave.eol, EOL_MODES, DEFAULT_SETTINGS.autosave.eol)
    },
    window: {
      bounds: bounds(win.bounds),
      maximized: bool(win.maximized, false)
    },
    recent: recent(root.recent),
    lastDir: typeof root.lastDir === 'string' && root.lastDir.length > 2 ? root.lastDir : null
  }
}

/** 编辑器字体的完整 CSS 字体栈：主字体 + 中文兜底 + 等宽兜底。 */
export function fontStack(family: string): string {
  return `"${family}", "Source Han Serif SC", "Noto Serif SC", SimSun, Consolas, monospace`
}

/** 整数行高，避免亚像素累积导致光标与字锤错位。 */
export function lineHeightPx(size: number, ratio: number): number {
  return Math.round(size * ratio)
}
