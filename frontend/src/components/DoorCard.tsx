import { DoorOpen, Info } from 'lucide-react'
import { Link } from 'react-router'
import type { Room } from '../rooms'
import { useMissingPrerequisite } from '../store/usePrerequisite'

/**
 * A door to another room: a real link, mirrored by a door in the 3D scene.
 * A room that isn't ready yet is still reachable and says what's missing.
 */
export default function DoorCard({ room }: { room: Room }) {
  const missing = useMissingPrerequisite(room.prerequisite)
  return (
    <Link
      to={room.path}
      className="group flex min-h-24 flex-col gap-1 rounded-2xl border border-line bg-surface p-4 no-underline shadow-sm transition hover:border-primary"
    >
      <span className="flex items-center justify-between gap-2 text-base font-semibold text-primary group-hover:underline">
        {room.name}
        <DoorOpen className="size-5 shrink-0" aria-hidden="true" />
      </span>
      <span className="text-sm text-ink-muted">{room.purpose}</span>
      {missing && (
        <span className="mt-1 flex items-start gap-1.5 text-sm font-medium text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {missing}
        </span>
      )}
    </Link>
  )
}
