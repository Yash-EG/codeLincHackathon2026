import { Languages, Receipt, TriangleAlert, X } from 'lucide-react'
import type { CostLineItem, JargonTranslation, NetworkTier } from '../../types/domain'
import { COVERAGE_LABEL, totalsFor } from '../../lib/estimate'
import { formatShortDate, formatUsd } from '../../lib/format'
import SplitBar from './SplitBar'

interface CostBreakdownProps {
  items: CostLineItem[]
  network: NetworkTier
  onNetworkChange: (network: NetworkTier) => void
  onRemove: (requestId: string) => void
  translations: JargonTranslation[]
}

const NETWORK_OPTIONS: Array<{ value: NetworkTier; label: string }> = [
  { value: 'IN_NETWORK', label: 'In-network' },
  { value: 'OUT_OF_NETWORK', label: 'Out-of-network' },
]

export default function CostBreakdown({ items, network, onNetworkChange, onRemove, translations }: CostBreakdownProps) {
  const totals = totalsFor(items, network)
  const other = totalsFor(items, network === 'IN_NETWORK' ? 'OUT_OF_NETWORK' : 'IN_NETWORK')
  const networkDelta = Math.abs(other.patientPays - totals.patientPays)

  return (
    <div className="scrollbar-thin h-full space-y-5 overflow-y-auto p-4">
      {/* Network toggle */}
      <div role="radiogroup" aria-label="Dentist network" className="grid grid-cols-2 gap-1 rounded-xl bg-ink-850 p-1 ring-1 ring-ink-800">
        {NETWORK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={network === opt.value}
            onClick={() => onNetworkChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-accent ${
              network === opt.value ? 'bg-ink-700 text-ink-50 shadow' : 'text-ink-400 hover:text-ink-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Totals */}
      <section aria-labelledby="totals-title" className="rounded-2xl border border-ink-800 bg-ink-850 p-4">
        <h3 id="totals-title" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          Your plan · {items.length} {items.length === 1 ? 'procedure' : 'procedures'}
        </h3>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Figure label="Total cost" value={formatUsd(totals.fee)} />
          <Figure label="Insurance pays" value={formatUsd(totals.planPays)} swatch="bg-viz-plan" />
          <Figure label="You pay" value={formatUsd(totals.patientPays)} swatch="bg-viz-you" emphasis />
        </dl>
        <div className="mt-4">
          <SplitBar planPays={totals.planPays} patientPays={totals.patientPays} size="md" />
        </div>
        {items.length > 0 && networkDelta > 0 && (
          <p className="mt-3 text-xs text-ink-300">
            {network === 'IN_NETWORK' ? (
              <>
                Going out-of-network would cost you <span className="font-semibold text-ink-50">{formatUsd(networkDelta)} more</span>.
              </>
            ) : (
              <>
                An in-network dentist would save you <span className="font-semibold text-ink-50">{formatUsd(networkDelta)}</span>.
              </>
            )}
          </p>
        )}
        {totals.overMaximum > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger ring-1 ring-danger/25">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {formatUsd(totals.overMaximum)} of insurance payments don't fit under this year's maximum. Schedule some of
            this care after it resets.
          </p>
        )}
      </section>

      {/* Line items */}
      <section aria-labelledby="items-title">
        <h3 id="items-title" className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          <Receipt className="size-3.5" aria-hidden="true" /> Line items
        </h3>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-ink-400">
            Nothing planned yet. Click a tooth or ask the assistant.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const e = item.byNetwork[network]
              return (
                <li key={item.request.id} className="group rounded-xl border border-ink-800 bg-ink-900 p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink-50">
                        {item.procedure.shortName}
                        {item.request.toothNumber != null && (
                          <span className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] font-semibold text-ink-100">
                            #{item.request.toothNumber}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        <span className="font-mono">{item.procedure.cdtCode}</span> ·{' '}
                        {item.procedure.isCovered
                          ? `${COVERAGE_LABEL[item.procedure.coverageClass]} · plan pays ${item.planPaysPct[network]}%`
                          : 'Not covered'}
                        {item.request.recommendedDate && <> · {formatShortDate(item.request.recommendedDate)}</>}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      <p className="font-semibold text-ink-50">{formatUsd(e.patientPays)}</p>
                      <p className="text-ink-400">of {formatUsd(e.fee)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item.request.id)}
                      className="-mr-1 -mt-1 rounded-md p-1 text-ink-500 opacity-60 transition hover:bg-ink-800 hover:text-ink-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent"
                      aria-label={`Remove ${item.procedure.shortName}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5">
                    <SplitBar planPays={e.planPays} patientPays={e.patientPays} />
                  </div>
                  {e.overMaximum > 0 && (
                    <p className="mt-2 text-[11px] text-danger">
                      {formatUsd(e.overMaximum)} over your annual maximum
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Jargon translation */}
      <section aria-labelledby="decoded-title">
        <h3 id="decoded-title" className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          <Languages className="size-3.5" aria-hidden="true" /> Your plan, decoded
        </h3>
        <ul className="space-y-2">
          {translations.map((t) => (
            <li key={t.id} className="rounded-xl border border-ink-800 bg-ink-900 p-3">
              <p className="text-xs font-semibold text-ink-50">{t.topic}</p>
              <blockquote className="mt-1.5 border-l-2 border-ink-700 pl-2.5 text-[11px] italic leading-relaxed text-ink-400">
                {t.planText}
              </blockquote>
              <p className="mt-2 text-sm leading-relaxed text-ink-100">{t.plainEnglish}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Figure({
  label,
  value,
  swatch,
  emphasis,
}: {
  label: string
  value: string
  swatch?: string
  emphasis?: boolean
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] text-ink-400">
        {swatch && <span className={`size-2 rounded-[3px] ${swatch}`} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={`mt-0.5 font-semibold tracking-tight text-ink-50 ${emphasis ? 'text-xl' : 'text-lg'}`}>{value}</dd>
    </div>
  )
}
