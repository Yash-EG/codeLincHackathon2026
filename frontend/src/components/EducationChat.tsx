import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Info, Send } from 'lucide-react'
import { useNavigate } from 'react-router'
import { askEducation, type EducationChatResponse } from '../lib/educationChat'
import { nextId } from '../lib/id'
import { buttonPrimary, buttonSecondary, eyebrow, fieldInput } from './ui'

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
    <div className="space-y-5">
      <p className="max-w-[62ch]">
        Ask about dental-benefits terms in plain language, like deductible, copay, coinsurance, or in- vs
        out-of-network. General answers don&rsquo;t need a plan checked in.
      </p>

      {turns.length === 0 ? (
        <div>
          <p className={`${eyebrow} mb-2`}>Try asking</p>
          <ul className="border-t border-line">
            {SUGGESTIONS.map((s) => (
              <li key={s} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => void send(s)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left font-serif text-[15px] text-ink transition-colors hover:text-primary"
                >
                  {s}
                  <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="border-t-2 border-ink">
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <li key={turn.id} className="border-b border-line py-4">
                <p className={eyebrow} aria-hidden="true">
                  You
                </p>
                <p className="mt-1.5 font-serif text-base leading-relaxed text-ink">
                  <span className="sr-only">You: </span>
                  {turn.text}
                </p>
              </li>
            ) : (
              <li key={turn.id} className="border-b border-line py-4">
                <p className={`${eyebrow} text-primary`} aria-hidden="true">
                  Benefits assistant
                </p>
                <p className="mt-1.5 max-w-[62ch] text-ink">
                  <span className="sr-only">Benefits assistant: </span>
                  {turn.text}
                </p>
                {turn.meta && <AssistantExtras meta={turn.meta} onEstimate={() => navigate('/operatory#explore')} />}
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

/** Small mono labels for where the answer came from, an "amounts unavailable" note, and the estimate handoff. */
function AssistantExtras({ meta, onEstimate }: { meta: EducationChatResponse; onEstimate: () => void }) {
  const label = 'font-mono text-[10px] font-medium uppercase tracking-widest'
  return (
    <div className="mt-3 space-y-3">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
        <span className={label}>{INTENT_LABEL[meta.intent]}</span>
        {meta.source === 'offline' ? (
          <span className={label} title="The backend wasn't reachable, so this came from the in-browser offline glossary.">
            · Offline demo
          </span>
        ) : meta.modelUsed ? (
          <span className={`${label} text-primary`} title="Answered by the backend and rewritten by the education AI model.">
            · AI
          </span>
        ) : null}
      </p>
      {meta.personalPlanDataAvailable === false && (
        <p className="flex items-start gap-2 border-l-2 border-amber py-0.5 pl-3 text-sm font-medium text-amber-ink">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Your amounts aren&rsquo;t available yet.
        </p>
      )}
      {meta.estimateHandoff && (
        <button type="button" onClick={onEstimate} className={buttonSecondary}>
          Get a cost estimate <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
