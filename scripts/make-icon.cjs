const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const SIZES = [16, 24, 32, 48, 64, 128, 256]

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden}
svg{display:block;width:100%;height:100%}
</style></head><body>
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#241a13"/><stop offset="1" stop-color="#0e0a07"/>
    </linearGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7efdc"/><stop offset="1" stop-color="#e6d6b4"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e0a468"/><stop offset="0.5" stop-color="#b0703c"/><stop offset="1" stop-color="#6e4322"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="54" fill="url(#bg)"/>
  <rect x="62" y="34" width="132" height="132" rx="5" fill="url(#sheet)"/>
  <g fill="#241a13" opacity="0.72">
    <rect x="82" y="62" width="70" height="5" rx="2.5"/>
    <rect x="82" y="80" width="92" height="5" rx="2.5"/>
    <rect x="82" y="98" width="58" height="5" rx="2.5"/>
    <rect x="82" y="116" width="80" height="5" rx="2.5"/>
  </g>
  <rect x="82" y="140" width="14" height="12" rx="1.5" fill="#2b2117" opacity="0.85"/>
  <rect x="48" y="158" width="160" height="20" rx="10" fill="url(#metal)"/>
  <rect x="54" y="162" width="148" height="3" fill="#ffffff" opacity="0.3"/>
  <path d="M40 200 Q40 178 64 178 L192 178 Q216 178 216 200 L226 234 L30 234 Z" fill="url(#metal)"/>
  <circle cx="72" cy="206" r="9" fill="#2a2a2c"/>
  <circle cx="184" cy="206" r="9" fill="#2a2a2c"/>
  <circle cx="72" cy="206" r="3" fill="#c9a227" opacity="0.6"/>
  <circle cx="184" cy="206" r="3" fill="#c9a227" opacity="0.6"/>
</svg></body></html>`

function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  let offset = 6 + 16 * entries.length
  const heads = entries.map(([size, png]) => {
    const head = Buffer.alloc(16)
    head.writeUInt8(size >= 256 ? 0 : size, 0)
    head.writeUInt8(size >= 256 ? 0 : size, 1)
    head.writeUInt8(0, 2)
    head.writeUInt8(0, 3)
    head.writeUInt16LE(1, 4)
    head.writeUInt16LE(32, 6)
    head.writeUInt32LE(png.length, 8)
    head.writeUInt32LE(offset, 12)
    offset += png.length
    return head
  })

  return Buffer.concat([header, ...heads, ...entries.map(([, png]) => png)])
}

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: false }
  })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML)}`)
  await new Promise((resolve) => setTimeout(resolve, 600))

  const entries = []
  for (const size of SIZES) {
    win.setContentSize(size, size)
    await new Promise((resolve) => setTimeout(resolve, 90))
    const image = await win.webContents.capturePage()
    entries.push([size, image.resize({ width: size, height: size }).toPNG()])
  }

  const outDir = path.join(__dirname, '..', 'build')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'icon.ico'), buildIco(entries))
  // macOS icon conversion needs a high-resolution source, independent of display DPI.
  win.setContentSize(1024, 1024)
  await new Promise((resolve) => setTimeout(resolve, 90))
  const macIcon = await win.webContents.capturePage()
  fs.writeFileSync(path.join(outDir, 'icon.png'), macIcon.resize({ width: 1024, height: 1024 }).toPNG())
  console.log('icon.ico written', SIZES.join(','))
  app.quit()
})
