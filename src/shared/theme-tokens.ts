/**
 * 设计令牌：每套主题 = 一组 token；token 拍平成 CSS 自定义属性。
 */

export const ROOM_THEME_IDS = ['hearth-inn', 'rainy-cabin', 'candlelit-study'] as const
export type RoomThemeId = (typeof ROOM_THEME_IDS)[number]

export const THEME_IDS = [
  'paper-ink',
  'midnight-study',
  'moonlit-poetry',
  'sepia-underwood',
  'green-baize',
  ...ROOM_THEME_IDS
] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const TEXTURE_IDS = ['plain', 'laid', 'wove', 'felt', 'parchment', 'grid'] as const
export type TextureId = (typeof TEXTURE_IDS)[number]

export const PAPER_WIDTHS = ['letter', 'full'] as const
export type PaperWidth = (typeof PAPER_WIDTHS)[number]

export type GoboKind = 'none' | 'window' | 'grid'
export type LightSource = 'carriage' | 'desk-lamp' | 'moonlight'

export type ThemeTokens = {
  id: ThemeId
  name: string
  blurb: string
  mode: 'light' | 'dark'
  room: {
    wallTop: string
    wallBottom: string
    desk: string
    vignette: number
    vignetteColor: string
  }
  paper: {
    base: string
    sheen: string
    edge: string
    shadow: string
    textureOpacity: number
  }
  ink: {
    text: string
    muted: string
    caret: string
    selection: string
    composition: string
  }
  metal: {
    body: string
    bodyHi: string
    bodyLo: string
    rail: string
    bar: string
    ribbon: string
    keycap: string
    brass: string
  }
  light: {
    key: string
    intensity: number
    cone: number
    falloff: number
    ambient: string
    gobo: GoboKind
    /** 3D 模型用的光源类型 */
    source: LightSource
  }
  ui: {
    serif: string
    sans: string
    mono: string
    frame: string
    panel: string
    panelBorder: string
    text: string
    textDim: string
    accent: string
  }
}

const SERIF = 'Georgia, "Source Han Serif SC", "Noto Serif SC", SimSun, serif'
const SANS = 'DengXian, "Microsoft YaHei", system-ui, sans-serif'
const MONO = 'Consolas, "Courier New", monospace'

