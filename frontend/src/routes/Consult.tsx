import { CalendarClock, Hourglass, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import { textLink } from '../components/ui'
import { PROCEDURES } from '../data/mockData'
import { formatLongDate, formatShortDate, formatUsd } from '../lib/format'
import { ROOMS_BY_ID } from '../rooms'
import { useAnnualMax, useLineItems } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'

const room = ROOMS_BY_ID.consult

export default function Consult() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="procedure">
        <Timeline />
      </RoomGate>
    </>
  )
}

function Timeline() {
  const { benefits, treatmentPlan } = useSessionStore(
    useShallow((s) => ({ benefits: s.benefits, treatmentPlan: s.treatmentPlan })),
  )
  const lineItems = useLineItems()
  const annualMax = useAnnualMax()
  if (!benefits || !annualMax) return null

  const nextYear = Number(annualMax.year) + 1
  const thisYear = [...lineItems].sort((a, b) =>
    (a.request.recommendedDate ?? '9999').localeCompare(b.request.recommendedDate ?? '9999'),
  )
  const later = treatmentPlan
    .filter((item) => item.recommendedDate > benefits.planYearEnd)
    .sort((a, b) => a.recommendedDate.localeCompare(b.recommendedDate))

  return (
    <>
      <Panel id="this-year" eyebrow={`Before ${formatLongDate(benefits.planYearEnd)}`} title="Do this plan year">
        <ol className="space-y-3">
          {thisYear.map((item) => (
            <li key={item.request.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-viz-planned" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'Not scheduled yet'}:{' '}
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
            {later.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
                <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {formatShortDate(item.recommendedDate)}, {nextYear}: {PROCEDURES[item.cdtCode]?.shortName ?? item.cdtCode}
                    {item.toothNumber != null && <> on tooth #{item.toothNumber}</>}
                  </p>
                  <p className="text-sm text-ink-muted">{item.aiRationale}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel id="savings" title="What good timing saves">
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
          A full side-by-side of &ldquo;all now&rdquo; versus &ldquo;split across Jan 1&rdquo; arrives with the cost engine.
          For today&rsquo;s numbers, see{' '}
          <Link to="/billing" className={textLink}>
            Billing
          </Link>
          .
        </p>
      </Panel>
    </>
  )
}
