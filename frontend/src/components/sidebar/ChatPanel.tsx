import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, LoaderCircle, SendHorizontal, X } from 'lucide-react'
import type { ToothInfo } from '../../data/teeth'
import type { ChatMessage } from '../../types/domain'
import { formatUsd } from '../../lib/format'
import SplitBar from './SplitBar'

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
      <div ref={listRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((message) =>
          message.role === 'assistant' ? (
            <div key={message.id} className="flex gap-3">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/25">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="rounded-2xl rounded-tl-md border border-ink-800 bg-ink-850 px-3.5 py-2.5 text-sm leading-relaxed text-ink-100">
                  {message.content}
                </p>
                {message.lineItems && message.lineItems.length > 0 && (
                  <div className="rounded-xl border border-ink-800 bg-ink-900 p-3">
                    <ul className="space-y-2.5">
                      {message.lineItems.map((item) => {
                        const e = item.byNetwork.IN_NETWORK
                        return (
                          <li key={item.request.id} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="truncate text-ink-100">
                                <span className="font-mono text-ink-400">{item.procedure.cdtCode}</span>{' '}
                                {item.procedure.shortName}
                                {item.request.toothNumber && <span className="text-ink-400"> · #{item.request.toothNumber}</span>}
                              </span>
                              <span className="shrink-0 tabular-nums text-ink-300">
                                you {formatUsd(e.patientPays)}
                              </span>
                            </div>
                            <SplitBar planPays={e.planPays} patientPays={e.patientPays} />
                          </li>
                        )
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={onViewBreakdown}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      View full breakdown <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-sm font-medium leading-relaxed text-ink-950">
                {message.content}
              </p>
            </div>
          ),
        )}

        {isThinking && (
          <div className="flex items-center gap-2 pl-10 text-xs text-ink-400">
            <LoaderCircle className="size-3.5 animate-spin text-accent" aria-hidden="true" />
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
                className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-left text-xs text-ink-300 transition hover:border-accent/60 hover:text-ink-50 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-ink-800 p-3">
        {selectedTooth && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pl-2.5 pr-1 text-xs text-accent ring-1 ring-accent/25">
            Tooth #{selectedTooth.number} · {selectedTooth.name}
            <button
              type="button"
              onClick={onClearTooth}
              className="rounded-full p-0.5 hover:bg-accent/20"
              aria-label="Clear selected tooth"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 p-1.5 pl-3.5 focus-within:border-accent/60">
          <label htmlFor="assistant-input" className="sr-only">
            Describe your planned dental care
          </label>
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
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isThinking}
            className="grid size-9 place-items-center rounded-lg bg-accent text-ink-950 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
            aria-label="Send"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
