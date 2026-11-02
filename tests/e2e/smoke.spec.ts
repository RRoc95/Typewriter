import { copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import type { Input } from 'electron'
import { ROOM_THEME_IDS } from '../../src/shared/theme-tokens'

const TEST_FONT = join(process.cwd(), 'node_modules/@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2')
const runningApps = new Set<ElectronApplication>()

test.afterEach(async () => {
  for (const app of runningApps) {
    await app.close()
  }
  runningApps.clear()
})

async function activateWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ app, BrowserWindow }) => {
    app.focus({ steal: true })
    const win = BrowserWindow.getAllWindows()[0]
    win.show()
    win.focus()
    win.webContents.focus()
  })
  await (await app.firstWindow()).bringToFront()
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    return window.isFocused() && window.webContents.isFocused()
  })).toBe(true)
}

async function pressCommand(app: ElectronApplication, keyCode: string, shift = false): Promise<void> {
  await activateWindow(app)
  const primary: 'meta' | 'control' = process.platform === 'darwin' ? 'meta' : 'control'
  // Application accelerators need Electron input; CDP keys only target the DOM.
  const inputs = await app.evaluate(({ BrowserWindow }, { keyCode, primary, shift }) => {
    const modifiers: ('meta' | 'control' | 'shift')[] = [primary]
    if (shift) modifiers.push('shift')
    const contents = BrowserWindow.getAllWindows()[0].webContents
    return new Promise<Input[]>((resolve, reject) => {
      const inputs: Input[] = []
      const timeout = setTimeout(() => {
        contents.removeListener('before-input-event', observe)
        reject(new Error(`Native key did not reach before-input-event: ${JSON.stringify(inputs)}`))
      }, 15_000)
      const observe = (_event: Electron.Event, input: Input): void => {
        inputs.push(input)
        // Handled accelerators can consume keyup before this hook on macOS.
        if (input.type !== 'keyDown' || input.key.toLowerCase() !== keyCode.toLowerCase()) return
        clearTimeout(timeout)
        contents.removeListener('before-input-event', observe)
        resolve(inputs)
      }
      contents.on('before-input-event', observe)
      contents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
      contents.sendInputEvent({ type: 'keyUp', keyCode, modifiers })
    })
  }, { keyCode, primary, shift })
  console.log('Native shortcut:', JSON.stringify(inputs.map(({ type, key, control, meta, shift, alt }) => ({ type, key, control, meta, shift, alt }))))
  expect(inputs).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'keyDown', key: expect.stringMatching(new RegExp(`^${keyCode}$`, 'i')), [primary]: true, shift })
  ]))
}

async function resizeWindow(app: ElectronApplication, page: Page, width: number, height: number): Promise<number> {
  await app.evaluate(({ BrowserWindow, screen }, { width, height }) => {
    const window = BrowserWindow.getAllWindows()[0]
    const area = screen.getDisplayMatching(window.getBounds()).workArea
    const [outerWidth, outerHeight] = window.getSize()
    const [innerWidth, innerHeight] = window.getContentSize()
    // Keep the whole native window on the hosted display, including its frame.
    window.setContentSize(
      Math.min(width, area.width - (outerWidth - innerWidth) - 40),
      Math.min(height, area.height - (outerHeight - innerHeight) - 40)
    )
  }, { width, height })
  // Read the native size again after the renderer has acknowledged its resize;
  // an oversized request can be clamped asynchronously by the window manager.
  await expect.poll(async () => {
    const nativeWidth = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize()[0])
    const rendererWidth = await page.evaluate(() => window.innerWidth)
    return { nativeWidth, rendererWidth, matches: nativeWidth === rendererWidth }
  }).toMatchObject({ matches: true })
  return page.evaluate(() => window.innerWidth)
}

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
  await win.waitForLoadState('load')
  await win.waitForSelector('[data-testid="editor"]', { timeout: 40_000 })
  await activateWindow(app)
  return { app, win, userData: dir }
}

