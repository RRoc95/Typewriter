import type { CustomFont } from '../../../shared/ipc'

const loaded = new Map<string, FontFace>()

/**
 * 用户字体：主进程把字节经 IPC 传过来（结构化克隆，不做 base64），
 * 渲染层直接用它构造 FontFace。避免自定义协议在打包后失效。
 */
export async function registerCustomFonts(fonts: CustomFont[]): Promise<CustomFont[]> {
  const alive: CustomFont[] = []
  for (const font of fonts) {
    if (loaded.has(font.id)) {
      alive.push(font)
      continue
    }
    try {
      const response = await window.api.fonts.read(font.id)
      if (!response.ok) continue
      const bytes = response.data
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const face = new FontFace(font.family, buffer)
      await face.load()
      document.fonts.add(face)
      loaded.set(font.id, face)
      alive.push(font)
    } catch {
      // 字体损坏或已被删除：跳过，不影响其他字体。
    }
  }
  return alive
}

export function unregisterCustomFont(id: string, family: string): void {
  const face = loaded.get(id)
  if (face) {
    document.fonts.delete(face)
    loaded.delete(id)
  }
  const stillUsed = [...loaded.values()].some((candidate) => candidate.family === family)
  if (face && !stillUsed) {
    document.fonts.forEach((candidate) => {
      if (candidate.family.replace(/^"|"$/g, '') === family) document.fonts.delete(candidate)
    })
  }
}

export function isRegistered(id: string): boolean {
  return loaded.has(id)
}