const BASE_THEMES: Record<Exclude<ThemeId, RoomThemeId>, ThemeTokens> = {
  'paper-ink': {
    id: 'paper-ink',
    name: 'Paper & Ink',
    blurb: '象牙洋葱纸，铜制机身，一盏台灯',
    mode: 'light',
    room: { wallTop: '#2A211A', wallBottom: '#171210', desk: '#3A2A1E', vignette: 0.55, vignetteColor: '#0B0806' },
    paper: { base: '#EFE3C8', sheen: '#F7EFDC', edge: '#D8C6A4', shadow: '#20160E', textureOpacity: 0.5 },
    ink: { text: '#1B1713', muted: '#6B5B45', caret: '#2B2117', selection: '#E3C88A', composition: '#8A6B3F' },
    metal: {
      body: '#B0703C',
      bodyHi: '#D99A5E',
      bodyLo: '#6E4322',
      rail: '#C9CDD2',
      bar: '#8C9096',
      ribbon: '#2A2A2C',
      keycap: '#EFE6D4',
      brass: '#C9A227'
    },
    light: { key: '#FFD9A0', intensity: 0.85, cone: 34, falloff: 1.9, ambient: '#6A5540', gobo: 'none', source: 'desk-lamp' },
    ui: {
      serif: SERIF,
      sans: SANS,
      mono: MONO,
      frame: '#1B1713',
      panel: '#221A14',
      panelBorder: '#3B2E23',
      text: '#EDE3CE',
      textDim: '#A08D74',
      accent: '#C9A227'
    }
  },
  'midnight-study': {
    id: 'midnight-study',
    name: 'Midnight Study',
    blurb: '夜纸，深房间，台灯只照亮一页',
    mode: 'dark',
    room: { wallTop: '#0B0F14', wallBottom: '#05070A', desk: '#101418', vignette: 0.78, vignetteColor: '#000000' },
    paper: { base: '#23262B', sheen: '#2C3037', edge: '#181A1E', shadow: '#000000', textureOpacity: 0.35 },
    ink: { text: '#E8E3D6', muted: '#8E8A80', caret: '#F0C27B', selection: '#3C4A5C', composition: '#B58A4E' },
    metal: {
      body: '#6B7076',
      bodyHi: '#9AA1A8',
      bodyLo: '#3A3F45',
      rail: '#8A9099',
      bar: '#5E646B',
      ribbon: '#1B1D20',
      keycap: '#D8D2C4',
      brass: '#8A7A55'
    },
    light: { key: '#FFCF8F', intensity: 0.45, cone: 26, falloff: 2.4, ambient: '#6F8BB0', gobo: 'window', source: 'desk-lamp' },
    ui: {
      serif: SERIF,
      sans: SANS,
      mono: MONO,
      frame: '#080A0D',
      panel: '#101418',
      panelBorder: '#242A31',
      text: '#D9D4C7',
      textDim: '#7C7A72',
      accent: '#F0C27B'
    }
  },
  'moonlit-poetry': {
    id: 'moonlit-poetry',
    name: 'Moonlit Poetry',
    blurb: '冷白直纹纸，月光穿过方窗',
    mode: 'dark',
    room: { wallTop: '#111A2B', wallBottom: '#070C16', desk: '#131D2E', vignette: 0.68, vignetteColor: '#02050B' },
    paper: { base: '#E9EEF5', sheen: '#F4F8FD', edge: '#C9D6E6', shadow: '#0A1424', textureOpacity: 0.4 },
    ink: { text: '#1B2430', muted: '#5C6A7C', caret: '#2C3A4E', selection: '#C2D4EA', composition: '#6E86A4' },
    metal: {
      body: '#8FA0B5',
      bodyHi: '#B9C7D8',
      bodyLo: '#5D6B7C',
      rail: '#C6D2E0',
      bar: '#7E8CA0',
      ribbon: '#232C3A',
      keycap: '#E4EBF3',
      brass: '#A8B6C8'
    },
    light: { key: '#CFE0FF', intensity: 0.55, cone: 48, falloff: 1.6, ambient: '#7E93B5', gobo: 'grid', source: 'moonlight' },
    ui: {
      serif: SERIF,
      sans: SANS,
      mono: MONO,
      frame: '#080C16',
      panel: '#0E1524',
      panelBorder: '#232E42',
      text: '#DCE4EF',
      textDim: '#8593A8',
      accent: '#A8C2E8'
    }
  },
  'sepia-underwood': {
    id: 'sepia-underwood',
    name: 'Sepia Underwood',
    blurb: '泛黄牛皮纸，铸铁重机，强聚光',
    mode: 'light',
    room: { wallTop: '#3B2A1E', wallBottom: '#20150F', desk: '#4A3323', vignette: 0.62, vignetteColor: '#120B06' },
    paper: { base: '#E8DCC0', sheen: '#F3EAD4', edge: '#C9B48C', shadow: '#241A10', textureOpacity: 0.7 },
    ink: { text: '#241D16', muted: '#6E5B45', caret: '#2B2117', selection: '#D9BE86', composition: '#8A6B3F' },
    metal: {
      body: '#4A4A4A',
      bodyHi: '#6E6E6E',
      bodyLo: '#2C2C2C',
      rail: '#9DA2A6',
      bar: '#6C7175',
      ribbon: '#31261A',
      keycap: '#E6DCC6',
      brass: '#C9A227'
    },
    light: { key: '#FFC978', intensity: 0.95, cone: 28, falloff: 2.1, ambient: '#5A4632', gobo: 'none', source: 'desk-lamp' },
    ui: {
      serif: SERIF,
      sans: SANS,
      mono: MONO,
      frame: '#1C1410',
      panel: '#251B14',
      panelBorder: '#423124',
      text: '#EADCC0',
      textDim: '#A89373',
      accent: '#C9A227'
    }
  },
  'green-baize': {
    id: 'green-baize',
    name: 'Green Baize',
    blurb: '绿呢书桌，墨绿珐琅机身，罩灯',
    mode: 'dark',
    room: { wallTop: '#1B3A2B', wallBottom: '#0C1B14', desk: '#22402F', vignette: 0.6, vignetteColor: '#04100A' },
    paper: { base: '#F2E9D6', sheen: '#FBF5E8', edge: '#D6C8AB', shadow: '#0E1F16', textureOpacity: 0.45 },
    ink: { text: '#1E1A15', muted: '#5E5648', caret: '#243A2C', selection: '#CBD8C2', composition: '#6E7A5E' },
    metal: {
      body: '#2F4A3C',
      bodyHi: '#4C6B58',
      bodyLo: '#1B2C23',
      rail: '#B9C2B4',
      bar: '#7B8878',
      ribbon: '#1E2A22',
      keycap: '#E8E2CE',
      brass: '#C9A227'
    },
    light: { key: '#FFE7B8', intensity: 0.7, cone: 40, falloff: 1.8, ambient: '#7A8C6E', gobo: 'none', source: 'carriage' },
    ui: {
      serif: SERIF,
      sans: SANS,
      mono: MONO,
      frame: '#0D1A13',
      panel: '#12251B',
      panelBorder: '#274231',
      text: '#E6E0CE',
      textDim: '#9AA68C',
      accent: '#C9A227'
    }
  }
}

