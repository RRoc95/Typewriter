export type PresetId = 'underwood' | 'nocturne' | 'modern' | 'quiet' | 'silent'

export type Partial_ = {
  freq: number
  gain: number
  decay: number
}

export type StrikePreset = {
  id: Exclude<PresetId, 'silent'>
  name: string
  blurb: string
  band: { freq: number; q: number }
  noise: { attack: number; decay: number; peak: number }
  body: Partial_[]
  metal: Partial_[]
  second: { gain: number; delay: number } | null
  lowpass: number | null
  wet: number
  /** dB */
  trim: number
}

export const PRESETS: Record<Exclude<PresetId, 'silent'>, StrikePreset> = {
  underwood: {
    id: 'underwood',
    name: 'Underwood',
    blurb: '老式重击：低频厚、余震长',
    band: { freq: 1400, q: 0.9 },
    noise: { attack: 0.003, decay: 0.095, peak: 0.9 },
    body: [
      { freq: 130, gain: 0.34, decay: 0.06 },
      { freq: 380, gain: 0.2, decay: 0.05 },
      { freq: 900, gain: 0.1, decay: 0.035 }
    ],
    metal: [
      { freq: 2400, gain: 0.07, decay: 0.014 },
      { freq: 3600, gain: 0.045, decay: 0.01 }
    ],
    second: { gain: 0.3, delay: 0.055 },
    lowpass: null,
    wet: 0.16,
    trim: 0
  },
  nocturne: {
    id: 'nocturne',
    name: 'Nocturne',
    blurb: '柔和：闷响、短促、不刺耳',
    band: { freq: 900, q: 1.4 },
    noise: { attack: 0.008, decay: 0.13, peak: 0.62 },
    body: [
      { freq: 160, gain: 0.2, decay: 0.048 },
      { freq: 420, gain: 0.12, decay: 0.04 }
    ],
    metal: [{ freq: 3000, gain: 0.028, decay: 0.012 }],
    second: { gain: 0.15, delay: 0.045 },
    lowpass: 6000,
    wet: 0.1,
    trim: -2
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    blurb: '干脆：高频亮、几乎无尾音',
    band: { freq: 2600, q: 2.2 },
    noise: { attack: 0.0015, decay: 0.038, peak: 0.72 },
    body: [{ freq: 220, gain: 0.12, decay: 0.03 }],
    metal: [{ freq: 3200, gain: 0.11, decay: 0.009 }],
    second: { gain: 0.08, delay: 0.035 },
    lowpass: null,
    wet: 0.06,
    trim: -1
  },
  quiet: {
    id: 'quiet',
    name: 'Quiet',
    blurb: '极轻：像隔着一层纸',
    band: { freq: 700, q: 1 },
    noise: { attack: 0.006, decay: 0.055, peak: 0.2 },
    body: [{ freq: 150, gain: 0.08, decay: 0.045 }],
    metal: [],
    second: null,
    lowpass: 3500,
    wet: 0.04,
    trim: -14
  }
}

export const PRESET_LIST: Array<{ id: PresetId; name: string; blurb: string }> = [
  { id: 'underwood', name: PRESETS.underwood.name, blurb: PRESETS.underwood.blurb },
  { id: 'nocturne', name: PRESETS.nocturne.name, blurb: PRESETS.nocturne.blurb },
  { id: 'modern', name: PRESETS.modern.name, blurb: PRESETS.modern.blurb },
  { id: 'quiet', name: PRESETS.quiet.name, blurb: PRESETS.quiet.blurb },
  { id: 'silent', name: '关闭', blurb: '完全静音，不占用音频设备' }
]
