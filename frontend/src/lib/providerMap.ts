// Pure helpers for the provider map (components/ProviderMap.tsx). Nothing here
// touches Mapbox, so it can be tested on its own.

import type { Provider } from '../types/domain'

/** A muted light basemap: it keeps the pins readable, and matches the app's light theme. */
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11'

/** Camera for the tilted 3D view (the flat Traditional view and reduced motion use pitch 0). */
export const TILT = { pitch: 55, bearing: -20 }

export type LngLat = [number, number]
export type LngLatBounds = [LngLat, LngLat]

/**
 * The Mapbox access token from the environment. Use a public `pk.` token and
 * restrict it to this site's URL in the Mapbox account: it ships in the bundle.
 */
export function mapToken(): string | undefined {
  const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim()
  return token ? token : undefined
}

/** A provider the map can pin: both coordinates are real numbers. */
export function hasCoordinates(p: Provider): p is Provider & { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)
}

/** South-west and north-east corners around every pinned provider, or null when there are none. */
export function boundsOf(providers: Provider[]): LngLatBounds | null {
  const pinned = providers.filter(hasCoordinates)
  if (pinned.length === 0) return null
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const p of pinned) {
    west = Math.min(west, p.lng)
    east = Math.max(east, p.lng)
    south = Math.min(south, p.lat)
    north = Math.max(north, p.lat)
  }
  return [
    [west, south],
    [east, north],
  ]
}

/** The pin's accessible name: who, which network and how far, and what it does. */
export function pinLabel(p: Provider): string {
  const network = p.inNetwork ? 'in-network' : 'out-of-network'
  return `${p.name}, ${p.practiceName}, ${network}, ${p.distanceMiles.toFixed(1)} miles away. Show details on the map.`
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  el.textContent = text
  return el
}

/**
 * The popup's content, built as DOM nodes with textContent (never an HTML
 * string), so nothing from the data can inject markup.
 */
export function buildPopup(p: Provider): HTMLElement {
  const root = document.createElement('div')
  root.className = 'provider-popup'
  root.append(
    node('p', 'provider-popup__name', p.name),
    node('p', 'provider-popup__practice', `${p.practiceName} · ${p.specialty}`),
    node(
      'p',
      'provider-popup__meta',
      [
        p.inNetwork ? 'In-network' : 'Out-of-network',
        `${p.distanceMiles.toFixed(1)} mi`,
        p.acceptingNewPatients ? 'Accepting new patients' : 'Not accepting new patients',
      ].join(' · '),
    ),
  )
  const phone = node('a', 'provider-popup__phone', p.phone)
  phone.href = `tel:${p.phone.replace(/[^\d+]/g, '')}`
  root.append(phone)
  return root
}
