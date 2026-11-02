import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { CH } from '../shared/ipc'
import type { Api, Unsubscribe } from './api'

const invoke = <T>(channel: string, arg?: unknown): Promise<T> => ipcRenderer.invoke(channel, arg) as Promise<T>

function subscribe<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_event: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: Api = {
  platform: process.platform,
  files: {
    openDialog: () => invoke(CH.FILE_OPEN_DIALOG),
    openPath: (filePath) => invoke(CH.FILE_OPEN_PATH, { filePath }),
    save: (req) => invoke(CH.FILE_SAVE, req),
    saveAs: (suggestedName) => invoke(CH.FILE_SAVE_AS_DIALOG, { suggestedName }),
    stat: (filePath) => invoke(CH.FILE_STAT, { filePath }),
    reveal: (filePath) => invoke(CH.FILE_REVEAL, { filePath })
  },
  settings: {
    get: () => invoke(CH.SETTINGS_GET),
    patch: (patch) => invoke(CH.SETTINGS_PATCH, patch),
    reset: () => invoke(CH.SETTINGS_RESET)
  },
  fonts: {
    import: () => invoke(CH.FONTS_IMPORT),
    listCustom: () => invoke(CH.FONTS_LIST_CUSTOM),
    read: (id) => invoke(CH.FONTS_READ, { id }),
    remove: (id) => invoke(CH.FONTS_DELETE, { id })
  },
  dialog: {
    chooseDir: () => invoke(CH.DIALOG_CHOOSE_DIR)
  },
  recent: {
    add: (filePath) => invoke(CH.RECENT_ADD, { filePath }),
    list: () => invoke(CH.RECENT_LIST),
    clear: () => invoke(CH.RECENT_CLEAR)
  },
  win: {
    state: () => invoke(CH.WIN_GET_STATE),
    closeReady: (saved) => invoke(CH.WIN_CLOSE_READY, { saved }),
    setTitle: (title) => invoke(CH.WIN_SET_TITLE, { title })
  },
  app: {
    info: () => invoke(CH.APP_INFO),
    startup: () => invoke(CH.STARTUP)
  },
  theme: {
    titleBar: (req) => invoke(CH.THEME_TITLEBAR, req)
  },
  find: {
    start: (text, forward, findNext) => invoke(CH.FIND_START, { text, forward, findNext }),
    next: (forward) => invoke(CH.FIND_NEXT, { forward }),
    stop: () => invoke(CH.FIND_STOP)
  },
  menu: {
    context: (hasSelection) => invoke(CH.CONTEXT_MENU, { hasSelection })
  },
  edit: {
    action: (action) => invoke(CH.EDIT_ACTION, { action })
  },
  appCommand: (command) => invoke(CH.APP_COMMAND, { command }),
  session: {
    saved: (payload) => invoke(CH.SESSION_SAVED, payload),
    clear: () => invoke(CH.SESSION_NOTICE)
  },
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },
  onTick: (cb) => subscribe(CH.AUTOSAVE_TICK, cb),
  onRequestClose: (cb) => subscribe<void>(CH.WIN_REQUEST_CLOSE, () => cb()),
  onMenu: (cb) => {
    const listener = (_event: unknown, command: string, payload?: string): void => {
      cb(command as never, payload)
    }
    ipcRenderer.on(CH.MENU_COMMAND, listener)
    return () => {
      ipcRenderer.removeListener(CH.MENU_COMMAND, listener)
    }
  },
  onFindResult: (cb) => subscribe(CH.FIND_RESULT, cb),
  onOpenFile: (cb) => subscribe(CH.SHELL_OPEN_FILE, cb),
  onSessionNotice: (cb) => subscribe(CH.SESSION_INTERRUPTED, cb)
}

contextBridge.exposeInMainWorld('api', api)
