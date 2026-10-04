import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import ExploreProcedureForm from '../components/ExploreProcedureForm'
import { textLink } from '../components/ui'
import { formatShortDate, formatUsd } from '../lib/format'
import { ROOMS_BY_ID } from '../rooms'
import { useLineItems } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { announce } from '../store/uiStore'

const room = ROOMS_BY_ID.operatory

export default function Operatory() {
  const removeProcedure = useSessionStore((s) => s.removeProcedure)
  const lineItems = useLineItems()

  return (
    <>
      <RoomIntro room={room} />

      <Panel id="explore" title="Find care for a procedure">
        <p>
          Tell us who the care is for, what&rsquo;s needed, and where to look. It takes about a minute, and you can
          change any answer before continuing.
        </p>
        <ExploreProcedureForm />
      </Panel>

      <Panel id="planned" title="Planned care">
        {lineItems.length === 0 ? (
          <p>Nothing planned yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {lineItems.map((item) => (
              <li key={item.request.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {item.procedure.shortName}
                    {item.request.toothNumber != null && <> · tooth #{item.request.toothNumber}</>}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'Not scheduled'} · you
                    pay about {formatUsd(item.byNetwork.IN_NETWORK.patientPays)} in-network
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeProcedure(item.request.id)
                    announce(`Removed ${item.procedure.shortName} from your plan.`)
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
                  aria-label={`Remove ${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/billing" className={`${textLink} inline-flex items-center gap-1`}>
          See the full cost breakdown in Billing <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Panel>
    </>
  )
}
