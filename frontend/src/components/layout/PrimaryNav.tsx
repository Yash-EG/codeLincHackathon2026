import { FileSearch, MapPin, Stethoscope, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import type { RoomId } from '../../rooms'

interface PrimaryItem {
  room: RoomId
  to: string
  label: string
  blurb: string
  icon: LucideIcon
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

/**
 * Primary navigation: the three core functions, one tab each, in a ruled row
 * under the header. The current tab carries a maroon rule on top.
 */
export default function PrimaryNav() {
  return (
    <nav aria-label="Primary" className="border-t border-line">
      <ul className="flex overflow-x-auto px-4 sm:px-6 lg:px-12">
        {PRIMARY.map(({ to, label, blurb, icon: Icon }) => (
          <li key={to} className="min-w-44 flex-1 border-line not-first:border-l">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative flex min-h-12 items-center gap-3 px-4 py-2.5 no-underline transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-muted hover:bg-paper/60 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-0.5 ${isActive ? 'bg-primary' : ''}`} />
                  <Icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : ''}`} aria-hidden="true" />
                  <span className="leading-tight">
                    <span className="block whitespace-nowrap text-sm font-semibold">
                      {label}
                      {isActive && <span className="sr-only"> (current)</span>}
                    </span>
                    <span className="mt-0.5 hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-ink-muted sm:block">
                      {blurb}
                    </span>
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
