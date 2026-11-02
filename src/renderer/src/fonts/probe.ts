/**
 * 系统字体探测：canvas 度量对比法。
 * 与 monospace 兜底宽度不同即认为该字族存在；双字号 + 混合串降低误判。
 */
const CANDIDATES = [
  'SimSun',
  'KaiTi',
  'FangSong',
  'SimHei',
  'DengXian',
  'Microsoft YaHei',
  'Noto Serif SC',
  'Noto Sans SC',
  'Source Han Serif SC',
  'STKaiti',
  'STFangsong',
  'Songti SC',
  'PingFang SC',
  'Heiti SC',
  'Menlo',
  'Monaco',
  'Consolas',
  'Courier New',
  'Cascadia Mono',
  'Georgia',
  'Times New Roman',
  'Palatino Linotype',
  'Book Antiqua',
  'Cambria',
  'Garamond',
  'Baskerville',
  'Constantia',
  'Old English Text MT'
]

/** 中文优先排序，便于用户先看到能排中文的字体。 */
const CJK_HINTS = /Sim|Kai|Fang|Hei|Deng|YaHei|Han|Noto|Songti|ST/i

let cache: string[] | null = null

function exists(ctx: CanvasRenderingContext2D, family: string): boolean {
  const sample = 'mmmmmmmmmmlli永永永'
  ctx.font = '72px monospace'
  const base = ctx.measureText(sample).width
  ctx.font = '48px monospace'
  const baseSmall = ctx.measureText(sample).width

  ctx.font = `72px "__tw_missing__", monospace`
  const miss = ctx.measureText(sample).width
  ctx.font = `48px "__tw_missing__", monospace`
  const missSmall = ctx.measureText(sample).width

  ctx.font = `72px "${family}", monospace`
  const big = ctx.measureText(sample).width
  ctx.font = `48px "${family}", monospace`
  const small = ctx.measureText(sample).width

  return (big !== miss || big !== base) && (small !== missSmall || small !== baseSmall)
}

export function detectSystemFonts(): string[] {
  if (cache) return cache
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const found = CANDIDATES.filter((family) => exists(ctx, family))
  const sorted = [
    ...found.filter((f) => CJK_HINTS.test(f)),
    ...found.filter((f) => !CJK_HINTS.test(f))
  ]
  cache = sorted
  return sorted
}

export function resetSystemFonts(): void {
  cache = null
}
