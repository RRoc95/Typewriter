import { mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron } from '@playwright/test'

const userData = await mkdtemp(join(tmpdir(), 'tw-ui-'))
const env = { ...process.env, TW_USER_DATA: userData, TW_E2E: '1' }
delete env.ELECTRON_RUN_AS_NODE
delete env.NODE_OPTIONS
await mkdir('artifacts', { recursive: true })

const app = await electron.launch({ args: ['.'], env })
const win = await app.firstWindow()
await win.waitForSelector('[data-testid="editor"]')
await win.locator('[data-testid="editor"]').click()

await win.keyboard.insertText('第一章 雨夜\n\n雨落在玻璃上，像是有人在很远的地方翻动一页旧纸。\n他把打字机搬到窗边，铜制的机身映着台灯的光。')
await win.waitForTimeout(700)

// 菜单
await win.click('.menubar-button >> nth=0')
await win.waitForTimeout(250)
await win.screenshot({ path: 'artifacts/ui-menu-file.png' })
await win.keyboard.press('Escape')

// 新建两个标签
await win.click('.tab-new')
await win.waitForTimeout(400)
await win.locator('[data-testid="editor"]').click()
await win.keyboard.insertText('第二个文件：致友人')
await win.waitForTimeout(500)

await win.click('.tab-new')
await win.waitForTimeout(400)
await win.locator('[data-testid="editor"]').click()
await win.keyboard.insertText('第三个：空白页')
await win.waitForTimeout(600)
await win.screenshot({ path: 'artifacts/ui-tabs.png' })

// 切回第一个标签
await win.click('.tab >> nth=0')
await win.waitForTimeout(700)
await win.screenshot({ path: 'artifacts/ui-tab-switch.png' })

const state = await win.evaluate(() => ({
  tabs: [...document.querySelectorAll('.tab .tab-label')].map((n) => n.textContent),
  active: document.querySelector('.tab[data-active="true"] .tab-label')?.textContent,
  value: document.querySelector('[data-testid="editor"]').value.slice(0, 24),
  editors: document.querySelectorAll('textarea.editor').length
}))
console.log(JSON.stringify(state, null, 2))

await app.close()
console.log('shots done')
