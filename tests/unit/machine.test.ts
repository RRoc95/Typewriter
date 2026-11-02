import { describe, expect, it } from 'vitest'
import {
  BACKOFF_MS,
  initialAutosave,
  MAX_ATTEMPTS,
  nextAutosave,
  type AutosaveState
} from '../../src/renderer/src/autosave/machine'

const run = (start: AutosaveState, events: Parameters<typeof nextAutosave>[1][]): AutosaveState =>
  events.reduce((state, event) => nextAutosave(state, event).state, start)

describe('自动保存状态机', () => {
  it('初始为 idle，内容变了才转 dirty', () => {
    const base = initialAutosave('h0')
    expect(base.phase).toBe('idle')
    expect(nextAutosave(base, { t: 'EDIT', hash: 'h0' }).state.phase).toBe('saved')
    expect(nextAutosave(base, { t: 'EDIT', hash: 'h1' }).state.phase).toBe('dirty')
  })

  it('只有 dirty 且过了退避时间才触发保存', () => {
    const base = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    expect(nextAutosave(base, { t: 'TICK', now: 0 }).action).toBe('save')
    expect(nextAutosave({ ...base, phase: 'saved' }, { t: 'TICK', now: 1 }).action).toBe('none')
    expect(nextAutosave({ ...base, nextRetryAt: 5000 }, { t: 'TICK', now: 1000 }).action).toBe('none')
  })

  it('保存成功回到 saved 并记录时间', () => {
    let state = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    state = nextAutosave(state, { t: 'SAVE_START', hash: 'a' }).state
    expect(state.phase).toBe('saving')
    expect(state.gen).toBe(1)
    state = nextAutosave(state, { t: 'SAVE_OK', now: 1000, gen: 1, hash: 'a' }).state
    expect(state.phase).toBe('saved')
    expect(state.lastSavedAt).toBe(1000)
    expect(state.savedHash).toBe('a')
  })

  it('过期代号写回被丢弃', () => {
    let state = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    state = nextAutosave(state, { t: 'SAVE_START', hash: 'a' }).state
    const stale = nextAutosave(state, { t: 'SAVE_OK', now: 1000, gen: 0, hash: 'a' }).state
    expect(stale.phase).toBe('saving')
  })

  it('保存期间继续编辑只记 pendingHash，不排队', () => {
    let state = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    state = nextAutosave(state, { t: 'SAVE_START', hash: 'a' }).state
    state = nextAutosave(state, { t: 'EDIT', hash: 'b' }).state
    expect(state.phase).toBe('saving')
    expect(state.pendingHash).toBe('b')
    state = nextAutosave(state, { t: 'SAVE_OK', now: 10, gen: 1, hash: 'a' }).state
    expect(state.phase).toBe('dirty')
    expect(state.savedHash).toBe('a')
  })

  it('连续失败按 1/3/9/27 秒退避，第 5 次转 error', () => {
    let state = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    const delays: number[] = []
    for (let attempt = 1; attempt <= MAX_ATTEMPTS + 1; attempt++) {
      state = nextAutosave(state, { t: 'SAVE_START', hash: 'a' }).state
      const gen = state.gen
      state = nextAutosave(state, { t: 'SAVE_FAIL', now: 100, gen, error: 'EIO' }).state
      delays.push(state.nextRetryAt - 100)
    }
    expect(delays.slice(0, 4)).toEqual(BACKOFF_MS)
    expect(state.phase).toBe('error')
    expect(state.lastError).toBe('EIO')
  })

  it('RETRY 在退避期内被忽略，过期后重新允许保存', () => {
    let state = run(initialAutosave(''), [{ t: 'EDIT', hash: 'a' }])
    state = nextAutosave(state, { t: 'SAVE_START', hash: 'a' }).state
    state = nextAutosave(state, { t: 'SAVE_FAIL', now: 0, gen: 1, error: 'x' }).state
    expect(nextAutosave(state, { t: 'RETRY', now: 10 }).action).toBe('none')
    expect(nextAutosave(state, { t: 'RETRY', now: BACKOFF_MS[0] + 1 }).action).toBe('save')
  })

  it('RESET 清空计数', () => {
    const state = run(initialAutosave(''), [
      { t: 'EDIT', hash: 'a' },
      { t: 'SAVE_START', hash: 'a' },
      { t: 'SAVE_FAIL', now: 0, gen: 1, error: 'x' }
    ])
    const reset = nextAutosave(state, { t: 'RESET', hash: 'z' }).state
    expect(reset.attempts).toBe(0)
    expect(reset.savedHash).toBe('z')
    expect(reset.phase).toBe('idle')
  })
})
