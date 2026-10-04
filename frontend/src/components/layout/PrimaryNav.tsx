import { FileSearch, MapPin, Stethoscope } from 'lucide-react'
import { NavLink } from 'react-router'
import type { ComponentType } from 'react'
import type { RoomId } from '../../rooms'

interface PrimaryItem {
  room: RoomId
  to: string
  label: string
  blurb: string
  icon: ComponentType<{ className?: string }>
}

/**
 * The three primary things Molarity does, surfaced in every room. These point
 * at existing rooms so there is one canonical page per function; the full
 * building Directory (all rooms) still lives beside the brand in the header.
 */
const PRIMARY: PrimaryItem[] = [
  {
    room: 'operatory',
    to: '/operatory#describe',
    label: 'Explore procedures',
    blurb: 'Describe or pick your care',
    icon: Stethoscope,
  },
  {
    room: 'imaging',
    to: '/imaging#coverage',
    label: 'Decode your plan',
    blurb: 'Insurance jargon in plain English',
    icon: FileSearch,
  },
  {
    room: 'providers',
    to: '/providers#find',
    label: 'Find a dentist',
    blurb: 'Browse in-network providers',
    icon: MapPin,
  },
]

/** Primary navigation: the three core functions, one tab each. */
export default function PrimaryNav() {
  return (
    <nav aria-label="Primary" className="border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1.5 sm:px-4">
        {PRIMARY.map(({ to, label, blurb, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 no-underline transition ${
                  isActive ? 'bg-sky text-primary ring-1 ring-primary/40' : 'text-ink hover:bg-cream'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`size-5 shrink-0 ${isActive ? 'text-primary' : 'text-ink-muted'}`} />
                  <span className="leading-tight">
                    <span className="block whitespace-nowrap text-sm font-semibold">
                      {label}
                      {isActive && <span className="sr-only"> (current)</span>}
                    </span>
                    <span className="hidden whitespace-nowrap text-xs text-ink-muted sm:block">{blurb}</span>
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
