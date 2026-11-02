import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CaretSnapshot } from '../editor/engine'
import { subscribeStage } from './bus'
import { stageLayout, type StageLayout } from './stageLayout'
import { paperBackground } from './paper'
import type { MachineTheme } from './Machine3D'

const Machine3D = lazy(() => import('./Machine3D').then((module) => ({ default: module.Machine3D })))

type StageProps = {
  children: ReactNode
  decor: 'full' | 'classic'
  lite: boolean
  focus: boolean
  studio: boolean
  theme: {
    id: string
    wallBottom: string
    lightKey: string
    lightSource: MachineTheme['source']
    trim: string
    body: string
    paperBase: string
    paperMode: 'light' | 'dark'
    serif: string
  }
  paperFull: boolean
}

export function Stage({ children, decor, lite, focus, studio, theme, paperFull }: StageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const paperRef = useRef<HTMLDivElement | null>(null)
  const caretRef = useRef<HTMLDivElement | null>(null)
  const inkRef = useRef<HTMLDivElement | null>(null)
  const clipRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const machineOn = decor === 'full' && !focus

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    })
    observer.observe(node)
    const rect = node.getBoundingClientRect()
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    return () => observer.disconnect()
  }, [])

  const layout: StageLayout = useMemo(
    () => stageLayout(size.width || 1000, size.height || 700, machineOn, paperFull ? 1 : 0),
    [size.width, size.height, machineOn, paperFull]
  )

  const machineTheme = useMemo<MachineTheme>(
    () => ({
      room: theme.wallBottom,
      light: theme.lightKey,
      source: theme.lightSource,
      trim: theme.trim,
      body: theme.body,
      environment: theme.paperMode === 'dark' ? 0.55 : 0.8,
      exposure: theme.paperMode === 'dark' ? 1.15 : 1.05
    }),
    [theme.wallBottom, theme.lightKey, theme.lightSource, theme.trim, theme.body, theme.paperMode]
  )

  const paper = useMemo(
    () => ({ color: theme.paperBase, appearance: theme.paperMode }),
    [theme.paperBase, theme.paperMode]
  )

  const paperUrl = useMemo(() => paperBackground(theme.paperBase), [theme.paperBase])

  // 每页列宽用于字锤的擒纵齿距
  const grid = useMemo(() => {
    const cellWidth = 10.8
    const usable = Math.max(200, layout.text.width - 128)
    return {
      left: layout.text.x + 64,
      cols: Math.max(20, Math.floor(usable / cellWidth)),
      cellWidth
    }
  }, [layout.text.x, layout.text.width])

  useEffect(() => {
    let frame = 0
    let pendingCaret: CaretSnapshot | null | undefined
    let lastCaret: CaretSnapshot | null = null
    const stamps: HTMLSpanElement[] = []

    const paintCaret = (caret: CaretSnapshot | null): void => {
      const block = caretRef.current
      if (!block) return
      if (!caret) {
        block.dataset.visible = 'false'
        return
      }
      lastCaret = caret
      block.dataset.visible = 'true'
      block.style.width = `${Math.max(2, caret.advance).toFixed(2)}px`
      block.style.height = `${Math.max(8, caret.height).toFixed(2)}px`
      block.style.transform = `translate3d(${caret.x.toFixed(2)}px, ${(caret.y - caret.scrollTop).toFixed(2)}px, 0)`
    }

    const stamp = (char: string, caret: CaretSnapshot | null): void => {
      const layer = inkRef.current
      if (!layer || !caret || lite) return
      if (!char || char === '\n' || char === '\t' || char === ' ') return

      const node = document.createElement('span')
      node.className = 'ink-stamp'
      node.textContent = char
      node.style.transform = `translate3d(${caret.x.toFixed(2)}px, ${(caret.y - caret.scrollTop).toFixed(2)}px, 0) scale(1.06)`
      layer.appendChild(node)

      const animation = node.animate(
        [{ opacity: 0.45, filter: 'blur(1.8px)' }, { opacity: 1, filter: 'blur(0px)' }],
        { duration: 420, easing: 'cubic-bezier(0.2,0.7,0.2,1)', fill: 'forwards' }
      )
      animation.onfinish = () => node.remove()
      stamps.push(node)
      while (stamps.length > 3) stamps.shift()?.remove()
    }

    const paintClip = (ratio: number, velocity: number): void => {
      const clip = clipRef.current
      const paperNode = paperRef.current
      if (!clip || !paperNode || decor === 'classic') return
      const travel = Math.max(0, paperNode.clientHeight - 56 - 44)
      const y = 20 + Math.min(1, Math.max(0, ratio)) * travel
      const tilt = Math.max(-6, Math.min(6, velocity * 0.5))
      clip.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`
    }

    const observer = new ResizeObserver(() => {
      if (lastCaret) paintCaret(lastCaret)
    })
    if (paperRef.current) observer.observe(paperRef.current)

    const unsubscribe = subscribeStage((event) => {
      if (event.t === 'caret') {
        pendingCaret = event.caret
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0
            if (pendingCaret !== undefined) paintCaret(pendingCaret)
            pendingCaret = undefined
          })
        }
        return
      }
      if (event.t === 'scroll') {
        paintClip(event.ratio, event.velocity)
        return
      }
      if (event.t === 'strike' && event.kind !== 'backspace' && event.kind !== 'enter') {
        stamp(event.char, event.caret)
      }
    })

    return () => {
      observer.disconnect()
      unsubscribe()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [decor, lite])

  return (
    <div
      className="stage"
      data-decor={decor}
      data-focus={focus}
      data-lite={lite}
      data-studio={studio}
    >
      <div className="layer-room" />
      <div className="viewport" ref={viewportRef}>
        <div
          className="paper"
          ref={paperRef}
          style={{
            left: layout.sheet.x,
            top: layout.sheet.y,
            width: layout.sheet.width,
            height: layout.sheet.height,
            backgroundImage: paperUrl ? `url(${paperUrl})` : undefined
          }}
        >
          <div className="paper-fiber" />
          <div className="text-box" style={{ height: layout.text.height }}>
            {children}
          </div>
          <div className="ink-layer" ref={inkRef} />
          <div className="caret-block" ref={caretRef} data-visible="false" />
          <div className="layer-light" />
          <div className="layer-glow" />
          <div className="paper-clip" ref={clipRef} data-no-caret>
            <div className="wire" />
          </div>
        </div>

        {machineOn && (
          <Suspense fallback={null}>
            <Machine3D
              layout={layout}
              theme={machineTheme}
              paper={paper}
              serif={theme.serif}
              grid={grid}
              pixelRatio={typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1}
              revision={size.width + size.height}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
