import { randomBytes } from 'node:crypto'
import { access, copyFile, mkdir, readFile, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { app, dialog, type BrowserWindow } from 'electron'
import type { CustomFont, ImportedFont } from '../../shared/ipc'
import { getSettings, patchSettings } from './settingsStore'
import { isFontMagic, readFamily } from './sfnt'

const MAX_FONT_BYTES = 12 * 1024 * 1024
const FONT_EXT = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2'])

export function fontsDir(): string {
  return join(app.getPath('userData'), 'fonts')
}

export async function listCustomFonts(): Promise<CustomFont[]> {
  const fonts = getSettings().customFonts
  const alive: CustomFont[] = []
  for (const font of fonts) {
    try {
      await access(join(fontsDir(), basename(font.fileName)))
      alive.push(font)
    } catch {
      // 文件被手工删掉：从设置里剔除，不再提示。
    }
  }
  if (alive.length !== fonts.length) await patchSettings({ customFonts: alive })
  return alive
}

export async function readFontBytes(id: string): Promise<Buffer> {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('EINVAL: 非法字体 id')
  const found = getSettings().customFonts.find((font) => font.id === id)
  if (!found) throw new Error('ENOENT: 字体不存在')
  return readFile(join(fontsDir(), basename(found.fileName)))
}

export async function importFont(win: BrowserWindow): Promise<ImportedFont> {
  const result = await dialog.showOpenDialog(win, {
    title: '选择字体文件',
    properties: ['openFile'],
    filters: [{ name: '字体文件', extensions: ['ttf', 'otf', 'ttc', 'woff', 'woff2'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true }

  const source = result.filePaths[0]
  const ext = extname(source).toLowerCase()
  if (!FONT_EXT.has(ext)) throw new Error('EINVAL: 不支持的字体格式')

  const buf = await readFile(source)
  if (buf.length > MAX_FONT_BYTES) throw new Error('ETOOBIG: 字体文件超过 12MB')
  if (!isFontMagic(buf)) throw new Error('EINVAL: 不是有效的字体文件')

  const id = randomBytes(8).toString('hex')
  const fileName = `${id}${ext}`
  await mkdir(fontsDir(), { recursive: true })
  await copyFile(source, join(fontsDir(), fileName))

  const family = readFamily(buf) ?? basename(source, ext)
  const record: CustomFont = { id, family, fileName, addedAt: Date.now() }
  await patchSettings({ customFonts: [...getSettings().customFonts, record] })
  return record
}

export async function deleteFont(id: string): Promise<void> {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('EINVAL: 非法字体 id')
  const fonts = getSettings().customFonts
  const target = fonts.find((font) => font.id === id)
  if (!target) return
  await unlink(join(fontsDir(), basename(target.fileName))).catch(() => undefined)
  await patchSettings({ customFonts: fonts.filter((font) => font.id !== id) })
}
