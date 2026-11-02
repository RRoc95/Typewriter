/**
 * sfnt（TTF/OTF/TTC）字体名解析。纯函数，不依赖 Electron，便于单测。
 */

export function isFontMagic(buf: Buffer): boolean {
  if (buf.length < 12) return false
  const tag = buf.toString('ascii', 0, 4)
  const version = buf.readUInt32BE(0)
  return (
    tag === 'OTTO' ||
    tag === 'true' ||
    tag === 'ttcf' ||
    tag === 'wOFF' ||
    tag === 'wOF2' ||
    version === 0x00010000
  )
}

/** 从 name 表读族名；woff/woff2 的表是压缩的，这里不解析，交给调用方用文件名兜底。 */
export function readFamily(buf: Buffer): string | null {
  try {
    let base = 0
    if (buf.toString('ascii', 0, 4) === 'ttcf') base = buf.readUInt32BE(12)

    const numTables = buf.readUInt16BE(base + 4)
    if (numTables <= 0 || numTables > 512) return null

    for (let i = 0; i < numTables; i++) {
      const record = base + 12 + i * 16
      if (record + 16 > buf.length) return null
      if (buf.toString('ascii', record, record + 4) !== 'name') continue

      const nameTable = buf.readUInt32BE(record + 8)
      if (nameTable + 6 > buf.length) return null
      const count = buf.readUInt16BE(nameTable + 2)
      const stringBase = nameTable + buf.readUInt16BE(nameTable + 4)

      for (let j = 0; j < count; j++) {
        const entry = nameTable + 6 + j * 12
        if (entry + 12 > buf.length) break
        const platform = buf.readUInt16BE(entry)
        const encoding = buf.readUInt16BE(entry + 2)
        const nameId = buf.readUInt16BE(entry + 6)
        const length = buf.readUInt16BE(entry + 8)
        const offset = buf.readUInt16BE(entry + 10)
        if (nameId !== 1) continue

        const start = stringBase + offset
        if (start + length > buf.length || length === 0 || length > 512) continue

        let text: string
        if (platform === 3 || platform === 0) {
          const slice = Buffer.from(buf.subarray(start, start + (length & ~1)))
          slice.swap16()
          text = slice.toString('utf16le')
        } else if (platform === 1 && encoding === 0) {
          text = buf.toString('latin1', start, start + length)
        } else {
          continue
        }

        const cleaned = text.replace(/\0/g, '').trim()
        if (cleaned) return cleaned
      }
      return null
    }
  } catch {
    return null
  }
  return null
}
