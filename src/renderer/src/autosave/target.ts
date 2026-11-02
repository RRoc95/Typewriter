import { sanitizeFileName, titleFromText } from '../../../shared/text'

/** 渲染层没有 node:path，这里只需处理 Windows 绝对路径的拼接与去尾。 */
export function joinPath(dir: string, name: string): string {
  const base = dir.replace(/[\\/]+$/, '')
  const sep = base.includes('/') && !base.includes('\\') ? '/' : '\\'
  return `${base}${sep}${name}`
}

export function basenameOf(filePath: string): string {
  const parts = filePath.split(/[\\/]+/)
  return parts[parts.length - 1] || filePath
}

export function dirnameOf(filePath: string): string {
  const index = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'))
  return index > 0 ? filePath.slice(0, index) : filePath
}

export type TargetInput = {
  /** 已打开或另存为过的完整路径 */
  filePath: string | null
  /** 用户指定的自动保存目录 */
  fixedDir: string | null
  /** 系统「文档」目录下的默认落点 */
  defaultDir: string
  /** 会话内固定的时间戳，不随 tick 漂移 */
  draftStamp: string
  /** 取自首行的标题 */
  title: string
}

export type TargetResult = {
  path: string
  isDraft: boolean
  directory: string
}

/**
 * 优先级：已有文件路径 → 指定目录 → 文档\打字机 → userData 回落。
 * draftStamp 必须由调用方在会话内固定一次，否则每个 tick 都会产生新文件名。
 */
export function resolveTargetPath(input: TargetInput): TargetResult {
  if (input.filePath) {
    return { path: input.filePath, isDraft: false, directory: dirnameOf(input.filePath) }
  }
  const name = `${sanitizeFileName(input.title || '未命名')}-${input.draftStamp}.txt`
  if (input.fixedDir) {
    const dir = input.fixedDir.replace(/[\\/]+$/, '')
    return { path: joinPath(dir, name), isDraft: true, directory: dir }
  }
  const dir = input.defaultDir.replace(/[\\/]+$/, '')
  return { path: joinPath(dir, name), isDraft: true, directory: dir }
}

export function draftTitle(text: string): string {
  return titleFromText(text, 20) || '未命名'
}
