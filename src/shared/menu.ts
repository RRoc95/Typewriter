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

/** 菜单的唯一真源：原生菜单（负责快捷键）与界面里可见的菜单栏共用这一份。 */
export const MENU: MenuGroupSpec[] = [
  {
    id: 'file',
    label: '文件',
    items: [
      { id: 'new', label: '新建标签页', command: 'new', accelerator: 'Ctrl+N' },
      { id: 'open', label: '打开…', command: 'open', accelerator: 'Ctrl+O' },
      { id: 'sep1', label: '', separator: true },
      { id: 'save', label: '保存', command: 'save', accelerator: 'Ctrl+S' },
      { id: 'saveAs', label: '另存为…', command: 'saveAs', accelerator: 'Ctrl+Shift+S' },
      { id: 'sep2', label: '', separator: true },
      { id: 'close', label: '关闭标签页', command: 'closeTab', accelerator: 'Ctrl+W' },
      { id: 'reveal', label: '在资源管理器中显示', command: 'reveal' },
      { id: 'sep3', label: '', separator: true },
      { id: 'quit', label: '退出', command: 'quit' }
    ]
  },
  {
    id: 'edit',
    label: '编辑',
    items: [
      { id: 'undo', label: '撤销', edit: 'undo', accelerator: 'Ctrl+Z' },
      { id: 'redo', label: '重做', edit: 'redo', accelerator: 'Ctrl+Y' },
      { id: 'sep1', label: '', separator: true },
      { id: 'cut', label: '剪切', edit: 'cut', accelerator: 'Ctrl+X' },
      { id: 'copy', label: '复制', edit: 'copy', accelerator: 'Ctrl+C' },
      { id: 'paste', label: '粘贴', edit: 'paste', accelerator: 'Ctrl+V' },
      { id: 'selectAll', label: '全选', edit: 'selectAll', accelerator: 'Ctrl+A' },
      { id: 'sep2', label: '', separator: true },
      { id: 'find', label: '查找', command: 'find', accelerator: 'Ctrl+F' }
    ]
  },
  {
    id: 'view',
    label: '查看',
    items: [
      { id: 'studio', label: '打字机面板', command: 'studio', accelerator: 'Ctrl+,' },
      { id: 'focus', label: '专注模式', command: 'focus', accelerator: 'Ctrl+Shift+F' },
      { id: 'sep1', label: '', separator: true },
      { id: 'theme', label: '下一套主题', command: 'themeNext', accelerator: 'Ctrl+Shift+T' },
      { id: 'sound', label: '试听音效', command: 'soundTest' },
      { id: 'sep2', label: '', separator: true },
      { id: 'zoomIn', label: '放大字号', command: 'zoomIn', accelerator: 'Ctrl+=' },
      { id: 'zoomOut', label: '缩小字号', command: 'zoomOut', accelerator: 'Ctrl+-' },
      { id: 'zoomReset', label: '重置字号', command: 'resetZoom', accelerator: 'Ctrl+0' },
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
