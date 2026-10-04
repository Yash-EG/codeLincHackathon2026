import { useRef } from 'react'
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
    <header ref={ref} className="sticky top-0 z-30 border-b border-ink/15 bg-surface short:static">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5 rounded-sm no-underline">
          <ToothMark className="size-6 text-primary" />
          <span className="leading-none">
            <span className="block font-serif text-xl tracking-tight text-ink">Molarity</span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Dental benefits optimizer
            </span>
          </span>
        </Link>

        <Directory />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {plan ? (
            <p className="hidden text-right leading-tight md:block">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted">Checked-in plan</span>
              <span className="block text-sm text-ink">{plan.planName}</span>
            </p>
          ) : (
            <Link
              to="/reception#check-in"
              className="hidden text-sm font-semibold text-primary underline decoration-1 underline-offset-4 md:inline"
            >
              Check in a plan
            </Link>
          )}
          <ViewToggle />
        </div>
      </div>
    </header>
  )
}