test('编辑器可输入、主题切换不重建 DOM、字数进状态栏', async () => {
  const { app, win } = await launch()
  const machine = win.locator('.machine-canvas')
  await expect(machine).toHaveAttribute('data-webgl', 'true')
  if (process.env.CI) await expect(machine).toHaveAttribute('data-quality', 'low')
  console.log('3D renderer:', await machine.getAttribute('data-renderer'))

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

test('WebGL 不可用时仍可编辑并切换专注模式', async () => {
  const { app, win } = await launch()
  const errors: string[] = []
  win.on('pageerror', (error) => errors.push(error.message))
  // Inject a failed WebGL context before the reloaded application initializes.
  // Canvas2D remains available for paper textures and text measurement.
  await win.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, options?: unknown) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return getContext.call(this, type, options)
    } as typeof getContext
  })
  await win.reload()
  await activateWindow(app)
  await expect(win.locator('.machine-canvas')).toHaveAttribute('data-webgl', 'false')
  await win.getByTestId('editor').fill('无 GPU 仍可写作')
  await win.click('.titlebar .chip:nth-child(1)')
  await expect(win.locator('.machine-canvas')).toHaveCount(0)
  await win.click('.focus-exit')
  await expect(win.locator('.machine-canvas')).toHaveAttribute('data-webgl', 'false')
  await expect(win.getByTestId('editor')).toHaveValue('无 GPU 仍可写作')
  expect(errors).toEqual([])
  await app.close()
})

test('木屋主题保留编辑状态、加载素材、动画可降级并持久化', async () => {
  // Keep one native editor across three scenes, window changes and a restart.
  // Software rendering needs a larger total budget; assertion timeouts stay unchanged.
  if (process.env.CI) test.setTimeout(300_000)
  const { app, win, userData } = await launch()
  const errors: string[] = []
  win.on('pageerror', (error) => errors.push(error.message))
  win.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  const viewportWidth = await resizeWindow(app, win, 1498, 1050)
  await win.emulateMedia({ reducedMotion: 'no-preference' })
  const editor = win.getByTestId('editor')
  const originalEditor = await editor.elementHandle()
  await editor.click()
  await win.keyboard.insertText('第一章')
  await mkdir('artifacts/rooms', { recursive: true })

  for (const theme of ROOM_THEME_IDS) {
    await win.click('.titlebar .chip:nth-child(2)')
    await win.getByTestId(`theme-${theme}`).click()
    await expect(win.locator('html')).toHaveAttribute('data-theme', theme)
    await win.click('.studio-head .icon-btn')
    await expect(editor).toHaveValue('第一章')
    expect(await originalEditor!.evaluate((node) => node === document.querySelector('[data-testid="editor"]'))).toBe(true)
    await expect.poll(() => win.locator('.room-backdrop img').evaluateAll((images) =>
      images.length === 4 && images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
    )).toBe(true)

    const flame = win.locator('.room-flame-main')
    await activateWindow(app)
    await expect(flame).toHaveCSS('animation-play-state', 'running')
    const frame = await flame.evaluate((node) => getComputedStyle(node).transform)
    await expect.poll(() => flame.evaluate((node) => getComputedStyle(node).transform)).not.toBe(frame)
    // Capture after the panel's width transition and the stage's geometry settle.
    await expect.poll(() => win.locator('.viewport').evaluate((node) => Math.round(node.getBoundingClientRect().width))).toBe(viewportWidth)
    await expect(win.locator('.toast')).toHaveCount(0)
    await win.screenshot({ path: `artifacts/rooms/${theme}.png`, scale: 'css' })
    await expect.poll(async () => JSON.parse(await readFile(join(userData, 'settings.json'), 'utf8')).theme).toBe(theme)
  }

  // Native undo history survives switching all three environments.
  await editor.focus()
  await win.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z')
  await expect(editor).toHaveValue('')
  await win.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y')
  await expect(editor).toHaveValue('第一章')

  await win.emulateMedia({ reducedMotion: 'reduce' })
  await expect(win.locator('.room-flame-main')).toHaveCSS('animation-name', 'none')
  await win.emulateMedia({ reducedMotion: 'no-preference' })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide())
  await expect(win.locator('.room-backdrop')).toHaveAttribute('data-inactive', 'true')
  await expect(win.locator('.room-flame-main')).toHaveCSS('animation-play-state', 'paused')
  await activateWindow(app)
  await expect(win.locator('.room-backdrop')).toHaveAttribute('data-inactive', 'false')

  await win.click('.titlebar .chip:nth-child(1)')
  await expect(win.locator('.room-backdrop')).toHaveAttribute('data-paused', 'true')
  await expect(editor).toHaveValue('第一章')
  await win.click('.focus-exit')
  await expect(win.locator('.room-backdrop')).toHaveAttribute('data-paused', 'false')

  const narrowWidth = await resizeWindow(app, win, 900, 700)
  expect(narrowWidth).toBeLessThanOrEqual(900)
  await win.click('.titlebar .chip:nth-child(2)')
  await expect(win.getByTestId('theme-candlelit-study')).toHaveAttribute('data-active', 'true')
  await win.screenshot({ path: 'artifacts/rooms/narrow-panel.png', scale: 'css' })
  await win.click('.studio-head .icon-btn')
  await app.close()

  const restored = await launch(userData)
  restored.win.on('pageerror', (error) => errors.push(error.message))
  await expect(restored.win.locator('html')).toHaveAttribute('data-theme', 'candlelit-study')
  await expect(restored.win.locator('.room-flame-main')).toBeVisible()
  // Returning to a legacy theme removes both the environment and its chrome texture.
  await restored.win.click('.titlebar .chip:nth-child(2)')
  await restored.win.getByTestId('theme-paper-ink').click()
  await expect(restored.win.locator('.room-backdrop')).toHaveCount(0)
  await expect(restored.win.locator('html')).toHaveAttribute('data-room', 'false')
  await expect(restored.win.locator('.titlebar')).toHaveCSS('background-image', 'none')
  await restored.win.getByTestId('theme-green-baize').click()
  await expect(restored.win.locator('html')).toHaveAttribute('data-theme', 'green-baize')
  await restored.win.click('.studio-head .icon-btn')
  for (const theme of ROOM_THEME_IDS) {
    await restored.win.getByTestId('editor').focus()
    await pressCommand(restored.app, 'T', true)
    await expect(restored.win.locator('html')).toHaveAttribute('data-theme', theme)
  }
  expect(errors).toEqual([])
  await restored.app.close()
})

