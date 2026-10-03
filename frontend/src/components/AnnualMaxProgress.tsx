import { CircleCheck, Hourglass, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { BenefitSummary } from '../types/domain'
import { formatShortDate, formatUsd } from '../lib/format'

interface AnnualMaxProgressProps {
  summary: BenefitSummary
  /** Insurance payments in the current (unsaved) treatment plan. */
  plannedPlanPays: number
  /** Plan payments the current plan wants but the maximum can't cover. */
  overMaximum: number
}

interface Segment {
  key: string
  label: string
  value: number
  swatch: string
  fill: string
}

/**
 * Annual-maximum meter: used (claims) + planned (current plan) + unused.
 * Segments are separated by a 2px surface gap; "planned" is also hatched so
 * it never relies on color alone. Each segment has a hover tooltip, and the
 * legend below doubles as the text/table view.
 */
export default function AnnualMaxProgress({ summary, plannedPlanPays, overMaximum }: AnnualMaxProgressProps) {
  const max = summary.effectiveMaximum
  const used = Math.min(summary.usedToDate, max)
  const planned = Math.min(plannedPlanPays, Math.max(max - used, 0))
  const unused = Math.max(max - used - planned, 0)
  const pct = (value: number) => (max > 0 ? (value / max) * 100 : 0)
  const year = summary.planYearStart.slice(0, 4)
  const nextYear = Number(year) + 1

  const segments: Segment[] = [
    { key: 'used', label: 'Used', value: used, swatch: 'bg-viz-plan', fill: 'bg-viz-plan' },
    { key: 'planned', label: 'Planned', value: planned, swatch: 'bg-viz-planned', fill: 'bg-viz-planned bg-stripes' },
  ]

  return (
    <section
      aria-labelledby="annual-max-title"
      className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="annual-max-title" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
            Annual maximum · {year}
          </h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-5xl font-semibold tracking-tight text-ink-50">
              {formatUsd(summary.remainingMaximum)}
            </span>
            <span className="text-sm text-ink-300">
              left of {formatUsd(max)}
              {summary.rolloverBalance > 0 && (
                <span className="text-ink-400"> (incl. {formatUsd(summary.rolloverBalance)} rollover)</span>
              )}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overMaximum > 0 && (
            <StatusChip tone="danger" icon={<TriangleAlert className="size-3.5" aria-hidden="true" />}>
              Plan is {formatUsd(overMaximum)} over your maximum. Move some care to {nextYear}
            </StatusChip>
          )}
          {summary.benefitsExpiringSoon && unused > 0 && (
            <StatusChip tone="warning" icon={<Hourglass className="size-3.5" aria-hidden="true" />}>
              {formatUsd(unused)} expires unused on {formatShortDate(summary.planYearEnd)} · {summary.daysRemaining} days
            </StatusChip>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`Annual maximum ${year}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used + planned}
        aria-valuetext={`${formatUsd(used)} used, ${formatUsd(planned)} planned, ${formatUsd(unused)} unused of ${formatUsd(max)}`}
        className="mt-5 flex h-3 w-full gap-[2px] rounded-full bg-ink-800"
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div
              key={s.key}
              className={`group relative h-full transition-[width] duration-700 ease-out ${s.fill} ${
                i === 0 ? 'rounded-l-full rounded-r-[4px]' : 'rounded-[4px]'
              }`}
              style={{ width: `${pct(s.value)}%` }}
            >
              {/* enlarged hit target + tooltip */}
              <span className="absolute inset-x-0 -inset-y-2" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {s.label}: {formatUsd(s.value)} ({Math.round(pct(s.value))}%)
              </span>
            </div>
          ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <LegendItem swatch="bg-viz-plan" label="Used" value={formatUsd(used)} />
        <LegendItem swatch="bg-viz-planned bg-stripes" label="Planned" value={formatUsd(planned)} />
        <LegendItem swatch="bg-ink-800 ring-1 ring-inset ring-ink-600" label="Unused" value={formatUsd(unused)} />
        <div className="flex items-center gap-2">
          <dt className="text-ink-400">Deductible</dt>
          <dd className="flex items-center gap-1 font-medium text-ink-100 tabular-nums">
            {formatUsd(summary.deductibleMet)} / {formatUsd(summary.deductible)}
            {summary.deductibleRemaining === 0 && (
              <CircleCheck className="size-3.5 text-accent" aria-label="met" />
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function LegendItem({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2.5 shrink-0 rounded-[3px] ${swatch}`} aria-hidden="true" />
      <dt className="text-ink-400">{label}</dt>
      <dd className="font-medium text-ink-100 tabular-nums">{value}</dd>
    </div>
  )
}

function StatusChip({
  tone,
  icon,
  children,
}: {
  tone: 'warning' | 'danger'
  icon: ReactNode
  children: ReactNode
}) {
  const toneClass =
    tone === 'warning'
      ? 'bg-warning/10 text-warning ring-warning/30'
      : 'bg-danger/10 text-danger ring-danger/30'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${toneClass}`}>
      {icon}
      {children}
    </span>
  )
}
