import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok, type AppInfo, type R, type SaveRequest, type SaveResult } from '../../src/shared/ipc'
import { DEFAULT_SETTINGS } from '../../src/shared/settings'
import { hashText } from '../../src/shared/text'
import { autosaveState, initAutosave, isDirty, markChanged, resetAutosave, runTick, saveDocument } from '../../src/renderer/src/autosave/controller'
import { useAppStore } from '../../src/renderer/src/state/store'

const appInfo: AppInfo = {
  version: '1.0.0', documentsDir: '/test/Documents', userDataDir: '/test/data',
  defaultAutosaveDir: '/test/Documents/打字机', isDev: true
}

let text = ''
const save = vi.fn(async (request: SaveRequest): Promise<R<SaveResult>> =>
  ok({ filePath: request.filePath, mtimeMs: 1000, bytes: request.text.length })
)

function deferredWrite() {
  let resolve!: (result: R<SaveResult>) => void
  const promise = new Promise<R<SaveResult>>((done) => { resolve = done })
  return { promise, resolve }
}

function edit(value: string): void {
  text = value
  markChanged()
}

function tick(): void {
  runTick({ now: Date.now(), reason: 'interval' })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
  text = ''
  save.mockClear()
  vi.stubGlobal('window', {
    api: { files: { save }, session: { saved: vi.fn(async () => ok(null)) } }
  })
  useAppStore.setState({ settings: structuredClone(DEFAULT_SETTINGS), tabs: [], toasts: [] })
  useAppStore.getState().addTab({
    id: 'draft', filePath: null, name: '未命名', encoding: 'utf8', eol: 'lf',
    mtimeMs: 0, dirty: false, draftStamp: '20261102-120000'
  })
  initAutosave(appInfo, () => text)
  resetAutosave(hashText(''))
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('保存控制器', () => {
  it('首次自动保存等待所配置的间隔', async () => {
    edit('草稿')
    vi.advanceTimersByTime(1000)
    tick()
    expect(save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(9000)
    tick()
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(isDirty()).toBe(false)
  })

  it('新草稿保存早于统计更新时仍显示首行标题', async () => {
    edit('第二页内容')
    expect(await saveDocument()).toBe(true)
    expect(useAppStore.getState().doc.name).toBe('第二页内容')
    expect(useAppStore.getState().doc.filePath).toContain('第二页内容-20261102-120000.txt')
  })

  it('显式保存等待正在写盘的自动保存并写入最新内容', async () => {
    const pending = deferredWrite()
    save.mockImplementationOnce(() => pending.promise)
    edit('原文')
    vi.advanceTimersByTime(10000)
    tick()
    edit('保存期间的新内容')
    const closingSave = saveDocument()
    expect(save).toHaveBeenCalledTimes(1)
    pending.resolve(ok({ filePath: '/test/draft.txt', mtimeMs: 1000, bytes: 6 }))
    expect(await closingSave).toBe(true)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][0].text).toBe('保存期间的新内容')
    expect(save.mock.calls[1][0].expectMtimeMs).toBe(1000)
    expect(isDirty()).toBe(false)
  })

  it('保存期间继续编辑保持 dirty，后续 tick 写入新内容', async () => {
    const pending = deferredWrite()
    save.mockImplementationOnce(() => pending.promise)
    edit('原文')
    vi.advanceTimersByTime(10000)
    tick()
    edit('尚未落盘的修改')
    pending.resolve(ok({ filePath: '/test/draft.txt', mtimeMs: 1000, bytes: 6 }))
    await vi.advanceTimersByTimeAsync(0)
    expect(isDirty()).toBe(true)
    expect(useAppStore.getState().doc.dirty).toBe(true)
    expect(autosaveState().phase).toBe('dirty')
    vi.advanceTimersByTime(10000)
    tick()
    await vi.advanceTimersByTimeAsync(0)
    expect(save.mock.calls[1][0].text).toBe('尚未落盘的修改')
    expect(isDirty()).toBe(false)
  })

  it('写入失败仍保留未保存状态，允许显式重试', async () => {
    save.mockResolvedValueOnce(fail('ECONFLICT', '文件已被修改'))
    edit('未保存内容')
    expect(await saveDocument()).toBe(false)
    expect(isDirty()).toBe(true)
    expect(autosaveState().lastError).toBe('文件已被修改')
    expect(await saveDocument()).toBe(true)
    expect(isDirty()).toBe(false)
  })
})
