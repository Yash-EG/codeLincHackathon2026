import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Compass, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './ProviderMap.css'
import { useReducedMotion } from '../a11y/useReducedMotion'
import { boundsOf, buildPopup, hasCoordinates, MAP_STYLE, mapToken, pinLabel, TILT } from '../lib/providerMap'
import { useViewMode } from '../store/settingsStore'
import type { Provider } from '../types/domain'
import { buttonSecondary } from './ui'

interface ProviderMapProps {
  /** The dentists to pin: the filtered list, so the filters above move the pins. */
  providers: Provider[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Called if the map can't load (a bad token, no WebGL), so the page can drop its "Show on map" buttons. */
  onFail?: () => void
}

interface Pin {
  marker: mapboxgl.Marker
  popup: mapboxgl.Popup
}

const BUILDINGS = 'providers-3d-buildings'

function fitTo(map: mapboxgl.Map, providers: Provider[], animate: boolean) {
  const bounds = boundsOf(providers)
  if (!bounds) return
  map.fitBounds(bounds, {
    padding: 64,
    maxZoom: 14,
    duration: animate ? 800 : 0,
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  })
}

/**
 * An interactive 3D map of the dentists in the list (Mapbox GL): tilted, with 3D
 * buildings, in both views. The slow rotation starts on in the 3D view and off in
 * the Traditional view, and either way you can toggle it. Under reduced motion
 * the map is flat and still, and the camera cuts instead of flying.
 *
 * It is an extra view of the list, never the only one: every pin is a real
 * <button>, and the list below carries the same information. Loaded lazily
 * (Mapbox is large) and only when there is a token and WebGL.
 */
export default function ProviderMap({ providers, selectedId, onSelect, onFail }: ProviderMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const pins = useRef(new Map<string, Pin>())
  const inView = useRef(true)
  const firstFit = useRef(true)
  const descId = useId()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()
  const view = useViewMode()
  const [rotating, setRotating] = useState(view === 'immersive')
  const flat = reduced
  const located = useMemo(() => providers.filter(hasCoordinates), [providers])

  // The latest props for the map's long-lived callbacks, so they never read stale values.
  const latest = useRef({ flat, rotating, selectedId, onSelect, onFail })
  useEffect(() => {
    latest.current = { flat, rotating, selectedId, onSelect, onFail }
  })

  // Pins follow the filtered list.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    let disposed = false
    const added = new Map<string, Pin>()
    for (const p of located) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `provider-pin ${p.inNetwork ? 'provider-pin--in' : 'provider-pin--out'}`
      button.setAttribute('aria-label', pinLabel(p))
      button.addEventListener('click', () => latest.current.onSelect(p.id))

      const popup = new mapboxgl.Popup({ offset: 22, maxWidth: '18rem', className: 'provider-popup-shell' }).setDOMContent(
        buildPopup(p),
      )
      popup.on('close', () => {
        // Closing the card (its x, Escape, or a click on the map) clears the selection.
        if (!disposed && latest.current.selectedId === p.id) latest.current.onSelect(null)
      })
      const marker = new mapboxgl.Marker({ element: button }).setLngLat([p.lng, p.lat]).addTo(map)
      added.set(p.id, { marker, popup })
    }
    pins.current = added
    fitTo(map, located, !firstFit.current && !latest.current.flat)
    firstFit.current = false
    return () => {
      disposed = true
      for (const { marker, popup } of added.values()) {
        popup.remove()
        marker.remove()
      }
      pins.current = new Map()
    }
  }, [ready, located])

  // The chosen dentist: highlight the pin, fly to it, open its card.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const [id, { marker, popup }] of pins.current) {
      const selected = id === selectedId
      marker.getElement().classList.toggle('provider-pin--selected', selected)
      if (!selected && popup.isOpen()) popup.remove()
    }
    const pin = selectedId ? pins.current.get(selectedId) : undefined
    if (!pin) return
    const center = pin.marker.getLngLat()
    pin.popup.setLngLat(center).addTo(map)
    map.flyTo({ center, zoom: Math.max(map.getZoom(), 14.5), duration: latest.current.flat ? 0 : 1600 })
  }, [selectedId, ready, located])

  // Flat and still, or tilted with 3D buildings: follows the view toggle and the motion preference.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setLayoutProperty(BUILDINGS, 'visibility', flat ? 'none' : 'visible')
    map.easeTo({ pitch: flat ? 0 : TILT.pitch, bearing: flat ? 0 : map.getBearing(), duration: flat ? 0 : 800 })
  }, [flat, ready])

  // The map itself. Declared last so that, on unmount, the pins above are removed before the map is.
  useEffect(() => {
    const token = mapToken()
    const el = container.current
    if (!token || !el) return
    mapboxgl.accessToken = token

    const fail = () => {
      setFailed(true)
      latest.current.onFail?.()
    }

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: el,
        style: MAP_STYLE,
        center: [-79.8, 36.08],
        zoom: 10,
        pitch: latest.current.flat ? 0 : TILT.pitch,
        bearing: latest.current.flat ? 0 : TILT.bearing,
        antialias: true,
        // The map sits inside a scrolling page: Ctrl + scroll (or two fingers) to zoom, so it never traps the scroll.
        cooperativeGestures: true,
      })
    } catch {
      fail()
      return
    }
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right')

    map.on('error', (e: { error?: unknown }) => {
      const status = (e.error as { status?: number } | undefined)?.status
      if (status === 401 || status === 403) fail() // a bad or restricted token
    })

    map.on('load', () => {
      // Quieter basemap: points of interest and transit compete with the pins.
      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.type === 'symbol' && /(poi|transit|airport|ferry)/.test(layer.id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      }
      map.addLayer({
        id: BUILDINGS,
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 12,
        layout: { visibility: latest.current.flat ? 'none' : 'visible' },
        paint: {
          'fill-extrusion-color': '#d9d6cd',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.75,
        },
      })
      setReady(true)
    })

    // Keep the canvas sized to its box (the drawer, the column and the zoom level all change it).
    const resizer = new ResizeObserver(() => map.resize())
    resizer.observe(el)
    // Don't spin while off screen.
    const watcher = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting
    })
    watcher.observe(el)

    // Slow rotation (the 3D view only). Never while the camera is moving (a fly-to, or a drag), when the
    // tab is hidden, or when the user has stopped it.
    let frame = 0
    const spin = () => {
      const { flat: still, rotating: spinning } = latest.current
      if (spinning && !still && inView.current && !document.hidden && !map.isMoving()) {
        map.setBearing(map.getBearing() + 0.02)
      }
      frame = requestAnimationFrame(spin)
    }
    frame = requestAnimationFrame(spin)

    return () => {
      cancelAnimationFrame(frame)
      resizer.disconnect()
      watcher.disconnect()
      map.remove()
      mapRef.current = null
      firstFit.current = true
      setReady(false)
    }
  }, [])

  function reset() {
    onSelect(null)
    const map = mapRef.current
    if (map) fitTo(map, located, !flat)
  }

  return (
    <div className="space-y-3">
      {failed && (
        <p role="status" className="text-ink-muted">
          The map couldn&rsquo;t load, but every dentist is in the list below.
        </p>
      )}
      <div hidden={failed} className="space-y-3">
        <Link
          to="#results"
          className="sr-only focus:not-sr-only focus:inline-block focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary"
        >
          Skip the map and go to the list of dentists
        </Link>
        <div
          role="region"
          aria-label="Map of dentists"
          aria-describedby={descId}
          className="overflow-hidden rounded-lg border border-line"
        >
          <div ref={container} className="h-[22rem] w-full sm:h-[26rem]" />
        </div>
        <p id={descId} className="sr-only">
          The pins are the dentists in the list below, which has the same information. Each pin is a button that opens
          that dentist&rsquo;s details. Use Ctrl and scroll to zoom the map.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={reset} className={buttonSecondary}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset view
          </button>
          {!flat && (
            <button
              type="button"
              aria-pressed={rotating}
              onClick={() => setRotating((r) => !r)}
              className={`${buttonSecondary} aria-pressed:border-primary aria-pressed:bg-primary/[0.06]`}
            >
              <Compass className="size-4" aria-hidden="true" />
              Rotate view
            </button>
          )}
          <p className="text-sm text-ink-muted">
            {located.length} {located.length === 1 ? 'dentist' : 'dentists'} on the map.
          </p>
        </div>
      </div>
    </div>
  )
}
