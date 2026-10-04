import { lazy, Suspense, useId, useMemo, useState } from 'react'
import { Check, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { hasWebGL } from '../a11y/webgl'
import { useReducedMotion } from '../a11y/useReducedMotion'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import SegmentedControl from '../components/SegmentedControl'
import { buttonSecondary, eyebrow, fieldInput, textLink } from '../components/ui'
import { milesBetween, useZipCenter } from '../lib/geo'
import { AREAS, areaOf, hasCoordinates, mapToken, type AreaId } from '../lib/providerMap'
import { ROOMS_BY_ID } from '../rooms'
import { useSessionStore } from '../store/sessionStore'
import { useViewMode } from '../store/settingsStore'
import { announce } from '../store/uiStore'
import type { Provider } from '../types/domain'

// Mapbox is large (~1.5 MB), so the map is its own chunk, fetched only when this page shows it.
const ProviderMap = lazy(() => import('../components/ProviderMap'))

const room = ROOMS_BY_ID.providers

type NetworkFilter = 'IN_NETWORK' | 'ALL'

const NETWORK_OPTIONS: Array<{ value: NetworkFilter; label: string }> = [
  { value: 'IN_NETWORK', label: 'In-network only' },
  { value: 'ALL', label: 'All nearby' },
]

const ALL_SPECIALTIES = '__all__'

export default function Providers() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="plan">
        <ProviderDirectory />
      </RoomGate>
    </>
  )
}

