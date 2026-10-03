import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import CheckInForm from '../components/CheckInForm'
import DoorCard from '../components/DoorCard'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary, buttonSecondary, textLink } from '../components/ui'
import { formatLongDate, formatUsd } from '../lib/format'
import { ROOMS_BY_ID } from '../rooms'
import { useSessionStore } from '../store/sessionStore'
import { announce } from '../store/uiStore'

const room = ROOMS_BY_ID.reception
const DOORS = [ROOMS_BY_ID.operatory, ROOMS_BY_ID.imaging, ROOMS_BY_ID.billing, ROOMS_BY_ID.consult, ROOMS_BY_ID.records]

export default function Reception() {
  return (
    <>
      <RoomIntro room={room} id="welcome" title="Welcome in">
        <p className="text-lg font-semibold text-ink">Know what you&rsquo;ll owe before you sit in the chair.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="#check-in" className={buttonPrimary}>
            Check in your plan <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="#how-it-works" className={buttonSecondary}>
            How it works
          </Link>
        </div>
      </RoomIntro>

      <Panel id="how-it-works" title="How it works">
        <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-primary">
          <li>
            <strong>Check in your plan.</strong> Your annual maximum, deductible and what each kind of care is covered at.
          </li>
          <li>
            <strong>Describe your care.</strong> In your own words, or by picking a tooth in the{' '}
            <Link to="/operatory" className={textLink}>
              Operatory
            </Link>
            .
          </li>
          <li>
            <strong>See the cost and the timing.</strong> What you&rsquo;ll pay in{' '}
            <Link to="/billing" className={textLink}>
              Billing
            </Link>
            , and when to schedule it in the{' '}
            <Link to="/consult" className={textLink}>
              Consult office
            </Link>
            .
          </li>
        </ol>
      </Panel>

      <CheckIn />

      <Panel id="privacy" title="Your privacy">
        <ul className="list-disc space-y-2 pl-5">
          <li>Everything here is synthetic demo data. Don&rsquo;t enter real member IDs or health details.</li>
          <li>Nothing is stored on a server. Your answers stay in this browser tab and clear when you close it.</li>
          <li>Every number is an estimate, not a guarantee of payment. Your insurer decides the final amount.</li>
        </ul>
      </Panel>

      <Panel id="doors" title="Where to next">
        <div className="grid gap-3 sm:grid-cols-2">
          {DOORS.map((door) => (
            <DoorCard key={door.id} room={door} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function CheckIn() {
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
            <SummaryItem label="Deductible" value={formatUsd(benefits.deductible)} />
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
            <p>Maya Chen&rsquo;s Premier PPO from Ivorycrest Mutual, with a few claims already this year. The quickest way to try it.</p>
            <button
              ref={sampleButtonRef}
              type="button"
              className={buttonPrimary}
              onClick={() => {
                loadSamplePlan()
                setFocusAfter('summary')
                announce('Sample plan checked in: Premier PPO.')
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
