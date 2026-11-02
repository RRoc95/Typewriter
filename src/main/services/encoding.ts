import type { Encoding, Eol } from '../../shared/ipc'
import { toEol } from '../../shared/text'

export type Decoded = { text: string; encoding: Encoding }

/** 识别 BOM 并解码。无 BOM 一律按 UTF-8。 */
export function decodeBuffer(buf: Buffer): Decoded {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.subarray(3).toString('utf8'), encoding: 'utf8bom' }
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { text: buf.subarray(2).toString('utf16le'), encoding: 'utf16le' }
  }
  return { text: buf.toString('utf8'), encoding: 'utf8' }
}

export function encodeText(text: string, encoding: Encoding, eol: Eol): Buffer {
  const body = toEol(text, eol)
  if (encoding === 'utf8bom') {
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body, 'utf8')])
  }
  if (encoding === 'utf16le') {
    return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, 'utf16le')])
  }
  return Buffer.from(body, 'utf8')
}

/** 前 8KB 里出现 NUL 就当作二进制拒绝。 */
export function looksBinary(buf: Buffer): boolean {
  const limit = Math.min(buf.length, 8192)
  let zeros = 0
  for (let i = 0; i < limit; i++) if (buf[i] === 0) zeros++
  return limit > 0 && zeros / limit > 0.01
}

export function decodeLabel(encoding: Encoding): string {
  return encoding === 'utf16le' ? 'UTF-16LE' : 'UTF-8'
}
