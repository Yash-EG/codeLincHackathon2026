import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { SAMPLE_PLANS, type SamplePlanId } from '../../data/mockData'
import { formatLongDate, formatUsd } from '../../lib/format'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import CheckInForm from '../CheckInForm'
import Panel from '../Panel'
import PdfDropzone from '../PdfDropzone'
import { buttonPrimary, buttonSecondary, fieldInput, ledger } from '../ui'

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
 * Reception's plan details (the front desk in 3D). A plan is already loaded, so
 * this is a ruled summary you can correct in place: update the annual maximum
 * or what's been used, or switch to another sample plan, your own numbers or a
 * PDF. There is no setup step to get through first. Focus follows every swap so
 * keyboard and screen-reader users never lose their place.
 */
export default function PlanInput() {
  const { plan, benefits, loadSamplePlan, setManualPlan, updateBenefits } = useSessionStore(
    useShallow((s) => ({
      plan: s.plan,
      benefits: s.benefits,
      loadSamplePlan: s.loadSamplePlan,
      setManualPlan: s.setManualPlan,
      updateBenefits: s.updateBenefits,
    })),
  )
  const [method, setMethod] = useState<Method>('preferred')
  const [changing, setChanging] = useState(false)
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

  if (plan && benefits && !changing) {
    const left = Math.max(benefits.remainingMaximum, 0)
    return (
      <Panel id="check-in" eyebrow="Plan details" title="Your plan">
        <p ref={summaryRef} tabIndex={-1} className="font-serif text-2xl leading-tight text-ink">
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
        <AdjustNumbers
          key={`${benefits.annualMaximum}-${benefits.usedToDate}`}
          annualMaximum={benefits.annualMaximum}
          usedToDate={benefits.usedToDate}
          onSave={(patch) => {
            updateBenefits(patch)
            announce('Plan numbers updated.')
          }}
        />
        <div className="flex flex-wrap gap-3">
          <Link to="/imaging#ask" className={buttonPrimary}>
            Next: decode your plan <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => {
              setChanging(true)
              setFocusAfter('options')
            }}
          >
            Use a different plan
          </button>
        </div>
      </Panel>
    )
  }

  const sample = isSample(method) ? SAMPLE_PLANS[method] : null

  return (
    <Panel id="check-in" eyebrow="Plan details" title="Choose a plan">
      <fieldset ref={optionsRef}>
        <legend className="mb-3 font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
          Which plan should we use?
        </legend>
        <div className="border-t-2 border-primary/70">
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
              setChanging(false)
              setFocusAfter('summary')
              announce(`Now using ${sample.plan.planName}.`)
            }}
          >
            Use {sample.plan.planName}
          </button>
        </div>
      )}

      {method === 'manual' && (
        <CheckInForm
          onSubmit={(input) => {
            setManualPlan(input)
            setChanging(false)
            setFocusAfter('summary')
            announce(`Now using ${input.planName}.`)
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

      {plan && (
        <button
          type="button"
          className={buttonSecondary}
          onClick={() => {
            setChanging(false)
            setFocusAfter('summary')
          }}
        >
          Keep {plan.planName}
        </button>
      )}
    </Panel>
  )
}

/** Correct the two numbers that change most often, without redoing the whole plan. */
function AdjustNumbers({
  annualMaximum,
  usedToDate,
  onSave,
}: {
  annualMaximum: number
  usedToDate: number
  onSave: (patch: { annualMax: number; used: number }) => void
}) {
  const [max, setMax] = useState(String(annualMaximum))
  const [used, setUsed] = useState(String(usedToDate))
  const maxNum = Number(max)
  const usedNum = Number(used)
  const valid = max.trim() !== '' && used.trim() !== '' && maxNum >= 0 && usedNum >= 0 && Number.isFinite(maxNum + usedNum)
  const unchanged = maxNum === annualMaximum && usedNum === usedToDate

  return (
    <form
      noValidate
      className="space-y-3 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !unchanged) onSave({ annualMax: maxNum, used: usedNum })
      }}
    >
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink">Adjust your numbers</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          Annual maximum ($)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={50}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            aria-invalid={max.trim() === '' || maxNum < 0 ? true : undefined}
            className={fieldInput}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Used so far ($)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={25}
            value={used}
            onChange={(e) => setUsed(e.target.value)}
            aria-invalid={used.trim() === '' || usedNum < 0 ? true : undefined}
            className={fieldInput}
          />
        </label>
      </div>
      <button type="submit" disabled={!valid || unchanged} className={buttonSecondary}>
        Update numbers
      </button>
    </form>
  )
}

function SummaryRow({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={ledger.row}>
      <dt className={ledger.key}>
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className={`${ledger.value} ${accent ? 'font-semibold text-positive' : ''}`}>{value}</dd>
    </div>
  )
}
