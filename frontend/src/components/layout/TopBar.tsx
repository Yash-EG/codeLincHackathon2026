import { CalendarClock, ShieldCheck } from 'lucide-react'
import type { BenefitSummary } from '../../types/domain'

interface TopBarProps {
  summary: BenefitSummary
}

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M10.5 6.5c-2.9 0-4.6 2.4-4.1 5.6.4 2.6 1.6 4.4 2.3 7 .6 2.4.9 6.4 2.6 6.4 1.8 0 1.6-4.6 3.2-4.6h3c1.6 0 1.4 4.6 3.2 4.6 1.7 0 2-4 2.6-6.4.7-2.6 1.9-4.4 2.3-7 .5-3.2-1.2-5.6-4.1-5.6-2.2 0-3.4 1.3-5.5 1.3s-3.3-1.3-5.5-1.3z"
      />
    </svg>
  )
}

export default function TopBar({ summary }: TopBarProps) {
  const initials = summary.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
  const planYear = summary.planYearStart.slice(0, 4)

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-ink-800 bg-ink-950/80 px-4 backdrop-blur lg:px-5">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-accent text-ink-950 shadow-[0_0_28px_-6px_var(--color-accent)]">
          <ToothMark className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-ink-50">Molarity</p>
          <p className="text-xs text-ink-400">Dental benefits optimizer</p>
        </div>
      </div>

      <div className="ml-3 hidden items-center gap-2 md:flex">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs text-ink-300">
          <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
          {summary.carrierName}
          <span className="text-ink-600">/</span>
          <span className="font-medium text-ink-100">{summary.planName}</span>
        </span>
        <span className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs text-ink-300">
          Plan year {planYear}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {summary.benefitsExpiringSoon && (
          <span className="hidden items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning ring-1 ring-warning/30 sm:inline-flex">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Benefits reset in {summary.daysRemaining} days
          </span>
        )}
        <div className="flex items-center gap-2">
          <div
            className="grid size-8 place-items-center rounded-full bg-ink-800 text-xs font-semibold text-ink-100 ring-1 ring-ink-700"
            aria-hidden="true"
          >
            {initials}
          </div>
          <span className="hidden text-sm text-ink-300 lg:block">{summary.fullName}</span>
        </div>
      </div>
    </header>
  )
}
