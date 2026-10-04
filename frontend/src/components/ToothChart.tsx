import { getTooth } from '../data/teeth'
import type { ToothStatus } from '../types/domain'

interface ToothChartProps {
  selectedTooth: number | null
  toothStatus: Partial<Record<number, ToothStatus>>
  onSelect: (toothNumber: number | null) => void
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i))

// Charted as the dentist sees the mouth: the patient's right is on the left.
const ARCHES = [
  {
    id: 'upper',
    label: 'Upper',
    quadrants: [
      { id: 'upper-right', label: 'Upper right', teeth: range(1, 8) },
      { id: 'upper-left', label: 'Upper left', teeth: range(9, 16) },
    ],
  },
  {
    id: 'lower',
    label: 'Lower',
    quadrants: [
      { id: 'lower-right', label: 'Lower right', teeth: range(32, 25) },
      { id: 'lower-left', label: 'Lower left', teeth: range(24, 17) },
    ],
  },
]

const STATUS_TEXT: Record<ToothStatus, string> = {
  planned: 'care planned',
  treated: 'treated this plan year',
}

/**
 * A classic 32-tooth dental chart (Universal numbering): two ruled arches of
 * 16 cells, split at the midline. Every cell is a toggle button with its name
 * and status in its label, so status is never shown by color alone. When the
 * chart is narrow the quadrants stack, so cells stay well above 24px.
 */
export default function ToothChart({ selectedTooth, toothStatus, onSelect }: ToothChartProps) {
  return (
    <div className="@container space-y-5">
      {ARCHES.map((arch) => (
        <div key={arch.id}>
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">
            {arch.label} arch
          </p>
          <div className="flex flex-col gap-3 @xl:flex-row @xl:gap-0">
            {arch.quadrants.map((quadrant, q) => (
              <div
                key={quadrant.id}
                role="group"
                aria-labelledby={`${quadrant.id}-label`}
                className={`flex-1 ${q === 1 ? '@xl:border-l-2 @xl:border-ink' : ''}`}
              >
                <p
                  id={`${quadrant.id}-label`}
                  className={`mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted ${q === 1 ? '@xl:pl-2 @xl:text-right' : ''}`}
                >
                  {quadrant.label}
                </p>
                <div className="grid grid-cols-8 gap-px border border-line bg-line">
                  {quadrant.teeth.map((number) => {
                    const tooth = getTooth(number)
                    const status = toothStatus[number]
                    const selected = selectedTooth === number
                    return (
                      <button
                        key={number}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Tooth ${number}, ${tooth?.name.toLowerCase() ?? ''}${status ? `, ${STATUS_TEXT[status]}` : ''}`}
                        title={tooth?.name}
                        onClick={() => onSelect(selected ? null : number)}
                        className={`relative flex min-h-12 flex-col items-center justify-center gap-1 font-mono text-sm tabular-nums transition-colors ${
                          selected
                            ? 'bg-primary text-white'
                            : 'bg-surface text-ink hover:text-primary hover:shadow-[inset_0_0_0_1px_var(--color-primary)]'
                        }`}
                      >
                        {number}
                        <span aria-hidden="true" className="flex h-1.5 items-center">
                          {status === 'planned' && <span className={`h-0.5 w-3.5 ${selected ? 'bg-white' : 'bg-amber'}`} />}
                          {status === 'treated' && (
                            <span className={`size-1.5 rounded-full ${selected ? 'bg-white' : 'bg-viz-treated'}`} />
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted" aria-label="Key">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-3.5 bg-amber" aria-hidden="true" /> Care planned
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-viz-treated" aria-hidden="true" /> Treated this plan year
        </li>
        <li>Charted as your dentist sees you: your right is on the left.</li>
      </ul>
    </div>
  )
}
