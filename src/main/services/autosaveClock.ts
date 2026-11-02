import type { BrowserWindow } from 'electron'
import { CH, type AutosaveTick } from '../../shared/ipc'

let timer: ReturnType<typeof setInterval> | null = null
let target: BrowserWindow | null = null

/**
 * 时钟放在主进程：窗口最小化/后台时 Chromium 会把渲染层的定时器节流到分钟级，
 * 只有主进程的 Node 定时器可靠。
 */
export function startAutosaveClock(win: BrowserWindow): void {
  stopAutosaveClock()
  target = win
  timer = setInterval(() => {
    if (!target || target.isDestroyed() || target.webContents.isDestroyed()) return
    const payload: AutosaveTick = { now: Date.now(), reason: 'interval' }
    target.webContents.send(CH.AUTOSAVE_TICK, payload)
  }, 1000)
}

export function stopAutosaveClock(): void {
  if (timer) clearInterval(timer)
  timer = null
  target = null
}

export function tickNow(win: BrowserWindow, reason: AutosaveTick['reason']): void {
  if (win.isDestroyed()) return
  const payload: AutosaveTick = { now: Date.now(), reason }
  win.webContents.send(CH.AUTOSAVE_TICK, payload)
}
