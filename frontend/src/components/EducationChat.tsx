import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, Info, Send, Sparkles, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router'
import { askEducation, type EducationChatResponse } from '../lib/educationChat'
import { nextId } from '../lib/id'
import { buttonPrimary, fieldInput } from './ui'

/** One turn in the education chat transcript. */
interface Turn {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Present on assistant turns, drives the outcome badge + handoff button. */
  meta?: EducationChatResponse
}

const SUGGESTIONS = [
  'What is a deductible?',
  'What is the difference between a copay and coinsurance?',
  'How does my copay differ in network versus out of network?',
]

const INTENT_LABEL: Record<EducationChatResponse['intent'], string> = {
  GENERAL_DEFINITION: 'General explanation',
  PERSONAL_PLAN_QUESTION: 'About your plan',
  ESTIMATE_REQUEST: 'Cost estimate',
  OUT_OF_SCOPE: 'Out of scope',
}

/**
 * Benefits-education chat for the Imaging ("Decode your plan") tab. It calls the
 * backend POST /api/education/chat (with an offline fallback), and works without
 * a plan checked in: general definitions need no account data. The response
 * fields let us show when personal amounts aren't available and offer a handoff
 * to the cost-estimate flow.
 */
export default function EducationChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function send(message: string) {
    const text = message.trim()
    if (!text || busy) return
    setTurns((t) => [...t, { id: nextId('eduq'), role: 'user', text }])
    setInput('')
    setBusy(true)
    setStatus('Thinking\u2026')
    try {
      const reply = await askEducation(text)
      setTurns((t) => [...t, { id: nextId('edua'), role: 'assistant', text: reply.answer, meta: reply }])
      setStatus(reply.answer)
    } catch {
      const msg = 'Sorry, I had trouble answering that. Please try again.'
      setTurns((t) => [...t, { id: nextId('edua'), role: 'assistant', text: msg }])
      setStatus(msg)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(input)
  }

  return (
    <div className="space-y-4">
      <p>
        Ask about dental-benefits terms in plain language &mdash; like deductible, copay, coinsurance, or in- vs
        out-of-network. General answers don&rsquo;t need a plan checked in.
      </p>

      {turns.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-control bg-surface px-3.5 text-sm font-medium text-primary transition hover:border-primary"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <li key={turn.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-white">{turn.text}</p>
              </li>
            ) : (
              <li key={turn.id} className="flex flex-col gap-2">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-sky p-4">
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
                    <Bot className="size-4 text-primary" aria-hidden="true" /> Benefits assistant
                  </p>
                  <p className="text-ink">{turn.text}</p>
                  {turn.meta && <AssistantExtras meta={turn.meta} onEstimate={() => navigate('/operatory#explore')} />}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="edu-chat-input" className="sr-only">
            Ask a benefits question
          </label>
          <input
            ref={inputRef}
            id="edu-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. What is coinsurance?"
            autoComplete="off"
            className={fieldInput}
          />
        </div>
        <button type="submit" disabled={busy || !input.trim()} className={buttonPrimary}>
          {busy ? 'Thinking\u2026' : 'Ask'}
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  )
}

/** Outcome badge, "amounts unavailable" note, and estimate handoff button. */
function AssistantExtras({ meta, onEstimate }: { meta: EducationChatResponse; onEstimate: () => void }) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {INTENT_LABEL[meta.intent]}
        </span>
        {meta.source === 'offline' ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-line bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
            title="The backend wasn't reachable, so this came from the in-browser offline glossary."
          >
            <WifiOff className="size-3.5" aria-hidden="true" />
            Offline demo
          </span>
        ) : meta.modelUsed ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-primary"
            title="Answered by the backend and rewritten by the education AI model."
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI
          </span>
        ) : null}
        {meta.personalPlanDataAvailable === false && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
            <Info className="size-3.5" aria-hidden="true" />
            Your amounts aren&rsquo;t available yet
          </span>
        )}
      </div>
      {meta.estimateHandoff && (
        <button
          type="button"
          onClick={onEstimate}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-control bg-surface px-3.5 font-semibold text-primary transition hover:border-primary"
        >
          Get a cost estimate <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
