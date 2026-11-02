import type {
  AppInfo,
  AutosaveTick,
  CustomFont,
  FileDoc,
  ImportedFont,
  SaveRequest,
  SaveResult,
  SessionNotice,
  StartupPayload,
  StatResult,
  FindStatus,
  ThemeBarRequest,
  MenuCommand,
  WindowState
} from '../shared/ipc'
import type { SettingsV1 } from '../shared/settings'

export type Unsubscribe = () => void

export type Api = {
  platform: string
  files: {
    openDialog: () => Promise<Result<{ canceled: true } | FileDoc>>
    openPath: (filePath: string) => Promise<Result<FileDoc>>
    save: (req: SaveRequest) => Promise<Result<SaveResult>>
    saveAs: (suggestedName: string) => Promise<Result<{ canceled: true } | { filePath: string }>>
    stat: (filePath: string) => Promise<Result<StatResult>>
    reveal: (filePath: string) => Promise<Result<null>>
  }
  settings: {
    get: () => Promise<Result<SettingsV1>>
    patch: (patch: Partial<SettingsV1>) => Promise<Result<SettingsV1>>
    reset: () => Promise<Result<SettingsV1>>
  }
  fonts: {
    import: () => Promise<Result<ImportedFont>>
    listCustom: () => Promise<Result<CustomFont[]>>
    read: (id: string) => Promise<Result<Uint8Array>>
    remove: (id: string) => Promise<Result<null>>
  }
  dialog: {
    chooseDir: () => Promise<Result<{ canceled: true } | { dirPath: string }>>
  }
  recent: {
    add: (filePath: string) => Promise<Result<string[]>>
    list: () => Promise<Result<string[]>>
    clear: () => Promise<Result<string[]>>
  }
  win: {
    state: () => Promise<Result<WindowState>>
    closeReady: (saved: boolean) => Promise<Result<null>>
    setTitle: (title: string) => Promise<Result<null>>
  }
  app: {
    info: () => Promise<Result<AppInfo>>
    startup: () => Promise<StartupPayload>
  }
  theme: {
    titleBar: (req: ThemeBarRequest) => Promise<Result<null>>
  }
  find: {
    start: (text: string, forward: boolean, findNext: boolean) => Promise<Result<null>>
    next: (forward: boolean) => Promise<Result<null>>
    stop: () => Promise<Result<null>>
  }
  menu: {
    context: (hasSelection: boolean) => Promise<Result<null>>
  }
  edit: {
    action: (action: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll') => Promise<Result<null>>
  }
  appCommand: (command: 'quit' | 'about' | 'fullscreen') => Promise<Result<null>>
  session: {
    saved: (payload: {
      draftId: string
      targetPath: string | null
      hash: string
      textLen: number
      startedAt: number
    }) => Promise<Result<null>>
    clear: () => Promise<Result<null>>
  }
  pathForFile: (file: File) => string
  onTick: (cb: (tick: AutosaveTick) => void) => Unsubscribe
  onWindowActivity: (cb: (active: boolean) => void) => Unsubscribe
  onRequestClose: (cb: () => void) => Unsubscribe
  onMenu: (cb: (command: MenuCommand, payload?: string) => void) => Unsubscribe
  onFindResult: (cb: (status: FindStatus) => void) => Unsubscribe
  onOpenFile: (cb: (doc: FileDoc) => void) => Unsubscribe
  onSessionNotice: (cb: (notice: SessionNotice) => void) => Unsubscribe
}

export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

declare global {
  interface Window {
    api: Api
  }
}
