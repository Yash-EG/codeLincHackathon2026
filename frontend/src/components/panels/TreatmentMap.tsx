import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { getTooth } from '../../data/teeth'
import { formatShortDate, formatUsd } from '../../lib/format'
import { useAssistant } from '../../lib/useAssistant'
import { useLineItems, useNextYearPlan, useToothHistory, useToothStatus } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce, useUiStore } from '../../store/uiStore'
import type { AiAnalysis } from '../../types/domain'
import ExploreProcedureForm, { type ExploreAnswers } from '../ExploreProcedureForm'
import Panel from '../Panel'
import ToothChart from '../ToothChart'
import ToothInspector from '../ToothInspector'
import { buttonPrimary, buttonQuiet, eyebrow, fieldSerif, ledger, textLink } from '../ui'

type ReplySource = 'describe' | 'tooth'

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
  const { selectedTooth, selectTooth, aiAnalysis, setProcedureInput } = useSessionStore(
    useShallow((s) => ({
      selectedTooth: s.selectedTooth,
      selectTooth: s.selectTooth,
      aiAnalysis: s.aiAnalysis,
      setProcedureInput: s.setProcedureInput,
    })),
  )
  const toothStatus = useToothStatus()
  const history = useToothHistory(selectedTooth)
  const tooth = getTooth(selectedTooth)
  const [reply, setReply] = useState<{ source: ReplySource; text: string } | null>(null)

  async function run(text: string, source: ReplySource) {
    const result = await ask(text)
    if (!result) return
    setReply({ source, text: result.content })
    announce(result.content)
  }

  // The explore form's answer becomes the starting point for "Describe your care".
  function explore(answers: ExploreAnswers) {
    const phrase = EXPLORE_PHRASE[answers.procedure]
    if (!phrase) return
    const text = selectedTooth != null ? `${phrase} on tooth #${selectedTooth}` : phrase
    setProcedureInput(text)
    announce(`Added "${text}" to Describe your care. Choose Price it to see the cost.`)
  }

  return (
    <>
      <Panel id="explore" eyebrow="Guided" title="Explore a procedure">
        <p>Not sure how to describe it? Answer a few quick questions and we&rsquo;ll start the description for you.</p>
        <ExploreProcedureForm onContinue={explore} />
      </Panel>

      <Panel id="describe" eyebrow="In your words" title="Describe your care">
        <DescribeForm busy={isThinking} toothNumber={selectedTooth} onSubmit={(text) => void run(text, 'describe')} />
        {reply?.source === 'describe' && <ReplyBox text={reply.text} />}
        {aiAnalysis && <AnalysisCard analysis={aiAnalysis} />}
      </Panel>

      <Panel id="tooth-map" eyebrow="Universal numbering" title="Pick a tooth">
        <p>Choose the tooth your dentist mentioned. The numbers match the ones printed on dental bills.</p>
        <ToothChart selectedTooth={selectedTooth} toothStatus={toothStatus} onSelect={selectTooth} />
        {tooth && (
          <ToothInspector
            tooth={tooth}
            status={toothStatus[tooth.number]}
            history={history}
            disabled={isThinking}
            onAsk={(prompt) => void run(prompt, 'tooth')}
            onClose={() => selectTooth(null)}
          />
        )}
        {reply?.source === 'tooth' && <ReplyBox text={reply.text} />}
      </Panel>

      <PlannedCare />
    </>
  )
}

function DescribeForm({
  busy,
  toothNumber,
  onSubmit,
}: {
  busy: boolean
  toothNumber: number | null
  onSubmit: (text: string) => void
}) {
  const { text, setText } = useSessionStore(
    useShallow((s) => ({ text: s.procedureInput, setText: s.setProcedureInput })),
  )
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value) {
      setError('Describe the care first, for example "root canal on tooth #14".')
      inputRef.current?.focus()
      return
    }
    setError(null)
    onSubmit(value)
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="describe-input" className="block font-medium text-ink">
          What did your dentist recommend?
        </label>
        <p id="describe-hint" className="mt-0.5 text-sm text-ink-muted">
          In your own words. The tooth number helps, e.g. &ldquo;root canal on tooth #14&rdquo;.
          {toothNumber != null && <> Tooth #{toothNumber} is selected and is used if you don&rsquo;t name one.</>}
        </p>
        <textarea
          ref={inputRef}
          id="describe-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your planned procedure, e.g. “Root canal on lower right molar next month”"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'describe-hint describe-error' : 'describe-hint'}
          className={fieldSerif}
        />
        {error && (
          <p id="describe-error" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={buttonPrimary}>
        {busy ? 'Reading your plan…' : 'Price it'}
      </button>
    </form>
  )
}

/** The assistant's reply as a transcript entry: a speaker label and the text, under a maroon rule. */
function ReplyBox({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <p className={eyebrow}>Assistant</p>
      <p className="mt-1.5 text-ink">{text}</p>
    </div>
  )
}

/** The assistant's analysis as a ledger: what it is, the three costs, and the order to do it in. */
function AnalysisCard({ analysis }: { analysis: AiAnalysis }) {
  return (
    <section aria-labelledby="analysis-title" className="space-y-5 pt-2">
      <div>
        <p className={eyebrow}>Analysis</p>
        <h3 id="analysis-title" className="mt-2 font-serif text-2xl leading-tight text-ink">
          What this means for you
        </h3>
      </div>
      <p className="max-w-[62ch] text-ink-muted">{analysis.simplifiedExplanation}</p>
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
      <div>
        <h4 className={eyebrow}>Suggested order</h4>
        <ol className="mt-2 border-t border-line">
          {analysis.suggestedSequence.map((step) => (
            <li key={step.step} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-line py-3">
              <span className="font-mono text-sm tabular-nums text-ink-muted">{String(step.step).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{step.label}</span>
                <span className="block text-sm text-ink-muted">
                  {step.timing === 'this-year'
                    ? 'This plan year. '
                    : `After the Jan 1 reset${step.date ? `, ${formatShortDate(step.date)}` : ''}. `}
                  {step.reason}
                </span>
              </span>
              <span className="text-right font-mono text-sm tabular-nums text-ink">{formatUsd(step.youPay)}</span>
            </li>
          ))}
        </ol>
      </div>
      {analysis.savings > 0 && (
        <p className="text-ink">
          This order saves you{' '}
          <span className="font-mono text-lg font-semibold tabular-nums text-primary">{formatUsd(analysis.savings)}</span>.{' '}
          <Link to="/consult" className={textLink}>
            See the timeline
          </Link>
        </p>
      )}
    </section>
  )
}

function PlannedCare() {
  const { removeProcedure, removePlanItem } = useSessionStore(
    useShallow((s) => ({ removeProcedure: s.removeProcedure, removePlanItem: s.removePlanItem })),
  )
  const lineItems = useLineItems()
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
        <p>Nothing planned yet. Describe your care or pick a tooth above.</p>
      ) : (
        <ul className="border-t-2 border-ink">
          {rows.map(({ item, when, remove }) => {
            const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
            return (
              <li key={item.request.id} className="flex items-start gap-4 border-b border-line py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {item.procedure.shortName}
                    {item.request.toothNumber != null && <span className="font-mono"> · #{item.request.toothNumber}</span>}
                  </p>
                  <p className="text-sm text-ink-muted">
                    <span className="font-mono">{item.procedure.cdtCode}</span> · {when}
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
