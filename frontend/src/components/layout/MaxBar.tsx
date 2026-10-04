import { useRef } from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useCssHeightVar } from '../../a11y/useCssHeightVar'
import { formatUsd } from '../../lib/format'
import { useAnnualMax } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { buttonPrimary } from '../ui'

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/15 bg-surface short:static"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-12">
        {annualMax ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink">Annual max {annualMax.year}</p>
            <div
              role="progressbar"
              aria-label={`Annual maximum ${annualMax.year} used or planned`}
              aria-valuemin={0}
              aria-valuemax={annualMax.max}
              aria-valuenow={annualMax.used + annualMax.pending}
              aria-valuetext={`${formatUsd(annualMax.used)} used, ${formatUsd(annualMax.pending)} pending, ${formatUsd(annualMax.left)} left`}
              className="flex h-2 min-w-32 flex-1 gap-[2px] bg-track sm:max-w-xs"
            >
              {annualMax.used > 0 && (
                <div className="h-full bg-viz-plan" style={{ width: `${(annualMax.used / annualMax.max) * 100}%` }} />
              )}
              {annualMax.pending > 0 && (
                <div
                  className="bg-stripes h-full bg-viz-planned"
                  style={{ width: `${(annualMax.pending / annualMax.max) * 100}%` }}
                />
              )}
            </div>
            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="size-2 bg-viz-plan" aria-hidden="true" />
                  Used
                </dt>
                <dd className="font-mono tabular-nums text-ink">{formatUsd(annualMax.used)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="bg-stripes size-2 bg-viz-planned" aria-hidden="true" />
                  Pending
                </dt>
                <dd className="font-mono tabular-nums text-ink">{formatUsd(annualMax.pending)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="size-2 bg-track ring-1 ring-inset ring-control" aria-hidden="true" />
                  Left
                </dt>
                <dd className="font-mono font-semibold tabular-nums text-positive">{formatUsd(annualMax.left)}</dd>
              </div>
              {annualMax.overMaximum > 0 && (
                <div className="flex items-center gap-1 font-semibold text-danger">
                  <dt className="sr-only">Over the maximum</dt>
                  <dd className="flex items-center gap-1 font-mono tabular-nums">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    {formatUsd(annualMax.overMaximum)} over
                  </dd>
                </div>
              )}
            </dl>
            <Link
              to="/records#annual-max"
              className="text-sm font-semibold text-primary underline decoration-1 underline-offset-4"
            >
              Details<span className="sr-only"> about your annual maximum</span>
            </Link>
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-sm text-ink">
            No plan checked in yet.{' '}
            <Link to="/reception#check-in" className="font-semibold text-primary underline decoration-1 underline-offset-4">
              Check in at Reception
            </Link>
          </p>
        )}

        <button type="button" onClick={openAskAi} aria-haspopup="dialog" className={buttonPrimary}>
          <Sparkles className="size-4" aria-hidden="true" />
          Ask AI
        </button>
      </div>
    </aside>
  )
}
