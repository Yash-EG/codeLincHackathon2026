import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, SendHorizontal, X } from 'lucide-react'
import type { ToothInfo } from '../../data/teeth'
import type { ChatMessage } from '../../types/domain'
import { formatUsd } from '../../lib/format'
import SplitBar from '../SplitBar'

interface ChatPanelProps {
  messages: ChatMessage[]
  isThinking: boolean
  selectedTooth: ToothInfo | undefined
  suggestions: string[]
  onSend: (text: string) => void
  onClearTooth: () => void
  onViewBreakdown: () => void
}

export default function ChatPanel({
  messages,
  isThinking,
  selectedTooth,
  suggestions,
  onSend,
  onClearTooth,
  onViewBreakdown,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [messages.length, isThinking])

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isThinking) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-5"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map((message) =>
          message.role === 'assistant' ? (
            <div key={message.id} className="border-b border-line py-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary" aria-hidden="true">
                Assistant
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                <span className="sr-only">Assistant: </span>
                {message.content}
              </p>
              {message.lineItems && message.lineItems.length > 0 && (
                <div className="mt-3">
                  <ul className="border-t border-ink/20">
                    {message.lineItems.map((item) => {
                      const e = item.byNetwork.IN_NETWORK
                      return (
                        <li key={item.request.id} className="space-y-1.5 border-b border-line py-2">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate text-ink">
                              <span className="font-mono text-ink-muted">{item.procedure.cdtCode}</span>{' '}
                              {item.procedure.shortName}
                              {item.request.toothNumber && (
                                <span className="font-mono text-ink-muted"> · #{item.request.toothNumber}</span>
                              )}
                            </span>
                            <span className="shrink-0 font-mono tabular-nums text-ink">you owe {formatUsd(e.patientPays)}</span>
                          </div>
                          <SplitBar planPays={e.planPays} patientPays={e.patientPays} />
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={onViewBreakdown}
                    className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline decoration-1 underline-offset-4"
                  >
                    View the full ledger in Billing <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div key={message.id} className="border-b border-line py-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted" aria-hidden="true">
                You
              </p>
              <p className="mt-1.5 font-serif text-base leading-relaxed text-ink">
                <span className="sr-only">You: </span>
                {message.content}
              </p>
            </div>
          ),
        )}

        {isThinking && (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-muted">
            <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            Reading your plan…
          </p>
        )}

        {messages.length <= 1 && !isThinking && (
          <div className="py-4">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">Try asking</p>
            <ul className="border-t border-line">
              {suggestions.map((s) => (
                <li key={s} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => onSend(s)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-serif text-[15px] text-ink transition-colors hover:text-primary"
                  >
                    {s}
                    <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-ink/20 px-5 py-4">
        {selectedTooth && (
          <p className="mb-2 flex items-center gap-2 text-sm text-ink">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Tooth</span>
            <span className="font-mono">#{selectedTooth.number}</span> {selectedTooth.name}
            <button
              type="button"
              onClick={onClearTooth}
              className="inline-flex min-h-11 items-center gap-1 px-1 text-ink-muted hover:text-primary"
              aria-label="Clear selected tooth"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </p>
        )}
        <label htmlFor="assistant-input" className="mb-1.5 block text-sm font-medium text-ink">
          Ask about your plan or describe your care
        </label>
        <div className="flex items-center gap-2">
          <input
            id="assistant-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              selectedTooth
                ? `What does your dentist recommend for #${selectedTooth.number}?`
                : 'e.g. “Root canal on tooth #14”'
            }
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-sm border border-control bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="grid size-11 shrink-0 place-items-center rounded-sm bg-primary text-white transition-colors hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60"
            aria-label="Send"
          >
            <SendHorizontal className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
