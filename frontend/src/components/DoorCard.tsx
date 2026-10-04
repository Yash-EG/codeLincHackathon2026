import { ArrowRight, Info } from 'lucide-react'
import { Link } from 'react-router'
import type { Room } from '../rooms'
import { useMissingPrerequisite } from '../store/usePrerequisite'
import { tileLift } from './ui'

/**
 * A door to another room: a real link, mirrored by a door in the 3D scene.
 * Shown as a ruled row in a list. A room that isn't ready yet is still
 * reachable and says what's missing.
 */
export default function DoorCard({ room }: { room: Room }) {
  const missing = useMissingPrerequisite(room.prerequisite)
  return (
    <Link
      to={room.path}
      className={`group mb-2 grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl border border-line bg-white/60 px-4 py-3 no-underline hover:border-primary/50 ${tileLift}`}
    >
      <span className="min-w-0">
        <span className="block font-serif text-lg text-ink group-hover:text-primary">{room.name}</span>
        <span className="block text-sm text-ink-muted">{room.purpose}</span>
        {missing && (
          <span className="mt-1 flex items-start gap-1.5 text-sm font-medium text-amber-ink">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {missing}
          </span>
        )}
      </span>
      <ArrowRight
        className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  )
}
