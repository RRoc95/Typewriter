import type { StageLayout } from '../stageLayout'

export type MachineQuality = 'high' | 'medium' | 'low'

export type MachineSpec = {
  layout: StageLayout
  pixelRatio: number
  quality: MachineQuality
  grid: { left: number; cols: number; cellWidth: number }
  theme: {
    room: string
    light: string
    source: 'carriage' | 'desk-lamp' | 'moonlight'
    trim: string
    /** 机身漆面颜色（本项目在原模型上新增的字段） */
    body?: string
    environment: number
    exposure: number
  }
  paper: { color: string; appearance: 'light' | 'dark' }
  serif: string
}

export type MachineState = {
  headX: number
  sway: number
  strike: number
  vibrator: number
  spool: number
  platenTurn: number
  lamp: boolean
  intensity: number
}

export type Machine = {
  build(spec: MachineSpec): void
  render(state: MachineState): boolean
  dispose(): void
}

export function createMachine(canvas: HTMLCanvasElement, onReady?: () => void): Machine
