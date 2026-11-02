import { useEffect, useRef, useState } from 'react'
import type { FindStatus } from '../../../shared/ipc'
import { formatShortcut } from '../../../shared/menu'
import { useAppStore } from '../state/store'

export function Toasts() {
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" data-kind={toast.kind} onClick={() => dismiss(toast.id)}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

type WelcomeProps = {
  show: boolean
  recent: string[]
  onOpenRecent: (path: string) => void
}

export function Welcome({ show, recent, onOpenRecent }: WelcomeProps) {
  return (
    <div className="welcome" data-show={show} aria-hidden={!show}>
      <div className="mark">打字机</div>
      <div className="sub">
        {formatShortcut('CmdOrCtrl+O', window.api.platform)} 打开 · {formatShortcut('CmdOrCtrl+S', window.api.platform)} 保存 · 直接开始打字
      </div>
      {recent.length > 0 && (
        <div className="recent">
          {recent.slice(0, 4).map((file) => (
            <button key={file} onClick={() => onOpenRecent(file)} title={file}>
              {file}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type FindBarProps = {
  open: boolean
  onClose: () => void
}

export function FindBar({ open, onClose }: FindBarProps) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<FindStatus | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => window.api.onFindResult(setStatus), [])

  useEffect(() => {
    if (!open) {
      setStatus(null)
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (timer.current) clearTimeout(timer.current)
    if (!text) {
      void window.api.find.stop()
      setStatus(null)
      return
    }
    timer.current = setTimeout(() => {
      void window.api.find.start(text, true, false)
    }, 180)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [text, open])

  if (!open) return null

  const close = () => {
    void window.api.find.stop()
    setText('')
    onClose()
  }

  return (
    <div className="findbar" data-no-caret>
      <input
        ref={inputRef}
        value={text}
        placeholder="查找…"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          } else if (event.key === 'Enter') {
            event.preventDefault()
            void window.api.find.next(!event.shiftKey)
          }
        }}
      />
      <span className="count">
        {status && status.matches > 0 ? `${status.ordinal}/${status.matches}` : text ? '无匹配' : ''}
      </span>
      <button onClick={() => void window.api.find.next(false)} title="上一个">
        ↑
      </button>
      <button onClick={() => void window.api.find.next(true)} title="下一个">
        ↓
      </button>
      <button onClick={close} title="关闭">
        ✕
      </button>
    </div>
  )
}

type ConfirmProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = '取消',
  danger,
  onConfirm,
  onCancel
}: ConfirmProps) {
  if (!open) return null
  return (
    <div className="modal-mask" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="actions">
          <button className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn" data-primary={!danger} data-danger={danger} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
