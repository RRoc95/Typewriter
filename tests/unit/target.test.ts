import { describe, expect, it } from 'vitest'
import { basenameOf, dirnameOf, joinPath, resolveTargetPath } from '../../src/renderer/src/autosave/target'

const base = {
  filePath: null,
  fixedDir: null,
  defaultDir: 'C:\\Users\\me\\Documents\\打字机',
  draftStamp: '20261101-030405',
  title: '第一章 雨夜'
}

describe('路径工具', () => {
  it('拼接时去掉尾部反斜杠', () => {
    expect(joinPath('C:\\a\\b\\', 'x.txt')).toBe('C:\\a\\b\\x.txt')
    expect(joinPath('C:/a/b', 'x.txt')).toBe('C:/a/b/x.txt')
  })

  it('取目录与文件名', () => {
    expect(basenameOf('C:\\a\\b.txt')).toBe('b.txt')
    expect(dirnameOf('C:\\a\\b.txt')).toBe('C:\\a')
    expect(dirnameOf('C:/a/b.txt')).toBe('C:/a')
  })
})

describe('resolveTargetPath', () => {
  it('已有文件路径则原地覆盖', () => {
    const result = resolveTargetPath({ ...base, filePath: 'D:\\书稿\\第一章.txt' })
    expect(result.path).toBe('D:\\书稿\\第一章.txt')
    expect(result.isDraft).toBe(false)
    expect(result.directory).toBe('D:\\书稿')
  })

  it('未命名时落到默认目录并带会话时间戳', () => {
    const result = resolveTargetPath(base)
    expect(result.path).toBe('C:\\Users\\me\\Documents\\打字机\\第一章 雨夜-20261101-030405.txt')
    expect(result.isDraft).toBe(true)
  })

  it('指定目录优先于默认目录', () => {
    const result = resolveTargetPath({ ...base, fixedDir: 'E:\\稿子\\' })
    expect(result.path).toBe('E:\\稿子\\第一章 雨夜-20261101-030405.txt')
  })

  it('标题里的非法字符被清理', () => {
    const result = resolveTargetPath({ ...base, title: '第1章:雨夜?' })
    expect(result.path).toContain('第1章 雨夜-')
  })

  it('空标题回落「未命名」', () => {
    expect(resolveTargetPath({ ...base, title: '' }).path).toContain('未命名-')
  })
})
