import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Prerequisite } from '../rooms'
import { useMissingPrerequisite } from '../store/usePrerequisite'
import { useSessionStore } from '../store/sessionStore'
import Panel from './Panel'
import { buttonPrimary } from './ui'

/** Shows the room's content, or explains (with a link) what to do first. */
export default function RoomGate({ prerequisite, children }: { prerequisite: Prerequisite; children: ReactNode }) {
  const missing = useMissingPrerequisite(prerequisite)
  const hasPlan = useSessionStore((s) => s.plan != null)
  if (!missing) return <>{children}</>

  const next = hasPlan
    ? { to: '/operatory#describe', label: 'Go to the Operatory' }
    : { to: '/reception#check-in', label: 'Go to Reception' }
  return (
    <Panel id="missing" title="Nothing to show yet">
      <p>{missing}</p>
      <Link
        to={next.to}
        className={buttonPrimary}
      >
        {next.label} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Panel>
  )
}
