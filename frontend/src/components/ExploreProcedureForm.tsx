import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Pencil, TriangleAlert } from 'lucide-react'
import { buttonPrimary, buttonSecondary, fieldInput } from './ui'

/**
 * A short, single-select intake form: who the care is for, what procedure,
 * when it's needed, and where (ZIP + radius) to look. Each group is a native
 * radio group styled as cards, so keyboard support (Tab to the group, arrow
 * keys within it) and selected states come for free (WCAG 2.1.1 / 4.1.2).
 *
 * There is no backend search that takes these inputs yet, so Continue shows a
 * read-only summary of the selections. Nothing is fabricated. Selections are
 * kept in state, so "Edit answers" returns to the form with everything intact.
 * `onContinue` (optional) hands the answers to the page, e.g. to prefill
 * "Describe your care" with the chosen procedure.
 */

type OptionGroup = {
  key: 'patient' | 'procedure' | 'timing' | 'radius'
  legend: string
  options: ReadonlyArray<{ value: string; label: string }>
}

const GROUPS: readonly OptionGroup[] = [
  {
    key: 'patient',
    legend: 'Who is the procedure for?',
    options: [
      { value: 'me', label: 'Me (account owner)' },
      { value: 'spouse', label: 'Spouse / partner' },
      { value: 'child', label: 'Child' },
      { value: 'dependent', label: 'Other covered dependent' },
    ],
  },
  {
    key: 'procedure',
    legend: 'What procedure is needed?',
    options: [
      { value: 'cleaning', label: 'Cleaning / checkup' },
      { value: 'filling', label: 'Filling' },
      { value: 'crown', label: 'Crown' },
      { value: 'root-canal', label: 'Root canal' },
      { value: 'extraction', label: 'Extraction' },
      { value: 'unsure', label: "Other / I'm not sure" },
    ],
  },
  {
    key: 'timing',
    legend: 'When is the appointment needed?',
    options: [
      { value: 'this-month', label: 'This month' },
      { value: '3-months', label: 'Within 3 months' },
      { value: '6-months', label: 'Within 6 months' },
      { value: 'exploring', label: 'Just exploring' },
    ],
  },
  {
    key: 'radius',
    legend: 'How far will you travel?',
    options: [
      { value: '5', label: 'Within 5 miles' },
      { value: '10', label: 'Within 10 miles' },
      { value: '25', label: 'Within 25 miles' },
      { value: '50', label: 'Within 50 miles' },
    ],
  },
] as const

type GroupKey = OptionGroup['key']
type Selections = Record<GroupKey, string>

const EMPTY: Selections = { patient: '', procedure: '', timing: '', radius: '' }

/** Looks up the human label for a stored value. */
function labelFor(key: GroupKey, value: string): string {
  const group = GROUPS.find((g) => g.key === key)
  return group?.options.find((o) => o.value === value)?.label ?? value
}

const ZIP_PATTERN = /^\d{5}$/

type Errors = Partial<Record<GroupKey | 'zip', string>>

export interface ExploreAnswers extends Selections {
  /** The human label of the chosen procedure, e.g. "Root canal". */
  procedureLabel: string
  zip: string
}

