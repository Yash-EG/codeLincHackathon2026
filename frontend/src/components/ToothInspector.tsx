import { Sparkles, X } from 'lucide-react'
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

/** Floating panel over the 3D stage for the tooth the user clicked. */
export default function ToothInspector({ tooth, status, history, disabled, onAsk, onClose }: ToothInspectorProps) {
  return (
    <div
      role="dialog"
      aria-label={`Tooth ${tooth.number}, ${tooth.name}`}
      className="w-72 rounded-2xl border border-ink-700 bg-ink-900/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">Tooth</p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-ink-50">#{tooth.number}</span>
            {status && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                  status === 'planned' ? 'text-ink-100 ring-viz-planned/50' : 'text-ink-100 ring-viz-treated/50'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${status === 'planned' ? 'bg-viz-planned' : 'bg-viz-treated'}`}
                  aria-hidden="true"
                />
                {status === 'planned' ? 'Care planned' : 'Treated this year'}
              </span>
            )}
          </p>
          <p className="text-sm text-ink-300">{tooth.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100 focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Close tooth details"
        >
          <X className="size-4" />
        </button>
      </div>

      {history.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-ink-800 pt-3">
          {history.map((entry) => (
            <li key={`${entry.kind}-${entry.label}-${entry.detail}`} className="flex items-center gap-2 text-xs">
              <span
                className={`size-1.5 shrink-0 rounded-full ${entry.kind === 'planned' ? 'bg-viz-planned' : 'bg-viz-treated'}`}
                aria-hidden="true"
              />
              <span className="text-ink-100">{entry.label}</span>
              <span className="ml-auto text-ink-400">{entry.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-ink-800 pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-400">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          Ask what it would cost
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(action.prompt(tooth.number))}
              className="rounded-full border border-ink-700 bg-ink-800 px-2.5 py-1 text-xs font-medium text-ink-100 transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
