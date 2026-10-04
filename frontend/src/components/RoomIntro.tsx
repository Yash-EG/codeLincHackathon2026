import type { ReactNode } from 'react'
import type { Room } from '../rooms'
import { eyebrow } from './ui'

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
      <div className="panel">
        {room.requirement && <p className={`${eyebrow} mb-4`}>{room.requirement}</p>}
        <h1
          id={`${id}-title`}
          tabIndex={-1}
          className="font-serif text-4xl font-normal leading-[1.05] tracking-tight text-ink sm:text-5xl"
        >
          {title ?? room.name}
        </h1>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink-muted sm:text-lg">{room.description}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  )
}
