interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  legend: string
  /** Radio group name; must be unique on the page. */
  name: string
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  hideLegend?: boolean
  size?: 'sm' | 'md'
}

/** A row of native radio buttons styled as a segmented control (arrow keys work natively). */
export default function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hideLegend,
  size = 'md',
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'min-h-9 px-2.5 py-1.5 text-xs' : 'min-h-11 px-3.5 py-2.5 text-sm'
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'mb-2 text-sm font-semibold text-ink'}>{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-control bg-surface p-1">
        {options.map((opt) => (
          <label key={opt.value} className="relative">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="peer sr-only"
            />
            <span
              className={`flex cursor-pointer items-center rounded-lg font-medium text-ink-muted transition hover:text-ink peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-white peer-focus-visible:shadow-[0_0_0_2px_#fff] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${pad}`}
            >
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
