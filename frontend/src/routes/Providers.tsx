import { useId, useMemo, useState } from 'react'
import { BadgeCheck, MapPin, Phone, Star } from 'lucide-react'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import SegmentedControl from '../components/SegmentedControl'
import { fieldInput } from '../components/ui'
import { ROOMS_BY_ID } from '../rooms'
import { useSessionStore } from '../store/sessionStore'
import { announce } from '../store/uiStore'
import type { Provider } from '../types/domain'

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
        <Directory />
      </RoomGate>
    </>
  )
}

function Directory() {
  const providers = useSessionStore((s) => s.providers)
  const plan = useSessionStore((s) => s.plan)
  const [network, setNetwork] = useState<NetworkFilter>('IN_NETWORK')
  const [specialty, setSpecialty] = useState<string>(ALL_SPECIALTIES)
  const [newPatientsOnly, setNewPatientsOnly] = useState(false)
  const specialtyId = useId()
  const newPatientsId = useId()

  const specialties = useMemo(
    () => Array.from(new Set(providers.map((p) => p.specialty))).sort(),
    [providers],
  )

  const results = useMemo(() => {
    return providers
      .filter((p) => (network === 'IN_NETWORK' ? p.inNetwork : true))
      .filter((p) => (specialty === ALL_SPECIALTIES ? true : p.specialty === specialty))
      .filter((p) => (newPatientsOnly ? p.acceptingNewPatients : true))
      .sort((a, b) => {
        // In-network first, then nearest.
        if (a.inNetwork !== b.inNetwork) return a.inNetwork ? -1 : 1
        return a.distanceMiles - b.distanceMiles
      })
  }, [providers, network, specialty, newPatientsOnly])

  if (providers.length === 0) {
    return (
      <Panel id="no-directory" title="No provider directory for this plan">
        <p>
          A searchable provider list comes with carrier plans. The sample plan ({'Premier PPO'}) includes one, so load
          it at Reception to try this out.
        </p>
      </Panel>
    )
  }

  return (
    <>
      <Panel id="find" title={`In-network dentists for ${plan?.planName ?? 'your plan'}`}>
        <p>
          Staying in-network means your dentist has agreed to the plan&rsquo;s fair prices, so you pay less and
          won&rsquo;t get balance-billed. Filter the list, then call to book.
        </p>

        <div className="grid gap-4">
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

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[14rem] flex-1">
              <label htmlFor={specialtyId} className="text-sm font-semibold text-ink">
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
                className="size-4 rounded border-control text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              Accepting new patients
            </label>
          </div>
        </div>
      </Panel>

      <Panel id="results" title={`${results.length} ${results.length === 1 ? 'dentist' : 'dentists'}`}>
        <p className="sr-only" aria-live="polite">
          {results.length} matching {results.length === 1 ? 'dentist' : 'dentists'}.
        </p>
        {results.length === 0 ? (
          <p>No dentists match those filters. Try widening them.</p>
        ) : (
          <ul className="grid gap-3">
            {results.map((p) => (
              <li key={p.id}>
                <ProviderCard provider={p} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

function ProviderCard({ provider: p }: { provider: Provider }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">{p.name}</h3>
          <p className="text-sm text-ink-muted">
            {p.practiceName} · {p.specialty}
          </p>
        </div>
        {p.inNetwork ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            In-network
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">
            Out-of-network
          </span>
        )}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <dd>
            {p.address}, {p.city}, {p.state} {p.zip}
            <span className="block text-ink-muted">{p.distanceMiles.toFixed(1)} mi away</span>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <dd>
            <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-primary underline">
              {p.phone}
            </a>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <dd>
            <span className="font-semibold text-ink">{p.rating.toFixed(1)}</span>
            <span className="text-ink-muted"> ({p.reviewCount} reviews)</span>
            <span className="sr-only"> out of 5</span>
          </dd>
        </div>
        <div className="text-sm">
          <dd className={p.acceptingNewPatients ? 'font-medium text-success' : 'text-ink-muted'}>
            {p.acceptingNewPatients ? 'Accepting new patients' : 'Not accepting new patients'}
          </dd>
        </div>
      </dl>
    </article>
  )
}
