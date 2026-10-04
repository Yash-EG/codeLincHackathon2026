import { X } from 'lucide-react'
import type { ToothInfo } from '../data/teeth'
import type { ToothStatus } from '../types/domain'
import { buttonQuiet, eyebrow } from './ui'

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
    <section aria-labelledby="tooth-inspector-title" className="border-t-2 border-primary/70 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="tooth-inspector-title" className="font-serif text-2xl leading-tight text-ink">
            Tooth <span className="font-mono tabular-nums">#{tooth.number}</span>
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {tooth.name}
            {status && <> · {status === 'planned' ? 'Care planned' : 'Treated this plan year'}</>}
          </p>
        </div>
        <button type="button" onClick={onClose} className={buttonQuiet}>
          <X className="size-4" aria-hidden="true" />
          Clear<span className="sr-only"> selected tooth</span>
        </button>
      </div>

      {history.length > 0 && (
        <ul className="mt-4 border-t border-line" aria-label={`History for tooth ${tooth.number}`}>
          {history.map((entry) => (
            <li
              key={`${entry.kind}-${entry.label}-${entry.detail}`}
              className="flex items-baseline gap-3 border-b border-line py-2 text-sm"
            >
              <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                {entry.kind === 'planned' ? 'Planned' : 'Treated'}
              </span>
              <span className="text-ink">{entry.label}</span>
              <span className="ml-auto font-mono text-ink-muted">{entry.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <p className={`${eyebrow} mb-2`}>Ask what it would cost</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(action.prompt(tooth.number))}
              className="min-h-11 rounded-lg border border-control bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
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
