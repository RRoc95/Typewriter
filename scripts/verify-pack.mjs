import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron } from '@playwright/test'

const defaultExecutable = process.platform === 'darwin'
  ? join('release', process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'Typewriter.app', 'Contents', 'MacOS', 'Typewriter')
  : 'release/win-unpacked/Typewriter.exe'
const executablePath = process.argv[2] ?? defaultExecutable
const userData = await mkdtemp(join(tmpdir(), 'tw-verify-'))
const env = { ...process.env, TW_USER_DATA: userData, TW_E2E: '1' }
delete env.ELECTRON_RUN_AS_NODE
delete env.NODE_OPTIONS

const failures = []
const app = await electron.launch({ executablePath, args: [], env })
const win = await app.firstWindow()

win.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console: ${message.text()}`)
})
win.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))

await win.waitForSelector('[data-testid="editor"]', { timeout: 45_000 })
await win.locator('[data-testid="editor"]').click()
await win.keyboard.insertText('打包产物验证')
await win.waitForTimeout(900)

const windows = await app.evaluate(({ BrowserWindow }) =>
  BrowserWindow.getAllWindows().map((w) => ({
    visible: w.isVisible(),
    title: w.getTitle(),
    width: w.getBounds().width,
    height: w.getBounds().height
  }))
)

const report = await win.evaluate(async () => {
  const root = getComputedStyle(document.documentElement)
  const canvas = document.querySelector('.machine-canvas')
  const context = canvas?.dataset.webgl === 'true' ? canvas.getContext('webgl2') : null
  await document.fonts.ready
  return {
    value: document.querySelector('[data-testid="editor"]').value,
    paperBase: root.getPropertyValue('--tw-paper-base').trim(),
    inkText: root.getPropertyValue('--tw-ink-text').trim(),
    courier: document.fonts.check('16px "Courier Prime"'),
    specialElite: document.fonts.check('16px "Special Elite"'),
    caretVisible: document.querySelector('.caret-block').dataset.visible,
    machine: canvas ? {
      w: canvas.clientWidth,
      h: canvas.clientHeight,
      webgl: !!context && !context.isContextLost(),
      quality: canvas.dataset.quality,
      renderer: canvas.dataset.renderer
    } : null,
    fontFaces: document.fonts.size,
    welcomeHidden: document.querySelector('.welcome').dataset.show === 'false',
    stats: document.querySelector('.statusbar').textContent.trim().slice(0, 24)
  }
})

await mkdir('artifacts', { recursive: true })
await win.screenshot({ path: 'artifacts/packaged.png' })
await app.close()

const checks = [
  ['主窗口已显示', windows.length === 1 && windows[0].visible === true],
  ['窗口标题正确', (windows[0]?.title ?? '').includes('打字机')],
  ['编辑器可输入', report.value === '打包产物验证'],
  ['主题变量生效', report.paperBase.length === 7 && report.inkText.length === 7],
  ['内置字体已加载', report.courier === true],
  ['Special Elite 已加载', report.specialElite === true],
  ['墨块光标已定位', report.caretVisible === 'true'],
  ['3D 机身已挂载', !!report.machine && report.machine.w > 100 && report.machine.webgl],
  ['字体资源已注册', report.fontFaces >= 3],
  ['输入后欢迎层隐藏', report.welcomeHidden === true],
  ['无 console 错误', failures.length === 0]
]

console.log('3D renderer:', JSON.stringify(report.machine))

let failed = false
for (const [label, pass] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${label}`)
  if (!pass) failed = true
}
if (failures.length > 0) console.log(failures.join('\n'))
process.exit(failed ? 1 : 0)
