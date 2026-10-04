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
  const pad = size === 'sm' ? 'min-h-11 px-3 text-xs' : 'min-h-11 px-4 text-sm'
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink'}>
        {legend}
      </legend>
      <div className="inline-flex flex-wrap rounded-lg border border-control bg-surface">
        {options.map((opt) => (
          <label key={opt.value} className="relative border-control not-first:border-l">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="peer sr-only"
            />
            <span
              className={`flex cursor-pointer items-center font-medium text-ink-muted transition-colors hover:text-ink peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${pad}`}
            >
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
