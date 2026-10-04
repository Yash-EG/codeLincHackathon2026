// Shared class lists: one radius (rounded-sm), flat fills, hairline rules, no shadows.

export const buttonPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:border-primary-strong hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60'

export const buttonSecondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-ink/30 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-colors hover:border-ink'

/** Small text-only action (Remove, Edit), with a 44px hit area. */
export const buttonQuiet =
  'inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-primary hover:underline'

export const textLink = 'font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-primary-strong'

export const fieldInput =
  'mt-1.5 block min-h-11 w-full rounded-sm border border-control bg-surface px-3 py-2 text-ink placeholder:text-ink-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

/** The editorial free-text box (Describe your care). */
export const fieldSerif =
  'mt-2 block w-full rounded-sm border border-control bg-surface px-4 py-3 font-serif text-lg leading-relaxed text-ink placeholder:font-serif placeholder:italic placeholder:text-ink-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

/** Small, uppercase, widely tracked label above a heading or a figure. */
export const eyebrow = 'font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted'

/** Section heading: high-contrast serif, tight tracking. */
export const heading = 'font-serif text-2xl font-normal leading-[1.1] tracking-tight text-ink sm:text-3xl'

/** Figures: dollars, CDT codes, tooth numbers. */
export const figure = 'font-mono tabular-nums'

/** Ledger tables: a rule in ink on top, hairlines between rows, mono figures, a double rule over totals. */
export const table = {
  frame: 'overflow-x-auto border-t-2 border-ink',
  root: 'w-full border-collapse text-left text-sm',
  caption: 'sr-only',
  head: 'border-b border-ink/20 bg-paper/60',
  th: 'px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted',
  td: 'px-3 py-3 align-top',
  num: 'px-3 py-3 text-right align-top font-mono tabular-nums',
  row: 'border-b border-line',
  foot: 'border-t-[3px] border-double border-ink font-semibold text-ink',
}

/** Key/value rows (receipts, plan summaries). */
export const ledger = {
  list: 'border-t-2 border-ink',
  row: 'flex items-baseline justify-between gap-4 border-b border-line py-2.5',
  key: 'text-sm text-ink-muted',
  value: 'font-mono text-sm tabular-nums text-ink',
  total: 'flex items-baseline justify-between gap-4 border-t-[3px] border-double border-ink pt-3',
}
