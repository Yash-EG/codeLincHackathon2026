import { lazy, Suspense, useState, type ReactNode } from 'react'
import { MousePointerClick, Rotate3d } from 'lucide-react'
import { getTooth } from '../data/teeth'
import type { ToothStatus } from '../types/domain'
import SceneErrorBoundary from './SceneErrorBoundary'

// Three.js + R3F live in their own chunk so the page paints first.
const DentalScene = lazy(() => import('./three/DentalScene'))

interface ToothStageProps {
  selectedTooth: number | null
  toothStatus: Partial<Record<number, ToothStatus>>
  onToothSelect: (toothNumber: number | null) => void
}

function StageMessage({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">{children}</div>
}

/**
 * The 3D dental arch: a pointer shortcut for the tooth picker next to it. Every
 * tooth it can select is also a button in the picker, so the whole stage is
 * hidden from assistive tech and the canvas never takes focus.
 */
export default function ToothStage({ selectedTooth, toothStatus, onToothSelect }: ToothStageProps) {
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)
  const hovered = getTooth(hoveredTooth)

  return (
    <div
      aria-hidden="true"
      className="relative h-[420px] overflow-hidden rounded-2xl border border-line bg-linear-to-b from-sky to-surface"
    >
      <div className="bg-blueprint pointer-events-none absolute inset-0" />

      <SceneErrorBoundary fallback={<StageMessage>3D view unavailable. Use the tooth buttons instead.</StageMessage>}>
        <Suspense fallback={<StageMessage>Loading 3D arch…</StageMessage>}>
          <div className="absolute inset-0">
            <DentalScene
              selectedTooth={selectedTooth}
              onToothSelect={onToothSelect}
              onToothHover={setHoveredTooth}
              toothStatus={toothStatus}
            />
          </div>
        </Suspense>
      </SceneErrorBoundary>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-xs text-ink">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-viz-planned" /> Care planned
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-viz-treated" /> Treated this year
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Selected
          </li>
        </ul>
        <p className="flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-xs text-ink">
          {hovered ? (
            <>
              <MousePointerClick className="size-3.5 text-primary" />
              <span className="font-semibold">#{hovered.number}</span> {hovered.name}
            </>
          ) : (
            <>
              <Rotate3d className="size-3.5 text-ink-muted" />
              Drag to orbit · scroll to zoom
            </>
          )}
        </p>
      </div>
    </div>
  )
}
