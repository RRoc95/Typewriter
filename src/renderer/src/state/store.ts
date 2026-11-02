import { create } from 'zustand'
import type { Encoding, Eol } from '../../../shared/ipc'
import type { SettingsV1 } from '../../../shared/settings'
import type { TextStats } from '../../../shared/text'
import { initialAutosave, type AutosaveState } from '../autosave/machine'

export type DocState = {
  filePath: string | null
  name: string
  encoding: Encoding
  eol: Eol
  mtimeMs: number
  dirty: boolean
}

/** 一个标签页的元信息。正文本身存在各自的 textarea 里，这样撤销栈与输入法状态不会串。 */
export type TabMeta = DocState & {
  id: string
  draftStamp: string
}

export type ToastItem = { id: number; message: string; kind: 'info' | 'error' }

export type StudioTab = 'theme' | 'type' | 'sound' | 'autosave'

const EMPTY_DOC: DocState = {
  filePath: null,
  name: '未命名',
  encoding: 'utf8',
  eol: 'crlf',
  mtimeMs: 0,
  dirty: false
}

const docOf = (tab: TabMeta | undefined): DocState =>
  tab
    ? {
        filePath: tab.filePath,
        name: tab.name,
        encoding: tab.encoding,
        eol: tab.eol,
        mtimeMs: tab.mtimeMs,
        dirty: tab.dirty
      }
    : EMPTY_DOC

type AppStore = {
  settings: SettingsV1 | null
  tabs: TabMeta[]
  activeId: string
  doc: DocState
  stats: TextStats
  save: AutosaveState
  studioOpen: boolean
  studioTab: StudioTab
  findOpen: boolean
  focus: boolean
  lite: boolean
  toasts: ToastItem[]

  patchSettings: (patch: Partial<SettingsV1>) => void
  setSettings: (settings: SettingsV1) => void
  setDoc: (patch: Partial<DocState>) => void
  addTab: (tab: TabMeta, index?: number) => void
  removeTab: (id: string) => void
  activateTab: (id: string) => void
  patchTab: (id: string, patch: Partial<DocState>) => void
  setStats: (stats: TextStats) => void
  setSave: (state: AutosaveState) => void
  setStudio: (open: boolean, tab?: StudioTab) => void
  setFind: (open: boolean) => void
  setFocus: (focus: boolean) => void
  setLite: (lite: boolean) => void
  toast: (message: string, kind?: 'info' | 'error') => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useAppStore = create<AppStore>((set, get) => ({
  settings: null,
  tabs: [],
  activeId: '',
  doc: EMPTY_DOC,
  stats: { chars: 0, words: 0, paragraphs: 0, readMinutes: 1 },
  save: initialAutosave(''),
  studioOpen: false,
  studioTab: 'theme',
  findOpen: false,
  focus: false,
  lite: false,
  toasts: [],

  patchSettings: (patch) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...patch } : state.settings
    })),
  setSettings: (settings) => set({ settings }),

  // 兼容旧调用：改的是"当前标签页"
  setDoc: (patch) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => (tab.id === state.activeId ? { ...tab, ...patch } : tab))
      return { tabs, doc: { ...state.doc, ...patch } }
    }),

  addTab: (tab, index) =>
    set((state) => {
      const tabs = [...state.tabs]
      tabs.splice(index ?? tabs.length, 0, tab)
      return { tabs, activeId: tab.id, doc: docOf(tab), save: initialAutosave('') }
    }),

  removeTab: (id) =>
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === id)
      if (index < 0) return {}
      const tabs = state.tabs.filter((tab) => tab.id !== id)
      const activeId =
        state.activeId === id ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? '') : state.activeId
      const active = tabs.find((tab) => tab.id === activeId)
      return { tabs, activeId, doc: docOf(active) }
    }),

  activateTab: (id) =>
    set((state) => {
      const active = state.tabs.find((tab) => tab.id === id)
      if (!active) return {}
      return { activeId: id, doc: docOf(active) }
    }),

  patchTab: (id, patch) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab))
      const active = tabs.find((tab) => tab.id === state.activeId)
      return { tabs, doc: docOf(active) }
    }),

  setStats: (stats) => set({ stats }),
  setSave: (save) => set({ save }),
  setStudio: (open, tab) =>
    set((state) => ({ studioOpen: open, studioTab: tab ?? state.studioTab })),
  setFind: (open) => set({ findOpen: open }),
  setFocus: (focus) => set({ focus }),
  setLite: (lite) => set({ lite }),
  toast: (message, kind = 'info') => {
    const id = ++toastId
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, kind }] }))
    setTimeout(() => {
      const store = get()
      if (store.toasts.some((t) => t.id === id)) {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }
    }, kind === 'error' ? 5200 : 2600)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))

export const activeTab = (): TabMeta | undefined => {
  const state = useAppStore.getState()
  return state.tabs.find((tab) => tab.id === state.activeId)
}
