import { useEffect, useRef } from 'react'
import type { RoomScene } from './roomScenes'

type Props = {
  scene: RoomScene
  height: number
  paused: boolean
}

export function RoomBackdrop({ scene, height, paused }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const scale = height / scene.height
  const { flame } = scene

  useEffect(() => {
    let nativeActive = false
    let receivedActivity = false
    let disposed = false
    const updateActivity = () => {
      if (rootRef.current) rootRef.current.dataset.inactive = String(document.hidden || !nativeActive)
    }
    const unsubscribe = window.api.onWindowActivity((active) => {
      receivedActivity = true
      nativeActive = active
      updateActivity()
    })
    // Subscribe before taking the snapshot; a late reply must not overwrite a
    // newer hide/focus event, or update an unmounted (StrictMode) instance.
    void window.api.win.state().then((result) => {
      if (disposed || receivedActivity || !result.ok) return
      nativeActive = result.data.active
      updateActivity()
    }).catch(() => { /* Leave decorative motion paused if the snapshot fails. */ })
    updateActivity()
    document.addEventListener('visibilitychange', updateActivity)
    return () => {
      disposed = true
      unsubscribe()
      document.removeEventListener('visibilitychange', updateActivity)
    }
  }, [])

  return (
    <div className="room-backdrop" ref={rootRef} data-paused={paused} aria-hidden="true">
      {/* Anchor each edge separately: resizing never stretches a window or candle.
          The join stays behind the opaque page in the middle of the viewport. */}
      <div className="room-wing room-wing-left">
        <img className="room-image" src={scene.image} alt="" draggable={false} />
      </div>
      <div className="room-wing room-wing-right">
        <img className="room-image" src={scene.image} alt="" draggable={false} />
      </div>
      <div
        className="room-fire"
        data-kind={flame.kind}
        style={{
          left: flame.x * scale,
          top: flame.y * scale,
          width: flame.width * scale,
          height: flame.height * scale
        }}
      >
        <img className="room-flame room-flame-glow" src={flame.image} alt="" draggable={false} />
        <img className="room-flame room-flame-main" src={flame.image} alt="" draggable={false} />
      </div>
    </div>
  )
}
