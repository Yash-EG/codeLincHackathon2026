import type { ReactNode } from 'react'
import type { Room } from '../rooms'

interface RoomIntroProps {
  room: Pick<Room, 'name' | 'description' | 'requirement'>
  /** Section id (defaults to "intro"). */
  id?: string
  /** Visible heading; defaults to the room name. */
  title?: string
  children?: ReactNode
}

/**
 * First section of every room: the page's only <h1> (focused after each room
 * change) plus the room's text description, the equivalent of the 3D view.
 */
export default function RoomIntro({ room, id = 'intro', title, children }: RoomIntroProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} data-camera={id} className="room-stop">
      <div className="panel p-6 sm:p-8">
        {room.requirement && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{room.requirement}</p>
        )}
        <h1 id={`${id}-title`} tabIndex={-1} className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title ?? room.name}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">{room.description}</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  )
}
