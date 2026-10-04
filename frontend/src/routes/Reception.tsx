import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import DoorCard from '../components/DoorCard'
import Panel from '../components/Panel'
import PlanInput from '../components/panels/PlanInput'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary, buttonSecondary, textLink } from '../components/ui'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.reception
const DOORS = [ROOMS_BY_ID.operatory, ROOMS_BY_ID.imaging, ROOMS_BY_ID.billing, ROOMS_BY_ID.consult, ROOMS_BY_ID.records]

export default function Reception() {
  return (
    <>
      <RoomIntro room={room} id="welcome" title="Welcome in">
        <p className="font-serif text-xl italic text-ink">Know what you&rsquo;ll owe before you sit in the chair.</p>
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
        <ol className="list-decimal space-y-3 border-t-2 border-ink pt-4 pl-6 marker:font-mono marker:text-sm marker:text-ink-muted">
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

      <PlanInput />

      <Panel id="privacy" title="Your privacy">
        <ul className="list-disc space-y-2 pl-5">
          <li>Everything here is synthetic demo data. Don&rsquo;t enter real member IDs or health details.</li>
          <li>Nothing is stored on a server. Your answers stay in this browser tab and clear when you close it.</li>
          <li>Every number is an estimate, not a guarantee of payment. Your insurer decides the final amount.</li>
        </ul>
      </Panel>

      <Panel id="doors" title="Where to next">
        <div className="border-t-2 border-ink">
          {DOORS.map((door) => (
            <DoorCard key={door.id} room={door} />
          ))}
        </div>
      </Panel>
    </>
  )
}
