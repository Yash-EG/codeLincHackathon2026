import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, LoaderCircle, SendHorizontal, X } from 'lucide-react'
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
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
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
        className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map((message) =>
          message.role === 'assistant' ? (
            <div key={message.id} className="flex gap-3">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-primary ring-1 ring-primary/25">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="rounded-2xl rounded-tl-md border border-line bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                  <span className="sr-only">Assistant: </span>
                  {message.content}
                </p>
                {message.lineItems && message.lineItems.length > 0 && (
                  <div className="rounded-xl border border-line bg-surface p-3">
                    <ul className="space-y-2.5">
                      {message.lineItems.map((item) => {
                        const e = item.byNetwork.IN_NETWORK
                        return (
                          <li key={item.request.id} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="truncate text-ink">
                                <span className="font-mono text-ink-muted">{item.procedure.cdtCode}</span>{' '}
                                {item.procedure.shortName}
                                {item.request.toothNumber && (
                                  <span className="text-ink-muted"> · #{item.request.toothNumber}</span>
                                )}
                              </span>
                              <span className="shrink-0 tabular-nums text-ink-muted">you {formatUsd(e.patientPays)}</span>
                            </div>
                            <SplitBar planPays={e.planPays} patientPays={e.patientPays} />
                          </li>
                        )
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={onViewBreakdown}
                      className="mt-3 inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      View full breakdown in Billing <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm font-medium leading-relaxed text-white">
                <span className="sr-only">You: </span>
                {message.content}
              </p>
            </div>
          ),
        )}

        {isThinking && (
          <div className="flex items-center gap-2 pl-10 text-sm text-ink-muted">
            <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            Reading your plan…
          </div>
        )}

        {messages.length <= 1 && !isThinking && (
          <div className="flex flex-wrap gap-2 pl-10">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSend(s)}
                className="min-h-9 rounded-full border border-control bg-surface px-3 py-1.5 text-left text-sm text-ink transition hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-line p-3">
        {selectedTooth && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky py-1 pl-3 pr-1 text-sm text-ink ring-1 ring-primary/30">
            Tooth #{selectedTooth.number} · {selectedTooth.name}
            <button
              type="button"
              onClick={onClearTooth}
              className="grid size-6 place-items-center rounded-full hover:bg-primary/10"
              aria-label="Clear selected tooth"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
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
                : 'e.g. "I need a crown on my back left molar"'
            }
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-control bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60"
            aria-label="Send"
          >
            <SendHorizontal className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
