import { useRef, useState, type FormEvent } from 'react'
import { TriangleAlert } from 'lucide-react'
import type { ManualPlanInput } from '../store/sessionStore'
import { buttonPrimary, fieldInput } from './ui'

type FieldName = keyof ManualPlanInput

interface FieldSpec {
  name: FieldName
  label: string
  hint: string
  kind: 'text' | 'money' | 'percent' | 'date'
}

const FIELDS: FieldSpec[] = [
  { name: 'carrierName', label: 'Insurance company', hint: 'e.g. Delta Dental', kind: 'text' },
  { name: 'planName', label: 'Plan name', hint: 'e.g. PPO Plus', kind: 'text' },
  { name: 'annualMaximum', label: 'Annual maximum', hint: 'The most the plan pays per year, e.g. $1,500', kind: 'money' },
  { name: 'deductible', label: 'Deductible', hint: 'What you pay before coverage starts, e.g. $50', kind: 'money' },
  { name: 'usedToDate', label: 'Already used this plan year', hint: 'From your last claim statement, e.g. $400. Use 0 if unsure.', kind: 'money' },
  { name: 'planYearEnd', label: 'Plan year ends', hint: 'Usually Dec 31', kind: 'date' },
  { name: 'preventivePct', label: 'Preventive care covered', hint: 'Cleanings, exams, X-rays. Usually 100%.', kind: 'percent' },
  { name: 'basicPct', label: 'Basic care covered', hint: 'Fillings, root canals. Usually 80%.', kind: 'percent' },
  { name: 'majorPct', label: 'Major care covered', hint: 'Crowns, implants. Usually 50%.', kind: 'percent' },
]

const DEFAULTS: Record<FieldName, string> = {
  carrierName: '',
  planName: '',
  annualMaximum: '',
  deductible: '',
  usedToDate: '0',
  planYearEnd: `${new Date().getFullYear()}-12-31`,
  preventivePct: '100',
  basicPct: '80',
  majorPct: '50',
}

const parseNumber = (raw: string) => Number(raw.replace(/[$,%\s]/g, ''))

function validate(values: Record<FieldName, string>): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {}
  for (const field of FIELDS) {
    const raw = values[field.name].trim()
    if (!raw) {
      errors[field.name] = `Enter the ${field.label.toLowerCase()}.`
      continue
    }
    if (field.kind === 'money' || field.kind === 'percent') {
      const n = parseNumber(raw)
      if (!Number.isFinite(n) || n < 0) errors[field.name] = 'Enter a number, like 1500.'
      else if (field.kind === 'percent' && n > 100) errors[field.name] = 'Enter a percentage from 0 to 100.'
    }
    if (field.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) errors[field.name] = 'Enter a date, like 2026-12-31.'
  }
  const max = parseNumber(values.annualMaximum)
  if (!errors.usedToDate && !errors.annualMaximum && parseNumber(values.usedToDate) > max) {
    errors.usedToDate = 'This is more than the annual maximum. Check both numbers.'
  }
  return errors
}

/** Manual plan entry: visible labels, examples, and errors linked to their fields (WCAG 3.3.1/3.3.2). */
export default function CheckInForm({ onSubmit }: { onSubmit: (input: ManualPlanInput) => void }) {
  const [values, setValues] = useState(DEFAULTS)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = FIELDS.find((f) => found[f.name])
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`#plan-${firstInvalid.name}`)?.focus()
      return
    }
    onSubmit({
      carrierName: values.carrierName.trim(),
      planName: values.planName.trim(),
      annualMaximum: parseNumber(values.annualMaximum),
      deductible: parseNumber(values.deductible),
      usedToDate: parseNumber(values.usedToDate),
      planYearEnd: values.planYearEnd,
      preventivePct: parseNumber(values.preventivePct),
      basicPct: parseNumber(values.basicPct),
      majorPct: parseNumber(values.majorPct),
    })
  }

  const errorCount = Object.keys(errors).length

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="space-y-6">
      {errorCount > 0 && (
        <p role="alert" className="flex items-start gap-2 border-l-2 border-danger py-1 pl-3 text-sm font-semibold text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorCount === 1 ? '1 field needs' : `${errorCount} fields need`} attention.
        </p>
      )}
      {/* An intake sheet: one ruled row per field, label and hint on the left, the answer on the right. */}
      <div className="border-t-2 border-ink">
        {FIELDS.map((field) => {
          const id = `plan-${field.name}`
          const error = errors[field.name]
          return (
            <div key={field.name} className="grid gap-x-6 gap-y-1 border-b border-line py-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
              <div>
                <label htmlFor={id} className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
                  {field.label}
                  {field.kind === 'money' && ' ($)'}
                  {field.kind === 'percent' && ' (%)'}
                </label>
                <p id={`${id}-hint`} className="mt-1 text-sm leading-snug text-ink-muted">
                  {field.hint}
                </p>
              </div>
              <div>
                <input
                  id={id}
                  name={field.name}
                  type={field.kind === 'date' ? 'date' : 'text'}
                  inputMode={field.kind === 'money' || field.kind === 'percent' ? 'decimal' : undefined}
                  autoComplete="off"
                  required
                  value={values[field.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
                  className={`${fieldInput} sm:mt-0 ${field.kind === 'text' ? '' : 'font-mono tabular-nums'}`}
                />
                {error && (
                  <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <button type="submit" className={buttonPrimary}>
        Check in this plan
      </button>
    </form>
  )
}
