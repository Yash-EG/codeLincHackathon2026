import { formatUsd } from '../lib/format'

interface SplitBarProps {
  planPays: number
  patientPays: number
  size?: 'sm' | 'md'
}

/** Covered vs out-of-pocket for one amount: two segments with a 2px surface gap. */
export default function SplitBar({ planPays, patientPays, size = 'sm' }: SplitBarProps) {
  const total = planPays + patientPays
  const planPct = total > 0 ? (planPays / total) * 100 : 0
  const height = size === 'md' ? 'h-2.5' : 'h-1.5'

  return (
    <div
      role="img"
      aria-label={`Insurance pays ${formatUsd(planPays)}, you pay ${formatUsd(patientPays)}`}
      className={`flex w-full gap-[2px] ${height}`}
    >
      {planPays > 0 && (
        <div
          className="h-full rounded-l-full rounded-r-[4px] bg-viz-plan transition-[width] duration-500"
          style={{ width: `${planPct}%` }}
          title={`Insurance pays ${formatUsd(planPays)}`}
        />
      )}
      {patientPays > 0 && (
        <div
          className={`h-full flex-1 bg-viz-you transition-[width] duration-500 ${
            planPays > 0 ? 'rounded-l-[4px] rounded-r-full' : 'rounded-full'
          }`}
          title={`You pay ${formatUsd(patientPays)}`}
        />
      )}
    </div>
  )
}
