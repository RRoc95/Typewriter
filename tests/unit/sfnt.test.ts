import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isFontMagic, readFamily } from '../../src/main/services/sfnt'

const TTF = ['C:\\Windows\\Fonts\\georgia.ttf', 'C:\\Windows\\Fonts\\consola.ttf', '/System/Library/Fonts/Supplemental/Georgia.ttf'].find((file) =>
  existsSync(file)
)
const TTC = ['C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\msyh.ttc', '/System/Library/Fonts/PingFang.ttc'].find((file) =>
  existsSync(file)
)

describe('sfnt 字体解析', () => {
  it('识别合法与非法魔数', () => {
    expect(isFontMagic(Buffer.from([0x00, 0x01, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true)
    expect(isFontMagic(Buffer.from('OTTO00000000'))).toBe(true)
    expect(isFontMagic(Buffer.from('ttcf00000000'))).toBe(true)
    expect(isFontMagic(Buffer.from('wOF200000000'))).toBe(true)
    expect(isFontMagic(Buffer.from('这是一个文本文件'))).toBe(false)
    expect(isFontMagic(Buffer.from('abc'))).toBe(false)
  })

  it.runIf(!!TTF)('从真实 ttf 读出族名', () => {
    const family = readFamily(readFileSync(TTF!))
    expect(family).toBeTruthy()
    expect(family!.length).toBeGreaterThan(1)
    expect(family).not.toMatch(/\uFFFD/)
  })

  it.runIf(!!TTC)('从字体集合 ttc 读出第一套族名', () => {
    const family = readFamily(readFileSync(TTC!))
    expect(family).toBeTruthy()
  })

  it('损坏数据不会抛异常', () => {
    expect(readFamily(Buffer.from([0x00, 0x01, 0x00, 0x00, 0xff, 0xff]))).toBeNull()
    expect(readFamily(Buffer.alloc(0))).toBeNull()
  })
})
