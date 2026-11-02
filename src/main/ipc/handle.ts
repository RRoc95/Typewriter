import { ipcMain } from 'electron'
import { fail, ok, type IoCode, type R } from '../../shared/ipc'

const CODES: IoCode[] = [
  'EINVAL',
  'ENOENT',
  'EACCES',
  'ETOOBIG',
  'EBINARY',
  'ELOCKED',
  'ECONFLICT',
  'EIO',
  'ECANCELED'
]

export function toResult(error: unknown): R<never> {
  const message = error instanceof Error ? error.message : String(error)
  const [head, ...rest] = message.split(':')
  const code = (CODES as string[]).includes(head) ? (head as IoCode) : 'EIO'
  const detail = CODES.includes(head as IoCode) ? rest.join(':').trim() : message
  return fail(code, detail || message)
}

/** 统一包装：任何异常都变成 {ok:false}，绝不把堆栈丢给渲染层。 */
export function handle<TArg, TData>(
  channel: string,
  fn: (arg: TArg) => Promise<TData> | TData
): void {
  ipcMain.handle(channel, async (_event, arg: TArg): Promise<R<TData>> => {
    try {
      return ok(await fn(arg))
    } catch (error) {
      return toResult(error) as R<TData>
    }
  })
}