function ProviderDirectory() {
  const providers = useSessionStore((s) => s.providers)
  const plan = useSessionStore((s) => s.plan)
  const searchZip = useSessionStore((s) => s.searchZip)
  const radius = useSessionStore((s) => s.searchRadiusMiles)
  const [area, setArea] = useState<AreaId>('greensboro')
  const [network, setNetwork] = useState<NetworkFilter>('IN_NETWORK')
  const [specialty, setSpecialty] = useState<string>(ALL_SPECIALTIES)
  const [newPatientsOnly, setNewPatientsOnly] = useState(false)
  const [pinned, setPinned] = useState<string | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const specialtyId = useId()
  const newPatientsId = useId()
  const reduced = useReducedMotion()
  const view = useViewMode()

  // The map needs a Mapbox token and WebGL. Without either, the page is just the list.
  const mapAvailable = useMemo(() => Boolean(mapToken()) && hasWebGL(), [])

  // A ZIP from "Add planned care" sets where we look: distances are measured from it and only dentists
  // within the radius show. Without one (or if it can't be located) the Area switch picks the city.
  const zip = useZipCenter(searchZip)
  const origin = zip.status === 'found' ? zip.center : null

  const inArea = useMemo(() => {
    if (origin) {
      return providers
        .filter(hasCoordinates)
        .map((p) => ({ ...p, distanceMiles: milesBetween([origin[1], origin[0]], [p.lat, p.lng]) }))
        .filter((p) => p.distanceMiles <= radius)
    }
    return providers.filter((p) => areaOf(p) === area)
  }, [providers, area, origin, radius])
  const specialties = useMemo(() => Array.from(new Set(inArea.map((p) => p.specialty))).sort(), [inArea])

  const results = useMemo(
    () =>
      inArea
        .filter((p) => (network === 'IN_NETWORK' ? p.inNetwork : true))
        .filter((p) => (specialty === ALL_SPECIALTIES ? true : p.specialty === specialty))
        .filter((p) => (newPatientsOnly ? p.acceptingNewPatients : true))
        .sort((a, b) => {
          // In-network first, then nearest.
          if (a.inNetwork !== b.inNetwork) return a.inNetwork ? -1 : 1
          return a.distanceMiles - b.distanceMiles
        }),
    [inArea, network, specialty, newPatientsOnly],
  )

  // A filter can hide the chosen dentist; then nothing is chosen.
  const selectedId = pinned !== null && results.some((p) => p.id === pinned) ? pinned : null

  function select(id: string | null) {
    setPinned(id)
    const chosen = id ? results.find((p) => p.id === id) : undefined
    if (chosen) announce(`Showing ${chosen.name} on the map.`)
  }

  function showOnMap(id: string) {
    if (selectedId === id) {
      select(null)
      return
    }
    select(id)
    document
      .getElementById('map')
      ?.scrollIntoView({ behavior: reduced || view === 'traditional' ? 'auto' : 'smooth', block: 'start' })
  }

  if (providers.length === 0) {
    return (
      <Panel id="no-directory" eyebrow="Directory" title="No provider directory for this plan">
        <p className="max-w-[62ch]">
          A searchable list of dentists comes with carrier plans. Both sample plans include one, so check in a sample
          plan at{' '}
          <Link to="/reception#check-in" className={textLink}>
            Reception
          </Link>{' '}
          to try it out.
        </p>
      </Panel>
    )
  }

  return (
    <>
      <Panel id="find" eyebrow="Directory" title={`Dentists for ${plan?.planName ?? 'your plan'}`}>
        <p className="max-w-[62ch]">
          Staying in-network means your dentist has agreed to the plan&rsquo;s fair prices, so you pay less and won&rsquo;t
          be balance-billed. Filter the list, then call to book.
        </p>

        <div className="space-y-5 border-t-2 border-primary/70 pt-5">
          {origin ? (
            <p className="text-ink-muted" aria-live="polite">
              Within <span className="font-semibold text-ink">{radius} miles</span> of ZIP{' '}
              <span className="font-mono font-semibold text-ink">{searchZip}</span> (from your answers in Add planned
              care).{' '}
              <Link to="/operatory#explore" className={textLink}>
                Change
              </Link>
            </p>
          ) : (
            <>
              {zip.status === 'loading' && <p className="text-ink-muted">Locating ZIP {searchZip}&hellip;</p>}
              {(zip.status === 'unknown' || zip.status === 'error') && (
                <p className="text-ink-muted">
                  Couldn&rsquo;t locate ZIP {searchZip}, so showing the area you pick below.
                </p>
              )}
              {zip.status === 'none' && (
                <p className="text-ink-muted">
                  Enter a ZIP in{' '}
                  <Link to="/operatory#explore" className={textLink}>
                    Add planned care
                  </Link>{' '}
                  to search near you, or pick an area.
                </p>
              )}
          <SegmentedControl
            legend="Area"
            name="provider-area"
            options={AREAS}
            value={area}
            onChange={(value) => {
              setArea(value)
              setSpecialty(ALL_SPECIALTIES)
              setPinned(null)
              announce(`Showing dentists in ${AREAS.find((a) => a.value === value)?.label}.`)
            }}
          />
            </>
          )}
          <SegmentedControl
            legend="Show"
            name="provider-network"
            options={NETWORK_OPTIONS}
            value={network}
            onChange={(value) => {
              setNetwork(value)
              announce(value === 'IN_NETWORK' ? 'Showing in-network dentists only.' : 'Showing all nearby dentists.')
            }}
          />

          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <div className="min-w-56 flex-1">
              <label htmlFor={specialtyId} className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
                Specialty
              </label>
              <select
                id={specialtyId}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className={fieldInput}
              >
                <option value={ALL_SPECIALTIES}>All specialties</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <label htmlFor={newPatientsId} className="inline-flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink">
              <input
                id={newPatientsId}
                type="checkbox"
                checked={newPatientsOnly}
                onChange={(e) => setNewPatientsOnly(e.target.checked)}
                className="size-4 accent-primary"
              />
              Accepting new patients
            </label>
          </div>
        </div>

        {import.meta.env.DEV && !mapToken() && (
          <p className="text-sm text-ink-muted">
            Developer note: the map is off. Add <code className="font-mono">VITE_MAPBOX_TOKEN</code> to{' '}
            <code className="font-mono">frontend/.env</code> to turn it on.
          </p>
        )}
      </Panel>

      {mapAvailable && (
        <Panel id="map" eyebrow="Map" title="Where they are">
          <p className="max-w-[62ch]">
            The pins follow the filters above. Select one for the office&rsquo;s details; in-network offices are filled,
            out-of-network offices are outlined.
          </p>
          <Suspense
            fallback={
              <div
                role="status"
                className="flex h-[22rem] items-center justify-center rounded-lg border border-line text-ink-muted sm:h-[26rem]"
              >
                Loading the map&hellip;
              </div>
            }
          >
            <ProviderMap
              providers={results}
              selectedId={selectedId}
              onSelect={select}
              center={origin}
              onFail={() => setMapFailed(true)}
            />
          </Suspense>
        </Panel>
      )}

      <Panel id="results" eyebrow="Results" title={`${results.length} ${results.length === 1 ? 'dentist' : 'dentists'}`}>
        <p className="sr-only" aria-live="polite">
          {results.length} matching {results.length === 1 ? 'dentist' : 'dentists'}.
        </p>
        {results.length === 0 ? (
          <p>No dentists match those filters. Try widening them.</p>
        ) : (
          <ul className="border-t-2 border-primary/70">
            {results.map((p) => (
              <li key={p.id}>
                <ProviderRow
                  provider={p}
                  onShowOnMap={mapAvailable && !mapFailed && hasCoordinates(p) ? () => showOnMap(p.id) : undefined}
                  onMap={selectedId === p.id}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-ink-muted">Fictional demo listings: names, numbers and ratings are made up.</p>
      </Panel>
    </>
  )
}

interface ProviderRowProps {
  provider: Provider
  /** Set when the map is on and this office has coordinates. */
  onShowOnMap?: () => void
  /** This office is the one the map is showing. */
  onMap: boolean
}

function ProviderRow({ provider: p, onShowOnMap, onMap }: ProviderRowProps) {
  return (
    <article
      className={`border-b border-l-2 border-line py-4 pl-4 ${onMap ? 'border-l-primary' : 'border-l-transparent'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-tight text-ink">{p.name}</h3>
          <p className="text-sm text-ink-muted">
            {p.practiceName} · {p.specialty}
          </p>
        </div>
        {p.inNetwork ? (
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest text-ink">
            <Check className="size-3.5 text-success" aria-hidden="true" />
            In-network
          </p>
        ) : (
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">Out-of-network</p>
        )}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={eyebrow}>Address</dt>
          <dd className="mt-0.5 text-ink">
            {p.address}, {p.city}, {p.state} {p.zip}
            <span className="block font-mono text-ink-muted">{p.distanceMiles.toFixed(1)} mi away</span>
          </dd>
        </div>
        <div>
          <dt className={eyebrow}>Phone</dt>
          <dd className="mt-0.5">
            <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className={`${textLink} font-mono`}>
              {p.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className={eyebrow}>Rating</dt>
          <dd className="mt-0.5 text-ink">
            <span className="font-mono">{p.rating.toFixed(1)}</span>
            <span className="sr-only"> out of 5</span>
            <span className="text-ink-muted"> ({p.reviewCount} reviews)</span>
          </dd>
        </div>
        <div>
          <dt className={eyebrow}>New patients</dt>
          <dd className={`mt-0.5 ${p.acceptingNewPatients ? 'font-medium text-ink' : 'text-ink-muted'}`}>
            {p.acceptingNewPatients ? 'Accepting new patients' : 'Not accepting new patients'}
          </dd>
        </div>
      </dl>

      {onShowOnMap && (
        <button
          type="button"
          aria-pressed={onMap}
          onClick={onShowOnMap}
          className={`${buttonSecondary} mt-3 aria-pressed:border-primary aria-pressed:bg-primary/[0.06]`}
        >
          <MapPin className="size-4" aria-hidden="true" />
          Show on map
          <span className="sr-only">: {p.name}</span>
        </button>
      )}
    </article>
  )
}
