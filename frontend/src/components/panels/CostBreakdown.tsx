import { TriangleAlert } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { COVERAGE_LABEL, totalsFor } from '../../lib/estimate'
import { formatUsd, roundCents } from '../../lib/format'
import { useLineItems } from '../../store/selectors'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import type { CostLineItem, NetworkTier } from '../../types/domain'
import { CdtBadge, Chip, CoverageChip, NetworkChip } from '../Chip'
import Panel from '../Panel'
import SplitBar from '../SplitBar'
import { buttonQuiet, ledger, table } from '../ui'

const NETWORKS: Array<{ value: NetworkTier; label: string; sub: string }> = [
  { value: 'IN_NETWORK', label: 'In-network', sub: 'Contracted rate' },
  { value: 'OUT_OF_NETWORK', label: 'Out-of-network', sub: 'Balance billed' },
]
const NETWORK_LABEL: Record<NetworkTier, string> = { IN_NETWORK: 'in-network', OUT_OF_NETWORK: 'out-of-network' }

const minus = (amount: number) => `−${formatUsd(amount)}`

/** The receipt's numbers for one network. */
function receiptFor(items: CostLineItem[], network: NetworkTier) {
  const totals = totalsFor(items, network)
  const allowed = roundCents(items.reduce((sum, i) => sum + i.byNetwork[network].allowed, 0))
  const deductible = roundCents(items.reduce((sum, i) => sum + i.byNetwork[network].deductibleApplied, 0))
  const rates = [...new Set(items.map((i) => i.planPaysPct[network]))]
  return {
    ...totals,
    balanceBilled: roundCents(totals.fee - allowed),
    deductible,
    coinsurance: rates.length === 1 ? `Plan pays ${rates[0]}%` : 'Varies by line',
  }
}

/**
 * Billing's panels (the checkout counter in 3D): a receipt for what you owe,
 * the line-item ledger, and in- vs out-of-network side by side. Every chart has
 * the same numbers as text or a table next to it.
 */
