import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary, buttonSecondary } from '../components/ui'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.entrance

const WHAT = [
  { title: 'Understands your care', body: 'Say “root canal on tooth #14” and it finds the billing code and the tooth.' },
  { title: 'Translates your plan', body: 'What insurance pays and what you owe, in and out of network.' },
  { title: 'Times your care', body: 'Spreads treatment across plan years so your annual maximum gets used, not lost on Dec 31.' },
]

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
        <ol className="border-t-2 border-ink">
          {WHAT.map((item, i) => (
            <li key={item.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4">
              <span className="font-mono text-sm tabular-nums text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block font-serif text-lg text-ink">{item.title}</span>
                <span className="block text-ink-muted">{item.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  )
}
