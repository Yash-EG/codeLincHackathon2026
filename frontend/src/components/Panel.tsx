import type { ReactNode } from 'react'
import { eyebrow as eyebrowClass, heading } from './ui'

interface PanelProps {
  /** Section id: the #hash target and the camera stop key. */
  id: string
  title: string
  /** Small uppercase label above the title. */
  eyebrow?: string
  children: ReactNode
  className?: string
}

/**
 * One content section of a room. On a sheet (Traditional view, or the side
 * drawer in the 3D view) it is a band under a hairline; on small screens in the
 * 3D view it is a 98% opaque block, so text never sits directly on the scene.
 * Each section is also one stop on the camera path (data-camera).
 */
export default function Panel({ id, title, eyebrow, children, className = '' }: PanelProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} data-camera={id} className="room-stop">
      <div className={`panel ${className}`}>
        {eyebrow && <p className={`${eyebrowClass} mb-3`}>{eyebrow}</p>}
        <h2 id={`${id}-title`} className={heading}>
          {title}
        </h2>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink">{children}</div>
      </div>
    </section>
  )
}
