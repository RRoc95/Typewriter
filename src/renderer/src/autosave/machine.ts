/**
 * 自动保存状态机：纯函数、零 IO、零定时器，便于把每条迁移都写成测试。
 */

export type Phase = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type AutosaveState = {
  phase: Phase
  /** 最近一次成功落盘的内容哈希 */
  savedHash: string
  /** 正在写入的内容哈希（saving 期间有效） */
  pendingHash: string
  /** 连续失败次数 */
  attempts: number
  nextRetryAt: number
  lastSavedAt: number
  lastError: string | null
  /** 写回代号，用来丢弃过期结果 */
  gen: number
}

export type AutosaveEvent =
  | { t: 'EDIT'; hash: string }
  | { t: 'TICK'; now: number }
  | { t: 'SAVE_START'; hash: string }
  | { t: 'SAVE_OK'; now: number; gen: number; hash: string }
  | { t: 'SAVE_FAIL'; now: number; gen: number; error: string }
  | { t: 'RETRY'; now: number }
  | { t: 'RESET'; hash: string }

export type AutosaveResult = { state: AutosaveState; action: 'none' | 'save' }

export const BACKOFF_MS = [1_000, 3_000, 9_000, 27_000]
export const MAX_ATTEMPTS = 4

export const initialAutosave = (hash = ''): AutosaveState => ({
  phase: 'idle',
  savedHash: hash,
  pendingHash: '',
  attempts: 0,
  nextRetryAt: 0,
  lastSavedAt: 0,
  lastError: null,
  gen: 0
})

export function nextAutosave(state: AutosaveState, event: AutosaveEvent): AutosaveResult {
  switch (event.t) {
    case 'EDIT': {
      // 保存过程中继续编辑：只记下"内容已变"，不回退状态，避免写队列堆积。
      if (state.phase === 'saving') {
        return { state: { ...state, pendingHash: event.hash }, action: 'none' }
      }
      if (event.hash === state.savedHash) {
        return { state: { ...state, phase: 'saved', lastError: null }, action: 'none' }
      }
      return { state: { ...state, phase: 'dirty', lastError: null }, action: 'none' }
    }

    case 'TICK': {
      if (state.phase !== 'dirty') return { state, action: 'none' }
      if (event.now < state.nextRetryAt) return { state, action: 'none' }
      return { state, action: 'save' }
    }

    case 'RETRY': {
      if (state.phase !== 'error' && state.phase !== 'dirty') return { state, action: 'none' }
      if (event.now < state.nextRetryAt) return { state, action: 'none' }
      return { state: { ...state, phase: 'dirty', nextRetryAt: 0 }, action: 'save' }
    }

    case 'SAVE_START': {
      return {
        state: { ...state, phase: 'saving', pendingHash: event.hash, gen: state.gen + 1 },
        action: 'none'
      }
    }

    case 'SAVE_OK': {
      if (event.gen !== state.gen) return { state, action: 'none' }
      const stillDirty = state.pendingHash !== '' && state.pendingHash !== event.hash
      return {
        state: {
          ...state,
          phase: stillDirty ? 'dirty' : 'saved',
          savedHash: event.hash,
          attempts: 0,
          nextRetryAt: 0,
          lastSavedAt: event.now,
          lastError: null
        },
        action: 'none'
      }
    }

    case 'SAVE_FAIL': {
      if (event.gen !== state.gen) return { state, action: 'none' }
      const attempts = state.attempts + 1
      const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)]
      return {
        state: {
          ...state,
          phase: attempts > MAX_ATTEMPTS ? 'error' : 'dirty',
          attempts,
          nextRetryAt: event.now + delay,
          lastError: event.error
        },
        action: 'none'
      }
    }

    case 'RESET': {
      return { state: initialAutosave(event.hash), action: 'none' }
    }

    default:
      return { state, action: 'none' }
  }
}
