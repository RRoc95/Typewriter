import { app, dialog, Menu } from 'electron'
import { join } from 'node:path'
import { CH, type AppInfo, type FindRequest, type ThemeBarRequest } from '../../shared/ipc'
import type { EditAction } from '../../shared/menu'
import { getSettings } from '../services/settingsStore'
import { allowWindowClose, getMainWindow, syncTitleBar } from '../window'
import { ensureAuthorizedDirectory } from './file'
import { handle } from './handle'

let lastQuery = ''

export function registerWinIpc(): void {
  handle<void, { bounds: unknown; maximized: boolean }>(CH.WIN_GET_STATE, () => getSettings().window)

  handle<{ saved: boolean }, null>(CH.WIN_CLOSE_READY, ({ saved }) => {
    if (!saved) return null
    const win = getMainWindow()
    allowWindowClose()
    win?.destroy()
    return null
  })

  handle<{ title: string }, null>(CH.WIN_SET_TITLE, ({ title }) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed() && typeof title === 'string') win.setTitle(title.slice(0, 300))
    return null
  })

  handle<void, AppInfo>(CH.APP_INFO, () => ({
    version: app.getVersion(),
    documentsDir: app.getPath('documents'),
    userDataDir: app.getPath('userData'),
    defaultAutosaveDir: join(app.getPath('documents'), '打字机'),
    isDev: !app.isPackaged
  }))

  handle<ThemeBarRequest, null>(CH.THEME_TITLEBAR, ({ color, symbolColor }) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color) || !/^#[0-9a-fA-F]{6}$/.test(symbolColor)) {
      throw new Error('EINVAL: 颜色格式不符合要求')
    }
    syncTitleBar(color, symbolColor)
    return null
  })

  handle<void, { canceled: true } | { dirPath: string }>(CH.DIALOG_CHOOSE_DIR, async () => {
    const win = getMainWindow()
    const options: Electron.OpenDialogOptions = {
      title: '选择自动保存目录',
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    const dirPath = await ensureAuthorizedDirectory(result.filePaths[0])
    return { dirPath }
  })

  handle<FindRequest, null>(CH.FIND_START, ({ text, forward, findNext }) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return null
    if (!text) {
      win.webContents.stopFindInPage('clearSelection')
      lastQuery = ''
      return null
    }
    lastQuery = text.slice(0, 200)
    win.webContents.findInPage(lastQuery, { forward: forward !== false, findNext: !!findNext })
    return null
  })

  handle<{ forward: boolean }, null>(CH.FIND_NEXT, ({ forward }) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed() || !lastQuery) return null
    win.webContents.findInPage(lastQuery, { forward: forward !== false, findNext: true })
    return null
  })

  handle<void, null>(CH.FIND_STOP, () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) win.webContents.stopFindInPage('clearSelection')
    lastQuery = ''
    return null
  })

  handle<{ action: EditAction }, null>(CH.EDIT_ACTION, ({ action }) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return null
    const contents = win.webContents
    const actions: Record<EditAction, () => void> = {
      undo: () => contents.undo(),
      redo: () => contents.redo(),
      cut: () => contents.cut(),
      copy: () => contents.copy(),
      paste: () => contents.paste(),
      selectAll: () => contents.selectAll()
    }
    actions[action]?.()
    return null
  })

  handle<{ command: 'quit' | 'about' | 'fullscreen' }, null>(CH.APP_COMMAND, ({ command }) => {
    const win = getMainWindow()
    if (command === 'quit') {
      app.quit()
      return null
    }
    if (command === 'fullscreen' && win && !win.isDestroyed()) {
      win.setFullScreen(!win.isFullScreen())
      return null
    }
    if (command === 'about') {
      void dialog.showMessageBox({
        type: 'info',
        title: '关于打字机',
        message: `打字机 ${app.getVersion()}`,
        detail: `面向 Windows 的纯文本编辑器。\n\n配置目录：${app.getPath('userData')}`,
        buttons: ['好']
      })
    }
    return null
  })

  handle<{ hasSelection: boolean }, null>(CH.CONTEXT_MENU, ({ hasSelection }) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return null
    Menu.buildFromTemplate([
      { label: '撤销', role: 'undo' },
      { label: '重做', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', role: 'cut', enabled: !!hasSelection },
      { label: '复制', role: 'copy', enabled: !!hasSelection },
      { label: '粘贴', role: 'paste' },
      { type: 'separator' },
      { label: '全选', role: 'selectAll' },
      { type: 'separator' },
      {
        label: '查找…',
        accelerator: 'CmdOrCtrl+F',
        click: () => win.webContents.send(CH.MENU_COMMAND, 'find')
      }
    ]).popup({ window: win })
    return null
  })
}
