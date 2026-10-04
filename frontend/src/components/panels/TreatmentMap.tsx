import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, CalendarClock, Hourglass, PiggyBank, Sparkles, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { getTooth } from '../../data/teeth'
import { formatShortDate, formatUsd } from '../../lib/format'
import { useAssistant } from '../../lib/useAssistant'
import { useLineItems, useNextYearPlan, useToothHistory, useToothStatus } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce, useUiStore } from '../../store/uiStore'
import type { AiAnalysis } from '../../types/domain'
import Panel from '../Panel'
import ToothInspector from '../ToothInspector'
import ToothPicker from '../ToothPicker'
import { buttonPrimary, fieldInput, textLink } from '../ui'

type ReplySource = 'describe' | 'tooth'

/**
 * The Operatory's panels (the dental chair in 3D): describe the care in your own
 * words, or pick a tooth, and get the assistant's analysis: what it is, what it
 * costs in- and out-of-network, and the order to do it in.
 */
export default function TreatmentMap() {
  const ask = useAssistant()
  const isThinking = useUiStore((s) => s.isThinking)
  const { selectedTooth, selectTooth, aiAnalysis } = useSessionStore(
    useShallow((s) => ({ selectedTooth: s.selectedTooth, selectTooth: s.selectTooth, aiAnalysis: s.aiAnalysis })),
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

  return (
    <>
      <Panel id="describe" title="Describe your care">
        <DescribeForm busy={isThinking} toothNumber={selectedTooth} onSubmit={(text) => void run(text, 'describe')} />
        {reply?.source === 'describe' && <ReplyBox text={reply.text} />}
        {aiAnalysis && <AnalysisCard analysis={aiAnalysis} />}
      </Panel>

      <Panel id="tooth-map" title="Pick a tooth">
        <p>
          Choose the tooth your dentist mentioned. Numbers follow the Universal system printed on dental bills, shown the
          way your dentist sees your mouth.
        </p>
        <ToothPicker selectedTooth={selectedTooth} toothStatus={toothStatus} onSelect={selectTooth} />
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
    <form noValidate onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="describe-input" className="block font-semibold text-ink">
          What did your dentist recommend?
        </label>
        <p id="describe-hint" className="text-sm text-ink-muted">
          In your own words, e.g. &ldquo;root canal on tooth #14&rdquo; or &ldquo;crown on my lower left molar&rdquo;.
          {toothNumber != null && <> Tooth #{toothNumber} is selected and is used if you don&rsquo;t name one.</>}
        </p>
        <textarea
          ref={inputRef}
          id="describe-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'describe-hint describe-error' : 'describe-hint'}
          className={fieldInput}
        />
        {error && (
          <p id="describe-error" className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
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

function ReplyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-line bg-sky p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <Bot className="size-4 text-primary" aria-hidden="true" /> Assistant
      </p>
      <p className="text-ink">{text}</p>
    </div>
  )
}

/** The assistant's analysis as structured text: costs as a list, the order as an ordered list. */
function AnalysisCard({ analysis }: { analysis: AiAnalysis }) {
  return (
    <section aria-labelledby="analysis-title" className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <h3 id="analysis-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Sparkles className="size-5 text-primary" aria-hidden="true" /> What this means for you
      </h3>
      <p>{analysis.simplifiedExplanation}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Figure label="Full price" value={formatUsd(analysis.estimatedCost)} />
        <Figure label="You pay, in-network" value={formatUsd(analysis.inNetworkCost)} emphasis />
        <Figure label="You pay, out-of-network" value={formatUsd(analysis.outOfNetworkCost)} />
      </dl>
      <div>
        <h4 className="font-semibold text-ink">Suggested order</h4>
        <ol className="mt-2 space-y-2">
          {analysis.suggestedSequence.map((step) => (
            <li key={step.step} className="flex gap-3 rounded-lg border border-line p-3">
              {step.timing === 'this-year' ? (
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-viz-planned" aria-hidden="true" />
              ) : (
                <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  Step {step.step}, {step.timing === 'this-year' ? 'now' : `after Jan 1${step.date ? ` (${formatShortDate(step.date)})` : ''}`}:{' '}
                  {step.label}
                </p>
                <p className="text-sm text-ink-muted">
                  You pay {formatUsd(step.youPay)} in-network. {step.reason}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {analysis.savings > 0 && (
        <p className="flex items-start gap-2 font-semibold text-success">
          <PiggyBank className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            This order saves you {formatUsd(analysis.savings)}.{' '}
            <Link to="/consult" className={textLink}>
              See the timeline
            </Link>
          </span>
        </p>
      )}
    </section>
  )
}

function Figure({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-semibold tracking-tight text-ink tabular-nums ${emphasis ? 'text-2xl' : 'text-xl'}`}>
        {value}
      </dd>
    </div>
  )
}

function PlannedCare() {
  const { removeProcedure, removePlanItem } = useSessionStore(
    useShallow((s) => ({ removeProcedure: s.removeProcedure, removePlanItem: s.removePlanItem })),
  )
  const lineItems = useLineItems()
  const later = useNextYearPlan()?.items ?? []

  const rows = [
    ...lineItems.map((item) => ({ item, when: item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'This year', remove: removeProcedure })),
    ...later.map((item) => ({
      item,
      when: `After Jan 1${item.request.recommendedDate ? ` (${formatShortDate(item.request.recommendedDate)})` : ''}`,
      remove: removePlanItem,
    })),
  ]

  return (
    <Panel id="planned" title="Planned care">
      {rows.length === 0 ? (
        <p>Nothing planned yet. Describe your care or pick a tooth above.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map(({ item, when, remove }) => {
            const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
            return (
              <li key={item.request.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {item.procedure.shortName}
                    {item.request.toothNumber != null && <> · tooth #{item.request.toothNumber}</>}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {when} · you pay about {formatUsd(item.byNetwork.IN_NETWORK.patientPays)} in-network
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    remove(item.request.id)
                    announce(`Removed ${name} from your plan.`)
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
                  aria-label={`Remove ${name}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/billing" className={`${textLink} inline-flex items-center gap-1`}>
        See the full cost breakdown in Billing <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Panel>
  )
}
