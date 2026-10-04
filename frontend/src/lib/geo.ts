// Small geography helpers for the Providers page: distance between two points,
// and turning a US ZIP code into a map location with the Mapbox geocoder.

import { useEffect, useState } from 'react'
import { mapToken, type LngLat } from './providerMap'

/** Straight-line miles between two [lat, lng] points (haversine), to a tenth of a mile. */
export function milesBetween(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10
}

const cache = new Map<string, LngLat | null>()

/** The centre of a US ZIP code as [lng, lat], or null if Mapbox doesn't know it. Throws on a network error. */
export async function geocodeZip(zip: string, signal?: AbortSignal): Promise<LngLat | null> {
  if (cache.has(zip)) return cache.get(zip) ?? null
  const token = mapToken()
  if (!token) return null
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(zip)}.json` +
    `?country=us&types=postcode&limit=1&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`geocoding failed: ${res.status}`)
  const data = (await res.json()) as { features?: Array<{ center?: number[] }> }
  const center = data.features?.[0]?.center
  const point: LngLat | null = center && center.length >= 2 ? [center[0], center[1]] : null
  cache.set(zip, point)
  return point
}

export type ZipLookup =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'found'; center: LngLat }
  | { status: 'unknown' }
  | { status: 'error' }

/** Looks a ZIP up as it changes. `none` when there is no ZIP (or no token to look it up with). */
export function useZipCenter(zip: string): ZipLookup {
  const [result, setResult] = useState<{ zip: string; lookup: ZipLookup } | null>(null)
  const wanted = /^\d{5}$/.test(zip) && mapToken() ? zip : ''

  useEffect(() => {
    if (!wanted) return
    const controller = new AbortController()
    geocodeZip(wanted, controller.signal)
      .then((center) => setResult({ zip: wanted, lookup: center ? { status: 'found', center } : { status: 'unknown' } }))
      .catch((err) => {
        if (!controller.signal.aborted) setResult({ zip: wanted, lookup: { status: 'error' } })
        void err
      })
    return () => controller.abort()
  }, [wanted])

  if (!wanted) return { status: 'none' }
  return result?.zip === wanted ? result.lookup : { status: 'loading' }
}
