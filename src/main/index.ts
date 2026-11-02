import { app, BrowserWindow, ipcMain, nativeTheme, session } from 'electron'
import { join } from 'node:path'
import { CH, type FileDoc, type StartupPayload } from '../shared/ipc'
import { registerAllIpc } from './ipc'
import { ensureAuthorizedDirectory, readDocument } from './ipc/file'
import { buildMenu, refreshMenu } from './menu'
import { inspectSession } from './services/session'
import { loadSettings } from './services/settingsStore'
import { createMainWindow, getMainWindow } from './window'
import { pathGuard } from './security/pathGuard'

if (process.env.TW_USER_DATA) {
  app.setPath('userData', process.env.TW_USER_DATA)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let startupNotice: StartupPayload['notice'] = null
let startupDoc: FileDoc | null = null
let startupConsumed = false

function fileArgFrom(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('-')) continue
    if (/\.(txt|text|md|log|csv)$/i.test(arg)) return arg
  }
  return null
}

app.on('second-instance', (_event, argv) => {
  const win = getMainWindow()
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
  const target = fileArgFrom(argv)
  if (target) {
    void readDocument(target)
      .then((doc) => {
        if (!win.isDestroyed()) win.webContents.send(CH.SHELL_OPEN_FILE, doc)
        refreshMenu()
      })
      .catch(() => undefined)
  }
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'

  const settings = await loadSettings()

  try {
    await ensureAuthorizedDirectory(settings.autosave.fixedDir ?? join(app.getPath('documents'), '打字机'))
  } catch {
    // 文档目录不可写时，自动保存会回落到 userData/drafts，不阻塞启动。
  }
  pathGuard.authorizeRoot(app.getPath('userData'))

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  registerAllIpc(getMainWindow)

  const startupPath = fileArgFrom(process.argv)
  startupNotice = await inspectSession()
  if (startupPath) {
    startupDoc = await readDocument(startupPath).catch(() => null)
  }

  await createMainWindow(settings)

  // 启动载荷用 invoke 拉取而不是事件推送，避免渲染层订阅晚于发送而丢事件。
  ipcMain.handle(CH.STARTUP, async (): Promise<StartupPayload> => {
    if (startupConsumed) return { notice: null, doc: null }
    startupConsumed = true
    return { notice: startupNotice, doc: startupDoc }
  })

  buildMenu(getMainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow(settings)
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
