/**
 * 主进程 ↔ 渲染进程的通道名与数据契约。三端唯一真源。
 */

export const CH = {
  FILE_OPEN_DIALOG: 'file:openDialog',
  FILE_OPEN_PATH: 'file:openPath',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS_DIALOG: 'file:saveAsDialog',
  FILE_STAT: 'file:stat',
  FILE_REVEAL: 'file:reveal',

  SETTINGS_GET: 'settings:get',
  SETTINGS_PATCH: 'settings:patch',
  SETTINGS_RESET: 'settings:reset',

  FONTS_IMPORT: 'fonts:import',
  FONTS_LIST_CUSTOM: 'fonts:listCustom',
  FONTS_READ: 'fonts:read',
  FONTS_DELETE: 'fonts:delete',

  DIALOG_CHOOSE_DIR: 'dialog:chooseDirectory',

  RECENT_ADD: 'recent:add',
  RECENT_LIST: 'recent:list',
  RECENT_CLEAR: 'recent:clear',

  WIN_GET_STATE: 'win:getState',
  WIN_ACTIVITY: 'win:activity',
  WIN_CLOSE_READY: 'win:closeReady',
  WIN_SET_TITLE: 'win:setTitle',
  APP_INFO: 'app:info',
  THEME_TITLEBAR: 'theme:titleBar',

  FIND_START: 'find:start',
  FIND_NEXT: 'find:next',
  FIND_STOP: 'find:stop',
  FIND_RESULT: 'find:result',

  AUTOSAVE_TICK: 'autosave:tick',
  WIN_REQUEST_CLOSE: 'win:requestClose',
  SESSION_SAVED: 'session:saved',
  SESSION_NOTICE: 'session:clear',
  SESSION_INTERRUPTED: 'session:interrupted',

  MENU_COMMAND: 'menu:command',
  EDIT_ACTION: 'edit:action',
  APP_COMMAND: 'app:command',
  CONTEXT_MENU: 'menu:context',

  SHELL_OPEN_FILE: 'shell:openFile',
  STARTUP: 'app:startup'
} as const

export type Channel = (typeof CH)[keyof typeof CH]

export type WindowState = {
  bounds: unknown
  maximized: boolean
  /** Native window is visible, focused and not minimized. */
  active: boolean
}

export type IoCode =
  | 'EINVAL'
  | 'ENOENT'
  | 'EACCES'
  | 'ETOOBIG'
  | 'EBINARY'
  | 'ELOCKED'
  | 'ECONFLICT'
  | 'EIO'
  | 'ECANCELED'

export type R<T> = { ok: true; data: T } | { ok: false; code: IoCode; message: string }

export const ok = <T>(data: T): R<T> => ({ ok: true, data })
export const fail = (code: IoCode, message: string): R<never> => ({ ok: false, code, message })

/** 文件编码。读入时探测，写出时沿用。 */
export type Encoding = 'utf8' | 'utf8bom' | 'utf16le'
/** 换行符。内存中统一为 \n，仅在写盘/读入边界转换。 */
export type Eol = 'lf' | 'crlf'

export type FileDoc = {
  filePath: string
  name: string
  text: string
  encoding: Encoding
  eol: Eol
  mtimeMs: number
  size: number
}

export type SaveResult = {
  filePath: string
  mtimeMs: number
  bytes: number
}

export type SaveRequest = {
  filePath: string
  text: string
  encoding: Encoding
  eol: Eol
  /** 期望的磁盘 mtime；不一致说明被外部修改，主进程拒绝覆盖。 */
  expectMtimeMs: number | null
}

export type StatResult = {
  exists: boolean
  mtimeMs: number
  size: number
}

export type CustomFont = {
  id: string
  family: string
  fileName: string
  addedAt: number
}

export type ImportedFont = CustomFont | { canceled: true }

export type AppInfo = {
  version: string
  documentsDir: string
  userDataDir: string
  defaultAutosaveDir: string
  isDev: boolean
}

export type ThemeBarRequest = {
  color: string
  symbolColor: string
}

export type FindRequest = {
  text: string
  forward: boolean
  findNext: boolean
}

export type FindStatus = {
  active: boolean
  matches: number
  /** 1-based；0 表示无当前项 */
  ordinal: number
  finalUpdate: boolean
}

export type AutosaveTick = {
  now: number
  reason: 'interval' | 'blur' | 'quit'
}

export type SessionNotice = {
  kind: 'interrupted'
  targetPath: string | null
  recoverable: boolean
}

export type StartupPayload = {
  notice: SessionNotice | null
  doc: FileDoc | null
}

export type MenuCommand =
  | 'new'
  | 'open'
  | 'save'
  | 'saveAs'
  | 'reveal'
  | 'find'
  | 'focus'
  | 'studio'
  | 'themeNext'
  | 'soundTest'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'newTab'
  | 'closeTab'
  | 'nextTab'
  | 'prevTab'
  | 'fullscreen'
  | 'quit'
  | 'about'
