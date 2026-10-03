import { lazy, Suspense, type ReactNode } from 'react'
import { MousePointerClick, Rotate3d } from 'lucide-react'
import { getTooth } from '../data/teeth'
import type { ToothStatus } from '../types/domain'
import SceneErrorBoundary from './SceneErrorBoundary'
import ToothInspector, { type ToothHistoryEntry } from './ToothInspector'

// Three.js + R3F live in their own chunk so the dashboard paints first.
const DentalScene = lazy(() => import('./three/DentalScene'))

interface ToothStageProps {
  selectedTooth: number | null
  hoveredTooth: number | null
  toothStatus: Partial<Record<number, ToothStatus>>
  historyFor: (toothNumber: number) => ToothHistoryEntry[]
  busy: boolean
  onToothSelect: (toothNumber: number | null) => void
  onToothHover: (toothNumber: number | null) => void
  onAsk: (prompt: string) => void
}

function StageMessage({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">{children}</div>
}

export default function ToothStage({
  selectedTooth,
  hoveredTooth,
  toothStatus,
  historyFor,
  busy,
  onToothSelect,
  onToothHover,
  onAsk,
}: ToothStageProps) {
  const selected = getTooth(selectedTooth)
  const hovered = getTooth(hoveredTooth)

  return (
    <section
      aria-label="Interactive dental arch"
      className="relative min-h-[460px] flex-1 overflow-hidden rounded-2xl border border-ink-800 bg-ink-900"
    >
      <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_55%,rgb(61_245_200/0.10),transparent_70%)]"
      />

      <SceneErrorBoundary
        fallback={<StageMessage>3D view unavailable. WebGL may be disabled in this browser.</StageMessage>}
      >
        <Suspense
          fallback={
            <StageMessage>
              <span className="animate-pulse">Loading 3D arch…</span>
            </StageMessage>
          }
        >
          <div className="absolute inset-0">
            <DentalScene
              selectedTooth={selectedTooth}
              onToothSelect={onToothSelect}
              onToothHover={onToothHover}
              toothStatus={toothStatus}
            />
          </div>
        </Suspense>
      </SceneErrorBoundary>

      {/* Overlays (pointer-events only where interactive so orbiting still works) */}
      <div className="pointer-events-none absolute left-4 top-4 lg:left-5 lg:top-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">Treatment map</h2>
        <p className="mt-1 text-lg font-semibold tracking-tight text-ink-50">Click a tooth to plan care</p>
      </div>

      {selected && (
        <div className="absolute right-4 top-4 lg:right-5 lg:top-5">
          <ToothInspector
            tooth={selected}
            status={toothStatus[selected.number]}
            history={historyFor(selected.number)}
            disabled={busy}
            onAsk={onAsk}
            onClose={() => onToothSelect(null)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 lg:inset-x-5 lg:bottom-5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-ink-800 bg-ink-950/70 px-3.5 py-1.5 text-xs text-ink-300 backdrop-blur">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-viz-planned" aria-hidden="true" /> Care planned
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-viz-treated" aria-hidden="true" /> Treated in 2026
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" /> Selected
          </li>
        </ul>
        <p className="flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-950/70 px-3.5 py-1.5 text-xs text-ink-300 backdrop-blur">
          {hovered ? (
            <>
              <MousePointerClick className="size-3.5 text-accent" aria-hidden="true" />
              <span className="font-medium text-ink-100">#{hovered.number}</span> {hovered.name}
            </>
          ) : (
            <>
              <Rotate3d className="size-3.5 text-ink-400" aria-hidden="true" />
              Drag to orbit · scroll to zoom
            </>
          )}
        </p>
      </div>
    </section>
  )
}
