import type { MouseEvent } from 'react'

/** First focusable element on every page (WCAG 2.4.1). Hidden until focused. */
export default function SkipLink() {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const main = document.getElementById('main')
    main?.focus({ preventScroll: true })
    main?.scrollIntoView()
  }

  return (
    <a
      href="#main"
      onClick={skip}
      className="sr-only rounded-lg bg-primary px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>
  )
}
