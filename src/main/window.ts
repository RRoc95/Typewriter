import { join } from 'node:path'
import { app, BrowserWindow, screen, shell } from 'electron'
import { CH } from '../shared/ipc'
import type { Bounds, SettingsV1 } from '../shared/settings'
import { THEMES } from '../shared/theme-tokens'
import { pathGuard } from './security/pathGuard'
import { startAutosaveClock, stopAutosaveClock, tickNow } from './services/autosaveClock'
import { patchSettings } from './services/settingsStore'

let mainWindow: BrowserWindow | null = null
let closeAllowed = false
let quitRequested = false

export const getMainWindow = (): BrowserWindow | null => mainWindow

export function requestQuit(): void {
  quitRequested = true
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
  else app.quit()
}

export function finishWindowClose(saved: boolean): void {
  if (!saved) {
    quitRequested = false
    return
  }
  closeAllowed = true
  mainWindow?.destroy()
  if (quitRequested) app.quit()
}

function visibleBounds(saved: Bounds | null): Bounds | null {
  if (!saved) return null
  const displays = screen.getAllDisplays()
  const visible = displays.some((display) => {
    const area = display.workArea
    const overlapX = Math.min(saved.x + saved.width, area.x + area.width) - Math.max(saved.x, area.x)
    const overlapY = Math.min(saved.y + saved.height, area.y + area.height) - Math.max(saved.y, area.y)
    return overlapX > 120 && overlapY > 80
  })
  return visible ? saved : null
}

export async function createMainWindow(settings: SettingsV1): Promise<BrowserWindow> {
  const bounds = visibleBounds(settings.window.bounds)
  const theme = THEMES[settings.theme]

  const win = new BrowserWindow({
    width: bounds?.width ?? 1120,
    height: bounds?.height ?? 780,
    ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 720,
    minHeight: 520,
    show: false,
    backgroundColor: theme.room.wallBottom,
    title: '打字机',
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 14, y: 12 } }
      : { titleBarOverlay: { color: theme.ui.frame, symbolColor: theme.ui.text, height: 40 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  })

  mainWindow = win
  closeAllowed = false

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => {
    // 没有这道闸，把 txt 拖进窗口会让整个应用导航过去。
    event.preventDefault()
  })
  win.webContents.on('will-attach-webview', (event) => event.preventDefault())

  win.webContents.on('found-in-page', (_event, result) => {
    if (win.isDestroyed()) return
    win.webContents.send(CH.FIND_RESULT, {
      active: true,
      matches: result.matches,
      ordinal: result.activeMatchOrdinal,
      finalUpdate: result.finalUpdate
    })
  })

  win.once('ready-to-show', () => {
    if (settings.window.maximized) win.maximize()
    win.show()
    // 启动耗时打点（仅诊断用，设置 TW_BOOT_MARK 时写一个时间戳文件）
    const mark = process.env.TW_BOOT_MARK
    if (mark) {
      void import('node:fs/promises')
        .then((fs) => fs.writeFile(mark, String(Date.now())))
        .catch(() => undefined)
    }
  })

  win.on('blur', () => {
    if (!win.isDestroyed()) tickNow(win, 'blur')
  })

  win.on('close', (event) => {
    if (closeAllowed) return
    event.preventDefault()
    if (!win.isDestroyed()) win.webContents.send(CH.WIN_REQUEST_CLOSE)
  })

  win.on('closed', () => {
    stopAutosaveClock()
    mainWindow = null
  })

  // 窗口矩形记忆
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const rememberBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (!win || win.isDestroyed() || win.isMinimized()) return
      void patchSettings({
        window: { bounds: win.getNormalBounds(), maximized: win.isMaximized() }
      })
    }, 500)
  }
  win.on('resize', rememberBounds)
  win.on('move', rememberBounds)
  win.on('maximize', rememberBounds)
  win.on('unmaximize', rememberBounds)

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) await win.loadURL(devUrl)
  else await win.loadFile(join(__dirname, '../renderer/index.html'))

  startAutosaveClock(win)
  return win
}

export function syncTitleBar(color: string, symbolColor: string): void {
  if (process.platform !== 'win32' || !mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setTitleBarOverlay({ color, symbolColor, height: 40 })
}

export function revealPath(filePath: string): void {
  if (pathGuard.isAuthorized(filePath)) shell.showItemInFolder(filePath)
}
