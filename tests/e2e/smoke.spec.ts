import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

const WINDOWS_FONT = 'C:\\Windows\\Fonts\\georgia.ttf'

async function launch(userData?: string) {
  const dir = userData ?? (await mkdtemp(join(tmpdir(), 'tw-e2e-')))
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    TW_USER_DATA: dir,
    TW_E2E: '1'
  }
  // 本机 shell 默认带 ELECTRON_RUN_AS_NODE，会让 Electron 退化成纯 Node 进程。
  delete env.ELECTRON_RUN_AS_NODE
  delete env.NODE_OPTIONS
  const app = await electron.launch({ args: ['.'], env })
  const win = await app.firstWindow()
  await win.waitForSelector('[data-testid="editor"]', { timeout: 40_000 })
  return { app, win, userData: dir }
}

test('编辑器可输入、主题切换不重建 DOM、字数进状态栏', async () => {
  const { app, win } = await launch()

  const editor = win.locator('[data-testid="editor"]')
  await editor.click()
  await win.keyboard.insertText('hello 世界')

  await expect(editor).toHaveValue('hello 世界')

  const beforeTheme = await win.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--tw-paper-base').trim()
  )
  // 墨迹压印是瞬态节点，等它消退后再数结构节点，避免误判"重建 DOM"。
  await win.waitForTimeout(700)
  const countNodes = (): number =>
    document.querySelectorAll('.stage *:not(.ink-stamp)').length
  const beforeNodes = await win.evaluate(countNodes)

  await win.click('.titlebar .chip:nth-child(2)')
  await win.click('[data-testid="theme-midnight-study"]')
  await win.waitForTimeout(220)

  const afterTheme = await win.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--tw-paper-base').trim()
  )
  const afterNodes = await win.evaluate(countNodes)

  expect(afterTheme).not.toBe(beforeTheme)
  expect(afterNodes).toBe(beforeNodes)

  await expect(win.locator('.statusbar')).toContainText('7 字')

  await mkdir('artifacts', { recursive: true })
  await win.screenshot({ path: 'artifacts/theme-midnight.png' })

  await app.close()
})

test('自动保存把未命名文稿写入默认目录', async () => {
  const { app, win } = await launch()
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('自动保存测试 draft')
  await win.waitForTimeout(12_000)

  const text = await win.locator('.statusbar .path').textContent()
  expect(text ?? '').toContain('打字机')
  expect(text ?? '').toContain('.txt')

  await app.close()
})

test('自定义字体：注册、列表、应用、持久化', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'tw-font-'))
  const id = 'abcdef0123456789'
  await mkdir(join(userData, 'fonts'), { recursive: true })
  await copyFile(WINDOWS_FONT, join(userData, 'fonts', `${id}.ttf`))
  await writeFile(
    join(userData, 'settings.json'),
    JSON.stringify({ customFonts: [{ id, family: 'Georgia', fileName: `${id}.ttf`, addedAt: 1 }] }),
    'utf8'
  )

  const { app, win } = await launch(userData)

  await win.click('.titlebar .chip:nth-child(2)')
  await win.click('.studio-tab:nth-child(2)')

  const customItem = win.locator('.font-item', { hasText: '自定义' }).first()
  await expect(customItem).toBeVisible()

  // 每行必须写出字体名，否则一排样张分不清是哪一款
  const names = await win.locator('.font-name').allTextContents()
  expect(names.length).toBeGreaterThan(2)
  expect(names.some((name) => name.trim().length > 0)).toBe(true)
  expect(names).toContain('Georgia')

  await customItem.click()
  await win.waitForTimeout(300)

  const applied = await win.evaluate(() => {
    const editor = document.querySelector('[data-testid="editor"]') as HTMLElement
    return {
      family: getComputedStyle(editor).fontFamily,
      loaded: document.fonts.check('16px "Georgia"')
    }
  })
  expect(applied.family).toContain('Georgia')
  expect(applied.loaded).toBe(true)

  await app.close()
})

test('多标签页：新建、切换保留内容、关闭', async () => {
  const { app, win } = await launch()
  const first = win.locator('[data-testid="editor"]')
  await first.click()
  await win.keyboard.insertText('第一页内容')
  await win.waitForTimeout(600)

  await win.click('.tab-new')
  await win.waitForTimeout(400)
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('第二页内容')
  await win.waitForTimeout(600)

  await expect(win.locator('.tab')).toHaveCount(2)
  await expect(win.locator('.tab[data-active="true"]')).toContainText('第二页')

  await win.click('.tab >> nth=0')
  await win.waitForTimeout(700)
  await expect(win.locator('[data-testid="editor"]')).toHaveValue('第一页内容')

  await win.click('.tab[data-active="true"] .tab-close')
  await win.waitForTimeout(600)
  await expect(win.locator('.tab')).toHaveCount(1)
  await expect(win.locator('[data-testid="editor"]')).toHaveValue('第二页内容')

  await app.close()
})

test('菜单栏：文件菜单可以新建标签页', async () => {
  const { app, win } = await launch()
  await win.click('.menubar-button >> nth=0')
  await win.waitForTimeout(250)
  await expect(win.locator('.menubar-drop')).toBeVisible()
  await win.click('.menubar-item >> text=新建标签页')
  await win.waitForTimeout(500)
  await expect(win.locator('.tab')).toHaveCount(2)
  await app.close()
})
