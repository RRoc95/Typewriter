import courierPrimeUrl from '@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2?url'
import cutiveMonoUrl from '@fontsource/cutive-mono/files/cutive-mono-latin-400-normal.woff2?url'
import specialEliteUrl from '@fontsource/special-elite/files/special-elite-latin-400-normal.woff2?url'

export type BundledFont = {
  family: string
  url: string
  blurb: string
}

/** 只内置三款 OFL 拉丁字体（合计约 200KB），中文一律走系统字体。 */
export const BUNDLED_FONTS: BundledFont[] = [
  { family: 'Courier Prime', url: courierPrimeUrl, blurb: '打字机衬线等宽' },
  { family: 'Special Elite', url: specialEliteUrl, blurb: '打字体噪点质感' },
  { family: 'Cutive Mono', url: cutiveMonoUrl, blurb: '轻复古等宽' }
]

export async function registerBundledFonts(): Promise<void> {
  await Promise.all(
    BUNDLED_FONTS.map(async (font) => {
      try {
        const face = new FontFace(font.family, `url("${font.url}") format("woff2")`)
        await face.load()
        document.fonts.add(face)
      } catch {
        // 字体加载失败就退回系统字体，不阻塞启动。
      }
    })
  )
}
