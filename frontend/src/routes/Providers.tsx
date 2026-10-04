import { useId, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import SegmentedControl from '../components/SegmentedControl'
import { eyebrow, fieldInput, textLink } from '../components/ui'
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
        <ProviderDirectory />
      </RoomGate>
    </>
  )
}

function ProviderDirectory() {
  const providers = useSessionStore((s) => s.providers)
  const plan = useSessionStore((s) => s.plan)
  const [network, setNetwork] = useState<NetworkFilter>('IN_NETWORK')
  const [specialty, setSpecialty] = useState<string>(ALL_SPECIALTIES)
  const [newPatientsOnly, setNewPatientsOnly] = useState(false)
  const specialtyId = useId()
  const newPatientsId = useId()

  const specialties = useMemo(() => Array.from(new Set(providers.map((p) => p.specialty))).sort(), [providers])

  const results = useMemo(
    () =>
      providers
        .filter((p) => (network === 'IN_NETWORK' ? p.inNetwork : true))
        .filter((p) => (specialty === ALL_SPECIALTIES ? true : p.specialty === specialty))
        .filter((p) => (newPatientsOnly ? p.acceptingNewPatients : true))
        .sort((a, b) => {
          // In-network first, then nearest.
          if (a.inNetwork !== b.inNetwork) return a.inNetwork ? -1 : 1
          return a.distanceMiles - b.distanceMiles
        }),
    [providers, network, specialty, newPatientsOnly],
  )

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

        <div className="space-y-5 border-t-2 border-ink pt-5">
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
      </Panel>

      <Panel id="results" eyebrow="Results" title={`${results.length} ${results.length === 1 ? 'dentist' : 'dentists'}`}>
        <p className="sr-only" aria-live="polite">
          {results.length} matching {results.length === 1 ? 'dentist' : 'dentists'}.
        </p>
        {results.length === 0 ? (
          <p>No dentists match those filters. Try widening them.</p>
        ) : (
          <ul className="border-t-2 border-ink">
            {results.map((p) => (
              <li key={p.id}>
                <ProviderRow provider={p} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-ink-muted">Fictional demo listings: names, numbers and ratings are made up.</p>
      </Panel>
    </>
  )
}

function ProviderRow({ provider: p }: { provider: Provider }) {
  return (
    <article className="border-b border-line py-4">
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
    </article>
  )
}
