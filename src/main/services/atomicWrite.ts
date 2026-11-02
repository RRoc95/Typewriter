import { open, rename, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * 同目录临时文件 → 写入 → fsync → rename。
 * 目标被其他程序短暂占用（EPERM/EBUSY）时退避重试，绝不静默丢弃内容。
 */
export async function atomicWrite(target: string, data: Buffer): Promise<void> {
  const dir = dirname(target)
  const tmp = join(dir, `.~tw-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`)

  const handle = await open(tmp, 'w')
  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rename(tmp, target)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') {
        await unlink(tmp).catch(() => undefined)
        throw error
      }
      await sleep(60 * (attempt + 1))
    }
  }

  await unlink(tmp).catch(() => undefined)
  const error = new Error('E_LOCKED') as NodeJS.ErrnoException
  error.code = 'EACCES'
  throw error
}