test('大文件停止房间火焰，恢复短文后继续播放', async () => {
  const { app, win } = await launch()
  await win.emulateMedia({ reducedMotion: 'no-preference' })
  await win.click('.titlebar .chip:nth-child(2)')
  await win.getByTestId('theme-hearth-inn').click()
  await win.click('.studio-head .icon-btn')
  await win.getByTestId('editor').fill('x'.repeat(2_000_001))
  await expect(win.locator('.stage')).toHaveAttribute('data-lite', 'true')
  await expect(win.locator('.room-flame-main')).toHaveCSS('animation-play-state', 'paused')
  await win.getByTestId('editor').fill('短文')
  await expect(win.locator('.stage')).toHaveAttribute('data-lite', 'false')
  await activateWindow(app)
  await expect(win.locator('.room-flame-main')).toHaveCSS('animation-play-state', 'running')
  await app.close()
})

test('自动保存把未命名文稿写入默认目录', async () => {
  const { app, win } = await launch()
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('自动保存测试 draft')
  await expect(win.locator('.statusbar .path')).toContainText('打字机')
  await expect(win.locator('.statusbar .path')).toContainText('.txt')
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
  const userData = await mkdtemp(join(tmpdir(), 'tw-shortcut-'))
  await writeFile(join(userData, 'settings.json'), JSON.stringify({ autosave: { enabled: false } }))
  const { app, win } = await launch(userData)
  await win.locator('[data-testid="editor"]').click()
  await win.keyboard.insertText('快捷键保存测试')
  await pressCommand(app, 'S')
  await expect(win.locator('.save-state')).toHaveAttribute('data-phase', 'saved')
  const filePath = await win.locator('.statusbar .path').getAttribute('title')
  expect(filePath).toBeTruthy()
  expect(filePath!.startsWith(join(userData, 'Documents'))).toBe(true)
  expect(await readFile(filePath!, 'utf8')).toBe('快捷键保存测试')
  await app.close()
})

test('平台主题快捷键每次只切换一套', async () => {
  const { app, win } = await launch()
  const editor = win.getByTestId('editor')
  await editor.focus()
  await pressCommand(app, 'T', true)
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'midnight-study')
  await pressCommand(app, 'T', true)
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'moonlit-poetry')
  await app.close()
})

test('退出应用先保存当前文稿', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'tw-quit-'))
  await writeFile(join(userData, 'settings.json'), JSON.stringify({ autosave: { enabled: false } }))
  const { app, win } = await launch(userData)
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
