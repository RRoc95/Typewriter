import { CH, type CustomFont, type ImportedFont } from '../../shared/ipc'
import { deleteFont, importFont, listCustomFonts, readFontBytes } from '../services/fontService'
import type { BrowserWindow } from 'electron'
import { handle } from './handle'

export function registerFontsIpc(getWindow: () => BrowserWindow | null): void {
  handle<void, ImportedFont>(CH.FONTS_IMPORT, async () => {
    const win = getWindow()
    if (!win) throw new Error('EIO: 窗口未就绪')
    return importFont(win)
  })

  handle<void, CustomFont[]>(CH.FONTS_LIST_CUSTOM, () => listCustomFonts())

  handle<{ id: string }, Uint8Array>(CH.FONTS_READ, async ({ id }) => {
    const bytes = await readFontBytes(id)
    return new Uint8Array(bytes)
  })

  handle<{ id: string }, null>(CH.FONTS_DELETE, async ({ id }) => {
    await deleteFont(id)
    return null
  })
}
