import { useMemo } from 'react'
import { CalendarPlus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import AnnualMaxProgress from '../components/AnnualMaxProgress'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary, table } from '../components/ui'
import { PROCEDURES } from '../data/mockData'
import { downloadIcs, type CalendarReminder } from '../lib/ics'
import { formatLongDate, formatShortDate, formatUsd } from '../lib/format'
import { ROOMS_BY_ID } from '../rooms'
import { useAnnualMax, useLineItems } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { announce } from '../store/uiStore'

const room = ROOMS_BY_ID.records

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function Records() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="plan">
        <RecordsContent />
      </RoomGate>
    </>
  )
}

function RecordsContent() {
  const { benefits, claims, treatmentPlan } = useSessionStore(
    useShallow((s) => ({ benefits: s.benefits, claims: s.claims, treatmentPlan: s.treatmentPlan })),
  )
  const annualMax = useAnnualMax()
  const lineItems = useLineItems()

  const reminders = useMemo<CalendarReminder[]>(() => {
    if (!benefits || !annualMax) return []
    const today = new Date().toISOString().slice(0, 10)
    const list: CalendarReminder[] = []
    if (annualMax.left > 0) {
      const monthBefore = addDays(benefits.planYearEnd, -30)
      list.push({
        id: 'use-max',
        date: monthBefore > today ? monthBefore : today,
        title: `Use your remaining ${formatUsd(annualMax.left)} of dental benefits`,
        description: `Your ${benefits.planName} annual maximum resets on ${formatLongDate(benefits.planYearEnd)}. Unused benefits don't carry over.`,
      })
    }
    for (const item of lineItems) {
      if (!item.request.recommendedDate) continue
      list.push({
        id: `visit-${item.request.id}`,
        date: item.request.recommendedDate,
        title: `Dental visit: ${item.procedure.shortName}${item.request.toothNumber != null ? ` (tooth #${item.request.toothNumber})` : ''}`,
        description: `Estimated cost to you: ${formatUsd(item.byNetwork.IN_NETWORK.patientPays)} in-network.`,
      })
    }
    list.push({
      id: 'reset',
      date: benefits.planYearEnd,
      title: 'Dental benefits reset tomorrow',
      description: `Your ${benefits.planName} maximum and deductible start over on the next day.`,
    })
    for (const item of treatmentPlan.filter((t) => t.recommendedDate > benefits.planYearEnd)) {
      list.push({
        id: `next-${item.id}`,
        date: item.recommendedDate,
        title: `Book: ${PROCEDURES[item.cdtCode]?.shortName ?? item.cdtCode}`,
        description: item.aiRationale,
      })
    }
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [benefits, annualMax, lineItems, treatmentPlan])

  if (!benefits || !annualMax) return null

  return (
    <>
      <Panel id="annual-max" title={`Annual maximum · ${annualMax.year}`}>
        <AnnualMaxProgress annualMax={annualMax} summary={benefits} />
      </Panel>

      <Panel id="history" title="Claims this plan year">
        {claims.length === 0 ? (
          <p>No claims on file for this plan year.</p>
        ) : (
          <div className={table.frame}>
            <table className={table.root}>
              <caption className={table.caption}>Paid claims, oldest first</caption>
              <thead className={table.head}>
                <tr>
                  <th scope="col" className={table.th}>
                    Date
                  </th>
                  <th scope="col" className={table.th}>
                    Procedure
                  </th>
                  <th scope="col" className={`${table.th} text-right`}>
                    Insurance paid
                  </th>
                  <th scope="col" className={`${table.th} text-right`}>
                    You paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, i) => (
                  <tr key={`${claim.cdtCode}-${claim.serviceDate}-${i}`} className={table.row}>
                    <td className={`${table.td} whitespace-nowrap`}>{formatShortDate(claim.serviceDate)}</td>
                    <th scope="row" className={`${table.td} font-semibold text-ink`}>
                      {PROCEDURES[claim.cdtCode]?.shortName ?? claim.cdtCode}
                      {claim.toothNumber != null && (
                        <span className="block font-normal text-ink-muted">tooth #{claim.toothNumber}</span>
                      )}
                    </th>
                    <td className={table.num}>{formatUsd(claim.planPaid)}</td>
                    <td className={table.num}>{formatUsd(claim.patientPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel id="reminders" eyebrow="Year-end alerts" title="Reminders">
        <ul className="border-t-2 border-primary/70">
          {reminders.map((r) => (
            <li key={r.id} className="grid gap-x-4 border-b border-line py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <p className="font-mono text-sm tabular-nums text-ink-muted">{formatLongDate(r.date)}</p>
              <div className="min-w-0">
                <p className="font-medium text-ink">{r.title}</p>
                <p className="text-sm text-ink-muted">{r.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={buttonPrimary}
          onClick={() => {
            downloadIcs('molarity-reminders.ics', reminders)
            announce(`Downloaded ${reminders.length} reminders as a calendar file.`)
          }}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add to my calendar (.ics)
        </button>
      </Panel>
    </>
  )
}
