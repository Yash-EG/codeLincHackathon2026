import { useLayoutEffect, type RefObject } from 'react'

/**
 * Publishes an element's height as a CSS variable on <html> (e.g. --maxbar-h),
 * so scroll-padding keeps focused content clear of fixed bars (WCAG 2.4.11).
 */
export function useCssHeightVar(ref: RefObject<HTMLElement | null>, name: `--${string}`) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty(name, `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [ref, name])
}
