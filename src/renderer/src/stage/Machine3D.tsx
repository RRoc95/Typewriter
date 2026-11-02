import { useEffect, useRef } from 'react'
import { subscribeStage } from './bus'
import { createMachine } from './machine/typewriter-machine.js'
import type { StageLayout } from './stageLayout'

type LightSource = 'carriage' | 'desk-lamp' | 'moonlight'

export type MachineTheme = {
  room: string
  light: string
  source: LightSource
  trim: string
  body: string
  environment: number
  exposure: number
}

type Props = {
  layout: StageLayout
  theme: MachineTheme
  paper: { color: string; appearance: 'light' | 'dark' }
  serif: string
  grid: { left: number; cols: number; cellWidth: number }
  pixelRatio: number
  /** 版面或主题变化时递增，用于触发重建。 */
  revision: number
}

type Machine = {
  build: (spec: unknown) => void
  render: (state: unknown) => boolean
  dispose: () => void
}

export function Machine3D({ layout, theme, paper, serif, grid, pixelRatio, revision }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const machineRef = useRef<Machine | null>(null)
  const specRef = useRef({ layout, theme, paper, serif, grid, pixelRatio })

  specRef.current = { layout, theme, paper, serif, grid, pixelRatio }

  // 建场景：canvas 只创建一次，之后靠 build() 重建模型
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let machine: Machine
    try {
      machine = createMachine(canvas, () => undefined) as Machine
    } catch {
      canvas.dataset.webgl = 'false'
      return
    }
    machineRef.current = machine

    return () => {
      machineRef.current = null
      machine.dispose()
    }
  }, [])

  // 版面/主题变化 → 重建模型（模型自带纸面遮挡体，重建后 DOM 文字仍然透出来）
  useEffect(() => {
    const machine = machineRef.current
    if (!machine || !layout.machine) return
    machine.build({
      layout,
      pixelRatio: Math.min(pixelRatio, 2),
      quality: 'high',
      grid,
      theme,
      paper,
      serif
    })
    machine.render(stateRef.current)
  }, [layout, theme, paper, serif, grid, pixelRatio, revision])

  const stateRef = useRef({
    headX: 0,
    sway: 0,
    strike: 0,
    vibrator: 0,
    spool: 0,
    platenTurn: 0,
    lamp: true,
    intensity: 1
  })

  // 打字动画：字锤沿滑轨走格、击打、色带盘转动、换行走纸
  useEffect(() => {
    const machine = machineRef && machineRef.current
    if (!machine) return

    let raf = 0
    let running = false
    let lastActive = 0
    let targetX = 0
    let strikeStart = -10
    let strikePower = 1

    const state = stateRef.current

    const clampHead = (x: number): number =>
      Math.min(layout.platen.right - 18, Math.max(layout.platen.left + 18, x))

    const wake = (): void => {
      lastActive = performance.now()
      if (running) return
      running = true
      raf = requestAnimationFrame(tick)
    }

    const tick = (): void => {
      const now = performance.now()
      state.headX += (targetX - state.headX) * 0.36

      const elapsed = (now - strikeStart) / 1000
      if (elapsed >= 0 && elapsed < 0.2) {
        const t = elapsed / 0.2
        state.strike = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 1.15 * strikePower
        state.sway = (Math.random() - 0.5) * 0.06 * state.strike
        state.vibrator = Math.min(1, state.strike)
      } else {
        state.strike = 0
        state.sway = 0
        state.vibrator = 0
      }

      machine.render(state)

      const settled = Math.abs(targetX - state.headX) < 0.2 && elapsed > 0.25
      if (settled && now - lastActive > 240) {
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const unsubscribe = subscribeStage((event) => {
      if (event.t === 'caret') {
        const caret = event.caret
        if (!caret) return
        targetX = clampHead(layout.text.x + caret.x)
        wake()
        return
      }
      if (event.t === 'strike') {
        strikePower = event.kind === 'enter' ? 1.25 : event.kind === 'backspace' ? 0.55 : 1
        strikeStart = performance.now()
        state.spool += 0.22
        if (event.kind === 'enter') {
          state.platenTurn += 1 / 26
          targetX = clampHead(layout.text.x)
        }
        wake()
      }
    })

    return () => {
      unsubscribe()
      cancelAnimationFrame(raf)
    }
  }, [layout, revision])

  return <canvas className="machine-canvas" ref={canvasRef} aria-hidden="true" />
}
