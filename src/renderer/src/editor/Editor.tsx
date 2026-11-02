import { useEffect, useRef } from 'react'

type EditorProps = {
  tabId: string
  active: boolean
  initialText: string
  onMount: (tabId: string, el: HTMLTextAreaElement) => void
  onContextMenu: (el: HTMLTextAreaElement) => void
}

/**
 * 每个标签页一个独立 textarea：切标签时只是显示/隐藏，
 * 原生撤销栈、输入法状态、滚动位置都留在各自元素上，不会串页。
 */
export function Editor({ tabId, active, initialText, onMount, onContextMenu }: EditorProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const reported = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || reported.current) return
    reported.current = true
    el.value = initialText
    onMount(tabId, el)
  }, [tabId, initialText, onMount])

  return (
    <textarea
      ref={ref}
      className="editor"
      data-testid={active ? 'editor' : undefined}
      data-tab={tabId}
      hidden={!active}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      wrap="soft"
      aria-label="正文"
      onContextMenu={(event) => {
        event.preventDefault()
        if (ref.current) onContextMenu(ref.current)
      }}
    />
  )
}
