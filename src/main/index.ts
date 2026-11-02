import { app, BrowserWindow, ipcMain, nativeTheme, session } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CH, type FileDoc, type StartupPayload } from '../shared/ipc'
import { registerAllIpc } from './ipc'
import { ensureAuthorizedDirectory, readDocument } from './ipc/file'
import { buildMenu, refreshMenu } from './menu'
import { inspectSession } from './services/session'
import { getSettings, loadSettings } from './services/settingsStore'
import { createMainWindow, getMainWindow, requestQuit } from './window'
import { pathGuard } from './security/pathGuard'

// Hosted runners lack a reliable native GPU. Keep real WebGL rendering in
// automated checks using Chromium's software backend, with the sandbox intact.
if (process.env.TW_E2E === '1' && process.env.CI) {
  app.commandLine.appendSwitch('use-gl', 'angle')
  app.commandLine.appendSwitch('use-angle', 'swiftshader')
  app.commandLine.appendSwitch('enable-unsafe-swiftshader')
  app.commandLine.appendSwitch('force-device-scale-factor', '1')
}

if (process.env.TW_USER_DATA) {
  app.setPath('userData', process.env.TW_USER_DATA)
  if (process.env.TW_E2E === '1') {
    const documents = join(process.env.TW_USER_DATA, 'Documents')
    mkdirSync(documents, { recursive: true })
    app.setPath('documents', documents)
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let startupNotice: StartupPayload['notice'] = null
let startupConsumed = false
let initialized = false
let startupPath = fileArgFrom(process.argv)

function fileArgFrom(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('-')) continue
    if (/\.(txt|text|md|log|csv)$/i.test(arg)) return arg
  }
  return null
}

async function openFileInWindow(target: string): Promise<void> {
  const win = getMainWindow()
  if (!startupConsumed || !win) {
    startupPath = target
    if (initialized && !win) {
      startupConsumed = false
      await createMainWindow(getSettings())
    }
    return
  }
  if (win.isMinimized()) win.restore()
  win.focus()
  const doc = await readDocument(target)
  if (!win.isDestroyed()) win.webContents.send(CH.SHELL_OPEN_FILE, doc)
  refreshMenu()
}

app.on('open-file', (event, target) => {
  event.preventDefault()
  void openFileInWindow(target).catch(() => undefined)
})

app.on('second-instance', (_event, argv) => {
  const target = fileArgFrom(argv)
  if (target) void openFileInWindow(target).catch(() => undefined)
  else {
    const win = getMainWindow()
    if (win?.isMinimized()) win.restore()
    win?.focus()
  }
})

// app.quit() must wait for the same save/confirmation flow as the close button.
app.on('before-quit', (event) => {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    event.preventDefault()
    requestQuit()
  }
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'

  const settings = await loadSettings()

  try {
    await ensureAuthorizedDirectory(settings.autosave.fixedDir ?? join(app.getPath('documents'), '打字机'))
  } catch {
    // 目录不可写不阻塞启动，实际保存时由文件服务返回错误。
  }
  pathGuard.authorizeRoot(app.getPath('userData'))

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  registerAllIpc(getMainWindow)

  startupNotice = await inspectSession()

  // 启动载荷用 invoke 拉取而不是事件推送，避免渲染层订阅晚于发送而丢事件。
  ipcMain.handle(CH.STARTUP, async (): Promise<StartupPayload> => {
    if (startupConsumed) return { notice: null, doc: null }
    startupConsumed = true
    const notice = startupNotice
    const target = startupPath
    startupNotice = null
    startupPath = null
    const doc: FileDoc | null = target ? await readDocument(target).catch(() => null) : null
    return { notice, doc }
  })

  initialized = true
  await createMainWindow(settings)
  buildMenu(getMainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startupConsumed = false
      void createMainWindow(getSettings())
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
