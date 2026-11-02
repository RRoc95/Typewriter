import type { MenuCommand } from './ipc'

export type EditAction = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'

export type MenuItemSpec = {
  id: string
  label: string
  /** 触发渲染层命令 */
  command?: MenuCommand
  /** 触发原生编辑动作 */
  edit?: EditAction
  accelerator?: string
  separator?: boolean
  danger?: boolean
}

export type MenuGroupSpec = {
  id: 'file' | 'edit' | 'view'
  label: string
  items: MenuItemSpec[]
}

export function menuAccelerator(item: MenuItemSpec, platform: string): string | undefined {
  if (platform === 'darwin' && item.edit === 'redo') return 'CmdOrCtrl+Shift+Z'
  return item.accelerator
}

export function formatShortcut(accelerator: string, platform: string): string {
  if (platform !== 'darwin') return accelerator.replace('CmdOrCtrl', 'Ctrl')
  return accelerator
    .replace('CmdOrCtrl', '⌘')
    .replace('Ctrl', '⌃')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replaceAll('+', '')
}

/** 菜单的唯一真源：原生菜单（负责快捷键）与界面里可见的菜单栏共用这一份。 */
export const MENU: MenuGroupSpec[] = [
  {
    id: 'file',
    label: '文件',
    items: [
      { id: 'new', label: '新建标签页', command: 'new', accelerator: 'CmdOrCtrl+N' },
      { id: 'open', label: '打开…', command: 'open', accelerator: 'CmdOrCtrl+O' },
      { id: 'sep1', label: '', separator: true },
      { id: 'save', label: '保存', command: 'save', accelerator: 'CmdOrCtrl+S' },
      { id: 'saveAs', label: '另存为…', command: 'saveAs', accelerator: 'CmdOrCtrl+Shift+S' },
      { id: 'sep2', label: '', separator: true },
      { id: 'close', label: '关闭标签页', command: 'closeTab', accelerator: 'CmdOrCtrl+W' },
      { id: 'reveal', label: '在文件夹中显示', command: 'reveal' },
      { id: 'sep3', label: '', separator: true },
      { id: 'quit', label: '退出', command: 'quit' }
    ]
  },
  {
    id: 'edit',
    label: '编辑',
    items: [
      { id: 'undo', label: '撤销', edit: 'undo', accelerator: 'CmdOrCtrl+Z' },
      { id: 'redo', label: '重做', edit: 'redo', accelerator: 'CmdOrCtrl+Y' },
      { id: 'sep1', label: '', separator: true },
      { id: 'cut', label: '剪切', edit: 'cut', accelerator: 'CmdOrCtrl+X' },
      { id: 'copy', label: '复制', edit: 'copy', accelerator: 'CmdOrCtrl+C' },
      { id: 'paste', label: '粘贴', edit: 'paste', accelerator: 'CmdOrCtrl+V' },
      { id: 'selectAll', label: '全选', edit: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      { id: 'sep2', label: '', separator: true },
      { id: 'find', label: '查找', command: 'find', accelerator: 'CmdOrCtrl+F' }
    ]
  },
  {
    id: 'view',
    label: '查看',
    items: [
      { id: 'studio', label: '打字机面板', command: 'studio', accelerator: 'CmdOrCtrl+,' },
      { id: 'focus', label: '专注模式', command: 'focus', accelerator: 'CmdOrCtrl+Shift+F' },
      { id: 'sep1', label: '', separator: true },
      { id: 'theme', label: '下一套主题', command: 'themeNext', accelerator: 'CmdOrCtrl+Shift+T' },
      { id: 'sound', label: '试听音效', command: 'soundTest' },
      { id: 'sep2', label: '', separator: true },
      { id: 'zoomIn', label: '放大字号', command: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
      { id: 'zoomOut', label: '缩小字号', command: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
      { id: 'zoomReset', label: '重置字号', command: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
      { id: 'sep3', label: '', separator: true },
      { id: 'fullscreen', label: '全屏', command: 'fullscreen', accelerator: 'F11' },
      { id: 'sep4', label: '', separator: true },
      { id: 'nextTab', label: '下一个标签页', command: 'nextTab', accelerator: 'Ctrl+Tab' },
      { id: 'prevTab', label: '上一个标签页', command: 'prevTab', accelerator: 'Ctrl+Shift+Tab' },
      { id: 'sep5', label: '', separator: true },
      { id: 'about', label: '关于打字机', command: 'about' }
    ]
  }
]
