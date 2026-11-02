import { describe, expect, it } from 'vitest'
import { commandForKeyInput, formatShortcut, MENU, menuAccelerator, type CommandKeyInput } from '../../src/shared/menu'

const keyInput: CommandKeyInput = {
  type: 'keyDown', key: 's', control: false, meta: false, shift: false, alt: false
}

describe('平台快捷键', () => {
  it('按平台解析主修饰键，避免使用另一系统的按键', () => {
    expect(commandForKeyInput({ ...keyInput, meta: true }, 'darwin')).toBe('save')
    expect(commandForKeyInput({ ...keyInput, control: true }, 'win32')).toBe('save')
    expect(commandForKeyInput({ ...keyInput, control: true }, 'darwin')).toBeUndefined()
    expect(commandForKeyInput({ ...keyInput, meta: true }, 'win32')).toBeUndefined()
  })

  it('主题轮换接受带 Shift 的大小写字母', () => {
    expect(commandForKeyInput({ ...keyInput, key: 't', meta: true, shift: true }, 'darwin')).toBe('themeNext')
    expect(commandForKeyInput({ ...keyInput, key: 'T', control: true, shift: true }, 'win32')).toBe('themeNext')
    expect(commandForKeyInput({ ...keyInput, key: 't', meta: true }, 'darwin')).toBeUndefined()
  })

  it('组字、松键、普通文字和原生编辑角色不被命令层截获', () => {
    expect(commandForKeyInput({ ...keyInput, meta: true, isComposing: true }, 'darwin')).toBeUndefined()
    expect(commandForKeyInput({ ...keyInput, meta: true, type: 'keyUp' }, 'darwin')).toBeUndefined()
    expect(commandForKeyInput(keyInput, 'win32')).toBeUndefined()
    expect(commandForKeyInput({ ...keyInput, key: 'z', meta: true }, 'darwin')).toBeUndefined()
  })

  it('切页使用 Control，额外修饰键不误触发', () => {
    expect(commandForKeyInput({ ...keyInput, key: 'Tab', control: true }, 'darwin')).toBe('nextTab')
    expect(commandForKeyInput({ ...keyInput, key: 'Tab', control: true, shift: true }, 'darwin')).toBe('prevTab')
    expect(commandForKeyInput({ ...keyInput, key: 'Tab', meta: true }, 'darwin')).toBeUndefined()
    expect(commandForKeyInput({ ...keyInput, control: true, alt: true }, 'win32')).toBeUndefined()
  })

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
