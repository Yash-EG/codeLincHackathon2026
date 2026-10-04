// Shared class lists: rounded-lg controls, teal actions, soft shadows. Hover lifts 2px in 200ms
// (off under reduced motion).

const lift = 'transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

export const buttonPrimary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline shadow-sm hover:border-primary-strong hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${lift}`

export const buttonSecondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-white/70 px-4 py-2.5 text-sm font-semibold text-primary no-underline shadow-sm hover:border-primary hover:bg-white ${lift}`

/** Small text-only action (Remove, Edit), with a 44px hit area. */
export const buttonQuiet =
  'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-primary hover:underline'

export const textLink = 'font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-primary-strong'

export const fieldInput =
  'mt-1.5 block min-h-11 w-full rounded-lg border border-control bg-surface px-3 py-2 text-ink placeholder:text-ink-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

/** The editorial free-text box (Describe your care). */
export const fieldSerif =
  'mt-2 block w-full rounded-lg border border-control bg-surface px-4 py-3 font-serif text-lg leading-relaxed text-ink placeholder:font-serif placeholder:italic placeholder:text-ink-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

/** Small, uppercase, widely tracked label above a heading or a figure. */
export const eyebrow = 'font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted'

/** Section heading: warm display serif. */
export const heading = 'font-serif text-2xl font-medium leading-[1.15] tracking-tight text-ink sm:text-3xl'

/** Micro-data: dollars, CDT codes, coverage percentages, tooth numbers. */
export const figure = 'font-mono tabular-nums'

/** Interactive tile (tooth, option row, suggestion chip): same 200ms lift as the buttons. */
export const tileLift = lift

/** Ledger tables: a rule in ink on top, hairlines between rows, mono figures, a double rule over totals. */
export const table = {
  frame: 'overflow-x-auto border-t-2 border-primary/70',
  root: 'w-full border-collapse text-left text-sm',
  caption: 'sr-only',
  head: 'border-b border-primary/20 bg-sage/30',
  th: 'px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted',
  td: 'px-3 py-3 align-top',
  num: 'px-3 py-3 text-right align-top font-mono tabular-nums',
  row: 'border-b border-line',
  foot: 'border-t-[3px] border-double border-primary/70 font-semibold text-ink',
}

/** Key/value rows (receipts, plan summaries). */
export const ledger = {
  list: 'border-t-2 border-primary/70',
  row: 'flex items-baseline justify-between gap-4 border-b border-line py-2.5',
  key: 'text-sm text-ink-muted',
  value: 'font-mono text-sm tabular-nums text-ink',
  total: 'flex items-baseline justify-between gap-4 border-t-[3px] border-double border-primary/70 pt-3',
}
