import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppInfo, FileDoc } from '../../shared/ipc'
import type { EditAction } from '../../shared/menu'
import { LARGE_DOC_CHARS, lineHeightPx } from '../../shared/settings'
import { countText, formatStamp, hashText, titleFromText } from '../../shared/text'
import { THEMES } from '../../shared/theme-tokens'
import { audioEngine } from './audio/AudioEngine'
import {
  initAutosave,
  isDirty,
  markChanged,
  resetAutosave,
  runTick,
  saveAs,
  saveDocument
} from './autosave/controller'
import { Editor } from './editor/Editor'
import { createEngine, type StrikeInfo } from './editor/engine'
import { registerBundledFonts } from './fonts/catalog'
import { registerCustomFonts } from './fonts/loader'
import { emitStage } from './stage/bus'
import { Stage } from './stage/Stage'
import { useAppStore, type TabMeta } from './state/store'
import { applyDecor, applyFont, applyPaperWidth, applyTexture, applyTheme } from './theme/applyTheme'
import { MenuBar } from './ui/MenuBar'
import { ConfirmDialog, FindBar, Toasts, Welcome } from './ui/Overlays'
import { StatusBar } from './ui/StatusBar'
import { Studio } from './ui/Studio'
import { TabBar } from './ui/TabBar'
import { TitleBar } from './ui/TitleBar'

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t${Date.now()}${Math.random().toString(36).slice(2, 8)}`

const makeTab = (patch: Partial<TabMeta> = {}): TabMeta => ({
  id: newId(),
  filePath: null,
  name: '未命名',
  encoding: 'utf8',
  eol: 'crlf',
  mtimeMs: 0,
  dirty: false,
  draftStamp: formatStamp(Date.now()),
  ...patch
})

export function App() {
  const [ready, setReady] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [pendingClose, setPendingClose] = useState(false)
  const [hasText, setHasText] = useState(false)
  const [chromeNear, setChromeNear] = useState(false)
  const hasTextRef = useRef(false)

  const settings = useAppStore((s) => s.settings)
  const tabs = useAppStore((s) => s.tabs)
  const activeId = useAppStore((s) => s.activeId)
  const doc = useAppStore((s) => s.doc)
  const stats = useAppStore((s) => s.stats)
  const save = useAppStore((s) => s.save)
  const studioOpen = useAppStore((s) => s.studioOpen)
  const studioTab = useAppStore((s) => s.studioTab)
  const findOpen = useAppStore((s) => s.findOpen)
  const focus = useAppStore((s) => s.focus)
  const lite = useAppStore((s) => s.lite)

  // 每个标签页一个 textarea，正文只存在各自的元素里
  const editors = useRef(new Map<string, HTMLTextAreaElement>())
  const seeds = useRef(new Map<string, string>())
  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null)
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlers = useRef<Record<string, (payload?: string) => void>>({})

  const editorNow = useCallback(
    (): HTMLTextAreaElement | null => editors.current.get(useAppStore.getState().activeId) ?? null,
    []
  )
  const readText = useCallback(() => editorNow()?.value ?? '', [editorNow])

  const syncHasText = useCallback(() => {
    const next = (editorNow()?.value.length ?? 0) > 0
    if (next !== hasTextRef.current) {
      hasTextRef.current = next
      setHasText(next)
    }
  }, [editorNow])

  const scheduleStats = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current)
    statsTimer.current = setTimeout(() => {
      const text = readText()
      const store = useAppStore.getState()
      store.setStats(countText(text))
      store.setLite(text.length > LARGE_DOC_CHARS)
      // 还没落盘的标签，用首行当标签名，否则一排『未命名』分不清
      const tab = store.tabs.find((item) => item.id === store.activeId)
      if (tab && !tab.filePath) {
        const title = titleFromText(text, 18) || '未命名'
        if (title !== tab.name) store.patchTab(tab.id, { name: title })
      }
    }, 400)
  }, [readText])

  /* ---------- 启动 ---------- */

  useEffect(() => {
    let disposed = false
    void (async () => {
      await registerBundledFonts()
      const [settingsRes, infoRes] = await Promise.all([
        window.api.settings.get(),
        window.api.app.info()
      ])
      if (disposed) return
      const store = useAppStore.getState()
      if (settingsRes.ok) store.setSettings(settingsRes.data)
      if (infoRes.ok) setAppInfo(infoRes.data)

      if (settingsRes.ok && settingsRes.data.customFonts.length > 0) {
        await registerCustomFonts(settingsRes.data.customFonts)
      }

      const recentRes = await window.api.recent.list()
      if (recentRes.ok && !disposed) setRecent(recentRes.data)

      if (store.tabs.length === 0) store.addTab(makeTab())
      setReady(true)
    })()
    return () => {
      disposed = true
    }
  }, [])

  /* ---------- 引擎 ---------- */

  const handleEditorMount = useCallback((tabId: string, el: HTMLTextAreaElement) => {
    editors.current.set(tabId, el)
  }, [])

  useEffect(() => {
    if (!ready || !appInfo) return
    initAutosave(appInfo, readText)

    const playStrike = (info: StrikeInfo): void => {
      const current = useAppStore.getState().settings
      if (!current || current.sound.preset === 'silent') return
      const pan = current.sound.pan ? (info.caret?.pan ?? 0) : 0
      if (info.kind === 'enter') audioEngine.play('enter', 0)
      else if (info.kind === 'backspace' || info.kind === 'tab') audioEngine.play(info.kind, pan)
      else audioEngine.play('char', pan)
    }

    const engine = createEngine({
      onCaret: (caret) => emitStage({ t: 'caret', caret }),
      onStrike: (info) => {
        emitStage({ t: 'strike', kind: info.kind, char: info.char, caret: info.caret })
        playStrike(info)
      },
      onChange: () => {
        markChanged()
        scheduleStats()
        syncHasText()
      },
      onBell: () => {
        const current = useAppStore.getState().settings
        if (current?.sound.bell) audioEngine.play('bell', 0)
      },
      onScroll: (ratio, velocity) => emitStage({ t: 'scroll', ratio, velocity })
    })

    engineRef.current = engine

    const onRelayout = (): void => engine.refresh()
    window.addEventListener('tw:relayout', onRelayout)

    return () => {
      window.removeEventListener('tw:relayout', onRelayout)
      engine.detach()
      engineRef.current = null
    }
  }, [ready, appInfo, readText, scheduleStats, syncHasText])

  // 切标签 = 把引擎接到另一个 textarea 上
  useEffect(() => {
    if (!ready) return
    const el = editors.current.get(activeId)
    if (!el) return
    const engine = engineRef.current
    engine?.detach()
    engine?.attach(el)
    el.focus()

    const store = useAppStore.getState()
    const text = el.value
    resetAutosave(hashText(text))
    store.setStats(countText(text))
    store.setLite(text.length > LARGE_DOC_CHARS)
    hasTextRef.current = text.length > 0
    setHasText(text.length > 0)
    emitStage({ t: 'caret', caret: null })
  }, [activeId, ready])

  /* ---------- 主题/字体/声音 应用 ---------- */

  useEffect(() => {
    if (!settings) return
    applyTheme(settings.theme)
    applyDecor(settings.decor)
    applyTexture(settings.paperTexture)
    applyPaperWidth(settings.paperWidth)
    applyFont(
      settings.font.family,
      settings.font.size,
      lineHeightPx(settings.font.size, settings.font.lineHeightRatio)
    )
    audioEngine.setPreset(settings.sound.preset)
    audioEngine.setVolume(settings.sound.volume)
    useAppStore.getState().setFocus(settings.focus)
    window.dispatchEvent(new Event('tw:theme'))
  }, [settings])

  useEffect(() => {
    const unlock = (): void => {
      const current = useAppStore.getState().settings
      if (current) {
        audioEngine.setPreset(current.sound.preset)
        audioEngine.setVolume(current.sound.volume)
      }
      audioEngine.unlock()
    }
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => {
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
    }
  }, [])

  /* ---------- 标签页与文档 ---------- */

  const createTab = useCallback((meta: Partial<TabMeta> = {}, text = '') => {
    const tab = makeTab(meta)
    seeds.current.set(tab.id, text)
    useAppStore.getState().addTab(tab)
    return tab
  }, [])

  const openDoc = useCallback(
    (file: FileDoc) => {
      const store = useAppStore.getState()
      const existing = store.tabs.find((tab) => tab.filePath === file.filePath)
      if (existing) {
        void (async () => {
          if (isDirty()) await saveDocument()
          store.activateTab(existing.id)
        })()
        return
      }
      createTab(
        {
          filePath: file.filePath,
          name: file.name,
          encoding: file.encoding,
          eol: file.eol,
          mtimeMs: file.mtimeMs,
          dirty: false
        },
        file.text
      )
      void window.api.recent.add(file.filePath).then((response) => {
        if (response.ok) setRecent(response.data)
      })
    },
    [createTab]
  )

  const switchTo = useCallback(async (id: string) => {
    const store = useAppStore.getState()
    if (id === store.activeId) return
    if (isDirty()) await saveDocument()
    useAppStore.getState().activateTab(id)
  }, [])

  const closeTab = useCallback(
    async (id: string) => {
      const store = useAppStore.getState()
      if (store.tabs.length <= 1) {
        // 关最后一个标签 = 保留一个空白标签，不留空窗口
        if (isDirty()) await saveDocument()
        const tab = makeTab()
        seeds.current.set(tab.id, '')
        store.addTab(tab)
        store.removeTab(id)
        return
      }
      if (id === store.activeId && isDirty()) await saveDocument()
      editors.current.delete(id)
      seeds.current.delete(id)
      useAppStore.getState().removeTab(id)
    },
    []
  )

  const doOpen = useCallback(
    async (path?: string) => {
      if (isDirty()) await saveDocument()
      const response = path ? await window.api.files.openPath(path) : await window.api.files.openDialog()
      if (!response.ok) {
        useAppStore.getState().toast(response.message, 'error')
        return
      }
      if ('canceled' in response.data) return
      openDoc(response.data)
    },
    [openDoc]
  )

  const doNew = useCallback(() => createTab(), [createTab])

  const doSave = useCallback(async () => {
    const ok = await saveDocument()
    if (!ok) useAppStore.getState().toast('保存失败，请检查路径与权限', 'error')
  }, [])

  const doSaveAs = useCallback(async () => {
    await saveAs(readText(), useAppStore.getState().doc.name)
  }, [readText])

  const doReveal = useCallback(async () => {
    const path = useAppStore.getState().doc.filePath
    if (!path) {
      useAppStore.getState().toast('这篇文稿还没落盘')
      return
    }
    await window.api.files.reveal(path)
  }, [])

  const toggleFocus = useCallback(() => {
    const store = useAppStore.getState()
    const next = !store.focus
    store.setFocus(next)
    setChromeNear(false)
    void window.api.settings.patch({ focus: next }).then((response) => {
      if (response.ok) store.setSettings(response.data)
    })
  }, [])

  const patchSettings = useCallback((patch: Parameters<typeof window.api.settings.patch>[0]) => {
    void window.api.settings.patch(patch).then((response) => {
      if (response.ok) useAppStore.getState().setSettings(response.data)
    })
  }, [])

  const cycleTab = useCallback(
    (step: number) => {
      const store = useAppStore.getState()
      const index = store.tabs.findIndex((tab) => tab.id === store.activeId)
      if (index < 0 || store.tabs.length < 2) return
      const next = (index + step + store.tabs.length) % store.tabs.length
      void switchTo(store.tabs[next].id)
    },
    [switchTo]
  )

  /* ---------- 菜单与快捷键 ---------- */

  handlers.current = {
    new: () => doNew(),
    newTab: () => doNew(),
    open: (payload) => void doOpen(payload),
    save: () => void doSave(),
    saveAs: () => void doSaveAs(),
    reveal: () => void doReveal(),
    closeTab: () => void closeTab(useAppStore.getState().activeId),
    nextTab: () => cycleTab(1),
    prevTab: () => cycleTab(-1),
    find: () => useAppStore.getState().setFind(true),
    focus: toggleFocus,
    studio: () => {
      const store = useAppStore.getState()
      store.setStudio(!store.studioOpen)
    },
    themeNext: () => {
      const store = useAppStore.getState()
      const current = store.settings
      if (!current) return
      const order = ['paper-ink', 'midnight-study', 'moonlit-poetry', 'sepia-underwood', 'green-baize'] as const
      const index = order.indexOf(current.theme)
      patchSettings({ theme: order[(index + 1) % order.length] })
    },
    soundTest: () => audioEngine.test(),
    zoomIn: () => {
      const current = useAppStore.getState().settings
      if (current) patchSettings({ font: { ...current.font, size: Math.min(40, current.font.size + 1) } })
    },
    zoomOut: () => {
      const current = useAppStore.getState().settings
      if (current) patchSettings({ font: { ...current.font, size: Math.max(12, current.font.size - 1) } })
    },
    resetZoom: () => {
      const current = useAppStore.getState().settings
      if (current) patchSettings({ font: { ...current.font, size: 18 } })
    },
    fullscreen: () => void window.api.appCommand('fullscreen'),
    quit: () => void window.api.appCommand('quit'),
    about: () => void window.api.appCommand('about')
  }

  useEffect(() => {
    return window.api.onMenu((command, payload) => {
      handlers.current[command]?.(payload)
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      const store = useAppStore.getState()
      if (store.findOpen) store.setFind(false)
      else if (store.studioOpen) store.setStudio(false)
      else if (store.focus) toggleFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFocus])

  useEffect(() => {
    if (!focus) {
      setChromeNear(false)
      return
    }
    let frame = 0
    const onMove = (event: MouseEvent): void => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setChromeNear(event.clientY <= 58 || event.clientY >= window.innerHeight - 34)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [focus])

  /* ---------- 自动保存时钟与关窗 ---------- */

  useEffect(() => window.api.onTick(runTick), [])

  useEffect(() => {
    return window.api.onRequestClose(async () => {
      if (!isDirty()) {
        await window.api.win.closeReady(true)
        return
      }
      const ok = await saveDocument()
      if (ok) {
        await window.api.win.closeReady(true)
        return
      }
      setPendingClose(true)
    })
  }, [])

  useEffect(() => {
    return window.api.onOpenFile((file) => openDoc(file))
  }, [openDoc])

  useEffect(() => {
    const title = `${doc.dirty ? '● ' : ''}${doc.name} — 打字机`
    void window.api.win.setTitle(title)
  }, [doc.dirty, doc.name])

  useEffect(() => {
    const prevent = (event: DragEvent): void => event.preventDefault()
    const drop = (event: DragEvent): void => {
      event.preventDefault()
      const file = event.dataTransfer?.files?.[0]
      if (!file) return
      const path = window.api.pathForFile(file)
      if (path) void doOpen(path)
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', drop)
    }
  }, [doOpen])

  useEffect(() => {
    if (!ready) return
    void (async () => {
      const payload = await window.api.app.startup()
      if (payload.doc) openDoc(payload.doc)
      if (payload.notice) {
        useAppStore.getState().toast(
          payload.notice.recoverable
            ? '上次会话非正常结束，目标文件已被外部修改，请检查内容'
            : '上次会话非正常结束，目标文件已不在原处',
          'error'
        )
        await window.api.session.clear()
      }
    })()
  }, [ready, openDoc])

  const empty = !ready || !hasText

  return (
    <div className="app" data-focus={focus} data-chrome={chromeNear ? 'true' : 'false'}>
      <TitleBar
        menu={
          <MenuBar
            onCommand={(command) => handlers.current[command]?.()}
            onEdit={(action: EditAction) => void window.api.edit.action(action)}
          />
        }
        focus={focus}
        studioOpen={studioOpen}
        onStudio={() => useAppStore.getState().setStudio(!studioOpen)}
        onFocus={toggleFocus}
      />

      <TabBar
        tabs={tabs}
        activeId={activeId}
        onActivate={(id) => void switchTo(id)}
        onClose={(id) => void closeTab(id)}
        onNew={doNew}
      />

      {focus && (
        <button className="focus-exit" onClick={toggleFocus} title="退出专注模式（Esc）">
          <span>退出专注</span>
          <kbd>Esc</kbd>
        </button>
      )}

      <Stage
        decor={settings?.decor ?? 'full'}
        lite={lite}
        focus={focus}
        studio={studioOpen}
        paperFull={settings?.paperWidth === 'full'}
        theme={{
          id: settings?.theme ?? 'paper-ink',
          wallBottom: THEMES[settings?.theme ?? 'paper-ink'].room.wallBottom,
          lightKey: THEMES[settings?.theme ?? 'paper-ink'].light.key,
          lightSource: THEMES[settings?.theme ?? 'paper-ink'].light.source,
          trim: THEMES[settings?.theme ?? 'paper-ink'].metal.brass,
          body: THEMES[settings?.theme ?? 'paper-ink'].metal.body,
          paperBase: THEMES[settings?.theme ?? 'paper-ink'].paper.base,
          paperMode: THEMES[settings?.theme ?? 'paper-ink'].mode,
          serif: THEMES[settings?.theme ?? 'paper-ink'].ui.serif
        }}
      >
        {tabs.map((tab) => (
          <Editor
            key={tab.id}
            tabId={tab.id}
            active={tab.id === activeId}
            initialText={seeds.current.get(tab.id) ?? ''}
            onMount={handleEditorMount}
            onContextMenu={(el) =>
              void window.api.menu.context(el.selectionStart !== el.selectionEnd)
            }
          />
        ))}
        <Welcome
          show={empty && !findOpen}
          recent={recent}
          onOpenRecent={(path) => void doOpen(path)}
        />
      </Stage>

      <StatusBar
        stats={stats}
        save={save}
        encoding={doc.encoding}
        eol={doc.eol}
        path={doc.filePath}
        lite={lite}
        onSaveClick={() => {
          const store = useAppStore.getState()
          if (store.save.phase === 'error') void doSave()
          else store.setStudio(true, 'autosave')
        }}
        onOpenStudio={() => useAppStore.getState().setStudio(true, 'autosave')}
      />

      <Studio
        open={studioOpen}
        tab={studioTab}
        onTab={(tab) => useAppStore.getState().setStudio(true, tab)}
      />

      <FindBar open={findOpen} onClose={() => useAppStore.getState().setFind(false)} />

      <Toasts />

      <ConfirmDialog
        open={pendingClose}
        title="保存失败"
        message="这篇文稿没能写入磁盘。仍然退出会丢失未保存的内容。"
        confirmLabel="仍然退出"
        cancelLabel="返回继续编辑"
        danger
        onConfirm={() => {
          setPendingClose(false)
          void window.api.win.closeReady(true)
        }}
        onCancel={() => {
          setPendingClose(false)
          void window.api.win.closeReady(false)
        }}
      />
    </div>
  )
}
