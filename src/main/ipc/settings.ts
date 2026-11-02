import { CH } from '../../shared/ipc'
import type { SettingsV1 } from '../../shared/settings'
import { clearSession, writeSession } from '../services/session'
import { getSettings, loadSettings, patchSettings, resetSettings } from '../services/settingsStore'
import { handle } from './handle'

type SessionPayload = {
  draftId: string
  targetPath: string | null
  hash: string
  textLen: number
  startedAt: number
}

export function registerSettingsIpc(): void {
  handle<void, SettingsV1>(CH.SETTINGS_GET, () => loadSettings())

  handle<Partial<SettingsV1>, SettingsV1>(CH.SETTINGS_PATCH, (patch) => patchSettings(patch))

  handle<void, SettingsV1>(CH.SETTINGS_RESET, () => resetSettings())

  handle<SessionPayload, null>(CH.SESSION_SAVED, async (payload) => {
    if (!payload || typeof payload.hash !== 'string') return null
    await writeSession({
      pid: process.pid,
      startedAt: payload.startedAt || Date.now(),
      draftId: String(payload.draftId ?? ''),
      targetPath: payload.targetPath ?? null,
      lastSavedAt: Date.now(),
      hash: payload.hash,
      textLen: payload.textLen ?? 0
    })
    return null
  })

  handle<void, null>(CH.SESSION_NOTICE, async () => {
    await clearSession()
    return null
  })

  handle<void, string[]>(CH.RECENT_LIST, () => getSettings().recent)

  handle<{ filePath: string }, string[]>(CH.RECENT_ADD, async ({ filePath }) => {
    if (typeof filePath !== 'string' || filePath.length < 3) return getSettings().recent
    const key = filePath.toLowerCase()
    const list = [filePath, ...getSettings().recent.filter((p) => p.toLowerCase() !== key)].slice(0, 10)
    const next = await patchSettings({ recent: list })
    return next.recent
  })

  handle<void, string[]>(CH.RECENT_CLEAR, async () => {
    const next = await patchSettings({ recent: [] })
    return next.recent
  })
}
