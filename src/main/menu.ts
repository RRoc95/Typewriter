import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'
import { CH, type MenuCommand } from '../shared/ipc'
import { MENU, type MenuItemSpec } from '../shared/menu'
import { getSettings } from './services/settingsStore'

let builder: (() => void) | null = null

const ROLE_BY_EDIT = {
  undo: 'undo',
  redo: 'redo',
  cut: 'cut',
  copy: 'copy',
  paste: 'paste',
  selectAll: 'selectAll'
} as const

/**
 * 原生菜单只负责三件事：快捷键、编辑动作、以及「最近文件」这类动态项。
 * 界面上那个可见的「文件 / 编辑 / 查看」直接复用同一份 MENU 规格。
 */
export function buildMenu(getWindow: () => BrowserWindow | null): void {
  const send = (command: MenuCommand, payload?: string): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(CH.MENU_COMMAND, command, payload)
  }

  const toItem = (spec: MenuItemSpec): MenuItemConstructorOptions => {
    if (spec.separator) return { type: 'separator' }
    if (spec.edit) return { label: spec.label, role: ROLE_BY_EDIT[spec.edit], accelerator: spec.accelerator }

    if (spec.command === 'quit') return { label: spec.label, role: 'quit' }
    if (spec.command === 'fullscreen') return { label: spec.label, role: 'togglefullscreen', accelerator: spec.accelerator }
    if (spec.command === 'about') {
      return {
        label: spec.label,
        click: () => {
          void dialog.showMessageBox({
            type: 'info',
            title: '关于打字机',
            message: `打字机 ${app.getVersion()}`,
            detail: `面向 Windows 的纯文本编辑器。\n\n配置目录：${app.getPath('userData')}\n自动保存目录：${
              getSettings().autosave.fixedDir ?? join(app.getPath('documents'), '打字机')
            }`,
            buttons: ['好']
          })
        }
      }
    }

    return {
      label: spec.label,
      accelerator: spec.accelerator,
      click: () => send(spec.command as MenuCommand)
    }
  }

  const template: MenuItemConstructorOptions[] = MENU.map((group) => {
    const items: MenuItemConstructorOptions[] = group.items.map(toItem)
    if (group.id === 'file') {
      // 最近文件插在「打开…」之后
      const recent = getSettings().recent
      const recentItems: MenuItemConstructorOptions[] =
        recent.length === 0
          ? [{ label: '（暂无）', enabled: false }]
          : recent.slice(0, 10).map((filePath) => ({
              label: filePath.length > 64 ? `…${filePath.slice(-62)}` : filePath,
              click: () => send('open', filePath)
            }))
      items.splice(2, 0, { label: '最近文件', submenu: recentItems })
    }
    return { label: group.label, submenu: items }
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  builder = () => buildMenu(getWindow)
}

/** 最近文件变化后重建菜单。 */
export function refreshMenu(): void {
  builder?.()
}
