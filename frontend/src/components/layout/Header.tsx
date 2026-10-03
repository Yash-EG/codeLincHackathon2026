import { useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useCssHeightVar } from '../../a11y/useCssHeightVar'
import { useSessionStore } from '../../store/sessionStore'
import Directory from './Directory'
import ViewToggle from './ViewToggle'

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

/** Identical in every room (WCAG 3.2.3): brand, directory, plan, view toggle. */
export default function Header() {
  const ref = useRef<HTMLElement>(null)
  useCssHeightVar(ref, '--header-h')
  const plan = useSessionStore((s) => s.plan)

  return (
    <header ref={ref} className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur short:static">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 rounded-xl no-underline">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-white">
            <ToothMark className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold text-ink">Molarity</span>
            <span className="block text-xs text-ink-muted">Dental benefits optimizer</span>
          </span>
        </Link>

        <Directory />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {plan ? (
            <p className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink md:inline-flex">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              <span className="sr-only">Checked-in plan: </span>
              {plan.carrierName} · <span className="font-semibold">{plan.planName}</span>
            </p>
          ) : (
            <Link to="/reception#check-in" className="hidden text-sm font-semibold text-primary underline md:inline">
              Check in a plan
            </Link>
          )}
          <ViewToggle />
        </div>
      </div>
    </header>
  )
}
