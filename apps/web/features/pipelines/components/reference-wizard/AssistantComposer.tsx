import { IconButton } from '@tapstate-web/ui/icon-button'
import { Textarea } from '@tapstate-web/ui/textarea'
import { ArrowUp, LoaderCircle, Square } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'

interface AssistantComposerProps {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  label: string
  placeholder: string
  sendLabel: string
  stopLabel?: string
  state?: 'idle' | 'waiting' | 'streaming'
  disabled?: boolean
  hint?: string
  id?: string
  autoFocus?: boolean
  maxLength?: number
  inputRef?: RefObject<HTMLTextAreaElement | null>
}

export function AssistantComposer({
  value,
  onValueChange,
  onSend,
  onStop,
  label,
  placeholder,
  sendLabel,
  stopLabel,
  state = 'idle',
  disabled,
  hint,
  id,
  autoFocus,
  maxLength,
  inputRef,
}: AssistantComposerProps) {
  const shell = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const active = state !== 'idle' && Boolean(onStop)
  const resize = useCallback(() => {
    const input = field.current
    if (!input) return
    input.style.height = '0px'
    const style = getComputedStyle(input)
    const border =
      (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0)
    const height = Math.ceil(input.scrollHeight + border)
    input.style.height = `${Math.max(24, Math.min(height, 158))}px`
    input.style.overflowY = height > 158 ? 'auto' : 'hidden'
  }, [])
  useLayoutEffect(resize, [resize, value, placeholder])
  useLayoutEffect(() => {
    if (!shell.current || typeof ResizeObserver === 'undefined') return
    let width = 0
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width !== width) {
        width = entry.contentRect.width
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(resize)
      }
    })
    observer.observe(shell.current)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [resize])

  return (
    <div ref={shell} className="pipeline-ai-composer">
      <Textarea
        ref={(element) => {
          field.current = element
          if (inputRef) inputRef.current = element
        }}
        id={id}
        aria-label={label}
        autoFocus={autoFocus}
        maxLength={maxLength}
        rows={1}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (!active && !disabled && value.trim()) onSend()
          }
        }}
        className="pipeline-ai-composer-input"
      />
      {hint && <div className="pipeline-ai-composer-actions">{hint}</div>}
      <IconButton
        type="button"
        variant="primary"
        size="lg"
        className="pipeline-ai-composer-send"
        aria-label={active ? (stopLabel ?? sendLabel) : sendLabel}
        title={active ? (stopLabel ?? sendLabel) : sendLabel}
        aria-busy={state === 'waiting'}
        data-state={state}
        disabled={!active && (disabled || !value.trim())}
        onClick={active ? onStop : onSend}
      >
        <span className="relative flex size-5 items-center justify-center" aria-hidden="true">
          {active ? (
            <Square className="size-2.5 fill-current" />
          ) : (
            <ArrowUp className="size-4.5" strokeWidth={2.5} />
          )}
          {state === 'waiting' && (
            <LoaderCircle
              className="absolute size-5 animate-spin motion-reduce:animate-none"
              strokeWidth={1.5}
            />
          )}
        </span>
      </IconButton>
    </div>
  )
}
