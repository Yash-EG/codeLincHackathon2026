const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usdCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** $1,004 for whole dollars, $462.50 when there are cents. */
export function formatUsd(amount: number): string {
  return Number.isInteger(Math.round(amount * 100) / 100) ? usdWhole.format(amount) : usdCents.format(amount)
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** ISO date (YYYY-MM-DD) -> "Nov 12" */
export function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(`${isoDate}T00:00:00Z`))
}

/** ISO date (YYYY-MM-DD) -> "Nov 12, 2026" */
export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`))
}

/** Whole days from today until an ISO date (0 if it has passed). */
export function daysUntil(isoDate: string, from: Date = new Date()): number {
  const end = Date.UTC(...isoParts(isoDate))
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.max(0, Math.round((end - start) / 86_400_000))
}

function isoParts(isoDate: string): [number, number, number] {
  const [y, m, d] = isoDate.split('-').map(Number)
  return [y, m - 1, d]
}

export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100
}
