import { CalendarClock, Check, Sparkles, X } from 'lucide-react'
import type { ToothInfo } from '../data/teeth'
import type { ToothStatus } from '../types/domain'

export interface ToothHistoryEntry {
  label: string
  detail: string
  kind: 'treated' | 'planned'
}

interface ToothInspectorProps {
  tooth: ToothInfo
  status?: ToothStatus
  history: ToothHistoryEntry[]
  disabled?: boolean
  onAsk: (prompt: string) => void
  onClose: () => void
}

const QUICK_ACTIONS: Array<{ label: string; prompt: (n: number) => string }> = [
  { label: 'Filling', prompt: (n) => `I need a filling on tooth #${n}` },
  { label: 'Crown', prompt: (n) => `My dentist recommended a crown on tooth #${n}` },
  { label: 'Root canal', prompt: (n) => `I might need a root canal on tooth #${n}` },
  { label: 'Extraction', prompt: (n) => `What if tooth #${n} is pulled?` },
  { label: 'Implant', prompt: (n) => `How much is an implant for tooth #${n}?` },
]

/** Details and one-click "what would it cost" questions for the selected tooth. */
export default function ToothInspector({ tooth, status, history, disabled, onAsk, onClose }: ToothInspectorProps) {
  return (
    <section aria-labelledby="tooth-inspector-title" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="tooth-inspector-title" className="flex flex-wrap items-baseline gap-x-2 text-ink">
            <span className="text-2xl font-semibold tracking-tight">Tooth #{tooth.number}</span>
            <span className="text-sm text-ink-muted">{tooth.name}</span>
          </h3>
          {status && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              {status === 'planned' ? (
                <CalendarClock className="size-4 text-viz-planned" aria-hidden="true" />
              ) : (
                <Check className="size-4 text-viz-treated" aria-hidden="true" />
              )}
              {status === 'planned' ? 'Care planned' : 'Treated this plan year'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
          aria-label="Clear selected tooth"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {history.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3" aria-label={`History for tooth ${tooth.number}`}>
          {history.map((entry) => (
            <li key={`${entry.kind}-${entry.label}-${entry.detail}`} className="flex items-center gap-2 text-sm">
              {entry.kind === 'planned' ? (
                <CalendarClock className="size-3.5 shrink-0 text-viz-planned" aria-hidden="true" />
              ) : (
                <Check className="size-3.5 shrink-0 text-viz-treated" aria-hidden="true" />
              )}
              <span className="sr-only">{entry.kind === 'planned' ? 'Planned:' : 'Treated:'}</span>
              <span className="text-ink">{entry.label}</span>
              <span className="ml-auto text-ink-muted">{entry.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-line pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm text-ink-muted">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Ask what it would cost
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(action.prompt(tooth.number))}
              className="min-h-10 rounded-full border border-control bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
            >
              {action.label}
              <span className="sr-only"> on tooth {tooth.number}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
