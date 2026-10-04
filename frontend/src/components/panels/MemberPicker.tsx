import { useEffect, useId, useState, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { formatUsd } from '../../lib/format'
import { fetchMembers, MEMBER_SOURCE, MembersError, type Member } from '../../lib/membersApi'
import { useSessionStore } from '../../store/sessionStore'
import { announce } from '../../store/uiStore'
import Panel from '../Panel'
import { buttonSecondary, fieldInput, textLink } from '../ui'

type Load =
  | { state: 'loading' }
  | { state: 'ready'; members: Member[] }
  | { state: 'error'; status: number; message: string }

/** Past this many members, a name filter appears. */
const SEARCH_FROM = 7

/**
 * Reception's front desk: the employees in the member database. Checking one in
 * loads their plan, this year's usage and their deductible from their record,
 * and estimates are then priced against them. Without the database (the
 * backend's `db` profile) it says so, and the sample plan stays loaded.
 */
export default function MemberPicker() {
  const { benefits, checkInMember } = useSessionStore(
    useShallow((s) => ({ benefits: s.benefits, checkInMember: s.checkInMember })),
  )
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [justCheckedIn, setJustCheckedIn] = useState<string | null>(null)
  const searchId = useId()

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    fetchMembers(ctrl.signal)
      .then((members) => setLoad({ state: 'ready', members }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        const status = err instanceof MembersError ? err.status : 0
        const message = err instanceof Error ? err.message : 'Unknown error.'
        setLoad({ state: 'error', status, message })
      })
    return () => ctrl.abort()
  }, [attempt])

  // The row's button turns into a "Checked in" note; move focus onto it so keyboard users keep their place.
  useEffect(() => {
    if (!justCheckedIn) return
    document.getElementById(statusId(justCheckedIn))?.focus()
    setJustCheckedIn(null)
  }, [justCheckedIn])

  // Who is checked in now: a member from the database (sample plans have other enrollment ids).
  const currentId = benefits?.carrierName === MEMBER_SOURCE ? benefits.enrollmentId : null

  function checkIn(member: Member) {
    checkInMember(member)
    setJustCheckedIn(member.id)
    announce(`Checked in ${member.fullName}. ${member.planName} is loaded.`)
  }

  return (
    <Panel id="member" eyebrow="Front desk" title="Who's checking in?">
      <p className="max-w-[62ch]">
        Choose the employee from the member database. Their plan, what they&rsquo;ve used this year and their deductible
        come from their record, and cost estimates are priced against it.
      </p>

      {load.state === 'loading' && (
        <p role="status" className="text-ink-muted">
          Loading the member list&hellip;
        </p>
      )}

      {load.state === 'error' && (
        <div role="alert" className="space-y-3 border-l-2 border-amber pl-4">
          <p className="font-medium text-amber-ink">
            {load.status === 503
              ? 'The member list needs the database. Start the backend with the db profile (SPRING_PROFILES_ACTIVE=db).'
              : `Couldn't load the member list. ${load.message}`}
          </p>
          <p className="text-sm text-ink-muted">The sample plan below stays loaded in the meantime.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={buttonSecondary}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {load.state === 'ready' && load.members.length === 0 && <p>There are no members in the database yet.</p>}

      {load.state === 'ready' && load.members.length > 0 && (
        <MemberList
          members={load.members}
          query={load.members.length >= SEARCH_FROM ? query : ''}
          currentId={currentId}
          onCheckIn={checkIn}
          search={
            load.members.length >= SEARCH_FROM && (
              <div className="max-w-sm">
                <label
                  htmlFor={searchId}
                  className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink"
                >
                  Find a member
                </label>
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or plan"
                  className={fieldInput}
                />
              </div>
            )
          }
        />
      )}
    </Panel>
  )
}

const statusId = (memberId: string) => `member-status-${memberId}`

interface MemberListProps {
  members: Member[]
  query: string
  currentId: string | null
  onCheckIn: (member: Member) => void
  search: ReactNode
}

function MemberList({ members, query, currentId, onCheckIn, search }: MemberListProps) {
  const q = query.trim().toLowerCase()
  const shown = q
    ? members.filter((m) => m.fullName.toLowerCase().includes(q) || m.planName.toLowerCase().includes(q))
    : members

  return (
    <div className="space-y-4">
      {search}
      {q && (
        <p className="sr-only" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'member matches' : 'members match'}.
        </p>
      )}
      {shown.length === 0 ? (
        <p>No members match &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <ul className="border-t-2 border-primary/70">
          {shown.map((m) => (
            <li key={m.id}>
              <MemberRow member={m} current={m.id === currentId} onCheckIn={() => onCheckIn(m)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MemberRow({ member: m, current, onCheckIn }: { member: Member; current: boolean; onCheckIn: () => void }) {
  const deductibleLeft = Math.max(m.deductible - m.deductibleMet, 0)
  return (
    <article
      className={`grid gap-x-6 gap-y-2 border-b border-l-2 border-line py-4 pl-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
        current ? 'border-l-primary bg-primary/[0.04]' : 'border-l-transparent'
      }`}
    >
      <div className="min-w-0">
        <h3 className="font-serif text-xl leading-tight text-ink">{m.fullName}</h3>
        <p className="text-sm text-ink-muted">{m.planName}</p>
        <p className="mt-1.5 font-mono text-sm tabular-nums text-ink">
          {formatUsd(m.remainingMaximum)} left of {formatUsd(m.annualMaximum)}
          <span className="text-ink-muted">
            {' · '}
            {deductibleLeft > 0 ? `${formatUsd(deductibleLeft)} deductible to go` : 'deductible met'}
          </span>
        </p>
      </div>
      {current ? (
        <p
          id={statusId(m.id)}
          tabIndex={-1}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest text-ink"
        >
          <Check className="size-3.5 text-success" aria-hidden="true" />
          Checked in
          <Link to="#check-in" className={`${textLink} ml-2 font-sans text-sm normal-case tracking-normal`}>
            See plan
          </Link>
        </p>
      ) : (
        <button type="button" onClick={onCheckIn} className={buttonSecondary}>
          Check in<span className="sr-only"> {m.fullName}</span>
        </button>
      )}
    </article>
  )
}
