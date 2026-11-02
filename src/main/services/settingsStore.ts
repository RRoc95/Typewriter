import { app } from 'electron'
import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { clampSettings, DEFAULT_SETTINGS, type SettingsV1 } from '../../shared/settings'
import { atomicWrite } from './atomicWrite'

let cache: SettingsV1 | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<SettingsV1> {
  if (cache) return cache
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    cache = clampSettings(JSON.parse(raw))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      // 坏文件留档，避免下次把用户设置覆盖成默认值还不留痕迹。
      await rename(settingsPath(), `${settingsPath()}.bad-${Date.now()}`).catch(() => undefined)
    }
    cache = { ...DEFAULT_SETTINGS }
  }
  return cache
}

export function getSettings(): SettingsV1 {
  return cache ?? DEFAULT_SETTINGS
}

function mergeOneLevel(base: SettingsV1, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key]
    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
    if (isObject(value) && isObject(current)) {
      out[key] = { ...current, ...value }
    } else {
      out[key] = value
    }
  }
  return out
}

export async function patchSettings(patch: unknown): Promise<SettingsV1> {
  const current = await loadSettings()
  const patchObject =
    typeof patch === 'object' && patch !== null && !Array.isArray(patch)
      ? (patch as Record<string, unknown>)
      : {}
  const next = clampSettings(mergeOneLevel(current, patchObject))
  cache = next
  await atomicWrite(settingsPath(), Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8')).catch(() => undefined)
  return next
}

export async function resetSettings(): Promise<SettingsV1> {
  cache = { ...DEFAULT_SETTINGS }
  await atomicWrite(settingsPath(), Buffer.from(`${JSON.stringify(cache, null, 2)}\n`, 'utf8')).catch(() => undefined)
  return cache
}
