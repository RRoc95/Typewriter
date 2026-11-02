import type { AppInfo, AutosaveTick } from '../../../shared/ipc'
import { formatStamp, hashText, toEol, formatTime, titleFromText } from '../../../shared/text'
import { activeTab, useAppStore } from '../state/store'
import { initialAutosave, nextAutosave, type AutosaveState } from './machine'
import { draftTitle, resolveTargetPath } from './target'

let state: AutosaveState = initialAutosave('')
let dirty = false
let lastAttemptAt = 0
let inFlight: Promise<boolean> | null = null
let info: AppInfo | null = null
let readText: () => string = () => ''
let draftStamp = formatStamp(Date.now())
let startedAt = Date.now()

function commit(next: AutosaveState): void {
  state = next
  useAppStore.getState().setSave(next)
}

export function initAutosave(appInfo: AppInfo, getText: () => string): void {
  info = appInfo
  readText = getText
  startedAt = Date.now()
  lastAttemptAt = startedAt
  draftStamp = formatStamp(startedAt)
  commit(initialAutosave(''))
}

export function resetAutosave(hash: string): void {
  dirty = false
  lastAttemptAt = Date.now()
  draftStamp = formatStamp(Date.now())
  // 切过来的这一页内容已经在盘上，状态直接算已保存，不要显示『未开始』
  commit({ ...initialAutosave(hash), phase: hash ? 'saved' : 'idle' })
}

export function markChanged(): void {
  dirty = true
  const store = useAppStore.getState()
  store.setDoc({ dirty: true })
  commit(nextAutosave(state, { t: 'EDIT', hash: '~' }).state)
}

export function autosaveState(): AutosaveState {
  return state
}

export function isDirty(): boolean {
  return dirty || state.phase === 'dirty' || state.phase === 'saving'
}

function targetFor(text: string): { path: string; isDraft: boolean } | null {
  const store = useAppStore.getState()
  if (!info) return null
  const doc = store.doc
  const settings = store.settings
  if (!settings) return null
  return resolveTargetPath({
    filePath: doc.filePath,
    fixedDir: settings.autosave.fixedDir,
    defaultDir: info.defaultAutosaveDir,
    draftStamp: activeTab()?.draftStamp ?? draftStamp,
    title: draftTitle(text)
  })
}

async function performSave(force: boolean): Promise<boolean> {
  if (inFlight) {
    if (!force) return false
    // Closing or switching tabs must wait for the current write, then flush
    // any newer text instead of reporting an in-progress save as a failure.
    await inFlight
    return performSave(true)
  }
  const operation = writeSnapshot(force)
  inFlight = operation
  try {
    return await operation
  } finally {
    inFlight = null
  }
}

async function writeSnapshot(force: boolean): Promise<boolean> {
  const store = useAppStore.getState()
  const settings = store.settings
  const doc = store.doc
  if (!settings) return false
  if (!force && !settings.autosave.enabled) return false

  const text = readText()
  const hash = hashText(text)

  if (hash === state.savedHash && !force) {
    dirty = false
    commit(nextAutosave(state, { t: 'EDIT', hash }).state)
    return true
  }

  const target = targetFor(text)
  if (!target) return false

  lastAttemptAt = Date.now()
  commit(nextAutosave(state, { t: 'SAVE_START', hash }).state)
  const gen = state.gen

  const eol = settings.autosave.eol === 'preserve' ? doc.eol : settings.autosave.eol
  const response = await window.api.files.save({
    filePath: target.path,
    text,
    encoding: doc.encoding,
    eol,
    expectMtimeMs: doc.mtimeMs || null
  })

  if (response.ok) {
    const currentHash = hashText(readText())
    dirty = currentHash !== hash
    const saved = nextAutosave(state, { t: 'SAVE_OK', now: Date.now(), gen, hash }).state
    commit(nextAutosave(saved, { t: 'EDIT', hash: currentHash }).state)
    // A fast save may beat the debounced title update. Keep the first-line
    // label for new drafts rather than the timestamped disk filename.
    useAppStore.getState().setDoc({
      filePath: response.data.filePath,
      mtimeMs: response.data.mtimeMs,
      dirty,
      ...(target.isDraft && !doc.filePath ? { name: titleFromText(text, 18) || doc.name } : {})
    })
    if (target.isDraft && !doc.filePath) {
      useAppStore.getState().toast(`已自动保存到 ${response.data.filePath}`)
    }
    void window.api.session.saved({
      draftId: draftStamp,
      targetPath: response.data.filePath,
      hash,
      textLen: text.length,
      startedAt
    })
    return true
  }

  commit(nextAutosave(state, { t: 'SAVE_FAIL', now: Date.now(), gen, error: response.message }).state)

  if (response.code === 'ECONFLICT') {
    useAppStore.getState().toast('文件已被其他程序修改，自动保存已暂停：请另存为或重新打开', 'error')
  } else if (response.code === 'EACCES' && !target.isDraft) {
    useAppStore.getState().toast('没有写入权限，自动保存失败', 'error')
  } else {
    useAppStore.getState().toast(`保存失败：${response.message}`, 'error')
  }
  return false
}

/** 强制保存（Ctrl+S、关窗前）。 */
export function saveDocument(): Promise<boolean> {
  return performSave(true)
}

/** 由主进程时钟驱动，每秒一次。 */
export function runTick(tick: AutosaveTick): void {
  const settings = useAppStore.getState().settings
  if (!settings || !info) return
  if (!settings.autosave.enabled) return
  if (!dirty) return
  if (inFlight) return

  const urgent = tick.reason !== 'interval'
  if (!urgent && Date.now() - lastAttemptAt < settings.autosave.intervalSec * 1000) return
  if (!urgent && state.phase !== 'dirty') return

  void performSave(urgent)
}

export type SaveAsOutcome = 'saved' | 'canceled' | 'failed'

/** 另存为：成功后把当前文档指向新路径，之后的自动保存原地覆盖。 */
export async function saveAs(text: string, suggestedName: string): Promise<SaveAsOutcome> {
  const response = await window.api.files.saveAs(suggestedName)
  if (!response.ok) {
    useAppStore.getState().toast(response.message, 'error')
    return 'failed'
  }
  if ('canceled' in response.data) return 'canceled'

  const filePath = response.data.filePath
  const store = useAppStore.getState()
  const doc = store.doc
  const eol = store.settings?.autosave.eol === 'preserve' ? doc.eol : (store.settings?.autosave.eol ?? doc.eol)

  const result = await window.api.files.save({
    filePath,
    text,
    encoding: doc.encoding,
    eol,
    expectMtimeMs: null
  })
  if (!result.ok) {
    useAppStore.getState().toast(result.message, 'error')
    return 'failed'
  }

  const hash = hashText(text)
  dirty = false
  lastAttemptAt = Date.now()
  commit(nextAutosave(state, { t: 'RESET', hash }).state)
  useAppStore.getState().setDoc({
    filePath: result.data.filePath,
    name: result.data.filePath.split(/[\\/]/).pop() ?? doc.name,
    mtimeMs: result.data.mtimeMs,
    dirty: false
  })
  void window.api.recent.add(result.data.filePath)
  void window.api.session.saved({
    draftId: draftStamp,
    targetPath: result.data.filePath,
    hash,
    textLen: text.length,
    startedAt
  })
  useAppStore.getState().toast(`已保存到 ${result.data.filePath}`)
  return 'saved'
}

export function savedLabel(): string {
  return state.lastSavedAt > 0 ? formatTime(state.lastSavedAt) : ''
}

export { toEol }
