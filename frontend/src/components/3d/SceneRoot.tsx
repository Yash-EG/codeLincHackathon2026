import { useRef } from 'react'
import type { RoomId } from '../../rooms'
import { useAnnualMax } from '../../store/selectors'
import { useActiveSection, useSceneStore } from '../../store/sceneStore'
import DentalOffice from './DentalOffice'
import { useScrollStops } from './useScrollStops'

interface SceneRootProps {
  room: RoomId
  reducedMotion: boolean
}

const getProgress = () => useSceneStore.getState().progress

/**
 * The single, persistent 3D layer. It sits behind the router at z-index -1,
 * is hidden from assistive tech, never takes focus or pointer input, and has
 * no meaning of its own: everything it shows is also text in the page.
 */
export default function SceneRoot({ room, reducedMotion }: SceneRootProps) {
  useScrollStops(room)
  const sections = useSceneStore((s) => s.sectionIds)
  const active = useActiveSection()
  const max = useAnnualMax()
  const fadeRef = useRef<HTMLDivElement>(null)
  // The coin jars show what is still left of this year's maximum.
  const jarFill = max && max.max > 0 ? max.left / max.max : 0.6

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-1"
      style={{ background: 'radial-gradient(120% 90% at 50% 35%, #f1ede7 0%, #ddd6cd 65%, #cfc7bd 100%)' }}
    >
      <DentalOffice
        room={room}
        sections={sections}
        getProgress={getProgress}
        active={active}
        reducedMotion={reducedMotion}
        fadeRef={fadeRef}
        jarFill={jarFill}
      />
      {/* Global SVG noise grain at 4% opacity to eliminate the uniform plastic look */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
        style={{
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      {/* The camera fades to this while it swaps one room for the next. */}
      <div ref={fadeRef} className="absolute inset-0 bg-surface opacity-0" />
    </div>
  )
}
