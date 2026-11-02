import { describe, expect, it } from 'vitest'
import { formatShortcut, MENU, menuAccelerator } from '../../src/shared/menu'

describe('平台快捷键', () => {
  it('文件操作使用 Command/Ctrl，切页继续使用 Control', () => {
    const items = MENU.flatMap((group) => group.items)
    expect(items.find((item) => item.command === 'save')?.accelerator).toBe('CmdOrCtrl+S')
    expect(items.find((item) => item.command === 'nextTab')?.accelerator).toBe('Ctrl+Tab')
  })

  it('Mac 重做使用 Command+Shift+Z，Windows 保留 Ctrl+Y', () => {
    const redo = MENU.flatMap((group) => group.items).find((item) => item.edit === 'redo')!
    expect(menuAccelerator(redo, 'darwin')).toBe('CmdOrCtrl+Shift+Z')
    expect(menuAccelerator(redo, 'win32')).toBe('CmdOrCtrl+Y')
  })

  it('界面显示平台实际使用的修饰键', () => {
    expect(formatShortcut('CmdOrCtrl+S', 'darwin')).toBe('⌘S')
    expect(formatShortcut('CmdOrCtrl+Shift+Z', 'darwin')).toBe('⌘⇧Z')
    expect(formatShortcut('Ctrl+Tab', 'darwin')).toBe('⌃Tab')
    expect(formatShortcut('CmdOrCtrl+S', 'win32')).toBe('Ctrl+S')
  })
})
