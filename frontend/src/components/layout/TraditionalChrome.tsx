import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ROOMS } from '../../rooms'

interface OutlineItem {
  id: string
  label: string
}

const sameOutline = (a: OutlineItem[], b: OutlineItem[]) =>
  a.length === b.length && a.every((item, i) => item.id === b[i].id && item.label === b[i].label)

/**
 * The sections of the page on screen, read from the DOM so the list always
 * matches what is rendered (a plan being checked in adds sections, a gate
 * replaces them). The first section holds the page's <h1>, so it is "Overview".
 */
function usePageOutline(): OutlineItem[] {
  const { pathname } = useLocation()
  const [items, setItems] = useState<OutlineItem[]>([])

  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    const read = () => {
      const next = Array.from(main.querySelectorAll<HTMLElement>('section[data-camera]'))
        .map((section) => ({
          id: section.id,
          label: section.querySelector('h1') ? 'Overview' : (section.querySelector('h2')?.textContent?.trim() ?? ''),
        }))
        .filter((item) => item.id && item.label)
      setItems((prev) => (sameOutline(prev, next) ? prev : next))
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(main, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [pathname])

  return items
}

/** The section nearest the top of the viewport, for the "On this page" marker. */
function useCurrentSection(items: OutlineItem[]): string | null {
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el != null)
    if (sections.length === 0) {
      setCurrent(null)
      return
    }
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top)
          else visible.delete(entry.target.id)
        }
        const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0]
        if (top) setCurrent(top[0])
      },
      // A band across the upper part of the viewport, below the sticky header.
      { rootMargin: '-15% 0px -65% 0px' },
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  return current ?? items[0]?.id ?? null
}

/**
 * The Traditional view's rail (lg and up): every room, then this page's
 * sections. A plain, always-visible alternative to the header's directory
 * dropdown and to scrolling to find a section.
 */
export function TraditionalRail() {
  const items = usePageOutline()
  const current = useCurrentSection(items)

  return (
    <div className="trad-rail">
      <nav aria-labelledby="rail-rooms-label">
        <p id="rail-rooms-label" className="trad-rail__label" aria-hidden="true">
          Rooms
        </p>
        <ul>
          {ROOMS.map((room) => (
            <li key={room.id}>
              <NavLink to={room.path} end>
                {room.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {items.length > 1 && (
        <nav aria-labelledby="rail-page-label">
          <p id="rail-page-label" className="trad-rail__label" aria-hidden="true">
            On this page
          </p>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Link to={`#${item.id}`} aria-current={item.id === current ? 'location' : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

/** The Traditional view's footer: what every number on the page is, and where privacy is explained. */
export function TraditionalFooter() {
  return (
    <footer className="trad-footer">
      <p>
        Molarity uses demo data. Every number is an estimate, not a guarantee of payment: your insurer decides the final
        amount.
      </p>
      <p>
        <Link to="/reception#privacy" className="underline underline-offset-4 hover:text-ink">
          How your information is handled
        </Link>
      </p>
    </footer>
  )
}