// 木屋主题共享纸面、墨色及机械光照，环境切换不改变打字机本身。
const writingDesk = BASE_THEMES['paper-ink']

export const THEMES: Record<ThemeId, ThemeTokens> = {
  ...BASE_THEMES,
  'hearth-inn': {
    ...writingDesk,
    id: 'hearth-inn',
    name: '炉火旅店',
    blurb: '栗木梁柱，壁炉微光，温暖的写作角落',
    room: { ...writingDesk.room, wallTop: '#352014', vignette: 0.18 },
    ui: {
      ...writingDesk.ui,
      frame: '#28180F', panel: '#2C1C12', panelBorder: '#805127',
      text: '#F3E6CF', textDim: '#CCB393', accent: '#E1AD58'
    }
  },
  'rainy-cabin': {
    ...writingDesk,
    id: 'rainy-cabin',
    name: '雨夜木屋',
    blurb: '窗外细雨，胡桃木墙，灯笼里的暖焰',
    room: { ...writingDesk.room, wallTop: '#28201A', vignette: 0.2 },
    ui: {
      ...writingDesk.ui,
      frame: '#201811', panel: '#251E18', panelBorder: '#6C5033',
      text: '#F0E5D3', textDim: '#C4B39B', accent: '#D3AB6B'
    }
  },
  'candlelit-study': {
    ...writingDesk,
    id: 'candlelit-study',
    name: '烛光书房',
    blurb: '蜂蜜色橡木，铜烛台，安静的一页',
    room: { ...writingDesk.room, wallTop: '#51321D', vignette: 0.12 },
    ui: {
      ...writingDesk.ui,
      frame: '#372314', panel: '#352315', panelBorder: '#8C6033',
      text: '#F8EBD4', textDim: '#D8C09C', accent: '#E8BD78'
    }
  }
}

export const THEME_LIST: ThemeTokens[] = THEME_IDS.map((id) => THEMES[id])

const toKebab = (key: string): string => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

/** 拍平为 [cssVar, value]，渲染层一次性写入 :root。 */
export function flattenTheme(t: ThemeTokens): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const group of ['room', 'paper', 'ink', 'metal', 'light', 'ui'] as const) {
    const values = t[group] as unknown as Record<string, string | number>
    for (const key of Object.keys(values)) {
      const raw = values[key]
      const value = String(raw)
      out.push([`--tw-${group}-${toKebab(key)}`, value])
    }
  }
  return out
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function channelLuminance(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** WCAG 对比度，返回 1–21。 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return (light + 0.05) / (dark + 0.05)
}

export const MIN_INK_CONTRAST = 4.5
