import { describe, expect, it } from 'vitest'
import {
  countText,
  detectEol,
  formatStamp,
  hashText,
  sanitizeFileName,
  titleFromText,
  toEol,
  toLf
} from '../../src/shared/text'

describe('换行处理', () => {
  it('识别 CRLF / LF 并取多数', () => {
    expect(detectEol('a\r\nb\r\nc')).toBe('crlf')
    expect(detectEol('a\nb\nc')).toBe('lf')
    expect(detectEol('a\r\nb\nc\nd')).toBe('lf')
    expect(detectEol('没有换行')).toBe('lf')
  })

  it('统一转 LF 再按目标写回', () => {
    expect(toLf('a\r\nb\rc')).toBe('a\nb\nc')
    expect(toEol('a\nb', 'crlf')).toBe('a\r\nb')
    expect(toEol('a\r\nb', 'lf')).toBe('a\nb')
  })
})

describe('countText', () => {
  it('纯中文每字计一字一词，标点只计字', () => {
    expect(countText('你好，世界')).toEqual({ chars: 5, words: 4, paragraphs: 1, readMinutes: 1 })
  })

  it('英文按词计数', () => {
    const stats = countText('hello world again')
    expect(stats.chars).toBe(15)
    expect(stats.words).toBe(3)
  })

  it('中英混排与数字', () => {
    const stats = countText('我有 3 apples')
    expect(stats.chars).toBe(9)
    expect(stats.words).toBe(4)
  })

  it('空串与纯空白', () => {
    expect(countText('')).toEqual({ chars: 0, words: 0, paragraphs: 0, readMinutes: 1 })
    expect(countText('   \n\n  ')).toEqual({ chars: 0, words: 0, paragraphs: 0, readMinutes: 1 })
  })

  it('段落按连续空行切分', () => {
    const stats = countText('第一段\n\n第二段\n\n\n第三段')
    expect(stats.paragraphs).toBe(3)
  })

  it('emoji 按码点计一个字', () => {
    expect(countText('😀😀').chars).toBe(2)
  })

  it('2MB 文本在 150ms 内算完', () => {
    const text = '雨落在玻璃上，像是有人在很远的地方翻动一页旧纸。\n'.repeat(40_000)
    const start = performance.now()
    countText(text)
    expect(performance.now() - start).toBeLessThan(150)
  })
})

describe('hashText', () => {
  it('同内容同哈希、不同内容不同哈希', () => {
    expect(hashText('abc')).toBe(hashText('abc'))
    expect(hashText('abc')).not.toBe(hashText('abd'))
    expect(hashText('')).toBe(hashText(''))
  })
})

describe('文件名', () => {
  it('清理 Windows 非法字符与结尾点', () => {
    expect(sanitizeFileName('第一章:雨夜?')).toBe('第一章 雨夜')
    expect(sanitizeFileName('a/b\\c*d')).toBe('a b c d')
    expect(sanitizeFileName('trailing. ')).toBe('trailing')
    expect(sanitizeFileName('')).toBe('未命名')
    expect(sanitizeFileName('CON')).toBe('_CON')
  })

  it('超长名截断到 100 字符', () => {
    expect(sanitizeFileName('字'.repeat(300)).length).toBe(100)
  })

  it('标题取首个非空行', () => {
    expect(titleFromText('\n\n  第一章 雨夜  ', 20)).toBe('第一章 雨夜')
    expect(titleFromText('', 20)).toBe('')
  })

  it('时间戳格式固定', () => {
    expect(formatStamp(new Date(2026, 10, 1, 3, 4, 5).getTime())).toBe('20261101-030405')
  })
})
