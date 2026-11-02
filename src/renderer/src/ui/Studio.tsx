import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CustomFont } from '../../../shared/ipc'
import { DEFAULT_SETTINGS, INTERVAL_CHOICES, type SettingsV1 } from '../../../shared/settings'
import {
  PAPER_WIDTHS,
  TEXTURE_IDS,
  THEME_LIST,
  type ThemeId,
  type ThemeTokens
} from '../../../shared/theme-tokens'
import { audioEngine } from '../audio/AudioEngine'
import { PRESET_LIST, type PresetId } from '../audio/presets'
import { saveDocument } from '../autosave/controller'
import { BUNDLED_FONTS } from '../fonts/catalog'
import { registerCustomFonts, unregisterCustomFont } from '../fonts/loader'
import { detectSystemFonts } from '../fonts/probe'
import { useAppStore, type StudioTab } from '../state/store'
import { roomSceneFor } from '../stage/roomScenes'

const TEXTURE_LABEL: Record<string, string> = {
  plain: '素纸',
  laid: '直纹',
  wove: '布纹',
  felt: '绒面',
  parchment: '羊皮',
  grid: '方格'
}

const TABS: Array<{ id: StudioTab; label: string; icon: ReactNode }> = [
  {
    id: 'theme',
    label: '主题',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.6" />
        <path d="M5.4 10.8 8 5.2l2.6 5.6" />
      </svg>
    )
  },
  {
    id: 'type',
    label: '字体',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.8 12.6 6.3 3.4h1.4l3.5 9.2" />
        <path d="M4.3 9.1h5.4" />
      </svg>
    )
  },
  {
    id: 'sound',
    label: '声音',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 6.2h2.2L8.4 3v10L5.2 9.8H3z" />
        <path d="M10.8 6.2a2.6 2.6 0 0 1 0 3.6" />
      </svg>
    )
  },
  {
    id: 'autosave',
    label: '自动保存',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.4" />
        <path d="M8 5.2V8l2 1.4" />
      </svg>
    )
  }
]

function usePatch() {
  return async (patch: Partial<SettingsV1>) => {
    const response = await window.api.settings.patch(patch)
    if (response.ok) useAppStore.getState().setSettings(response.data)
  }
}

function ThemeThumb({ theme }: { theme: ThemeTokens }) {
  const scene = roomSceneFor(theme.id)
  const style = {
    '--t-room-a': theme.room.wallTop,
    '--t-room-b': theme.room.wallBottom,
    '--t-paper': theme.paper.base,
    '--t-edge': theme.paper.edge,
    '--t-ink': theme.ink.text,
    '--t-metal': theme.metal.body,
    '--t-metal-hi': theme.metal.bodyHi,
    '--t-light': theme.light.key
  } as CSSProperties

  return (
    <span className="thumb" style={style} aria-hidden="true">
      <span
        className="thumb-room"
        style={scene ? { backgroundImage: `url("${scene.image}")`, backgroundSize: 'cover' } : undefined}
      />
      <span className="thumb-glow" />
      <span className="thumb-paper">
        <i style={{ width: '74%' }} />
        <i style={{ width: '88%' }} />
        <i style={{ width: '56%' }} />
        <i style={{ width: '68%' }} />
      </span>
      <span className="thumb-machine" />
      <span className="thumb-platen" />
    </span>
  )
}

