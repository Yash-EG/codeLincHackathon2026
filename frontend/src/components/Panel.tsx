import type { ReactNode } from 'react'

interface PanelProps {
  /** Section id: the #hash target and the camera keyframe key. */
  id: string
  title: string
  /** Small label above the title. */
  eyebrow?: string
  children: ReactNode
  className?: string
}

/**
 * One content section of a room, on a frosted panel so text never sits directly
 * on the 3D scene. Each panel is also one stop on the camera path (data-camera).
 */
export default function Panel({ id, title, eyebrow, children, className = '' }: PanelProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} data-camera={id} className="room-stop">
      <div className={`panel p-5 sm:p-7 ${className}`}>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{eyebrow}</p>}
        <h2 id={`${id}-title`} className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed">{children}</div>
      </div>
    </section>
  )
}
