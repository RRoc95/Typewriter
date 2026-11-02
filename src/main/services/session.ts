import { app } from 'electron'
import { readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { SessionNotice } from '../../shared/ipc'
import { hashText } from '../../shared/text'
import { atomicWrite } from './atomicWrite'

type SessionRecord = {
  pid: number
  startedAt: number
  draftId: string
  targetPath: string | null
  lastSavedAt: number
  hash: string
  textLen: number
}

function sessionPath(): string {
  return join(app.getPath('userData'), 'session.json')
}

export async function writeSession(record: SessionRecord): Promise<void> {
  await atomicWrite(sessionPath(), Buffer.from(JSON.stringify(record), 'utf8')).catch(() => undefined)
}

export async function clearSession(): Promise<void> {
  await unlink(sessionPath()).catch(() => undefined)
}

/**
 * 启动时调用：若哨兵还在，说明上次非正常退出。
 * 只判断"目标文件是否就是上次保存的内容"，不做全量备份，避免写放大。
 */
export async function inspectSession(): Promise<SessionNotice | null> {
  let record: SessionRecord
  try {
    record = JSON.parse(await readFile(sessionPath(), 'utf8')) as SessionRecord
  } catch {
    return null
  }

  if (!record.targetPath) {
    await clearSession()
    return null
  }

  try {
    const content = await readFile(record.targetPath, 'utf8')
    if (hashText(content) === record.hash) {
      await clearSession()
      return null
    }
    return { kind: 'interrupted', targetPath: record.targetPath, recoverable: true }
  } catch {
    return { kind: 'interrupted', targetPath: record.targetPath, recoverable: false }
  }
}
