import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { formatShortDate, formatUsd } from '../../lib/format'
import { useAssistant } from '../../lib/useAssistant'
import { useLineItems, useNextYearPlan } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce, useUiStore } from '../../store/uiStore'
import type { AiAnalysis, CoverageClass } from '../../types/domain'
import { CdtBadge, WaitingChip } from '../Chip'
import ExploreProcedureForm, { type ExploreAnswers } from '../ExploreProcedureForm'
import Panel from '../Panel'
import { buttonPrimary, buttonQuiet, eyebrow, fieldInput, ledger, textLink } from '../ui'

/** Explore-form procedures, phrased the way the assistant reads them ("unsure" has none). */
const EXPLORE_PHRASE: Record<string, string> = {
  cleaning: 'Cleaning',
  filling: 'Filling',
  crown: 'Crown',
  'root-canal': 'Root canal',
  extraction: 'Extraction',
}

/**
 * The Operatory's panels (the dental chair in 3D): explore a procedure step by
 * step, describe the care in your own words, or pick a tooth, and get the
 * assistant's analysis: what it is, what it costs in- and out-of-network, and
 * the order to do it in.
 */
export default function TreatmentMap() {
  const ask = useAssistant()
  const isThinking = useUiStore((s) => s.isThinking)
  const { selectedTooth, setProcedureInput } = useSessionStore(
    useShallow((s) => ({ selectedTooth: s.selectedTooth, setProcedureInput: s.setProcedureInput })),
  )
  const [reply, setReply] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)

  // Continue on the Explore form routes the chosen procedure to the estimate API.
  async function explore(answers: ExploreAnswers) {
    // The ZIP and radius also set where the Providers map looks.
    useSessionStore.getState().setSearchLocation(answers.zip, Number(answers.radius) || 25)
    const phrase = EXPLORE_PHRASE[answers.procedure]
    if (!phrase) return
    const text = selectedTooth != null ? `${phrase} on tooth #${selectedTooth}` : phrase
    setProcedureInput(text)
    announce(`Pricing "${text}"…`)

    // Route to the estimate API (useAssistant -> POST /api/analyze, with mock
    // fallback). The reply carries the backend's prose + cost analysis.
    const result = await ask(text)
    if (!result) {
      setReply('Check in a plan first, then try again.')
      setAnalysis(null)
      return
    }
    setReply(result.content)
    setAnalysis(result.analysis)
    announce(result.content)
  }

  return (
    <>
      <Panel id="explore" eyebrow="Guided" title="Explore a procedure">
        <p>Not sure what you need? Answer a few quick questions and we&rsquo;ll price it against your plan.</p>
        <ExploreProcedureForm onContinue={explore} busy={isThinking} />
        {reply && <ReplyBox text={reply} />}
        {analysis && <AnalysisCard analysis={analysis} />}
        {reply && <FollowUpBox busy={isThinking} onAsk={(q) => void ask(q).then((r) => {
          if (!r) return
          setReply(r.content)
          setAnalysis(r.analysis)
          announce(r.content)
        })} />}
      </Panel>

      <PlannedCare />
    </>
  )
}

/**
 * A free-text box so the user can answer a follow-up question (e.g. reply with a
 * tooth number after a "which tooth?" prompt) or ask something else. Submits
 * through the same analyzer path as the form.
 */
