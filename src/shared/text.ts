/**
 * 纯文本工具：无 DOM、无 Node，渲染层与主进程共用。
 */

export type Eol = 'lf' | 'crlf'

/** 混合换行取多数；无换行视为 lf。 */
export function detectEol(text: string): Eol {
  let crlf = 0
  let lf = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      if (i > 0 && text.charCodeAt(i - 1) === 13) crlf++
      else lf++
    }
  }
  return crlf > lf ? 'crlf' : 'lf'
}

export function toLf(text: string): string {
  return text.indexOf('\r') === -1 ? text : text.replace(/\r\n?/g, '\n')
}

export function toEol(text: string, eol: Eol): string {
  const lf = toLf(text)
  return eol === 'lf' ? lf : lf.replace(/\n/g, '\r\n')
}

/** 去掉可能残留的 BOM 字符。 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** cyrb53：够快够散，用于"内容是否变化"的判定，不做加密用途。 */
export function hashText(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export type TextStats = {
  /** 正文字数：不含空白与换行，含标点（网文口径） */
  chars: number
  /** 词数：中文每字计一词，拉丁/数字连续串计一词 */
  words: number
  /** 非空段落数 */
  paragraphs: number
  /** 预计阅读分钟（300 词/分钟） */
  readMinutes: number
}

function isCjk(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x20000 && cp <= 0x2fa1f)
  )
}

/** 中日韩标点与全角符号：计字但不计词。 */
function isCjkPunct(cp: number): boolean {
  return (cp >= 0x3000 && cp <= 0x303f) || (cp >= 0xff00 && cp <= 0xff65)
}

function isWordChar(cp: number): boolean {
  return (
    (cp >= 0x30 && cp <= 0x39) ||
    (cp >= 0x41 && cp <= 0x5a) ||
    (cp >= 0x61 && cp <= 0x7a) ||
    (cp >= 0xc0 && cp <= 0x24f) ||
    (cp >= 0x370 && cp <= 0x3ff) ||
    (cp >= 0x400 && cp <= 0x4ff)
  )
}

function isSpace(cp: number): boolean {
  return cp === 0x20 || cp === 0x09 || cp === 0x0d || cp === 0x0a || cp === 0xa0 || cp === 0x3000 || cp === 0x2028
}

export function countText(text: string): TextStats {
  let chars = 0
  let words = 0
  let paragraphs = 0
  let inWord = false
  let paraHasContent = false

  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!
    i += cp > 0xffff ? 2 : 1

    if (cp === 0x0a) {
      inWord = false
      if (paraHasContent) {
        paragraphs++
        paraHasContent = false
      }
      continue
    }
    if (isSpace(cp)) {
      inWord = false
      continue
    }

    paraHasContent = true
    chars++

    if (isCjk(cp)) {
      words++
      inWord = false
    } else if (isCjkPunct(cp)) {
      inWord = false
    } else if (isWordChar(cp)) {
      if (!inWord) {
        words++
        inWord = true
      }
    } else {
      words++
      inWord = false
    }
  }
  if (paraHasContent) paragraphs++

  return { chars, words, paragraphs, readMinutes: Math.max(1, Math.ceil(words / 300)) }
}

const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** 生成可用于 Windows 文件名的字符串。 */
export function sanitizeFileName(raw: string, fallback = '未命名'): string {
  let s = raw
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  s = s.replace(/^\.+/, '').replace(/[. ]+$/, '')
  if (!s) s = fallback
  if (WIN_RESERVED.test(s.split('.')[0])) s = `_${s}`
  if (s.length > 100) s = s.slice(0, 100).trim() || fallback
  return s
}

/** 取首行前 n 个字符作为默认文件名。 */
export function titleFromText(text: string, max = 20): string {
  const firstLine = text.split('\n').find((line) => line.trim().length > 0) ?? ''
  const trimmed = firstLine.trim()
  if (!trimmed) return ''
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

export function formatStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
