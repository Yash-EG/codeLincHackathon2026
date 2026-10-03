import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { roomForPath } from '../rooms'
import { announce } from '../store/uiStore'

const SITE = 'Molarity'

/**
 * After every in-app navigation (not the first page load): update the page
 * title, move focus to the new room's <h1> (or the #hash target), and announce
 * the arrival politely. Scroll position is left to <ScrollRestoration>.
 */
export function useRouteFocus() {
  const location = useLocation()
  const lastKey = useRef(location.key)
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    const room = roomForPath(location.pathname)
    document.title = `${room?.name ?? 'Room not found'} · ${SITE}`
  }, [location.pathname])

  useEffect(() => {
    // Same key = first load, or StrictMode re-running the effect: leave focus alone.
    if (lastKey.current === location.key) return
    lastKey.current = location.key

    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
    const focusable = target ?? document.querySelector<HTMLElement>('#main h1')
    if (focusable) {
      if (!focusable.hasAttribute('tabindex') && !isNativelyFocusable(focusable)) focusable.setAttribute('tabindex', '-1')
      focusable.focus({ preventScroll: true })
    }

    // Announce arrivals only; a jump within the same room just moves focus.
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    const room = roomForPath(location.pathname)
    announce(room ? `${room.name}. ${room.purpose}` : 'Room not found.')
  }, [location.key, location.hash, location.pathname])
}

function isNativelyFocusable(el: HTMLElement) {
  return el.matches('a[href], button, input, select, textarea, summary, [contenteditable="true"]')
}
