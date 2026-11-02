import type { TabMeta } from '../state/store'
import { formatShortcut } from '../../../shared/menu'

type Props = {
  tabs: TabMeta[]
  activeId: string
  onActivate: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

export function TabBar({ tabs, activeId, onActivate, onClose, onNew }: Props) {
  return (
    <div className="tabbar" data-empty={tabs.length === 0}>
      <div className="tabbar-strip">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="tab"
            data-active={tab.id === activeId}
            data-testid={`tab-${tab.id}`}
            onPointerDown={(event) => {
              if (event.button === 0) onActivate(tab.id)
            }}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault()
                onClose(tab.id)
              }
            }}
            title={tab.filePath ?? tab.name}
          >
            <span className="tab-label">{tab.name}</span>
            <span className="tab-dirty" data-dirty={tab.dirty} />
            <button
              className="tab-close"
              title={`关闭（${formatShortcut('CmdOrCtrl+W', window.api.platform)}）`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab.id)
              }}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.2 3.2l5.6 5.6M8.8 3.2l-5.6 5.6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button className="tab-new" onClick={onNew} title={`新建标签页（${formatShortcut('CmdOrCtrl+N', window.api.platform)}）`}>
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="M7 3v8M3 7h8" />
        </svg>
      </button>
    </div>
  )
}