function FollowUpBox({ busy, onAsk }: { busy: boolean; onAsk: (question: string) => void }) {
  const [value, setValue] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = value.trim()
    if (!q) return
    onAsk(q)
    setValue('')
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-2">
      <label htmlFor="followup-input" className={eyebrow}>
        Answer or ask a follow-up
      </label>
      <p id="followup-hint" className="text-sm text-ink-muted">
        For example, reply with the tooth number (&ldquo;#14&rdquo;) or ask another question.
      </p>
      <div className="flex gap-2">
        <input
          id="followup-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your answer, e.g. “#14”"
          aria-describedby="followup-hint"
          className={`${fieldInput} flex-1`}
        />
        <button type="submit" disabled={busy || !value.trim()} className={buttonPrimary}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}

/** The assistant's reply as a transcript entry under a maroon rule. */
function ReplyBox({ text }: { text: string }) {
  return (
    <div className="mt-4 border-l-2 border-primary pl-4">
      <p className={eyebrow}>Assistant</p>
      <p className="mt-1.5 text-ink">{text}</p>
    </div>
  )
}

/** The estimate as a ledger: full price, out-of-network, in-network. */
function AnalysisCard({ analysis }: { analysis: AiAnalysis }) {
  return (
    <section aria-labelledby="analysis-title" className="mt-5 space-y-5">
      <div>
        <p className={eyebrow}>Analysis</p>
        <h3 id="analysis-title" className="mt-2 font-serif text-2xl leading-tight text-ink">
          What this means for you
        </h3>
      </div>
      {analysis.simplifiedExplanation && (
        <p className="max-w-[62ch] text-ink-muted">{analysis.simplifiedExplanation}</p>
      )}
      <dl className={ledger.list}>
        <div className={ledger.row}>
          <dt className={ledger.key}>Full price, before insurance</dt>
          <dd className={ledger.value}>{formatUsd(analysis.estimatedCost)}</dd>
        </div>
        <div className={ledger.row}>
          <dt className={ledger.key}>You owe, out-of-network</dt>
          <dd className={ledger.value}>{formatUsd(analysis.outOfNetworkCost)}</dd>
        </div>
        <div className={ledger.total}>
          <dt className="text-sm font-semibold text-ink">You owe, in-network</dt>
          <dd className="font-mono text-xl font-semibold tabular-nums text-ink">{formatUsd(analysis.inNetworkCost)}</dd>
        </div>
      </dl>
    </section>
  )
}

function PlannedCare() {
  const { removeProcedure, removePlanItem } = useSessionStore(
    useShallow((s) => ({ removeProcedure: s.removeProcedure, removePlanItem: s.removePlanItem })),
  )
  const lineItems = useLineItems()
  const tiers = useSessionStore((s) => s.tiers)
  const waitingFor = (c: CoverageClass) => tiers?.[c].waitingPeriodMonths ?? 0
  const later = useNextYearPlan()?.items ?? []

  const rows = [
    ...lineItems.map((item) => ({
      item,
      when: item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'This year',
      remove: removeProcedure,
    })),
    ...later.map((item) => ({
      item,
      when: `After Jan 1${item.request.recommendedDate ? `, ${formatShortDate(item.request.recommendedDate)}` : ''}`,
      remove: removePlanItem,
    })),
  ]

  return (
    <Panel id="planned" eyebrow="Your plan" title="Planned care">
      {rows.length === 0 ? (
        <p>Nothing planned yet.</p>
      ) : (
        <ul className="border-t-2 border-primary/70">
          {rows.map(({ item, when, remove }) => {
            const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
            return (
              <li key={item.request.id} className="flex items-start gap-4 border-b border-line py-3">
                <div className="min-w-0 flex-1">
                  <p>
                    <CdtBadge code={item.procedure.cdtCode} name={item.procedure.shortName} />
                    {item.request.toothNumber != null && <span className="font-mono"> · #{item.request.toothNumber}</span>}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                    <WaitingChip months={waitingFor(item.procedure.coverageClass)} />
                    <span>{when}</span>
                  </p>
                </div>
                <p className="text-right">
                  <span className="block font-mono text-sm tabular-nums text-ink">
                    {formatUsd(item.byNetwork.IN_NETWORK.patientPays)}
                  </span>
                  <span className="block text-xs text-ink-muted">you owe</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    remove(item.request.id)
                    announce(`Removed ${name} from your plan.`)
                  }}
                  className={buttonQuiet}
                >
                  Remove<span className="sr-only"> {name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/billing" className={`${textLink} inline-flex items-center gap-1`}>
        See the full cost ledger in Billing <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Panel>
  )
}
