/**
 * 纸面纹理：复用开源项目的纸纤维配方（2600 条随机纤维 + 同一个 hash），
 * 改成 512×512 的可平铺方块，避免把 512×128 的原图纵向拉伸成长条。
 *
 * 这里刻意不 import textures.js：那个模块依赖 three.js，会把它拖进首屏包。
 */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

let cache: { color: string; url: string } | null = null

export function paperBackground(color: string): string {
  if (cache && cache.color === color) return cache.url

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return ''

  context.fillStyle = color
  context.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 2600; i++) {
    context.fillStyle = `rgba(${90 + hash(i) * 60}, ${60 + hash(i + 1) * 40}, 30, ${hash(i + 2) * 0.05})`
    context.fillRect(hash(i + 3) * 512, hash(i + 4) * 512, 1 + hash(i + 5) * 14, 1 + hash(i + 6) * 2)
  }

  const url = canvas.toDataURL('image/png')
  cache = { color, url }
  return url
}
