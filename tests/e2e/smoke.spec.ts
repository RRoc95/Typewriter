import { copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'

const TEST_FONT = join(process.cwd(), 'node_modules/@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2')
const runningApps = new Set<ElectronApplication>()

test.afterEach(async () => {
  for (const app of runningApps) {
    await app.close()
  }
  runningApps.clear()
})

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
  runningApps.add(app)
  app.once('close', () => runningApps.delete(app))
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
  const filePath = await win.locator('.statusbar .path').getAttribute('title')
  expect(filePath).toBeTruthy()
  expect(await readFile(filePath!, 'utf8')).toBe('自动保存测试 draft')

  await app.close()
})

test('自定义字体：注册、列表、应用、持久化', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'tw-font-'))
  const id = 'abcdef0123456789'
  await mkdir(join(userData, 'fonts'), { recursive: true })
  await copyFile(TEST_FONT, join(userData, 'fonts', `${id}.woff2`))
  await writeFile(
    join(userData, 'settings.json'),
    JSON.stringify({ customFonts: [{ id, family: 'Custom Courier', fileName: `${id}.woff2`, addedAt: 1 }] }),
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
  expect(names).toContain('Custom Courier')

  await customItem.click()
  await win.waitForTimeout(300)

  const applied = await win.evaluate(() => {
    const editor = document.querySelector('[data-testid="editor"]') as HTMLElement
    return {
      family: getComputedStyle(editor).fontFamily,
      loaded: document.fonts.check('16px "Custom Courier"')
    }
  })
  expect(applied.family).toContain('Custom Courier')
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

test('平台保存快捷键写入隔离文档目录', async () => {
  const { app, win, userData } = await launch()
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('快捷键保存测试')
  await win.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s')
  await expect(win.locator('.save-state')).toHaveAttribute('data-phase', 'saved')
  const filePath = await win.locator('.statusbar .path').getAttribute('title')
  expect(filePath).toBeTruthy()
  expect(filePath!.startsWith(join(userData, 'Documents'))).toBe(true)
  expect(await readFile(filePath!, 'utf8')).toBe('快捷键保存测试')
  await app.close()
})

test('退出应用先保存当前文稿', async () => {
  const { app, win, userData } = await launch()
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('退出前保存')
  await expect(win.locator('.save-state')).toHaveAttribute('data-phase', 'dirty')
  const closed = app.waitForEvent('close')
  await app.evaluate(({ app }) => {
    setTimeout(() => app.quit(), 0)
  })
  await closed
  const directory = join(userData, 'Documents', '打字机')
  const files = await readdir(directory)
  expect(files).toHaveLength(1)
  expect(await readFile(join(directory, files[0]), 'utf8')).toBe('退出前保存')
})

test('macOS 关窗后可从 Dock 重新激活或打开文件', async () => {
  test.skip(process.platform !== 'darwin', 'macOS 窗口生命周期')
  const { app, userData } = await launch()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(0)

  const activated = app.waitForEvent('window')
  await app.evaluate(({ app }) => app.emit('activate'))
  const restored = await activated
  await expect(restored.locator('[data-testid="editor"]')).toBeVisible()

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(0)
  const filePath = join(userData, 'Dock 打开的文稿.txt')
  await writeFile(filePath, '从 Dock 打开', 'utf8')
  const opened = app.waitForEvent('window')
  await app.evaluate(({ app }, path) => {
    app.emit('open-file', { preventDefault() {} }, path)
  }, filePath)
  const fileWindow = await opened
  await expect(fileWindow.locator('[data-testid="editor"]')).toHaveValue('从 Dock 打开')
  await app.close()
})
