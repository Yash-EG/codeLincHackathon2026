import { useRef } from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useCssHeightVar } from '../../a11y/useCssHeightVar'
import { formatUsd } from '../../lib/format'
import { useAnnualMax } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'

/**
 * Always-visible annual-maximum bar with the Ask AI button. Its height is
 * published as --maxbar-h so scroll-padding keeps focused content above it,
 * and it stops being fixed on short (zoomed) viewports.
 */
export default function MaxBar() {
  const ref = useRef<HTMLElement>(null)
  useCssHeightVar(ref, '--maxbar-h')
  const annualMax = useAnnualMax()
  const openAskAi = useUiStore((s) => s.openAskAi)

  return (
    <aside
      ref={ref}
      aria-label="Annual maximum"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur short:static"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        {annualMax ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
            <p className="text-sm font-semibold text-ink">Annual max {annualMax.year}</p>
            <div
              role="progressbar"
              aria-label={`Annual maximum ${annualMax.year} used or planned`}
              aria-valuemin={0}
              aria-valuemax={annualMax.max}
              aria-valuenow={annualMax.used + annualMax.pending}
              aria-valuetext={`${formatUsd(annualMax.used)} used, ${formatUsd(annualMax.pending)} pending, ${formatUsd(annualMax.left)} left`}
              className="flex h-3 min-w-32 flex-1 gap-[2px] rounded-full bg-track ring-1 ring-inset ring-control/40 sm:max-w-xs"
            >
              {annualMax.used > 0 && (
                <div
                  className="h-full rounded-l-full rounded-r-[3px] bg-viz-plan"
                  style={{ width: `${(annualMax.used / annualMax.max) * 100}%` }}
                />
              )}
              {annualMax.pending > 0 && (
                <div
                  className="bg-stripes h-full rounded-[3px] bg-viz-planned"
                  style={{ width: `${(annualMax.pending / annualMax.max) * 100}%` }}
                />
              )}
            </div>
            <p className="text-sm text-ink tabular-nums">
              {formatUsd(annualMax.used)} used · {formatUsd(annualMax.pending)} pending ·{' '}
              <span className="font-semibold">{formatUsd(annualMax.left)} left</span>
              {annualMax.overMaximum > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-danger">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  {formatUsd(annualMax.overMaximum)} over
                </span>
              )}
            </p>
            <Link to="/records#annual-max" className="text-sm font-semibold text-primary underline">
              Details<span className="sr-only"> about your annual maximum</span>
            </Link>
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-sm text-ink">
            No plan checked in yet.{' '}
            <Link to="/reception#check-in" className="font-semibold text-primary underline">
              Check in at Reception
            </Link>
          </p>
        )}

        <button
          type="button"
          onClick={openAskAi}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Ask AI
        </button>
      </div>
    </aside>
  )
}
