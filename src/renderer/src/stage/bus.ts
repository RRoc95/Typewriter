import type { CaretSnapshot, StrikeKind } from '../editor/engine'

export type StageEvent =
  | { t: 'caret'; caret: CaretSnapshot | null }
  | { t: 'strike'; kind: StrikeKind; char: string; caret: CaretSnapshot | null }
  | { t: 'scroll'; ratio: number; velocity: number }

type Listener = (event: StageEvent) => void

const listeners = new Set<Listener>()

export function emitStage(event: StageEvent): void {
  for (const listener of listeners) listener(event)
}

export function subscribeStage(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
