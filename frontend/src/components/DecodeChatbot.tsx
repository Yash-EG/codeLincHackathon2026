import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { askEducation, type EducationChatResponse } from '../lib/educationChat'
import type { DecodeChatMessage } from '../store/sessionStore'
import { useDentalStore } from '../store/useDentalStore'
import { buttonPrimary, buttonSecondary, eyebrow, fieldInput, textLink, tileLift } from './ui'

const SOURCE_LABEL: Record<NonNullable<DecodeChatMessage['source']>, string> = {
  backend: 'Benefits assistant',
  error: 'Assistant unavailable',
}

/** Quick-action pills under the input: just questions to send to the assistant. */
const SUGGESTIONS = ['Explain my deductible', 'Show in-network savings', 'What is a copay?', 'What happens if I get a crown in November?']

/**
 * "Decode your plan": a chat that turns insurance jargon into plain English.
 * Every question goes to the backend (POST /api/education/chat, Amazon Bedrock).
 * There are no canned answers: if the backend can't answer, the chat says so.
 * The transcript lives in the store, so it survives moving between rooms.
 */
export default function DecodeChatbot({ compact = false }: { compact?: boolean }) {
  const chatHistory = useDentalStore((s) => s.chatHistory)
  const addChatMessage = useDentalStore((s) => s.addChatMessage)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [handoff, setHandoff] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedRef = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()

  // Keep the newest entry in view inside the feed, without scrolling the page.
  useEffect(() => {
    const feed = feedRef.current
    if (feed) feed.scrollTop = feed.scrollHeight
  }, [chatHistory.length, busy])

  async function send(message: string) {
    const text = message.trim()
    if (!text || busy) return
    addChatMessage({ sender: 'user', text })
    setInput('')
    setBusy(true)
    setStatus('Looking that up…')

    let reply: { text: string; source: NonNullable<DecodeChatMessage['source']>; meta?: EducationChatResponse }
    try {
      const res = await askEducation(text)
      reply = { text: res.answer, source: res.source, meta: res }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      reply = {
        text: `I couldn't get an answer from the benefits assistant (${reason}).`,
        source: 'error',
      }
    }

    addChatMessage({ sender: 'assistant', text: reply.text, source: reply.source })
    setStatus(reply.text)
    setBusy(false)
    inputRef.current?.focus()
    if (reply.meta?.estimateHandoff) setHandoff(true)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(input)
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="max-w-[62ch]">
          Ask anything about your coverage in your own words. I&rsquo;ll answer in plain English using your
          plan&rsquo;s numbers, and I&rsquo;ll keep up as you use the forms: pick a tooth or switch plans and I&rsquo;ll tell you
          what it means.
        </p>
      )}

      {chatHistory.length > 0 && (
        <ul
          ref={feedRef}
          aria-label="Conversation"
          className={`divide-y divide-line rounded-xl border border-teal-100/70 bg-white/60 px-4 ${compact ? 'max-h-72' : 'max-h-[28rem]'} overflow-y-auto`}
        >
          {chatHistory.map((m, i) =>
            m.sender === 'user' ? (
              <li key={i} className="py-3.5">
                <p className={eyebrow} aria-hidden="true">
                  You
                </p>
                <p className="mt-1 font-serif text-base leading-relaxed text-ink">
                  <span className="sr-only">You: </span>
                  {m.text}
                </p>
              </li>
            ) : (
              <li key={i} className="py-3.5">
                <p className={`${eyebrow} text-primary`} aria-hidden="true">
                  {SOURCE_LABEL[m.source ?? 'backend']}
                </p>
                <p className="mt-1 max-w-[62ch] text-ink">
                  <span className="sr-only">Benefits assistant: </span>
                  {m.text}
                </p>
              </li>
            ),
          )}
          {busy && (
            <li className="py-3.5" aria-hidden="true">
              <p className={`${eyebrow} text-primary`}>Benefits assistant</p>
              <p className="mt-2 flex items-center gap-1.5">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <span className="size-2 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                <span className="size-2 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
              </p>
            </li>
          )}
        </ul>
      )}

      {handoff && (
        <button type="button" onClick={() => navigate('/operatory')} className={buttonSecondary}>
          Get a cost estimate <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={`decode-chat-input${compact ? '-compact' : ''}`} className="sr-only">
            Ask about your plan
          </label>
          <input
            ref={inputRef}
            id={`decode-chat-input${compact ? '-compact' : ''}`}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. What is my crown copay?"
            autoComplete="off"
            className={fieldInput}
          />
        </div>
        <button type="submit" disabled={busy || !input.trim()} className={buttonPrimary}>
          {busy ? 'Thinking…' : 'Ask'}
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>

      <div role="group" aria-label="Suggested questions" className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void send(s)}
            className={`min-h-9 rounded-full border border-teal-200 bg-sage/50 px-3.5 py-1.5 text-sm font-medium text-teal-900 hover:border-primary hover:bg-sage disabled:opacity-60 ${tileLift}`}
          >
            {s}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {!compact && (
        <p className="text-sm text-ink-muted">
          Ready to price your care?{' '}
          <Link to="/operatory" className={textLink}>
            Add planned care
          </Link>
          .
        </p>
      )}
    </div>
  )
}
