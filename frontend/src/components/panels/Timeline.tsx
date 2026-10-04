import { CalendarClock, Hourglass, PiggyBank, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { formatLongDate, formatShortDate, formatUsd } from '../../lib/format'
import { useAnnualMax, useLineItems, useNextYearPlan } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import Panel from '../Panel'
import { table, textLink } from '../ui'

/** "step 2" or "steps 2–3". */
function steps(from: number, to: number) {
  return from === to ? `step ${from}` : `steps ${from}–${to}`
}

/**
 * The Consult office's panels (the plan-year calendar in 3D): what to do before
 * the maximum resets, what to move past Jan 1, and what that timing saves.
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
  const headline =
    thisYear.length > 0 && later.length > 0 && timing.savings > 0
      ? `Do ${steps(1, thisYear.length)} now, ${steps(firstLater, thisYear.length + later.length)} after Jan 1 to save ${formatUsd(timing.savings)}.`
      : null

  return (
    <>
      <Panel id="this-year" eyebrow={`Before ${formatLongDate(benefits.planYearEnd)}`} title="Do this plan year">
        {headline && (
          <p className="flex items-start gap-2 rounded-xl bg-mint p-3 text-lg font-semibold text-ink">
            <PiggyBank className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
            {headline}
          </p>
        )}
        <ol className="space-y-3">
          {thisYear.map((item, i) => (
            <li key={item.request.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-viz-planned" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  Step {i + 1}, {item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'now'}:{' '}
                  {item.procedure.shortName}
                  {item.request.toothNumber != null && <> on tooth #{item.request.toothNumber}</>}
                </p>
                <p className="text-sm text-ink-muted">
                  Insurance pays {formatUsd(item.byNetwork.IN_NETWORK.planPays)}, you pay{' '}
                  {formatUsd(item.byNetwork.IN_NETWORK.patientPays)} (in-network).
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p>
          This uses {formatUsd(annualMax.pending)} of your {annualMax.year} maximum, leaving {formatUsd(annualMax.left)}.
        </p>
      </Panel>

      <Panel id="next-year" eyebrow={`From Jan 1, ${nextYear}`} title="Wait for the new plan year">
        {later.length === 0 ? (
          <p>Nothing needs to wait. Everything planned fits in this year&rsquo;s maximum.</p>
        ) : (
          <ol className="space-y-3">
            {later.map((item, i) => {
              const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
              return (
                <li key={item.request.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
                  <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      Step {firstLater + i},{' '}
                      {item.request.recommendedDate ? `${formatShortDate(item.request.recommendedDate)}, ${nextYear}` : `after Jan 1`}:{' '}
                      {item.procedure.shortName}
                      {item.request.toothNumber != null && <> on tooth #{item.request.toothNumber}</>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      With the {nextYear} maximum, insurance pays {formatUsd(item.byNetwork.IN_NETWORK.planPays)} and you pay{' '}
                      {formatUsd(item.byNetwork.IN_NETWORK.patientPays)} (in-network).
                      {rationale.get(item.request.id) && <> {rationale.get(item.request.id)}</>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removePlanItem(item.request.id)
                      announce(`Removed ${name} from next year.`)
                    }}
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
                    aria-label={`Remove ${name} from next year`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>

      <Panel id="savings" title="What good timing saves">
        {later.length > 0 && (
          <div className={table.frame}>
            <table className={table.root}>
              <caption className={table.caption}>What you pay for all of this care, in-network</caption>
              <tbody>
                <tr className={table.row}>
                  <th scope="row" className={`${table.td} font-semibold text-ink`}>
                    Everything before {formatShortDate(benefits.planYearEnd)}
                  </th>
                  <td className={table.num}>{formatUsd(timing.allNowPays)}</td>
                </tr>
                <tr className={table.row}>
                  <th scope="row" className={`${table.td} font-semibold text-ink`}>
                    {steps(1, thisYear.length).replace(/^s/, 'S')} now, the rest after Jan 1
                  </th>
                  <td className={table.num}>{formatUsd(timing.splitPays)}</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-line bg-cream font-semibold text-ink">
                <tr>
                  <th scope="row" className={table.td}>
                    {timing.savings >= 0 ? 'You save' : 'Waiting costs you'}
                  </th>
                  <td className={table.num}>{formatUsd(Math.abs(timing.savings))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {later.length > 0 && timing.savings > 0 && (
          <p>
            Your {annualMax.year} maximum can&rsquo;t cover all of it. On Jan 1 you get a fresh{' '}
            {formatUsd(benefits.annualMaximum)} maximum (and a new deductible), so the care that waits is mostly paid by
            insurance instead of you.
          </p>
        )}
        {annualMax.overMaximum > 0 && (
          <p className="flex items-start gap-2 font-medium text-danger">
            <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {formatUsd(annualMax.overMaximum)} of insurance payments don&rsquo;t fit under this year&rsquo;s maximum. Moving
            that care past Jan 1 lets the {nextYear} maximum pay it instead of you.
          </p>
        )}
        {annualMax.left > 0 && (
          <p>
            {formatUsd(annualMax.left)} of your {annualMax.year} maximum is still unused and expires on{' '}
            {formatLongDate(benefits.planYearEnd)} ({benefits.daysRemaining} days). Basic care such as fillings is a good use
            of it.
          </p>
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
