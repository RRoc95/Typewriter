import { CH, type MenuCommand } from '../../shared/ipc'
import { registerFileIpc } from './file'
import { registerFontsIpc } from './fonts'
import { registerSettingsIpc } from './settings'
import { registerWinIpc } from './win'
import type { BrowserWindow } from 'electron'

export function registerAllIpc(getWindow: () => BrowserWindow | null): void {
  registerFileIpc(getWindow)
  registerSettingsIpc()
  registerFontsIpc(getWindow)
  registerWinIpc()
}

export { CH }
export type { MenuCommand }
