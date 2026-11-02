import { describe, expect, it } from 'vitest'
import { pathGuard } from '../../src/main/security/pathGuard'

describe('pathGuard', () => {
  it('拒绝相对路径与含 .. 的路径', () => {
    expect(pathGuard.normalize('a.txt')).toBeNull()
    expect(pathGuard.normalize('C:\\a\\..\\..\\windows\\system32\\x.txt')).toBeNull()
    expect(pathGuard.normalize('C:\\a\\b.txt'.replace('b.txt', '..'))).toBeNull()
  })

  it('拒绝 UNC、设备名与结尾点', () => {
    expect(pathGuard.normalize('\\\\server\\share\\x.txt')).toBeNull()
    expect(pathGuard.normalize('C:\\tmp\\CON.txt')).toBeNull()
    expect(pathGuard.normalize('C:\\tmp\\x.')).toBeNull()
    expect(pathGuard.normalize('C:\\tmp\\x .txt ')).toBeNull()
  })

  it('拒绝非法字符与超长路径', () => {
    expect(pathGuard.normalize('C:\\tmp\\a*b.txt')).toBeNull()
    expect(pathGuard.normalize(`C:\\${'a'.repeat(1200)}\\x.txt`)).toBeNull()
    expect(pathGuard.normalize('C:\\tmp\\a\u0000b.txt')).toBeNull()
  })

  it('接受普通绝对路径并去掉尾部分隔符', () => {
    expect(pathGuard.normalize('C:\\Users\\me\\a.txt')).toBe('C:\\Users\\me\\a.txt')
    expect(pathGuard.normalize('D:\\书稿\\')).toBe('D:\\书稿')
  })

  it('授权根目录后其子路径可写，根外不可写', () => {
    pathGuard.authorizeRoot('D:\\打字机-测试根')
    expect(pathGuard.isAuthorized('D:\\打字机-测试根\\书稿\\a.txt')).toBe(true)
    expect(pathGuard.isAuthorized('D:\\打字机-测试根')).toBe(true)
    expect(pathGuard.isAuthorized('D:\\别的目录\\a.txt')).toBe(false)
    // 前缀相同但不是子目录
    expect(pathGuard.isAuthorized('D:\\打字机-测试根伪造\\a.txt')).toBe(false)
  })

  it('授权单个文件后仅该文件可写', () => {
    pathGuard.authorizeFile('E:\\稿子\\第一章.txt')
    expect(pathGuard.isAuthorized('E:\\稿子\\第一章.txt')).toBe(true)
    expect(pathGuard.isAuthorized('E:\\稿子\\第二章.txt')).toBe(false)
  })

  it('大小写不敏感', () => {
    pathGuard.authorizeFile('F:\\Docs\\Chapter.TXT')
    expect(pathGuard.isAuthorized('f:\\docs\\chapter.txt')).toBe(true)
  })
})
