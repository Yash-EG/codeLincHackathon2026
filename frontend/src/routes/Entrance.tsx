import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary, buttonSecondary } from '../components/ui'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.entrance

export default function Entrance() {
  return (
    <>
      <RoomIntro room={room} id="hero" title="Know what you’ll owe before you sit in the chair">
        <div className="flex flex-wrap gap-3">
          <Link to="/reception" className={buttonPrimary}>
            Walk in <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="/hallway" className={buttonSecondary}>
            See every room
          </Link>
        </div>
      </RoomIntro>

      <Panel id="what" title="What Molarity does">
        <ol className="space-y-4">
          <li>
            <p className="font-semibold text-ink">Understands your care</p>
            <p className="text-ink-muted">
              Say &ldquo;crown on my back left molar&rdquo; and it finds the billing code and the tooth.
            </p>
          </li>
          <li>
            <p className="font-semibold text-ink">Translates your plan</p>
            <p className="text-ink-muted">What insurance pays and what you pay, in and out of network.</p>
          </li>
          <li>
            <p className="font-semibold text-ink">Times your care</p>
            <p className="text-ink-muted">
              Spreads treatment across plan years so your annual maximum gets used, not lost on Dec 31.
            </p>
          </li>
        </ol>
      </Panel>
    </>
  )
}
