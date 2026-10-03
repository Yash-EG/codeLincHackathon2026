import { CalendarClock, Check } from 'lucide-react'
import { getTooth } from '../data/teeth'
import type { ToothStatus } from '../types/domain'

interface ToothPickerProps {
  selectedTooth: number | null
  toothStatus: Partial<Record<number, ToothStatus>>
  onSelect: (toothNumber: number | null) => void
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i))

// Laid out as the dentist sees the mouth: the patient's right is on the left.
const QUADRANTS = [
  { id: 'upper-right', label: 'Upper right', teeth: range(1, 8) },
  { id: 'upper-left', label: 'Upper left', teeth: range(9, 16) },
  { id: 'lower-right', label: 'Lower right', teeth: range(32, 25) },
  { id: 'lower-left', label: 'Lower left', teeth: range(24, 17) },
]

const STATUS_TEXT: Record<ToothStatus, string> = {
  planned: 'care planned',
  treated: 'treated this plan year',
}

/**
 * The tooth map as plain buttons: the keyboard and screen-reader equivalent of
 * the 3D arch. Status is shown by icon and text, never by color alone.
 */
export default function ToothPicker({ selectedTooth, toothStatus, onSelect }: ToothPickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {QUADRANTS.map((quadrant) => (
          <div key={quadrant.id} role="group" aria-labelledby={`${quadrant.id}-label`}>
            <p id={`${quadrant.id}-label`} className="mb-1.5 text-sm font-semibold text-ink">
              {quadrant.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quadrant.teeth.map((number) => {
                const tooth = getTooth(number)
                const status = toothStatus[number]
                const selected = selectedTooth === number
                const label = `Tooth ${number}, ${tooth?.name.toLowerCase() ?? ''}${status ? `, ${STATUS_TEXT[status]}` : ''}`
                return (
                  <button
                    key={number}
                    type="button"
                    aria-pressed={selected}
                    aria-label={label}
                    title={tooth?.name}
                    onClick={() => onSelect(selected ? null : number)}
                    className={`relative grid size-11 place-items-center rounded-xl border text-sm font-semibold tabular-nums transition ${
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-control bg-surface text-ink hover:border-primary hover:text-primary'
                    }`}
                  >
                    {number}
                    {status === 'planned' && (
                      <CalendarClock
                        className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-surface p-0.5 text-viz-planned ring-1 ring-viz-planned"
                        aria-hidden="true"
                      />
                    )}
                    {status === 'treated' && (
                      <Check
                        className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-surface p-0.5 text-viz-treated ring-1 ring-viz-treated"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted" aria-label="Key">
        <li className="flex items-center gap-1.5">
          <CalendarClock className="size-4 text-viz-planned" aria-hidden="true" /> Care planned
        </li>
        <li className="flex items-center gap-1.5">
          <Check className="size-4 text-viz-treated" aria-hidden="true" /> Treated this plan year
        </li>
      </ul>
    </div>
  )
}
