import { PRESETS, type PresetId, type StrikePreset } from './presets'

export type SoundKind = 'char' | 'space' | 'enter' | 'backspace' | 'bell' | 'tab'

const dbToGain = (db: number): number => Math.pow(10, db / 20)
const jitter = (amount: number): number => 1 + (Math.random() * 2 - 1) * amount

/**
 * Web Audio 实时合成。没有音频素材文件，所有声音都是噪声爆发 + 带通 + 指数包络
 * + 机身正弦 + 金属泛音叠出来的，因此可以按预设整组换音色。
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private convolver: ConvolverNode | null = null
  private noise: AudioBuffer | null = null
  private voices = 0
  private preset: PresetId = 'nocturne'
  private volume = 0.65
  private muted = false

  /** 必须在真实用户手势里调用。 */
  unlock(): void {
    if (this.preset === 'silent') return
    this.ensure()
  }

  setPreset(id: PresetId): void {
    this.preset = id
    if (id === 'silent') {
      void this.close()
      return
    }
    this.ensure()
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v))
    this.applyVolume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyVolume()
  }

  async close(): Promise<void> {
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.convolver = null
    this.noise = null
    this.voices = 0
    if (ctx && ctx.state !== 'closed') await ctx.close().catch(() => undefined)
  }

  play(kind: SoundKind, pan = 0): void {
    if (this.preset === 'silent' || this.muted) return
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (this.voices > 12) return

    const preset = PRESETS[this.preset as Exclude<PresetId, 'silent'>]
    const t0 = ctx.currentTime + 0.002
    const out = ctx.createGain()
    out.gain.value = dbToGain(preset.trim)

    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.min(1, Math.max(-1, pan))
    out.connect(panner)
    panner.connect(this.master)

    if (this.convolver && preset.wet > 0) {
      const send = ctx.createGain()
      send.gain.value = preset.wet
      out.connect(send)
      send.connect(this.convolver)
    }

    this.voices++
    if (kind === 'bell') this.bell(ctx, out, t0, preset)
    else if (kind === 'enter') this.enter(ctx, out, t0, preset)
    else if (kind === 'backspace') this.thud(ctx, out, t0, preset)
    else if (kind === 'tab') this.click(ctx, out, t0, preset)
    else this.strike(ctx, out, t0, preset, kind === 'space')
  }

  /** 试听：一声普通击键，位置居中。 */
  test(): void {
    this.play('char', 0)
  }

  private applyVolume(): void {
    if (!this.master || !this.ctx) return
    const target = this.muted ? 0 : Math.pow(this.volume, 1.6)
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02)
  }

  private ensure(): AudioContext | null {
    if (this.preset === 'silent') return null
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 })
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : Math.pow(this.volume, 1.6)

      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.ratio.value = 3
      comp.attack.value = 0.003
      comp.release.value = 0.12

      master.connect(comp)
      comp.connect(ctx.destination)

      const convolver = ctx.createConvolver()
      convolver.buffer = this.makeRoom(ctx, 0.42)
      convolver.connect(comp)

      this.ctx = ctx
      this.master = master
      this.convolver = convolver
      this.noise = null
      return ctx
    } catch {
      return null
    }
  }

  private makeRoom(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * Math.exp(-t * 3)
    }
    let prev = 0
    for (let i = 0; i < length; i++) {
      prev = prev * 0.82 + data[i] * 0.18
      data[i] = prev
    }
    return buffer
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise
    const length = ctx.sampleRate
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }

  private burst(
    ctx: AudioContext,
    dest: AudioNode,
    t0: number,
    _preset: StrikePreset,
    options: { freq: number; q: number; peak: number; attack: number; decay: number; delay?: number }
  ): void {
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = options.freq * jitter(0.05)
    filter.Q.value = options.q

    const gain = ctx.createGain()
    const start = t0 + (options.delay ?? 0)
    const attack = options.attack
    const decay = options.decay * jitter(0.1)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(options.peak * jitter(0.12), start + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(dest)
    source.start(start, Math.random() * 0.6, attack + decay + 0.03)
    source.stop(start + attack + decay + 0.04)
    source.onended = () => {
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }

  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    t0: number,
    freq: number,
    gainValue: number,
    decay: number,
    delay = 0,
    type: OscillatorType = 'sine'
  ): void {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq * jitter(0.04)
    const gain = ctx.createGain()
    const start = t0 + delay
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(gainValue * jitter(0.15), start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + decay)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(start)
    osc.stop(start + decay + 0.03)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }

  private cleanup(dest: AudioNode, seconds: number): void {
    setTimeout(
      () => {
        this.voices = Math.max(0, this.voices - 1)
        dest.disconnect()
      },
      Math.max(120, seconds * 1000)
    )
  }

  private strike(ctx: AudioContext, out: GainNode, t0: number, preset: StrikePreset, isSpace: boolean): void {
    const filter = preset.lowpass ? ctx.createBiquadFilter() : null
    if (filter && preset.lowpass) {
      filter.type = 'lowpass'
      filter.frequency.value = preset.lowpass
      filter.connect(out)
    }
    const dest: AudioNode = filter ?? out

    this.burst(ctx, dest, t0, preset, {
      freq: preset.band.freq * (isSpace ? 0.6 : 1),
      q: preset.band.q,
      peak: preset.noise.peak * (isSpace ? 0.8 : 1),
      attack: preset.noise.attack,
      decay: preset.noise.decay * (isSpace ? 1.5 : 1)
    })

    for (const partial of preset.body) {
      const gainValue = partial.gain * (isSpace ? 0.6 : 1)
      this.tone(ctx, dest, t0, partial.freq, gainValue, partial.decay * (isSpace ? 1.4 : 1))
    }

    if (!isSpace) {
      for (const partial of preset.metal) {
        this.tone(ctx, dest, t0, partial.freq, partial.gain, partial.decay)
      }
      if (preset.second) {
        this.burst(ctx, dest, t0, preset, {
          freq: 900,
          q: 1.1,
          peak: preset.second.gain,
          attack: 0.002,
          decay: 0.05,
          delay: preset.second.delay
        })
      }
    }
    this.cleanup(out, 0.4)
  }

  private thud(ctx: AudioContext, out: GainNode, t0: number, preset: StrikePreset): void {
    this.burst(ctx, out, t0, preset, {
      freq: 450,
      q: 1.1,
      peak: preset.noise.peak * 0.7,
      attack: 0.002,
      decay: 0.032
    })
    this.tone(ctx, out, t0, 105, 0.1, 0.045)
    this.cleanup(out, 0.2)
  }

  private click(ctx: AudioContext, out: GainNode, t0: number, preset: StrikePreset): void {
    this.burst(ctx, out, t0, preset, {
      freq: 2200,
      q: 2,
      peak: preset.noise.peak * 0.55,
      attack: 0.001,
      decay: 0.018
    })
    this.cleanup(out, 0.15)
  }

  private enter(ctx: AudioContext, out: GainNode, t0: number, preset: StrikePreset): void {
    // 擒纵双击
    for (const delay of [0, 0.02]) {
      this.burst(ctx, out, t0, preset, {
        freq: 1800,
        q: 1.6,
        peak: preset.noise.peak * 0.5,
        attack: 0.001,
        decay: 0.016,
        delay
      })
    }
    // 走纸：带通从 200Hz 扫到 80Hz
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 0.9
    filter.frequency.setValueAtTime(200, t0)
    filter.frequency.exponentialRampToValueAtTime(80, t0 + 0.18)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.11, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(out)
    source.start(t0, Math.random() * 0.5, 0.24)
    source.stop(t0 + 0.24)
    source.onended = () => {
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
    this.tone(ctx, out, t0 + 0.01, 92, 0.08, 0.12)
    this.cleanup(out, 0.4)
  }

  private bell(ctx: AudioContext, out: GainNode, t0: number, preset: StrikePreset): void {
    void preset
    this.tone(ctx, out, t0, 2093, 0.06, 0.9)
    this.tone(ctx, out, t0, 2637, 0.035, 0.75)
    this.tone(ctx, out, t0, 1046, 0.02, 1.1)
    this.cleanup(out, 1.2)
  }
}

export const audioEngine = new AudioEngine()
