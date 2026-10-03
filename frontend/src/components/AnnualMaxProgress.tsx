import { CircleCheck, Hourglass, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AnnualMax } from '../store/selectors'
import type { BenefitSummary } from '../types/domain'
import { formatShortDate, formatUsd } from '../lib/format'

interface AnnualMaxProgressProps {
  annualMax: AnnualMax
  summary: BenefitSummary
}

interface Segment {
  key: string
  label: string
  value: number
  fill: string
}

/**
 * Annual-maximum meter: used (claims) + planned (current plan) + unused.
 * Segments are separated by a 2px surface gap; "planned" is also hatched so
 * it never relies on color alone. The legend below doubles as the text view.
 */
export default function AnnualMaxProgress({ annualMax, summary }: AnnualMaxProgressProps) {
  const { max, used, pending, left, overMaximum, year } = annualMax
  const pct = (value: number) => (max > 0 ? (value / max) * 100 : 0)
  const nextYear = Number(year) + 1

  const segments: Segment[] = [
    { key: 'used', label: 'Used', value: used, fill: 'bg-viz-plan' },
    { key: 'planned', label: 'Planned', value: pending, fill: 'bg-viz-planned bg-stripes' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-5xl font-semibold tracking-tight text-ink">{formatUsd(left)}</span>
          <span className="text-sm text-ink-muted">
            left of {formatUsd(max)} after planned care
            {summary.rolloverBalance > 0 && <> (incl. {formatUsd(summary.rolloverBalance)} rollover)</>}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {overMaximum > 0 && (
            <StatusChip tone="danger" icon={<TriangleAlert className="size-4" aria-hidden="true" />}>
              Plan is {formatUsd(overMaximum)} over your maximum. Move some care to {nextYear}.
            </StatusChip>
          )}
          {summary.benefitsExpiringSoon && left > 0 && (
            <StatusChip tone="warning" icon={<Hourglass className="size-4" aria-hidden="true" />}>
              {formatUsd(left)} expires unused on {formatShortDate(summary.planYearEnd)} · {summary.daysRemaining} days
            </StatusChip>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`Annual maximum ${year}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used + pending}
        aria-valuetext={`${formatUsd(used)} used, ${formatUsd(pending)} planned, ${formatUsd(left)} unused of ${formatUsd(max)}`}
        className="mt-5 flex h-3 w-full gap-[2px] rounded-full bg-track ring-1 ring-inset ring-control/40"
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div
              key={s.key}
              className={`group relative h-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${s.fill} ${
                i === 0 ? 'rounded-l-full rounded-r-[4px]' : 'rounded-[4px]'
              }`}
              style={{ width: `${pct(s.value)}%` }}
            >
              {/* enlarged hit target + tooltip */}
              <span className="absolute inset-x-0 -inset-y-2" aria-hidden="true" />
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              >
                {s.label}: {formatUsd(s.value)} ({Math.round(pct(s.value))}%)
              </span>
            </div>
          ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <LegendItem swatch="bg-viz-plan" label="Used" value={formatUsd(used)} />
        <LegendItem swatch="bg-viz-planned bg-stripes" label="Planned" value={formatUsd(pending)} />
        <LegendItem swatch="bg-track ring-1 ring-inset ring-control" label="Unused" value={formatUsd(left)} />
        <div className="flex items-center gap-2">
          <dt className="text-ink-muted">Deductible</dt>
          <dd className="flex items-center gap-1 font-semibold text-ink tabular-nums">
            {formatUsd(summary.deductibleMet)} / {formatUsd(summary.deductible)}
            {summary.deductibleRemaining === 0 && (
              <>
                <CircleCheck className="size-4 text-success" aria-hidden="true" />
                <span className="sr-only">(met)</span>
              </>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function LegendItem({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-3 shrink-0 rounded-[3px] ${swatch}`} aria-hidden="true" />
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  )
}

function StatusChip({ tone, icon, children }: { tone: 'warning' | 'danger'; icon: ReactNode; children: ReactNode }) {
  const toneClass = tone === 'warning' ? 'text-warning ring-warning/40' : 'text-danger ring-danger/40'
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm font-medium ring-1 ${toneClass}`}>
      {icon}
      {children}
    </p>
  )
}