export default function CostBreakdown() {
  const { plan, benefits, network, setNetwork, removeProcedure } = useSessionStore(
    useShallow((s) => ({
      plan: s.plan,
      benefits: s.benefits,
      network: s.network,
      setNetwork: s.setNetwork,
      removeProcedure: s.removeProcedure,
    })),
  )
  const items = useLineItems()
  const receipt = receiptFor(items, network)
  const inNet = receiptFor(items, 'IN_NETWORK')
  const outNet = receiptFor(items, 'OUT_OF_NETWORK')
  const networkDelta = roundCents(Math.abs(outNet.patientPays - inNet.patientPays))

  // The deductible for the network shown: what it is, what's left of it.
  const deductible = plan ? (network === 'IN_NETWORK' ? plan.deductibleIndividualIn : plan.deductibleIndividualOut) : 0
  const deductibleLeft = Math.max(deductible - (benefits?.deductibleMet ?? 0), 0)

  return (
    <>
      <Panel id="you-pay" eyebrow="Your cost" title="What you'll owe">
        <fieldset>
          <legend className="sr-only">Prices for a dentist who is</legend>
          <div className="grid grid-cols-2 border border-line">
            {NETWORKS.map((option) => {
              const owe = option.value === 'IN_NETWORK' ? inNet.patientPays : outNet.patientPays
              return (
                <label
                  key={option.value}
                  className="relative cursor-pointer border-line bg-paper/60 px-4 py-3.5 text-ink-muted transition-colors first:border-r hover:text-ink has-checked:bg-surface has-checked:text-ink"
                >
                  <input
                    type="radio"
                    name="network"
                    value={option.value}
                    checked={network === option.value}
                    onChange={() => {
                      setNetwork(option.value)
                      announce(`Showing ${NETWORK_LABEL[option.value]} prices. You owe ${formatUsd(owe)}.`)
                    }}
                    className="peer sr-only"
                  />
                  {/* Active rule on top, and the focus ring drawn around the whole tab. */}
                  <span aria-hidden="true" className="absolute inset-x-0 -top-px h-0.5 peer-checked:bg-primary" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                  />
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs">{option.sub}</span>
                  <span className="mt-2 block font-mono text-xl tabular-nums text-ink">{formatUsd(owe)}</span>
                  <span className="block text-xs">you owe</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {networkDelta > 0 && (
          <p>
            {network === 'IN_NETWORK' ? 'Staying in-network saves you ' : 'An in-network dentist would save you '}
            <span className="font-mono font-semibold tabular-nums text-primary">{formatUsd(networkDelta)}</span>.
          </p>
        )}

        <dl className={ledger.list} aria-label={`Receipt, ${NETWORK_LABEL[network]}`}>
          <div className={ledger.row}>
            <dt className={ledger.key}>Procedure cost</dt>
            <dd className={ledger.value}>{formatUsd(receipt.fee)}</dd>
          </div>
          {receipt.balanceBilled > 0 && (
            <div className={ledger.row}>
              <dt className={ledger.key}>Balance billed (above what the plan allows)</dt>
              <dd className={ledger.value}>{formatUsd(receipt.balanceBilled)}</dd>
            </div>
          )}
          <div className={ledger.row}>
            <dt className={ledger.key}>Deductible applied</dt>
            <dd className={ledger.value}>{formatUsd(receipt.deductible)}</dd>
          </div>
          <div className={ledger.row}>
            <dt className={ledger.key}>Coinsurance</dt>
            <dd className={ledger.value}>{receipt.coinsurance}</dd>
          </div>
          <div className={ledger.row}>
            <dt className={`${ledger.key} flex items-center gap-2`}>
              <span className="size-2.5 bg-viz-plan" aria-hidden="true" /> Plan pays
            </dt>
            <dd className={ledger.value}>{minus(receipt.planPays)}</dd>
          </div>
          <div className={ledger.total}>
            <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="size-2.5 bg-viz-you" aria-hidden="true" /> You owe
            </dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums text-ink">{formatUsd(receipt.patientPays)}</dd>
          </div>
        </dl>
        <SplitBar planPays={receipt.planPays} patientPays={receipt.patientPays} size="md" />

        {deductible > 0 && (
          <p className="text-sm text-ink-muted">
            {deductibleLeft === 0
              ? `Your ${formatUsd(deductible)} ${NETWORK_LABEL[network]} deductible is already met this year.`
              : `Deductible: ${formatUsd(deductibleLeft)} of ${formatUsd(deductible)} not met yet. ${
                  receipt.deductible > 0
                    ? `You pay the first ${formatUsd(receipt.deductible)} of this care before insurance shares the cost.`
                    : 'None of this care uses it.'
                }`}
          </p>
        )}
        {receipt.overMaximum > 0 && (
          <p className="flex items-start gap-2 border-l-2 border-amber py-1 pl-3 text-sm font-medium text-amber-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {formatUsd(receipt.overMaximum)} of insurance payments don&rsquo;t fit under this year&rsquo;s maximum. Schedule
            some of this care after it resets.
          </p>
        )}
      </Panel>

      <Panel id="line-items" eyebrow="Ledger" title="Line items">
        <div className={table.frame}>
          <table className={table.root}>
            <caption className={table.caption}>Each procedure, {NETWORK_LABEL[network]}</caption>
            <thead className={table.head}>
              <tr>
                <th scope="col" className={table.th}>
                  Procedure
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Cost
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Deductible
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Coins.
                  <span className="sr-only">urance, share the plan pays</span>
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Plan pays
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  You owe
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
                    <th scope="row" className={`${table.td} font-medium text-ink`}>
                      <CdtBadge code={item.procedure.cdtCode} name={item.procedure.shortName} />
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <CoverageChip
                          label={COVERAGE_LABEL[item.procedure.coverageClass]}
                          pct={item.procedure.isCovered ? item.planPaysPct[network] : 0}
                        />
                        <NetworkChip network={network} />
                        {item.request.toothNumber != null && <Chip>Tooth #{item.request.toothNumber}</Chip>}
                      </span>
                      {e.overMaximum > 0 && (
                        <span className="block text-xs font-medium text-amber-ink">{formatUsd(e.overMaximum)} over the maximum</span>
                      )}
                    </th>
                    <td className={table.num}>{formatUsd(e.fee)}</td>
                    <td className={table.num}>{formatUsd(e.deductibleApplied)}</td>
                    <td className={table.num}>{item.procedure.isCovered ? `${item.planPaysPct[network]}%` : 'Not covered'}</td>
                    <td className={table.num}>{formatUsd(e.planPays)}</td>
                    <td className={`${table.num} font-semibold text-ink`}>{formatUsd(e.patientPays)}</td>
                    <td className="py-1.5 pl-1 align-top">
                      <button
                        type="button"
                        onClick={() => {
                          removeProcedure(item.request.id)
                          announce(`Removed ${name}.`)
                        }}
                        className={buttonQuiet}
                      >
                        Remove<span className="sr-only"> {name}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className={table.foot}>
              <tr>
                <th scope="row" className={table.td}>
                  Total
                </th>
                <td className={table.num}>{formatUsd(receipt.fee)}</td>
                <td className={table.num}>{formatUsd(receipt.deductible)}</td>
                <td className={table.num} />
                <td className={table.num}>{formatUsd(receipt.planPays)}</td>
                <td className={table.num}>{formatUsd(receipt.patientPays)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel id="network" eyebrow="Compare" title="In-network vs. out-of-network">
        <p className="max-w-[62ch]">
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
                  ['Procedure cost', 'fee'],
                  ['Balance billed', 'balanceBilled'],
                  ['Plan pays', 'planPays'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key} className={table.row}>
                  <th scope="row" className={`${table.td} font-medium text-ink`}>
                    {label}
                  </th>
                  <td className={table.num}>{formatUsd(inNet[key])}</td>
                  <td className={table.num}>{formatUsd(outNet[key])}</td>
                  <td className={table.num}>{formatUsd(roundCents(outNet[key] - inNet[key]))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={table.foot}>
              <tr>
                <th scope="row" className={table.td}>
                  You owe
                </th>
                <td className={table.num}>{formatUsd(inNet.patientPays)}</td>
                <td className={table.num}>{formatUsd(outNet.patientPays)}</td>
                <td className={`${table.num} text-primary`}>{formatUsd(networkDelta)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  )
}
