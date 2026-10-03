import { TriangleAlert, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import SegmentedControl from '../components/SegmentedControl'
import SplitBar from '../components/SplitBar'
import { table } from '../components/ui'
import { COVERAGE_LABEL, totalsFor } from '../lib/estimate'
import { formatUsd } from '../lib/format'
import { ROOMS_BY_ID } from '../rooms'
import { useLineItems } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { announce } from '../store/uiStore'
import type { NetworkTier } from '../types/domain'

const room = ROOMS_BY_ID.billing

const NETWORK_OPTIONS: Array<{ value: NetworkTier; label: string }> = [
  { value: 'IN_NETWORK', label: 'In-network' },
  { value: 'OUT_OF_NETWORK', label: 'Out-of-network' },
]
const NETWORK_LABEL: Record<NetworkTier, string> = { IN_NETWORK: 'in-network', OUT_OF_NETWORK: 'out-of-network' }

export default function Billing() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="procedure">
        <Breakdown />
      </RoomGate>
    </>
  )
}

function Breakdown() {
  const { network, setNetwork, removeProcedure } = useSessionStore(
    useShallow((s) => ({ network: s.network, setNetwork: s.setNetwork, removeProcedure: s.removeProcedure })),
  )
  const items = useLineItems()
  const totals = totalsFor(items, network)
  const inNet = totalsFor(items, 'IN_NETWORK')
  const outNet = totalsFor(items, 'OUT_OF_NETWORK')
  const networkDelta = Math.abs(outNet.patientPays - inNet.patientPays)

  return (
    <>
      <Panel id="you-pay" title="What you'll pay">
        <SegmentedControl
          legend="Prices for a dentist who is"
          name="network"
          options={NETWORK_OPTIONS}
          value={network}
          onChange={(value) => {
            setNetwork(value)
            announce(`Showing ${NETWORK_LABEL[value]} prices. You pay ${formatUsd(totalsFor(items, value).patientPays)}.`)
          }}
        />
        <dl className="grid grid-cols-3 gap-3">
          <Figure label="Total cost" value={formatUsd(totals.fee)} />
          <Figure label="Insurance pays" value={formatUsd(totals.planPays)} swatch="bg-viz-plan" />
          <Figure label="You pay" value={formatUsd(totals.patientPays)} swatch="bg-viz-you" emphasis />
        </dl>
        <SplitBar planPays={totals.planPays} patientPays={totals.patientPays} size="md" />
        {networkDelta > 0 && (
          <p>
            {network === 'IN_NETWORK' ? (
              <>
                Going out-of-network would cost you <strong>{formatUsd(networkDelta)} more</strong>.
              </>
            ) : (
              <>
                An in-network dentist would save you <strong>{formatUsd(networkDelta)}</strong>.
              </>
            )}
          </p>
        )}
        {totals.overMaximum > 0 && (
          <p className="flex items-start gap-2 font-medium text-danger">
            <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {formatUsd(totals.overMaximum)} of insurance payments don&rsquo;t fit under this year&rsquo;s maximum. Schedule
            some of this care after it resets.
          </p>
        )}
      </Panel>

      <Panel id="line-items" title="Line items">
        <div className={table.frame}>
          <table className={table.root}>
            <caption className={table.caption}>Each procedure, {NETWORK_LABEL[network]}</caption>
            <thead className={table.head}>
              <tr>
                <th scope="col" className={table.th}>
                  Procedure
                </th>
                <th scope="col" className={table.th}>
                  Coverage
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Cost
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Insurance
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  You pay
                </th>
                <th scope="col" className={table.th}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const e = item.byNetwork[network]
                const name = `${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`
                return (
                  <tr key={item.request.id} className={table.row}>
                    <th scope="row" className={`${table.td} font-semibold text-ink`}>
                      {item.procedure.shortName}
                      <span className="block font-normal text-ink-muted">
                        <span className="font-mono">{item.procedure.cdtCode}</span>
                        {item.request.toothNumber != null && <> · tooth #{item.request.toothNumber}</>}
                      </span>
                    </th>
                    <td className={table.td}>
                      {item.procedure.isCovered
                        ? `${COVERAGE_LABEL[item.procedure.coverageClass]}, ${item.planPaysPct[network]}%`
                        : 'Not covered'}
                      {e.overMaximum > 0 && (
                        <span className="block font-medium text-danger">{formatUsd(e.overMaximum)} over max</span>
                      )}
                    </td>
                    <td className={table.num}>{formatUsd(e.fee)}</td>
                    <td className={table.num}>{formatUsd(e.planPays)}</td>
                    <td className={`${table.num} font-semibold text-ink`}>{formatUsd(e.patientPays)}</td>
                    <td className={table.td}>
                      <button
                        type="button"
                        onClick={() => {
                          removeProcedure(item.request.id)
                          announce(`Removed ${name}.`)
                        }}
                        className="grid size-9 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-line bg-cream font-semibold text-ink">
              <tr>
                <th scope="row" colSpan={2} className={table.td}>
                  Total
                </th>
                <td className={table.num}>{formatUsd(totals.fee)}</td>
                <td className={table.num}>{formatUsd(totals.planPays)}</td>
                <td className={table.num}>{formatUsd(totals.patientPays)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel id="network" title="In-network vs. out-of-network">
        <p>
          Out-of-network dentists can charge more than your plan considers fair. The plan pays its share of the
          &ldquo;fair&rdquo; price and you pay everything above it.
        </p>
        <div className={table.frame}>
          <table className={table.root}>
            <caption className={table.caption}>All planned care, both ways</caption>
            <thead className={table.head}>
              <tr>
                <td className={table.th} />
                <th scope="col" className={`${table.th} text-right`}>
                  In-network
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Out-of-network
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Total cost', 'fee'],
                  ['Insurance pays', 'planPays'],
                  ['You pay', 'patientPays'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key} className={table.row}>
                  <th scope="row" className={`${table.td} font-semibold text-ink`}>
                    {label}
                  </th>
                  <td className={table.num}>{formatUsd(inNet[key])}</td>
                  <td className={table.num}>{formatUsd(outNet[key])}</td>
                  <td className={table.num}>{formatUsd(outNet[key] - inNet[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function Figure({ label, value, swatch, emphasis }: { label: string; value: string; swatch?: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
        {swatch && <span className={`size-2.5 rounded-[3px] ${swatch}`} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={`mt-0.5 font-semibold tracking-tight text-ink tabular-nums ${emphasis ? 'text-2xl' : 'text-xl'}`}>
        {value}
      </dd>
    </div>
  )
}
