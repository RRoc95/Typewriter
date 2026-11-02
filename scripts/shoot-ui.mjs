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

const prose =
  '雨落在玻璃上，像是有人在很远的地方翻动一页旧纸。\n' +
  '他把打字机搬到窗边，铜制的机身映着台灯的光，字锤一排排静着，\n' +
  '像等待被点名的士兵。每落下一次，纸面就轻轻一颤。\n\n' +
  '第一章 结束。'

await win.keyboard.insertText(prose)
await win.waitForTimeout(900)
await win.screenshot({ path: 'artifacts/ui-main.png' })

await win.click('.titlebar .chip:nth-child(2)')
await win.waitForTimeout(420)
await win.screenshot({ path: 'artifacts/ui-studio-theme.png' })

await win.click('.studio-tab:nth-child(2)')
await win.waitForTimeout(300)
await win.screenshot({ path: 'artifacts/ui-studio-type.png' })

await win.click('.studio-tab:nth-child(3)')
await win.waitForTimeout(300)
await win.screenshot({ path: 'artifacts/ui-studio-sound.png' })

await win.click('.studio-tab:nth-child(4)')
await win.waitForTimeout(300)
await win.screenshot({ path: 'artifacts/ui-studio-autosave.png' })

await win.click('.studio-head .icon-btn')
await win.waitForTimeout(300)

await win.click('.titlebar .chip:nth-child(1)')
await win.waitForTimeout(600)
await win.screenshot({ path: 'artifacts/ui-focus.png' })

await app.close()
console.log('ui shots done')
