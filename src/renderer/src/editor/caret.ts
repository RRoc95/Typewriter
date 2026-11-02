/**
 * 光标几何测量：把 textarea 的内容复制到隐藏镜像里量。
 * 纯文本 + 相同字体/宽度/内边距，Chromium 的换行结果与 textarea 一致。
 */

export type CaretGeom = {
  x: number
  y: number
  height: number
  line: number
  col: number
}

let mirror: HTMLDivElement | null = null
let widthCache = 0
let pitchCache: { key: string; advance: number } | null = null

function ensureMirror(): HTMLDivElement {
  if (mirror) return mirror
  const node = document.createElement('div')
  node.className = 'editor-mirror'
  node.setAttribute('aria-hidden', 'true')
  node.style.position = 'fixed'
  node.style.left = '-99999px'
  node.style.top = '0'
  node.style.visibility = 'hidden'
  node.style.pointerEvents = 'none'
  node.style.contain = 'strict'
  document.body.appendChild(node)
  mirror = node
  return node
}

function syncMirror(el: HTMLTextAreaElement, node: HTMLDivElement): void {
  const style = getComputedStyle(el)
  node.style.fontFamily = style.fontFamily
  node.style.fontSize = style.fontSize
  node.style.fontWeight = style.fontWeight
  node.style.fontStyle = style.fontStyle
  node.style.lineHeight = style.lineHeight
  node.style.letterSpacing = style.letterSpacing
  node.style.wordSpacing = style.wordSpacing
  node.style.padding = style.padding
  node.style.border = '0'
  node.style.whiteSpace = 'pre-wrap'
  node.style.overflowWrap = 'break-word'
  node.style.wordBreak = style.wordBreak
  node.style.tabSize = style.tabSize
  node.style.boxSizing = 'border-box'

  const width = el.clientWidth
  if (width !== widthCache) {
    node.style.width = `${width}px`
    widthCache = width
  }
}

export function lineColAt(text: string, offset: number): { line: number; col: number } {
  let line = 0
  let lastBreak = -1
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++
      lastBreak = i
    }
  }
  return { line, col: offset - lastBreak - 1 }
}

/**
 * 返回相对 textarea 内容区（padding 左上角）的坐标。
 * 超长文本（> 60 万字符）放弃逐键精确测量，避免镜像节点重排拖慢输入。
 */
export function measureCaret(el: HTMLTextAreaElement, offset: number): CaretGeom | null {
  const text = el.value
  const { line, col } = lineColAt(text, offset)
  if (text.length > 600_000) return null

  const node = ensureMirror()
  syncMirror(el, node)
  const style = getComputedStyle(el)
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.7

  node.textContent = text.slice(0, offset)
  const marker = document.createElement('span')
  marker.textContent = '\u200b'
  node.appendChild(marker)

  const box = node.getBoundingClientRect()
  const mark = marker.getBoundingClientRect()
  node.textContent = ''

  if (mark.height === 0 && box.height === 0) return null

  const fontHeight = mark.height || lineHeight
  // 内联盒子的 top 是字体盒顶边，行盒还要再补上上下各一半的行距。
  const y = mark.top - box.top - Math.max(0, (lineHeight - fontHeight) / 2)

  return {
    x: mark.left - box.left,
    y,
    height: lineHeight,
    line,
    col
  }
}

const charWidths = new Map<string, number>()

/** 单个字符的前进量：中文是西文的两倍，墨块必须跟着变宽。 */
export function advanceOfChar(el: HTMLTextAreaElement, char: string): number {
  const style = getComputedStyle(el)
  const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${char}`
  const cached = charWidths.get(key)
  if (cached !== undefined) return cached

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let width = advanceOf(el)
  if (ctx && char) {
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const measured = ctx.measureText(char).width
    if (measured > 0) width = measured
  }
  if (charWidths.size > 512) charWidths.clear()
  charWidths.set(key, width)
  return width
}

/** 单字符前进量，用于字锤齿距。 */
export function advanceOf(el: HTMLTextAreaElement): number {
  const style = getComputedStyle(el)
  const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}`
  if (pitchCache && pitchCache.key === key) return pitchCache.advance

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let advance = parseFloat(style.fontSize) * 0.6
  if (ctx) {
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    advance = ctx.measureText('M').width || advance
  }
  pitchCache = { key, advance }
  return advance
}

export function resetMeasurement(): void {
  widthCache = 0
  pitchCache = null
  charWidths.clear()
}
