import { posix, win32 } from 'node:path'

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

/**
 * 所有来自渲染进程的路径都必须先通过这里。
 * 授权模型：显式授权若干"目录根"与"单个文件"，之后只允许落在其中。
 */
export class PathGuard {
  private roots = new Set<string>()
  private files = new Set<string>()
  private readonly paths: typeof posix

  constructor(private readonly platform: NodeJS.Platform = process.platform) {
    this.paths = platform === 'win32' ? win32 : posix
  }

  private key(path: string): string {
    return this.platform === 'win32' ? path.toLowerCase() : path
  }

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
    if (!this.paths.isAbsolute(input)) return null
    if (this.platform === 'win32' && !/^[A-Za-z]:[\\/]/.test(input)) return null
    const parts = input.split(this.platform === 'win32' ? /[\\/]+/ : '/').filter(Boolean)
    for (const part of parts) {
      if (part === '.' || part === '..') return null
      if (this.platform === 'win32' && /[<>:"|?*]/.test(part) && !/^[A-Za-z]:$/.test(part)) return null
    }
    const name = this.paths.basename(input)
    if (this.platform === 'win32' && (RESERVED.test(name) || /[. ]$/.test(name))) return null
    return this.paths.resolve(input)
  }

  isAuthorized(input: unknown): boolean {
    const p = this.normalize(input)
    if (!p) return false
    const key = this.key(p)
    for (const f of this.files) if (this.key(f) === key) return true
    for (const root of this.roots) {
      const r = this.key(root)
      const prefix = r.endsWith(this.paths.sep) ? r : r + this.paths.sep
      if (key === r || key.startsWith(prefix)) return true
    }
    return false
  }
}

export const pathGuard = new PathGuard()
