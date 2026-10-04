import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from '../a11y/useReducedMotion'

const TOOTH_PATH =
  'M10.5 6.5c-2.9 0-4.6 2.4-4.1 5.6.4 2.6 1.6 4.4 2.3 7 .6 2.4.9 6.4 2.6 6.4 1.8 0 1.6-4.6 3.2-4.6h3c1.6 0 1.4 4.6 3.2 4.6 1.7 0 2-4 2.6-6.4.7-2.6 1.9-4.4 2.3-7 .5-3.2-1.2-5.6-4.1-5.6-2.2 0-3.4 1.3-5.5 1.3s-3.3-1.3-5.5-1.3z'

/**
 * Writes the pointer position (-1..1 from the window centre) and the scroll
 * offset to CSS variables on one element (--mx, --my, --sy). Layers read them
 * in CSS, so React never re-renders while the page moves. Does nothing under
 * reduced motion.
 */
function useParallaxVars(ref: React.RefObject<HTMLElement | null>, opts: { pointer: boolean; scroll: boolean }) {
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let frame = 0
    let mx = 0
    let my = 0
    const write = () => {
      frame = 0
      el.style.setProperty('--mx', mx.toFixed(3))
      el.style.setProperty('--my', my.toFixed(3))
      el.style.setProperty('--sy', String(Math.round(window.scrollY)))
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
      queue()
    }
    if (opts.pointer) window.addEventListener('pointermove', onPointer, { passive: true })
    if (opts.scroll) window.addEventListener('scroll', queue, { passive: true })
    write()
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', queue)
      if (frame) cancelAnimationFrame(frame)
      for (const v of ['--mx', '--my', '--sy']) el.style.removeProperty(v)
    }
  }, [ref, reduced, opts.pointer, opts.scroll])
}

/** One parallax layer: `depth` is px of travel per full pointer swing, `rate` is px per px scrolled. */
const layer = (depth: number, rate: number): CSSProperties =>
  ({ '--depth': depth, '--rate': rate }) as CSSProperties

/**
 * Background art for the Traditional view: three layers of soft shapes at
 * different depths. The pointer and the scroll move them at different speeds
 * (far = slow, near = fast), a 2.5D backdrop behind the frosted cards (z-20).
 * Decoration only: aria-hidden, no pointer events, static under reduced motion.
 */
export function ParallaxBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  useParallaxVars(ref, { pointer: true, scroll: true })
  return (
    <div ref={ref} aria-hidden="true" className="parallax-backdrop">
      <div className="parallax-layer" style={layer(10, 0.05)}>
        <span className="absolute -left-32 top-10 size-[28rem] rounded-full bg-sage/70 blur-3xl" />
        <span className="absolute -right-32 top-[36rem] size-[32rem] rounded-full bg-mint/35 blur-3xl" />
        <span className="absolute left-1/3 top-[78rem] size-[26rem] rounded-full bg-sage/60 blur-3xl" />
      </div>
      <div className="parallax-layer" style={layer(24, 0.14)}>
        {(
          [
            [5, 110, 120, -14, false],
            [86, 360, 150, 12, true],
            [12, 820, 96, 18, true],
            [80, 1220, 130, -10, false],
            [44, 1640, 110, 8, false],
          ] as const
        ).map(([left, top, size, rotate, filled], i) => (
          <svg
            key={i}
            viewBox="0 0 32 32"
            className="absolute text-accent"
            style={{ left: `${left}%`, top, width: size, height: size, rotate: `${rotate}deg` }}
          >
            <path
              d={TOOTH_PATH}
              fill={filled ? 'currentColor' : 'none'}
              fillOpacity={filled ? 0.07 : 0}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={0.6}
            />
          </svg>
        ))}
      </div>
      <div className="parallax-layer" style={layer(44, 0.28)}>
        {(
          [
            [22, 260, 10],
            [68, 150, 14],
            [91, 760, 8],
            [31, 990, 12],
            [58, 1420, 9],
            [8, 1510, 14],
            [74, 1810, 10],
          ] as const
        ).map(([left, top, d], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-accent/25"
            style={{ left: `${left}%`, top, width: d, height: d }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Wraps the 3D office so it drifts a few pixels against the pointer, giving the
 * room depth behind the frosted panels (z-20). Scaled up slightly so the edges
 * never show. The scene's own scroll-driven camera is left alone.
 */
export function ParallaxScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useParallaxVars(ref, { pointer: true, scroll: false })
  return (
    <div ref={ref} className="parallax-scene" style={layer(14, 0)}>
      {children}
    </div>
  )
}
