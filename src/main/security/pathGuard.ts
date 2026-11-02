import { basename, isAbsolute, resolve, sep } from 'node:path'

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

/**
 * 所有来自渲染进程的路径都必须先通过这里。
 * 授权模型：显式授权若干"目录根"与"单个文件"，之后只允许落在其中。
 */
class PathGuard {
  private roots = new Set<string>()
  private files = new Set<string>()

  reset(): void {
    this.roots.clear()
    this.files.clear()
  }

  authorizeRoot(dir: string): void {
    const safe = this.normalize(dir)
    if (safe) this.roots.add(safe)
  }

  authorizeFile(file: string): void {
    const safe = this.normalize(file)
    if (safe) this.files.add(safe)
  }

  /** 返回规范化后的绝对路径；不合法则返回 null。 */
  normalize(input: unknown): string | null {
    if (typeof input !== 'string' || input.length === 0 || input.length > 1024) return null
    if (input.includes('\0')) return null
    if (!isAbsolute(input)) return null
    if (input.startsWith('\\\\')) return null
    const parts = input.split(/[\\/]+/).filter(Boolean)
    for (const part of parts) {
      if (part === '.' || part === '..') return null
      if (/[<>:"|?*]/.test(part) && !/^[A-Za-z]:$/.test(part)) return null
    }
    const name = basename(input)
    if (!name || RESERVED.test(name)) return null
    if (/[. ]$/.test(name)) return null
    const abs = resolve(input)
    return abs.length > 3 && /[\\/]$/.test(abs) ? abs.slice(0, -1) : abs
  }

  isAuthorized(input: unknown): boolean {
    const p = this.normalize(input)
    if (!p) return false
    const lower = p.toLowerCase()
    for (const f of this.files) if (f.toLowerCase() === lower) return true
    for (const root of this.roots) {
      const r = root.toLowerCase().replace(/[\\/]+$/, '')
      if (lower === r || lower.startsWith(r + sep)) return true
    }
    return false
  }
}

export const pathGuard = new PathGuard()
