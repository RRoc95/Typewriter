/**
 * 输入法保护。规则只有两条，但都很硬：
 * 1. 组字期间不触发音效、字锤、脏标记——否则每敲一个拼音字母都会响一次。
 * 2. 组字期间拒绝任何程序化写值（打开文件、恢复、查找定位），否则会把组字打断、丢字。
 */
export type ImeGuard = {
  readonly composing: boolean
  start: () => void
  end: () => void
  guard: <T>(fn: () => T, fallback: T) => T
}

export function createImeGuard(): ImeGuard {
  let composing = false
  return {
    get composing() {
      return composing
    },
    start() {
      composing = true
    },
    end() {
      composing = false
    },
    guard<T>(fn: () => T, fallback: T): T {
      return composing ? fallback : fn()
    }
  }
}
