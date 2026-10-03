// Shared class lists for the few control styles every room uses.

export const buttonPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white no-underline shadow-sm transition hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60'

export const buttonSecondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-control bg-surface px-4 py-2.5 font-semibold text-primary no-underline transition hover:border-primary'

export const textLink = 'font-semibold text-primary underline hover:text-primary-strong'

export const fieldInput =
  'mt-1 block min-h-11 w-full rounded-xl border border-control bg-surface px-3.5 py-2 text-ink placeholder:text-ink-muted aria-[invalid=true]:border-danger aria-[invalid=true]:border-2'

/** Dense, Linear-style data tables. */
export const table = {
  frame: 'overflow-x-auto rounded-xl border border-line bg-surface',
  root: 'w-full border-collapse text-left text-sm',
  caption: 'px-3 pt-3 pb-2 text-left text-sm font-semibold text-ink',
  head: 'border-y border-line bg-cream text-ink-muted',
  th: 'px-3 py-2 font-semibold',
  td: 'px-3 py-2.5 align-top',
  num: 'px-3 py-2.5 text-right tabular-nums align-top',
  row: 'border-b border-line last:border-b-0',
}
