import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { SAMPLE_PLANS, type SamplePlanId } from '../../data/mockData'
import { formatLongDate, formatUsd } from '../../lib/format'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import CheckInForm from '../CheckInForm'
import Panel from '../Panel'
import PdfDropzone from '../PdfDropzone'
import { buttonPrimary, buttonSecondary, ledger } from '../ui'

type Method = SamplePlanId | 'manual' | 'upload'

const METHODS: Array<{ value: Method; name: string; blurb: string; meta: string }> = [
  {
    value: 'preferred',
    name: SAMPLE_PLANS.preferred.plan.planName,
    blurb: SAMPLE_PLANS.preferred.blurb,
    meta: `${formatUsd(SAMPLE_PLANS.preferred.plan.annualMaximum)} max`,
  },
  {
    value: 'high-option',
    name: SAMPLE_PLANS['high-option'].plan.planName,
    blurb: SAMPLE_PLANS['high-option'].blurb,
    meta: `${formatUsd(SAMPLE_PLANS['high-option'].plan.annualMaximum)} max`,
  },
  { value: 'manual', name: 'Enter my plan', blurb: 'Copy the numbers from your summary of benefits.', meta: 'Manual' },
  { value: 'upload', name: 'Upload benefits PDF', blurb: 'Attach your summary of benefits.', meta: 'PDF' },
]

const isSample = (method: Method): method is SamplePlanId => method === 'preferred' || method === 'high-option'

/**
 * Reception's check-in (the front desk in 3D), laid out like an intake sheet:
 * pick how to check in (a sample plan, your own numbers or a PDF), then fill in
 * that part. Once checked in it becomes a ruled summary of the plan. Focus
 * follows every swap so keyboard and screen-reader users never lose their place.
 */
export default function PlanInput() {
  const { plan, benefits, loadSamplePlan, setManualPlan, reset } = useSessionStore(
    useShallow((s) => ({
      plan: s.plan,
      benefits: s.benefits,
      loadSamplePlan: s.loadSamplePlan,
      setManualPlan: s.setManualPlan,
      reset: s.reset,
    })),
  )
  const [method, setMethod] = useState<Method>('preferred')
  const [focusAfter, setFocusAfter] = useState<'summary' | 'options' | 'manual' | null>(null)
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const optionsRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (!focusAfter) return
    const target =
      focusAfter === 'summary'
        ? summaryRef.current
        : focusAfter === 'manual'
          ? document.getElementById('plan-carrierName')
          : optionsRef.current?.querySelector<HTMLInputElement>('input:checked')
    if (!target) return
    target.focus()
    setFocusAfter(null)
  }, [focusAfter, plan, method])

  if (plan && benefits) {
    const left = Math.max(benefits.remainingMaximum, 0)
    return (
      <Panel id="check-in" eyebrow="Intake" title="Check in your plan">
        <p ref={summaryRef} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck className="size-4" aria-hidden="true" />
          Checked in
        </p>
        <p className="font-serif text-2xl leading-tight text-ink">
          {plan.planName}
          <span className="block font-sans text-sm text-ink-muted">{plan.carrierName}</span>
        </p>
        <dl className={ledger.list}>
          <SummaryRow label="Member" value={benefits.fullName} />
          <SummaryRow label="Annual maximum" value={formatUsd(benefits.effectiveMaximum)} />
          <SummaryRow label="Used so far" value={formatUsd(benefits.usedToDate)} />
          <SummaryRow label="Left this year" value={formatUsd(left)} accent />
          <SummaryRow
            label="Deductible"
            value={
              benefits.deductibleRemaining > 0
                ? `${formatUsd(benefits.deductible)}, ${formatUsd(benefits.deductibleRemaining)} to go`
                : `${formatUsd(benefits.deductible)}, met`
            }
          />
          <SummaryRow label="Plan year ends" value={formatLongDate(benefits.planYearEnd)} />
          <SummaryRow label="Days left" value={String(benefits.daysRemaining)} />
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link to="/operatory" className={buttonPrimary}>
            Next: describe your care <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => {
              reset()
              setFocusAfter('options')
              announce('Plan cleared. Choose how to check in.')
            }}
          >
            Check in a different plan
          </button>
        </div>
      </Panel>
    )
  }

  const sample = isSample(method) ? SAMPLE_PLANS[method] : null

  return (
    <Panel id="check-in" eyebrow="Intake" title="Check in your plan">
      <fieldset ref={optionsRef}>
        <legend className="mb-3 font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
          How would you like to check in?
        </legend>
        <div className="border-t-2 border-ink">
          {METHODS.map((option) => (
            <label
              key={option.value}
              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-line px-3 py-3.5 transition-colors hover:bg-paper/70 has-checked:bg-primary/[0.04] has-checked:shadow-[inset_2px_0_0_var(--color-primary)]"
            >
              <input
                type="radio"
                name="check-in-method"
                value={option.value}
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block font-medium text-ink">{option.name}</span>
                <span className="block text-sm text-ink-muted">{option.blurb}</span>
              </span>
              <span className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">{option.meta}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {sample && (
        <div className="space-y-5">
          <dl className={ledger.list}>
            <SummaryRow label="Annual maximum" value={formatUsd(sample.plan.annualMaximum)} />
            <SummaryRow label="Used so far" value={formatUsd(sample.benefits.usedToDate)} />
            <SummaryRow label="Deductible" value={`${formatUsd(sample.plan.deductibleIndividualIn)}, not met`} />
            <SummaryRow
              label="Covered in-network"
              value={`${sample.tiers.PREVENTIVE.planPaysPctInNetwork} / ${sample.tiers.BASIC.planPaysPctInNetwork} / ${sample.tiers.MAJOR.planPaysPctInNetwork}%`}
              hint="Preventive / basic / major"
            />
          </dl>
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => {
              loadSamplePlan(sample.id)
              setFocusAfter('summary')
              announce(`Sample plan checked in: ${sample.plan.planName}.`)
            }}
          >
            Check in {sample.plan.planName}
          </button>
        </div>
      )}

      {method === 'manual' && (
        <CheckInForm
          onSubmit={(input) => {
            setManualPlan(input)
            setFocusAfter('summary')
            announce(`Plan checked in: ${input.planName}.`)
          }}
        />
      )}

      {method === 'upload' && (
        <PdfDropzone
          onEnterManually={() => {
            setMethod('manual')
            setFocusAfter('manual')
          }}
        />
      )}
    </Panel>
  )
}

function SummaryRow({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={ledger.row}>
      <dt className={ledger.key}>
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className={`${ledger.value} ${accent ? 'font-semibold text-amber-ink' : ''}`}>{value}</dd>
    </div>
  )
}
