import { advanceOf, advanceOfChar, lineColAt, measureCaret } from './caret'
import { createImeGuard } from './imeGuard'

export type StrikeKind = 'char' | 'space' | 'enter' | 'backspace' | 'tab' | 'paste'

export type CaretSnapshot = {
  /** 相对 textarea 内容区（padding 左上角）的坐标，不含滚动 */
  x: number
  y: number
  height: number
  line: number
  col: number
  advance: number
  scrollTop: number
  /** -1 左 … 1 右，供声音定位 */
  pan: number
}

export type StrikeInfo = {
  kind: StrikeKind
  char: string
  caret: CaretSnapshot | null
}

export type EngineHooks = {
  onStrike?: (info: StrikeInfo) => void
  onCaret?: (caret: CaretSnapshot | null) => void
  onChange?: () => void
  onBell?: () => void
  onCarriageReturn?: () => void
  onScroll?: (ratio: number, velocity: number) => void
}

export type Engine = {
  attach: (el: HTMLTextAreaElement) => void
  detach: () => void
  caret: () => CaretSnapshot | null
  setText: (text: string, caretOffset?: number) => void
  reset: () => void
  composing: () => boolean
  /** 版面变化（侧栏开合、缩放）后强制重新测量。 */
  refresh: () => void
}

const MARGIN_COL = 68
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

export function createEngine(hooks: EngineHooks): Engine {
  let el: HTMLTextAreaElement | null = null
  const ime = createImeGuard()
  let lastCaret: CaretSnapshot | null = null
  let pendingInput: { type: string; data: string } | null = null
  let bellLines = new Set<number>()
  let raf = 0
  let resizeObserver: ResizeObserver | null = null
  let lastScrollTop = 0
  let scrollRaf = 0

  function computeCaret(): CaretSnapshot | null {
    const node = el
    if (!node) return null
    const geom = measureCaret(node, node.selectionStart)
    if (!geom) return null
    const offset = node.selectionStart
    const value = node.value
    const atCaret = value.slice(offset, offset + 1) || value.slice(Math.max(0, offset - 1), offset)
    const advance = atCaret && atCaret !== '\n' ? advanceOfChar(node, atCaret) : advanceOf(node)
    const width = Math.max(1, node.clientWidth)
    return {
      x: geom.x,
      y: geom.y,
      height: geom.height,
      line: geom.line,
      col: geom.col,
      advance,
      scrollTop: node.scrollTop,
      pan: clamp((geom.x / width) * 2 - 1, -1, 1) * 0.75
    }
  }

  function emitCaret(): void {
    raf = 0
    if (!el) return
    lastCaret = computeCaret()
    hooks.onCaret?.(lastCaret)
  }

  function scheduleCaret(): void {
    if (raf) return
    raf = requestAnimationFrame(emitCaret)
  }

  function handleBeforeInput(event: Event): void {
    const e = event as InputEvent
    pendingInput = { type: e.inputType, data: e.data ?? '' }
  }

  function handleInput(event: Event): void {
    const node = el
    if (!node) return
    const e = event as InputEvent
    const pending = pendingInput
    pendingInput = null

    if (ime.composing || e.isComposing) {
      // 组字过程中只刷新光标，不发声、不置脏、不画墨迹。
      scheduleCaret()
      return
    }

    const before = lastCaret
    const type = pending?.type ?? e.inputType
    const data = pending?.data ?? e.data ?? ''

    let kind: StrikeKind = 'char'
    if (type === 'insertParagraph' || type === 'insertLineBreak' || data.includes('\n')) kind = 'enter'
    else if (type.startsWith('delete')) kind = 'backspace'
    else if (type === 'insertFromPaste' || type === 'insertFromDrop') kind = 'paste'
    else if (data === ' ') kind = 'space'
    else if (data === '\t') kind = 'tab'

    hooks.onChange?.()
    emitCaret()

    if (kind === 'enter') {
      bellLines = new Set() // 换行后重新计列
      hooks.onCarriageReturn?.()
    }

    const char = kind === 'enter' ? '\n' : data.slice(-1)
    hooks.onStrike?.({ kind, char, caret: before })

    if (lastCaret && hooks.onBell) {
      if (lastCaret.col >= MARGIN_COL && !bellLines.has(lastCaret.line)) {
        bellLines.add(lastCaret.line)
        hooks.onBell()
      }
    }
  }

  function handleCompositionEnd(): void {
    ime.end()
    const node = el
    if (!node) return
    const before = lastCaret
    hooks.onChange?.()
    emitCaret()
    const end = node.selectionStart
    const char = node.value.slice(Math.max(0, end - 1), end)
    hooks.onStrike?.({ kind: 'char', char, caret: before })
  }

  function handleScroll(): void {
    const node = el
    if (!node) return
    const max = Math.max(1, node.scrollHeight - node.clientHeight)
    const ratio = node.scrollTop / max
    const velocity = node.scrollTop - lastScrollTop
    lastScrollTop = node.scrollTop
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        hooks.onScroll?.(ratio, velocity)
        scheduleCaret()
      })
    }
  }

  function handleSelectionChange(): void {
    if (!el) return
    if (document.activeElement !== el) return
    scheduleCaret()
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const node = el
    if (!node || ime.composing) return
    if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault()
      document.execCommand('insertText', false, '\t')
    }
  }

  function attach(node: HTMLTextAreaElement): void {
    el = node
    node.addEventListener('beforeinput', handleBeforeInput)
    node.addEventListener('input', handleInput)
    node.addEventListener('scroll', handleScroll, { passive: true })
    node.addEventListener('keydown', handleKeyDown)
    node.addEventListener('compositionstart', ime.start)
    node.addEventListener('compositionend', handleCompositionEnd)
    document.addEventListener('selectionchange', handleSelectionChange)
    resizeObserver = new ResizeObserver(() => scheduleCaret())
    resizeObserver.observe(node)
    lastScrollTop = node.scrollTop
    scheduleCaret()
  }

  function detach(): void {
    if (!el) return
    el.removeEventListener('beforeinput', handleBeforeInput)
    el.removeEventListener('input', handleInput)
    el.removeEventListener('scroll', handleScroll)
    el.removeEventListener('keydown', handleKeyDown)
    el.removeEventListener('compositionstart', ime.start)
    el.removeEventListener('compositionend', handleCompositionEnd)
    document.removeEventListener('selectionchange', handleSelectionChange)
    resizeObserver?.disconnect()
    resizeObserver = null
    el = null
  }

  function setText(text: string, caretOffset?: number): void {
    const node = el
    if (!node) return
    node.value = text
    const offset = caretOffset ?? text.length
    node.setSelectionRange(offset, offset)
    bellLines = new Set()
    lastCaret = null
    emitCaret()
  }

  return {
    attach,
    detach,
    caret: () => lastCaret,
    setText,
    reset: () => {
      bellLines = new Set()
      lastCaret = null
    },
    composing: () => ime.composing,
    refresh: () => emitCaret()
  }
}

export { lineColAt }