export default function ExploreProcedureForm({ onContinue }: { onContinue?: (answers: ExploreAnswers) => void } = {}) {
  const [selections, setSelections] = useState<Selections>(EMPTY)
  const [zip, setZip] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState<{ selections: Selections; zip: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const zipId = useId()

  const complete =
    (Object.keys(EMPTY) as GroupKey[]).every((k) => selections[k] !== '') && ZIP_PATTERN.test(zip.trim())

  function validate(): Errors {
    const found: Errors = {}
    for (const group of GROUPS) {
      if (!selections[group.key]) found[group.key] = 'Choose one option.'
    }
    const z = zip.trim()
    if (!z) found.zip = 'Enter a ZIP code.'
    else if (!ZIP_PATTERN.test(z)) found.zip = 'Enter a five-digit US ZIP code, like 43215.'
    return found
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Move focus to the first group/field that needs attention.
      const firstGroup = GROUPS.find((g) => found[g.key])
      if (firstGroup) {
        formRef.current
          ?.querySelector<HTMLInputElement>(`input[name="explore-${firstGroup.key}"]`)
          ?.focus()
      } else if (found.zip) {
        formRef.current?.querySelector<HTMLInputElement>(`#${CSS.escape(zipId)}`)?.focus()
      }
      return
    }
    setSubmitted({ selections: { ...selections }, zip: zip.trim() })
    onContinue?.({ ...selections, procedureLabel: labelFor('procedure', selections.procedure), zip: zip.trim() })
  }

  // Summary step: a read-only recap of what the employee chose. Selections stay
  // in state, so "Edit answers" returns here with everything preserved.
  if (submitted) {
    return (
      <div className="space-y-4">
        <p className="text-ink-muted">Here&rsquo;s what you told us. Nothing is submitted anywhere yet.</p>
        <dl className="grid gap-px border-t-2 border-ink bg-line sm:grid-cols-2">
          <SummaryRow label="Who it's for" value={labelFor('patient', submitted.selections.patient)} />
          <SummaryRow label="Procedure" value={labelFor('procedure', submitted.selections.procedure)} />
          <SummaryRow label="Timing" value={labelFor('timing', submitted.selections.timing)} />
          <SummaryRow label="Search radius" value={labelFor('radius', submitted.selections.radius)} />
          <SummaryRow label="ZIP code" value={submitted.zip} />
        </dl>
        <button type="button" onClick={() => setSubmitted(null)} className={buttonSecondary}>
          <Pencil className="size-4" aria-hidden="true" /> Edit answers
        </button>
      </div>
    )
  }

  const errorCount = Object.keys(errors).length
  const zipError = errors.zip

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="space-y-6">
      {errorCount > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 border-l-2 border-danger py-1 pl-3 text-sm font-semibold text-danger"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorCount === 1 ? '1 answer is' : `${errorCount} answers are`} missing.
        </p>
      )}

      {GROUPS.map((group) => (
        <ChoiceGroup
          key={group.key}
          group={group}
          value={selections[group.key]}
          error={errors[group.key]}
          onSelect={(value) => {
            setSelections((s) => ({ ...s, [group.key]: value }))
            setErrors((e) => ({ ...e, [group.key]: undefined }))
          }}
        />
      ))}

      <div>
        <label htmlFor={zipId} className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
          Where should we look?
        </label>
        <p id={`${zipId}-hint`} className="text-sm text-ink-muted">
          Enter a ZIP code as the center of the search. We don&rsquo;t need a full address.
        </p>
        <input
          id={zipId}
          name="explore-zip"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="43215"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, '').slice(0, 5))
            if (zipError) setErrors((er) => ({ ...er, zip: undefined }))
          }}
          aria-invalid={zipError ? true : undefined}
          aria-describedby={zipError ? `${zipId}-hint ${zipId}-error` : `${zipId}-hint`}
          className={`${fieldInput} max-w-[12rem] font-mono tabular-nums`}
        />
        {zipError && (
          <p id={`${zipId}-error`} className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {zipError}
          </p>
        )}
      </div>

      <button type="submit" disabled={!complete} className={buttonPrimary}>
        Continue <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  )
}

/** One single-select group rendered as a fieldset of radio "cards". */
function ChoiceGroup({
  group,
  value,
  error,
  onSelect,
}: {
  group: OptionGroup
  value: string
  error?: string
  onSelect: (value: string) => void
}) {
  const errorId = `explore-${group.key}-error`
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink">{group.legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {group.options.map((opt) => {
          const selected = value === opt.value
          return (
            <label key={opt.value} className="relative">
              <input
                type="radio"
                name={`explore-${group.key}`}
                value={opt.value}
                checked={selected}
                onChange={() => onSelect(opt.value)}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-3 py-2.5 text-center text-sm font-medium transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
                  selected
                    ? 'border-primary bg-primary/[0.05] font-semibold text-primary'
                    : 'border-control bg-surface text-ink hover:border-ink'
                }`}
              >
                {opt.label}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  )
}