function FontRow({
  family,
  tag,
  active,
  onPick,
  onRemove
}: {
  family: string
  tag: string
  active: boolean
  onPick: () => void
  onRemove?: () => void
}) {
  return (
    <div className="font-item" data-active={active}>
      <button className="font-pick" onClick={onPick} title={family}>
        <span className="font-name">{family}</span>
        <span className="sample" style={{ fontFamily: `"${family}"` }}>
          永 Aa 123
        </span>
      </button>
      <span className="tag">{tag}</span>
      {onRemove && (
        <button className="del" title="删除该字体" onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  )
}

type StudioProps = {
  open: boolean
  tab: StudioTab
  onTab: (tab: StudioTab) => void
}

export function Studio({ open, tab, onTab }: StudioProps) {
  const settings = useAppStore((s) => s.settings)
  const patch = usePatch()

  const [customFonts, setCustomFonts] = useState<CustomFont[]>([])
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const systemFonts = useMemo(() => detectSystemFonts(), [])
  const importRef = useRef(false)

  useEffect(() => {
    if (!open) return
    void window.api.fonts.listCustom().then((response) => {
      if (!response.ok) return
      setCustomFonts(response.data)
      void registerCustomFonts(response.data)
    })
  }, [open])

  if (!settings) return null

  const fontFamily = settings.font.family

  const importFont = async () => {
    if (importRef.current) return
    importRef.current = true
    setImporting(true)
    const response = await window.api.fonts.import()
    setImporting(false)
    importRef.current = false
    if (!response.ok) {
      useAppStore.getState().toast(response.message, 'error')
      return
    }
    if ('canceled' in response.data) return
    const font = response.data
    const registered = await registerCustomFonts([font])
    if (registered.length === 0) {
      useAppStore.getState().toast('字体文件无法解析，已跳过', 'error')
      return
    }
    setCustomFonts((prev) => [...prev, font])
    await patch({ font: { ...settings.font, family: font.family } })
    useAppStore.getState().toast(`已加载字体 ${font.family}`)
  }

  const removeFont = async (font: CustomFont) => {
    const response = await window.api.fonts.remove(font.id)
    if (!response.ok) {
      useAppStore.getState().toast(response.message, 'error')
      return
    }
    unregisterCustomFont(font.id, font.family)
    setCustomFonts((prev) => prev.filter((item) => item.id !== font.id))
    if (fontFamily === font.family) {
      await patch({ font: { ...settings.font, family: DEFAULT_SETTINGS.font.family } })
      useAppStore.getState().toast('该字体已删除，已回退默认字体')
    }
  }

  const chooseDir = async () => {
    const response = await window.api.dialog.chooseDir()
    if (!response.ok) {
      useAppStore.getState().toast(response.message, 'error')
      return
    }
    if ('canceled' in response.data) return
    await patch({ autosave: { ...settings.autosave, fixedDir: response.data.dirPath } })
  }

  const filteredSystem = query
    ? systemFonts.filter((family) => family.toLowerCase().includes(query.toLowerCase()))
    : systemFonts
  const filteredCustom = query
    ? customFonts.filter((font) => font.family.toLowerCase().includes(query.toLowerCase()))
    : customFonts
  const filteredBundled = query
    ? BUNDLED_FONTS.filter((font) => font.family.toLowerCase().includes(query.toLowerCase()))
    : BUNDLED_FONTS

  return (
    <aside className="studio" data-open={open} data-no-caret aria-hidden={!open}>
      <div className="studio-head">
        <span className="studio-title">打字机面板</span>
        <button
          className="icon-btn"
          onClick={() => useAppStore.getState().setStudio(false)}
          title="关闭（Esc）"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
          </svg>
        </button>
      </div>

      <div className="studio-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className="studio-tab"
            data-active={tab === item.id}
            onClick={() => onTab(item.id)}
          >
            <span className="tab-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="studio-body">
        {tab === 'theme' && (
          <>
            <section className="panel">
              <h3>主题</h3>
              <div className="theme-grid">
                {THEME_LIST.map((theme) => (
                  <button
                    key={theme.id}
                    className="theme-card"
                    data-active={settings.theme === theme.id}
                    data-testid={`theme-${theme.id}`}
                    onClick={() => void patch({ theme: theme.id as ThemeId })}
                  >
                    <ThemeThumb theme={theme} />
                    <span className="theme-meta">
                      <span className="name">{theme.name}</span>
                      <span className="blurb">{theme.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <h3>装饰</h3>
              <div className="field">
                <span className="field-label">机身与灯光</span>
                <span className="field-spacer" />
                <div className="seg">
                  <button
                    data-active={settings.decor === 'full'}
                    onClick={() => void patch({ decor: 'full' })}
                  >
                    完整
                  </button>
                  <button
                    data-active={settings.decor === 'classic'}
                    onClick={() => void patch({ decor: 'classic' })}
                  >
                    无装饰
                  </button>
                </div>
              </div>
              <p className="hint">无装饰会真的停掉灯光、辉光与机身绘制，也不播字锤动画。</p>
            </section>

            <section className="panel">
              <h3>纸张</h3>
              <div className="texture-grid">
                {TEXTURE_IDS.map((id) => (
                  <button
                    key={id}
                    className="tex-tile"
                    data-tex={id}
                    data-active={settings.paperTexture === id}
                    onClick={() => void patch({ paperTexture: id })}
                  >
                    <span className="tex-swatch" />
                    <span className="tex-label">{TEXTURE_LABEL[id]}</span>
                  </button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <span className="field-label">纸宽</span>
                <span className="field-spacer" />
                <div className="seg">
                  {PAPER_WIDTHS.map((width) => (
                    <button
                      key={width}
                      data-active={settings.paperWidth === width}
                      onClick={() => void patch({ paperWidth: width })}
                    >
                      {width === 'letter' ? '信纸' : '满滚筒'}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'type' && (
          <>
            <section className="panel">
              <h3>排版</h3>
              <div className="field">
                <span className="field-label">字号</span>
                <input
                  type="range"
                  min={12}
                  max={40}
                  step={1}
                  value={settings.font.size}
                  onChange={(event) =>
                    void patch({ font: { ...settings.font, size: Number(event.target.value) } })
                  }
                />
                <span className="field-value">{settings.font.size}px</span>
              </div>
              <div className="field">
                <span className="field-label">行距</span>
                <input
                  type="range"
                  min={1.2}
                  max={2.4}
                  step={0.02}
                  value={settings.font.lineHeightRatio}
                  onChange={(event) =>
                    void patch({
                      font: { ...settings.font, lineHeightRatio: Number(event.target.value) }
                    })
                  }
                />
                <span className="field-value">{settings.font.lineHeightRatio.toFixed(2)}×</span>
              </div>
            </section>

            <section className="panel">
              <h3>字体</h3>
              <div className="toolbar">
                <button className="btn" onClick={() => void importFont()} disabled={importing}>
                  {importing ? '正在读取…' : '加载字体…'}
                </button>
                <input
                  className="text-input"
                  placeholder="搜索字体"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div className="font-list">
                {filteredBundled.map((font) => (
                  <FontRow
                    key={font.family}
                    family={font.family}
                    tag="内置"
                    active={fontFamily === font.family}
                    onPick={() => void patch({ font: { ...settings.font, family: font.family } })}
                  />
                ))}

                {filteredCustom.map((font) => (
                  <FontRow
                    key={font.id}
                    family={font.family}
                    tag="自定义"
                    active={fontFamily === font.family}
                    onPick={() => void patch({ font: { ...settings.font, family: font.family } })}
                    onRemove={() => void removeFont(font)}
                  />
                ))}

                {filteredSystem.map((family) => (
                  <FontRow
                    key={family}
                    family={family}
                    tag="系统"
                    active={fontFamily === family}
                    onPick={() => void patch({ font: { ...settings.font, family } })}
                  />
                ))}

                {filteredBundled.length + filteredCustom.length + filteredSystem.length === 0 && (
                  <div className="empty">没有匹配的字体</div>
                )}
              </div>
              <p className="hint">中文靠系统字体，内置只有三款拉丁打字机字体。</p>
            </section>
          </>
        )}

        {tab === 'sound' && (
          <>
            <section className="panel">
              <h3>打字音色</h3>
              <div className="sound-list">
                {PRESET_LIST.map((preset) => (
                  <div
                    key={preset.id}
                    className="sound-row"
                    data-active={settings.sound.preset === preset.id}
                  >
                    <button
                      className="sound-main"
                      onClick={() =>
                        void patch({ sound: { ...settings.sound, preset: preset.id as PresetId } })
                      }
                    >
                      <span className="radio" />
                      <span className="sound-text">
                        <span className="name">{preset.name}</span>
                        <span className="blurb">{preset.blurb}</span>
                      </span>
                    </button>
                    {preset.id !== 'silent' && (
                      <button
                        className="btn tiny"
                        onClick={() => {
                          audioEngine.setPreset(preset.id as PresetId)
                          audioEngine.test()
                        }}
                      >
                        试听
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h3>音量与开关</h3>
              <div className="field">
                <span className="field-label">音量</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.sound.volume}
                  onChange={(event) => {
                    const volume = Number(event.target.value)
                    audioEngine.setVolume(volume)
                    void patch({ sound: { ...settings.sound, volume } })
                  }}
                />
                <span className="field-value">{Math.round(settings.sound.volume * 100)}%</span>
              </div>
              <div className="field">
                <span className="field-label">页边铃</span>
                <span className="field-spacer" />
                <button
                  className="switch"
                  data-on={settings.sound.bell}
                  onClick={() => void patch({ sound: { ...settings.sound, bell: !settings.sound.bell } })}
                />
              </div>
              <div className="field">
                <span className="field-label">按位置左右分声</span>
                <span className="field-spacer" />
                <button
                  className="switch"
                  data-on={settings.sound.pan}
                  onClick={() => void patch({ sound: { ...settings.sound, pan: !settings.sound.pan } })}
                />
              </div>
              <p className="hint">第 68 列响铃只提示，不改动文本，也不会自动硬换行。</p>
            </section>
          </>
        )}

        {tab === 'autosave' && (
          <>
            <section className="panel">
              <h3>自动保存</h3>
              <div className="field">
                <span className="field-label">启用</span>
                <span className="field-spacer" />
                <button
                  className="switch"
                  data-on={settings.autosave.enabled}
                  onClick={() =>
                    void patch({ autosave: { ...settings.autosave, enabled: !settings.autosave.enabled } })
                  }
                />
              </div>
              <div className="field">
                <span className="field-label">间隔</span>
                <span className="field-spacer" />
                <div className="seg">
                  {INTERVAL_CHOICES.map((seconds) => (
                    <button
                      key={seconds}
                      data-active={settings.autosave.intervalSec === seconds}
                      onClick={() =>
                        void patch({ autosave: { ...settings.autosave, intervalSec: seconds } })
                      }
                    >
                      {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field-label">换行符</span>
                <span className="field-spacer" />
                <div className="seg">
                  <button
                    data-active={settings.autosave.eol === 'preserve'}
                    onClick={() => void patch({ autosave: { ...settings.autosave, eol: 'preserve' } })}
                  >
                    原样
                  </button>
                  <button
                    data-active={settings.autosave.eol === 'crlf'}
                    onClick={() => void patch({ autosave: { ...settings.autosave, eol: 'crlf' } })}
                  >
                    CRLF
                  </button>
                  <button
                    data-active={settings.autosave.eol === 'lf'}
                    onClick={() => void patch({ autosave: { ...settings.autosave, eol: 'lf' } })}
                  >
                    LF
                  </button>
                </div>
              </div>
              <div className="field">
                <span className="field-label">立即写入一次</span>
                <span className="field-spacer" />
                <button className="btn tiny" onClick={() => void saveDocument()}>
                  保存
                </button>
              </div>
            </section>

            <section className="panel">
              <h3>保存位置</h3>
              <div className="path-box" title={settings.autosave.fixedDir ?? undefined}>
                {settings.autosave.fixedDir ?? '文档\\打字机（默认）'}
              </div>
              <div className="toolbar">
                <button className="btn" onClick={() => void chooseDir()}>
                  选择目录…
                </button>
                {settings.autosave.fixedDir && (
                  <button
                    className="btn"
                    data-danger="true"
                    onClick={() => void patch({ autosave: { ...settings.autosave, fixedDir: null } })}
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <p className="hint">
                已「另存为」的文稿始终原地覆盖。新文稿以「标题-日期时间.txt」落在这里，时间戳一次会话内固定。
              </p>
            </section>
          </>
        )}
      </div>
    </aside>
  )
}
