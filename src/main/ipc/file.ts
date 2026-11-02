import { mkdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { dialog, shell, type BrowserWindow } from 'electron'
import {
  CH,
  type FileDoc,
  type SaveRequest,
  type SaveResult,
  type StatResult
} from '../../shared/ipc'
import { MAX_FILE_BYTES } from '../../shared/settings'
import { detectEol, stripBom, toLf } from '../../shared/text'
import { pathGuard } from '../security/pathGuard'
import { atomicWrite } from '../services/atomicWrite'
import { decodeBuffer, encodeText, looksBinary } from '../services/encoding'
import { getSettings, patchSettings } from '../services/settingsStore'
import { handle } from './handle'

export type OpenOutcome = { canceled: true } | FileDoc

export async function readDocument(filePath: string): Promise<FileDoc> {  const safe = pathGuard.normalize(filePath)
  if (!safe) throw new Error('EINVAL: 路径不合法')

  const info = await stat(safe)
  if (!info.isFile()) throw new Error('EINVAL: 不是文件')
  if (info.size > MAX_FILE_BYTES) throw new Error('ETOOBIG: 文件超过 8MB')

  const buf = await readFile(safe)
  if (looksBinary(buf)) throw new Error('EBINARY: 这看起来不是文本文件')

  const { text, encoding } = decodeBuffer(buf)
  const eol = detectEol(text)

  pathGuard.authorizeFile(safe)
  return {
    filePath: safe,
    name: basename(safe),
    text: toLf(stripBom(text)),
    encoding,
    eol,
    mtimeMs: info.mtimeMs,
    size: info.size
  }
}

export function registerFileIpc(getWindow: () => BrowserWindow | null): void {
  handle<void, OpenOutcome>(CH.FILE_OPEN_DIALOG, async () => {
    const win = getWindow()
    const settings = getSettings()
    const options: Electron.OpenDialogOptions = {
      title: '打开文本文件',
      defaultPath: settings.lastDir ?? undefined,
      properties: ['openFile'],
      filters: [
        { name: '文本文件', extensions: ['txt', 'text', 'md', 'log', 'csv'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    const doc = await readDocument(result.filePaths[0])
    await patchSettings({ lastDir: dirname(doc.filePath) })
    return doc
  })

  handle<{ filePath: string }, FileDoc>(CH.FILE_OPEN_PATH, async ({ filePath }) => {
    if (!pathGuard.isAuthorized(filePath)) {
      // 最近文件可能来自上次会话，允许一次校验式授权。
      const info = await stat(filePath).catch(() => null)
      if (!info) throw new Error('ENOENT: 文件不存在或已被移动')
    }
    const doc = await readDocument(filePath)
    await patchSettings({ lastDir: dirname(doc.filePath) })
    return doc
  })

  handle<SaveRequest, SaveResult>(CH.FILE_SAVE, async (req) => {
    const safe = pathGuard.normalize(req.filePath)
    if (!safe || !pathGuard.isAuthorized(safe)) throw new Error('EACCES: 该路径未被授权')
    if (req.text.length > MAX_FILE_BYTES * 4) throw new Error('ETOOBIG: 内容过大')

    if (req.expectMtimeMs !== null) {
      const current = await stat(safe).catch(() => null)
      if (current && Math.abs(current.mtimeMs - req.expectMtimeMs) > 1200) {
        throw new Error('ECONFLICT: 文件已被其他程序修改')
      }
    }

    await mkdir(dirname(safe), { recursive: true })
    const buf = encodeText(req.text, req.encoding, req.eol)
    await atomicWrite(safe, buf)
    const after = await stat(safe)
    return { filePath: safe, mtimeMs: after.mtimeMs, bytes: buf.length }
  })

  handle<{ suggestedName: string }, { canceled: true } | { filePath: string }>(
    CH.FILE_SAVE_AS_DIALOG,
    async ({ suggestedName }) => {
      const win = getWindow()
      const settings = getSettings()
      const options: Electron.SaveDialogOptions = {
        title: '另存为',
        defaultPath: join(settings.lastDir ?? '', sanitize(suggestedName)),
        filters: [{ name: '文本文件', extensions: ['txt'] }]
      }
      const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return { canceled: true }
      const safe = pathGuard.normalize(result.filePath)
      if (!safe) throw new Error('EINVAL: 路径不合法')
      pathGuard.authorizeFile(safe)
      await patchSettings({ lastDir: dirname(safe) })
      return { filePath: safe }
    }
  )

  handle<{ filePath: string }, StatResult>(CH.FILE_STAT, async ({ filePath }) => {
    const safe = pathGuard.normalize(filePath)
    if (!safe) throw new Error('EINVAL: 路径不合法')
    const info = await stat(safe).catch(() => null)
    if (!info) return { exists: false, mtimeMs: 0, size: 0 }
    return { exists: true, mtimeMs: info.mtimeMs, size: info.size }
  })

  handle<{ filePath: string }, null>(CH.FILE_REVEAL, async ({ filePath }) => {
    const safe = pathGuard.normalize(filePath)
    if (!safe || !pathGuard.isAuthorized(safe)) throw new Error('EACCES: 该路径未被授权')
    shell.showItemInFolder(safe)
    return null
  })
}

function sanitize(name: string): string {
  const base = basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ').trim()
  const cleaned = base.replace(/[. ]+$/, '')
  if (!cleaned) return '未命名.txt'
  return cleaned.toLowerCase().endsWith('.txt') ? cleaned : `${cleaned}.txt`
}

export async function ensureAuthorizedDirectory(dir: string): Promise<string> {
  const safe = pathGuard.normalize(dir)
  if (!safe) throw new Error('EINVAL: 目录不合法')
  await mkdir(safe, { recursive: true })
  pathGuard.authorizeRoot(safe)
  return safe
}
