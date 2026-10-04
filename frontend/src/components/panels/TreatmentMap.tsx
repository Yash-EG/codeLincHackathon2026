import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { PROCEDURES } from '../../data/mockData'
import { COVERAGE_LABEL } from '../../lib/estimate'
import { formatShortDate, formatUsd } from '../../lib/format'
import { useAssistant } from '../../lib/useAssistant'
import { useLineItems, useNextYearPlan } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce, useUiStore } from '../../store/uiStore'
import type { AiAnalysis, CoverageClass } from '../../types/domain'
import { CdtBadge, WaitingChip } from '../Chip'
import ExploreProcedureForm, { type ExploreAnswers } from '../ExploreProcedureForm'
import Panel from '../Panel'
import { buttonQuiet, eyebrow, ledger, textLink } from '../ui'

/** The CDT code each Explore-form choice most often means. */
const CODE_FOR_EXPLORE: Record<string, string> = {
  cleaning: 'D1110',
  filling: 'D2391',
  crown: 'D2740',
  'root-canal': 'D3330',
  extraction: 'D7140',
}

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
    const phrase = EXPLORE_PHRASE[answers.procedure]
    if (!phrase) return
    const text = selectedTooth != null ? `${phrase} on tooth #${selectedTooth}` : phrase
    setProcedureInput(text)
    announce(`Pricing "${text}"…`)

    // Form -> chat: say what the plan does with it.
    const session = useSessionStore.getState()
    const code = CODE_FOR_EXPLORE[answers.procedure]
    const proc = code ? PROCEDURES[code] : undefined
    const tier = proc && session.tiers?.[proc.coverageClass]
    if (proc && tier) {
      session.addChatMessage({
        sender: 'assistant',
        kind: 'context',
        source: 'plan',
        timestamp: new Date().toISOString(),
        text:
          `${proc.shortName} (${proc.cdtCode}) is ${COVERAGE_LABEL[proc.coverageClass]} care on your ${session.plan?.planName}: ` +
          `${tier.planPaysPctInNetwork}% covered in-network, ${tier.planPaysPctOutNetwork}% out-of-network. ` +
          (tier.waitingPeriodMonths > 0 ? `There is a ${tier.waitingPeriodMonths}-month waiting period. ` : 'No waiting period. ') +
          'Pricing it now with your plan…',
      })
    }

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
      </Panel>

      <PlannedCare />
    </>
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
