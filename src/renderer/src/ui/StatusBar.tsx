import type { AutosaveState } from '../autosave/machine'
import type { TextStats } from '../../../shared/text'
import type { Eol } from '../../../shared/ipc'

type StatusBarProps = {
  stats: TextStats
  save: AutosaveState
  encoding: string
  eol: Eol
  path: string | null
  lite: boolean
  onSaveClick: () => void
  onOpenStudio: () => void
}

const PHASE_LABEL: Record<AutosaveState['phase'], string> = {
  idle: '未开始',
  dirty: '未保存',
  saving: '保存中…',
  saved: '已保存',
  error: '保存失败'
}

function timeOf(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function StatusBar({
  stats,
  save,
  encoding,
  eol,
  path,
  lite,
  onSaveClick,
  onOpenStudio
}: StatusBarProps) {
  const label = PHASE_LABEL[save.phase]
  const time = save.lastSavedAt ? timeOf(save.lastSavedAt) : ''

  return (
    <footer className="statusbar">
      <span
        className="save-state"
        data-phase={save.phase}
        onClick={onSaveClick}
        title={save.lastError ?? path ?? '点击打开自动保存设置'}
      >
        <span>{save.phase === 'error' ? '！' : save.phase === 'dirty' ? '○' : '●'}</span>
        <span>
          {label}
          {save.phase === 'saved' && time ? ` ${time}` : ''}
          {save.phase === 'error' && save.attempts > 0 ? '（点击重试）' : ''}
        </span>
      </span>
      {lite && <span>大文件模式</span>}
      <span className="grow" />
      <span>
        {stats.chars.toLocaleString()} 字 · {stats.paragraphs} 段
      </span>
      <span>{encoding === 'utf16le' ? 'UTF-16LE' : encoding === 'utf8bom' ? 'UTF-8 BOM' : 'UTF-8'}</span>
      <span>{eol === 'crlf' ? 'CRLF' : 'LF'}</span>
      <span className="path" title={path ?? '尚未落盘'} onClick={onOpenStudio}>
        {path ?? '尚未落盘'}
      </span>
    </footer>
  )
}
