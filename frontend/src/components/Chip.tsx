import type { ReactNode } from 'react'
import { Clock3, ShieldCheck, ShieldHalf } from 'lucide-react'
import type { NetworkTier } from '../types/domain'

type Tone = 'mint' | 'teal' | 'amber' | 'slate'

const TONE: Record<Tone, string> = {
  mint: 'border-emerald-200 bg-sage/60 text-emerald-900',
  teal: 'border-teal-200 bg-teal-50 text-teal-900',
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  slate: 'border-line bg-white/70 text-ink-muted',
}

/** Small status pill. Mono, uppercase, widely tracked, like the rest of the micro-data. */
export function Chip({ tone = 'slate', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-widest ${TONE[tone]}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** "D2740 · Crown": the CDT code is what shows up on the dentist's bill, so it sits beside the plain name. */
export function CdtBadge({ code, name }: { code: string; name?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Chip tone="teal">{code}</Chip>
      {name && <span className="font-medium text-ink">{name}</span>}
    </span>
  )
}

/** `No waiting period`, or `6-month wait required`. */
export function WaitingChip({ months }: { months: number }) {
  return months > 0 ? (
    <Chip tone="amber" icon={<Clock3 className="size-3" aria-hidden="true" />}>
      {months}-month wait required
    </Chip>
  ) : (
    <Chip tone="mint" icon={<ShieldCheck className="size-3" aria-hidden="true" />}>
      No waiting period
    </Chip>
  )
}

export function NetworkChip({ network }: { network: NetworkTier }) {
  return network === 'IN_NETWORK' ? (
    <Chip tone="mint" icon={<ShieldCheck className="size-3" aria-hidden="true" />}>
      In-network
    </Chip>
  ) : (
    <Chip tone="slate" icon={<ShieldHalf className="size-3" aria-hidden="true" />}>
      Out-of-network
    </Chip>
  )
}

/** "Basic · 80%" style coverage chip. */
export function CoverageChip({ label, pct }: { label: string; pct: number }) {
  return (
    <Chip tone="teal">
      {label} · {pct}%
    </Chip>
  )
}
