import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { formatLongDate, formatShortDate, formatUsd } from '../../lib/format'
import { useAnnualMax, useLineItems, useNextYearPlan } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import type { CostLineItem } from '../../types/domain'
import Panel from '../Panel'
import { buttonQuiet, eyebrow, ledger, table, textLink } from '../ui'

/** "step 2" or "steps 2-3". */
function steps(from: number, to: number) {
  return from === to ? `step ${from}` : `steps ${from}-${to}`
}

/** One item on the sequence rail: step number, what, when, and what you owe. */
function StepRow({ step, item, when, note, action }: { step: number; item: CostLineItem; when: string; note?: string; action?: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-line py-3">
      <span className="font-mono text-sm tabular-nums text-ink-muted">{String(step).padStart(2, '0')}</span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">
          {item.procedure.shortName}
          {item.request.toothNumber != null && <span className="font-mono"> · #{item.request.toothNumber}</span>}
        </span>
        <span className="block text-sm text-ink-muted">
          {when}. Insurance pays <span className="font-mono">{formatUsd(item.byNetwork.IN_NETWORK.planPays)}</span>.
          {note && <> {note}</>}
        </span>
        {action}
      </span>
      <span className="text-right">
        <span className="block font-mono text-sm tabular-nums text-ink">{formatUsd(item.byNetwork.IN_NETWORK.patientPays)}</span>
        <span className="block text-xs text-ink-muted">you owe</span>
      </span>
    </li>
  )
}

/**
 * The Consult office's panels (the plan-year calendar in 3D): a two-step plan.
 * Step 1 uses this year's maximum before it expires; step 2 waits for the Jan 1
 * reset when that is cheaper, with the saving spelled out.
 */
export default function Timeline() {
  const { benefits, treatmentPlan, removePlanItem } = useSessionStore(
    useShallow((s) => ({ benefits: s.benefits, treatmentPlan: s.treatmentPlan, removePlanItem: s.removePlanItem })),
  )
  const lineItems = useLineItems()
  const nextYearPlan = useNextYearPlan()
  const annualMax = useAnnualMax()
  if (!benefits || !annualMax || !nextYearPlan) return null

  const nextYear = Number(annualMax.year) + 1
  const thisYear = [...lineItems].sort((a, b) =>
    (a.request.recommendedDate ?? '0000').localeCompare(b.request.recommendedDate ?? '0000'),
  )
  const later = nextYearPlan.items
  const { timing } = nextYearPlan
  const rationale = new Map(treatmentPlan.map((t) => [t.id, t.aiRationale]))
  const firstLater = thisYear.length + 1
  const lastLater = thisYear.length + later.length
  const saves = thisYear.length > 0 && later.length > 0 && timing.savings > 0

  return (
    <>
      <Panel id="this-year" eyebrow={`Step 1 · Before ${formatLongDate(benefits.planYearEnd)}`} title="This plan year">
        {saves ? (
          <blockquote className="border-l-2 border-primary pl-5">
            <p className="font-serif text-2xl leading-snug text-ink sm:text-[1.7rem]">
              Do {steps(1, thisYear.length)} now, {steps(firstLater, lastLater)} after Jan 1 to save{' '}
              <span className="whitespace-nowrap font-mono text-primary">{formatUsd(timing.savings)}</span>.
            </p>
          </blockquote>
        ) : (
          later.length === 0 && (
            <p className="font-serif text-xl leading-snug text-ink">
              Everything planned fits in this year&rsquo;s maximum, so there is nothing to gain by waiting.
            </p>
          )
        )}
        <p className="text-ink-muted">Use what is left of your {annualMax.year} maximum before it expires.</p>
        <ol className="border-t-2 border-primary/70">
          {thisYear.map((item, i) => (
            <StepRow
              key={item.request.id}
              step={i + 1}
              item={item}
              when={item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'Now'}
            />
          ))}
        </ol>
        <dl className="grid grid-cols-3 gap-4">
          <Figure label={`${annualMax.year} maximum`} value={formatUsd(annualMax.max)} />
          <Figure label="Used + this plan" value={formatUsd(annualMax.used + annualMax.pending)} />
          <Figure label="Left on Dec 31" value={formatUsd(annualMax.left)} amber />
        </dl>
      </Panel>

      <Panel id="next-year" eyebrow={`Step 2 · From Jan 1, ${nextYear}`} title="After the reset">
        {later.length === 0 ? (
          <p>Nothing needs to wait. Everything planned fits in this year&rsquo;s maximum.</p>
        ) : (
          <>
            <p className="text-ink-muted">
              On Jan 1 the maximum starts over at {formatUsd(benefits.annualMaximum)} and the deductible resets.
            </p>
            <ol className="border-t-2 border-primary/70">
              {later.map((item, i) => {
                const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
                return (
                  <StepRow
                    key={item.request.id}
                    step={firstLater + i}
                    item={item}
                    when={item.request.recommendedDate ? `${formatShortDate(item.request.recommendedDate)}, ${nextYear}` : 'After Jan 1'}
                    note={rationale.get(item.request.id)}
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          removePlanItem(item.request.id)
                          announce(`Removed ${name} from next year.`)
                        }}
                        className={`${buttonQuiet} -ml-2`}
                      >
                        Remove<span className="sr-only"> {name} from next year</span>
                      </button>
                    }
                  />
                )
              })}
            </ol>
          </>
        )}
      </Panel>

      <Panel id="savings" eyebrow="The math" title="What good timing saves">
        {later.length > 0 && (
          <div className={table.frame}>
            <table className={table.root}>
              <caption className={table.caption}>What you owe for all of this care, in-network</caption>
              <tbody>
                <tr className={table.row}>
                  <th scope="row" className={`${table.td} font-medium text-ink`}>
                    Everything before {formatShortDate(benefits.planYearEnd)}
                  </th>
                  <td className={table.num}>{formatUsd(timing.allNowPays)}</td>
                </tr>
                <tr className={table.row}>
                  <th scope="row" className={`${table.td} font-medium text-ink`}>
                    {steps(1, thisYear.length).replace(/^s/, 'S')} now, the rest after Jan 1
                  </th>
                  <td className={table.num}>{formatUsd(timing.splitPays)}</td>
                </tr>
              </tbody>
              <tfoot className={table.foot}>
                <tr>
                  <th scope="row" className={table.td}>
                    {timing.savings >= 0 ? 'You save' : 'Waiting costs you'}
                  </th>
                  <td className={`${table.num} text-lg ${timing.savings > 0 ? 'text-primary' : ''}`}>
                    {formatUsd(Math.abs(timing.savings))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {saves && (
          <p className="max-w-[62ch]">
            Your {annualMax.year} maximum can&rsquo;t cover all of it. On Jan 1 you get a fresh{' '}
            {formatUsd(benefits.annualMaximum)} maximum (and a new deductible), so the care that waits is mostly paid by
            insurance instead of you.
          </p>
        )}
        {annualMax.overMaximum > 0 && (
          <p className="flex items-start gap-2 border-l-2 border-amber py-1 pl-3 text-sm font-medium text-amber-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {formatUsd(annualMax.overMaximum)} of insurance payments don&rsquo;t fit under this year&rsquo;s maximum. Moving
            that care past Jan 1 lets the {nextYear} maximum pay it instead of you.
          </p>
        )}
        {annualMax.left > 0 && (
          <dl className={ledger.list}>
            <div className={ledger.row}>
              <dt className={ledger.key}>Unused on {formatLongDate(benefits.planYearEnd)}</dt>
              <dd className={`${ledger.value} font-semibold text-amber-ink`}>{formatUsd(annualMax.left)}</dd>
            </div>
            <div className={ledger.row}>
              <dt className={ledger.key}>Days until it expires</dt>
              <dd className={ledger.value}>{benefits.daysRemaining}</dd>
            </div>
          </dl>
        )}
        <p className="text-sm text-ink-muted">
          For the line-by-line numbers, see{' '}
          <Link to="/billing" className={textLink}>
            Billing
          </Link>
          .
        </p>
      </Panel>
    </>
  )
}

function Figure({ label, value, amber }: { label: string; value: string; amber?: boolean }) {
  return (
    <div className="border-t border-line pt-2">
      <dt className={eyebrow}>{label}</dt>
      <dd className={`mt-1 font-serif text-2xl tabular-nums sm:text-3xl ${amber ? 'font-semibold text-amber-ink' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
