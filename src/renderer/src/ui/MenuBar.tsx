import { useEffect, useRef, useState } from 'react'
import type { MenuCommand } from '../../../shared/ipc'
import { MENU, type EditAction } from '../../../shared/menu'

type Props = {
  onCommand: (command: MenuCommand) => void
  onEdit: (action: EditAction) => void
}

export function MenuBar({ onCommand, onEdit }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menubar" ref={rootRef}>
      {MENU.map((group) => (
        <div className="menubar-group" key={group.id}>
          <button
            className="menubar-button"
            data-open={open === group.id}
            onClick={() => setOpen(open === group.id ? null : group.id)}
            onPointerEnter={() => {
              if (open) setOpen(group.id)
            }}
          >
            {group.label}
          </button>

          {open === group.id && (
            <div className="menubar-drop" role="menu">
              {group.items.map((item) =>
                item.separator ? (
                  <div className="menubar-sep" key={item.id} />
                ) : (
                  <button
                    key={item.id}
                    className="menubar-item"
                    data-danger={item.danger}
                    onClick={() => {
                      setOpen(null)
                      if (item.edit) onEdit(item.edit)
                      else if (item.command) onCommand(item.command)
                    }}
                  >
                    <span>{item.label}</span>
                    {item.accelerator && <kbd>{item.accelerator}</kbd>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
