import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { formatLongDate, formatUsd } from '../../lib/format'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import CheckInForm from '../CheckInForm'
import Panel from '../Panel'
import { buttonPrimary, buttonSecondary } from '../ui'

/**
 * Reception's check-in (the front desk in 3D): the sample plan, a typed-in plan,
 * or (later) an uploaded PDF. Once checked in it becomes a summary of the plan.
 * Focus follows the swap so keyboard and screen-reader users never lose their place.
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
  // The panel swaps between the options and the summary; keep focus on what replaced the clicked control.
  const [focusAfter, setFocusAfter] = useState<'summary' | 'options' | null>(null)
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const sampleButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!focusAfter) return
    const target = focusAfter === 'summary' ? summaryRef.current : sampleButtonRef.current
    if (!target) return
    target.focus()
    setFocusAfter(null)
  }, [focusAfter, plan])

  return (
    <Panel id="check-in" title="Check in your plan">
      {plan && benefits ? (
        <div className="space-y-4">
          <p ref={summaryRef} tabIndex={-1} className="flex items-center gap-2 font-semibold text-success">
            <CircleCheck className="size-5" aria-hidden="true" />
            Checked in: {plan.carrierName} {plan.planName}
          </p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <SummaryItem label="Member" value={benefits.fullName} />
            <SummaryItem label="Annual maximum" value={formatUsd(benefits.effectiveMaximum)} />
            <SummaryItem label="Used so far" value={formatUsd(benefits.usedToDate)} />
            <SummaryItem
              label="Deductible"
              value={
                benefits.deductibleRemaining > 0
                  ? `${formatUsd(benefits.deductible)}, ${formatUsd(benefits.deductibleRemaining)} to go`
                  : `${formatUsd(benefits.deductible)}, met`
              }
            />
            <SummaryItem label="Plan year ends" value={formatLongDate(benefits.planYearEnd)} />
            <SummaryItem label="Days left" value={String(benefits.daysRemaining)} />
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
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="sample-title" className="space-y-2">
            <h3 id="sample-title" className="text-lg font-semibold text-ink">
              Option 1: Use the sample plan
            </h3>
            <p>
              Maya Chen&rsquo;s Lincoln Preferred PPO: a $1,500 yearly maximum with $400 already used. The quickest way to
              try it.
            </p>
            <button
              ref={sampleButtonRef}
              type="button"
              className={buttonPrimary}
              onClick={() => {
                loadSamplePlan()
                setFocusAfter('summary')
                announce('Sample plan checked in: Lincoln Preferred PPO.')
              }}
            >
              Use the sample plan
            </button>
          </section>

          <section aria-labelledby="manual-title" className="space-y-2 border-t border-line pt-5">
            <h3 id="manual-title" className="text-lg font-semibold text-ink">
              Option 2: Enter your plan
            </h3>
            <p>Copy these from your plan&rsquo;s summary of benefits.</p>
            <CheckInForm
              onSubmit={(input) => {
                setManualPlan(input)
                setFocusAfter('summary')
                announce(`Plan checked in: ${input.planName}.`)
              }}
            />
          </section>

          <section aria-labelledby="upload-title" className="space-y-2 border-t border-line pt-5">
            <h3 id="upload-title" className="text-lg font-semibold text-ink">
              Option 3: Upload your plan PDF
            </h3>
            <p>
              Coming soon: upload your summary of benefits and the assistant will read the numbers for you. For now, use
              option 1 or 2.
            </p>
          </section>
        </div>
      )}
    </Panel>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  )
}
