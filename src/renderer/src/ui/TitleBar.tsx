import type { ReactNode } from 'react'
import { formatShortcut } from '../../../shared/menu'
import markUrl from '../assets/mark.svg?url'

type TitleBarProps = {
  menu: ReactNode
  focus: boolean
  studioOpen: boolean
  onStudio: () => void
  onFocus: () => void
}

export function TitleBar({ menu, focus, studioOpen, onStudio, onFocus }: TitleBarProps) {
  return (
    <header className="titlebar">
      <img className="mark" src={markUrl} alt="" draggable={false} />
      {menu}
      <span className="spacer" />
      <div className="chips">
        <button className="chip" data-active={focus} onClick={onFocus} title={formatShortcut('CmdOrCtrl+Shift+F', window.api.platform)}>
          专注
        </button>
        <button className="chip" data-active={studioOpen} onClick={onStudio} title={formatShortcut('CmdOrCtrl+,', window.api.platform)}>
          面板
        </button>
      </div>
    </header>
  )
}
