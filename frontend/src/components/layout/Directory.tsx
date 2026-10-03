import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { ChevronDown, Signpost } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { ROOMS } from '../../rooms'

/**
 * The building directory: every room, one click or keypress away. A disclosure
 * (button + list of links), not an ARIA menu, so links behave like links.
 */
export default function Directory() {
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // An open list must never cover what the user tabs to next (WCAG 2.4.11).
  function closeWhenFocusLeaves(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <nav ref={navRef} aria-label="Building directory" className="relative" onBlur={closeWhenFocusLeaves}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-control bg-surface px-3.5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
      >
        <Signpost className="size-4" aria-hidden="true" />
        Directory
        <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id={listId}
        hidden={!open}
        className="absolute left-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 shadow-xl"
      >
        <ul className="grid gap-1">
          {ROOMS.map((room) => (
            <li key={room.id}>
              <NavLink
                to={room.path}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 flex-col justify-center rounded-xl px-3 py-2 no-underline transition ${
                    isActive ? 'bg-sky ring-1 ring-primary/40' : 'hover:bg-cream'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-sm font-semibold text-primary">
                      {room.name}
                      {isActive && <span className="font-normal text-ink-muted"> (you are here)</span>}
                    </span>
                    <span className="text-sm text-ink-muted">{room.purpose}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
