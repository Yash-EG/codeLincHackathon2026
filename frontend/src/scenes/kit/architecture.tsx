import type { ReactNode } from 'react'
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'
import { M } from '../common/materials'
import { artTexture, clockTexture, labelTexture, noteTexture, screenTexture, viewTexture } from '../common/textures'
import { C, ROOM } from './palette'
import { Ball, Block, Cyl, Disc, Face, type V3 } from './parts'

type Paint = { kind: 'twoTone'; lower?: string } | { kind: 'solid'; back: string; side: string }

interface RoomShellProps {
  floor?: 'oak' | 'terrazzo'
  paint?: Paint
  children: ReactNode
}

/**
 * The cutaway room: a white base slab with an inset floor, two white wall
 * cores (back at -z, left at -x) with painted inner faces, and soft contact
 * shadows baked once when the room mounts. The front and right stay open to
 * the camera.
 */
export function RoomShell({ floor = 'oak', paint = { kind: 'twoTone' }, children }: RoomShellProps) {
  const { half, height, wall } = ROOM
  const span = half * 2 + wall
  const offset = -wall / 2
  const core = M.matte(C.shell, 0.8)
  return (
    <group>
      <Block size={[span, 0.3, span]} at={[offset, -0.18, offset]} mat={core} r={0.02} cast={false} />
      <Block
        size={[half * 2, 0.03, half * 2]}
        at={[0, -0.015, 0]}
        mat={floor === 'oak' ? M.oakFloor() : M.terrazzo()}
        r={0.004}
        cast={false}
      />
      <Block size={[span, height + 0.03, wall]} at={[offset, (height - 0.03) / 2, -half - wall / 2]} mat={core} r={0.015} cast={false} />
      <Block
        size={[span, height + 0.03, wall]}
        at={[-half - wall / 2, (height - 0.03) / 2, offset]}
        rot={[0, Math.PI / 2, 0]}
        mat={core}
        r={0.015}
        cast={false}
      />
      <WallPaint paint={paint} side="back" />
      {/* The same paint layout, turned to face +x on the left wall. */}
      <group rotation-y={Math.PI / 2}>
        <WallPaint paint={paint} side="left" />
      </group>
      {children}
      <AccumulativeShadows frames={24} alphaTest={0.8} opacity={0.75} scale={5.5} position={[0, 0.003, 0]} color="#3b4a42">
        <RandomizedLight amount={4} radius={3} ambient={0.55} intensity={1.1} position={[-1.5, 7, 4.5]} bias={0.001} mapSize={1024} />
      </AccumulativeShadows>
    </group>
  )
}

function WallPaint({ paint, side }: { paint: Paint; side: 'back' | 'left' }) {
  const { half, height } = ROOM
  const length = half * 2
  const z = (t: number) => -half + t / 2
  if (paint.kind === 'solid') {
    return <Block size={[length, height, 0.012]} at={[0, height / 2, z(0.012)]} mat={M.plaster(side === 'back' ? paint.back : paint.side)} r={0.004} cast={false} />
  }
  const railTop = 1.097
  return (
    <>
      <Block size={[length, 1, 0.012]} at={[0, 0.5, z(0.012)]} mat={M.plaster(paint.lower ?? C.sage)} r={0.004} cast={false} />
      <Block size={[length, 0.075, 0.02]} at={[0, 1.0375, z(0.02)]} mat={M.matte(C.maroon, 0.5)} r={0.006} cast={false} />
      <Block size={[length, 0.022, 0.024]} at={[0, 1.086, z(0.024)]} mat={M.matte(C.orange, 0.5)} r={0.006} cast={false} />
      <Block
        size={[length, height - railTop, 0.012]}
        at={[0, (height + railTop) / 2, z(0.012)]}
        mat={M.plaster(C.upperWall)}
        r={0.004}
        cast={false}
      />
    </>
  )
}

interface PlaceProps {
  at: V3
  rotY?: number
}

/** White door with a frosted glass panel, lever handle and a number plaque beside it. Origin: wall surface, floor. */
export function Door({ at, rotY = 0, number, color = C.white }: PlaceProps & { number?: string; color?: string }) {
  const trim = M.matte(C.white, 0.5)
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.07, 2.22, 0.12]} at={[-0.51, 1.11, 0]} mat={trim} r={0.012} />
      <Block size={[0.07, 2.22, 0.12]} at={[0.51, 1.11, 0]} mat={trim} r={0.012} />
      <Block size={[1.09, 0.07, 0.12]} at={[0, 2.185, 0]} mat={trim} r={0.012} />
      <Block size={[0.95, 2.15, 0.045]} at={[0, 1.075, 0.012]} mat={M.matte(color, 0.45)} r={0.01} />
      <Block size={[0.5, 1.55, 0.05]} at={[0, 1.2, 0.012]} mat={M.frosted()} r={0.008} cast={false} />
      <Cyl r={0.022} h={0.04} at={[0.38, 1.0, 0.055]} rot={[Math.PI / 2, 0, 0]} mat={M.metal()} />
      <Block size={[0.13, 0.02, 0.02]} at={[0.33, 1.0, 0.08]} mat={M.metal()} r={0.008} />
      {number && (
        <>
          <Block size={[0.13, 0.13, 0.012]} at={[0.7, 1.55, 0.006]} mat={trim} r={0.01} />
          <Face size={[0.1, 0.1]} at={[0.7, 1.55, 0.0131]} mat={M.picture(`plaque-${number}`, labelTexture(number, C.white, C.charcoal, 1))} />
        </>
      )}
    </group>
  )
}

/** Casement window with a white frame, a garden view and a sill. Origin: wall surface, window center. */
export function Window({ at, rotY = 0, w = 1.25, h = 1.45 }: PlaceProps & { w?: number; h?: number }) {
  const trim = M.matte(C.white, 0.45)
  return (
    <group position={at} rotation-y={rotY}>
      <Face size={[w - 0.08, h - 0.08]} at={[0, 0, 0.004]} mat={M.picture('view', viewTexture(), false)} />
      <Block size={[w, 0.07, 0.14]} at={[0, h / 2 - 0.035, 0.03]} mat={trim} r={0.01} />
      <Block size={[w, 0.07, 0.14]} at={[0, -h / 2 + 0.035, 0.03]} mat={trim} r={0.01} />
      <Block size={[0.07, h, 0.14]} at={[-w / 2 + 0.035, 0, 0.03]} mat={trim} r={0.01} />
      <Block size={[0.07, h, 0.14]} at={[w / 2 - 0.035, 0, 0.03]} mat={trim} r={0.01} />
      <Block size={[0.06, h - 0.1, 0.1]} at={[0, 0, 0.04]} mat={trim} r={0.01} />
      <Block size={[w * 0.5 - 0.1, 0.035, 0.06]} at={[-w * 0.25, -0.02, 0.05]} mat={trim} r={0.01} />
      <Block size={[0.02, 0.1, 0.03]} at={[0.08, 0, 0.1]} mat={M.metal()} r={0.006} />
      <Block size={[w + 0.2, 0.05, 0.22]} at={[0, -h / 2 - 0.02, 0.09]} mat={trim} r={0.012} />
    </group>
  )
}

/** A flat sign with text. Origin: wall surface, sign center. */
export function Sign({
  at,
  rotY = 0,
  w,
  h,
  text,
  sub,
  bg = C.white,
  fg = C.charcoal,
}: PlaceProps & { w: number; h: number; text: string; sub?: string; bg?: string; fg?: string }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h, 0.03]} at={[0, 0, 0.015]} mat={M.matte(bg, 0.6)} r={0.01} />
      <Face size={[w - 0.03, h - 0.03]} at={[0, 0, 0.031]} mat={M.picture(`sign-${text}-${sub}`, labelTexture(text, bg, fg, w / h, sub))} />
    </group>
  )
}

/** Wall-mounted hand sanitizer with a drip tray. Origin: wall surface, unit center. */
export function Sanitizer({ at, rotY = 0 }: PlaceProps) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.16, 0.42, 0.015]} at={[0, -0.04, 0.008]} mat={M.metal()} r={0.006} />
      <Block size={[0.13, 0.22, 0.1]} at={[0, 0.05, 0.06]} mat={M.matte(C.white, 0.35)} r={0.03} />
      <Block size={[0.06, 0.03, 0.03]} at={[0, -0.075, 0.09]} mat={M.matte('#c8ccd0', 0.4)} r={0.01} />
      <Block size={[0.14, 0.02, 0.12]} at={[0, -0.24, 0.06]} mat={M.metal()} r={0.008} />
      <Block size={[0.09, 0.13, 0.07]} at={[-0.17, -0.02, 0.045]} mat={M.matte(C.white, 0.35)} r={0.02} />
    </group>
  )
}

/** Round wall clock. Origin: wall surface, clock center. */
export function Clock({ at, rotY = 0, r = 0.19 }: PlaceProps & { r?: number }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Cyl r={r} h={0.045} at={[0, 0, 0.0225]} rot={[Math.PI / 2, 0, 0]} mat={M.matte('#e8e4dc', 0.4)} seg={48} />
      <Disc r={r * 0.9} at={[0, 0, 0.0455]} mat={M.picture('clock', clockTexture())} />
    </group>
  )
}

/** Framed abstract print. Origin: wall surface, frame center. */
export function Art({ at, rotY = 0, w = 0.55, h = 0.75, seed = 1 }: PlaceProps & { w?: number; h?: number; seed?: number }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h, 0.03]} at={[0, 0, 0.015]} mat={M.matte(C.white, 0.5)} r={0.006} />
      <Face size={[w - 0.05, h - 0.05]} at={[0, 0, 0.031]} mat={M.picture(`art-${seed}`, artTexture(seed))} />
    </group>
  )
}

const NOTES: Array<{ x: number; y: number; w: number; h: number; paper: string; lines: number; tilt: number }> = [
  { x: -0.33, y: 0.13, w: 0.2, h: 0.26, paper: '#fbfaf6', lines: 7, tilt: 0.03 },
  { x: -0.08, y: 0.17, w: 0.13, h: 0.13, paper: '#f6e7a1', lines: 3, tilt: -0.08 },
  { x: 0.16, y: 0.12, w: 0.19, h: 0.25, paper: '#fbfaf6', lines: 6, tilt: -0.02 },
  { x: 0.36, y: 0.18, w: 0.12, h: 0.12, paper: '#d3efe3', lines: 2, tilt: 0.06 },
  { x: -0.3, y: -0.17, w: 0.13, h: 0.13, paper: '#d6e6f2', lines: 3, tilt: -0.05 },
  { x: -0.05, y: -0.13, w: 0.19, h: 0.22, paper: '#fbfaf6', lines: 5, tilt: 0.04 },
  { x: 0.22, y: -0.16, w: 0.13, h: 0.13, paper: '#f6e7a1', lines: 3, tilt: 0.07 },
]

/** Cork board with pinned pages and sticky notes. Origin: wall surface, board center. */
export function CorkBoard({ at, rotY = 0, children }: PlaceProps & { children?: ReactNode }) {
  const w = 1.15
  const h = 0.78
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h, 0.035]} at={[0, 0, 0.0175]} mat={M.wood('#b98d5f')} r={0.008} />
      <Block size={[w - 0.08, h - 0.08, 0.02]} at={[0, 0, 0.03]} mat={M.cork()} r={0.004} cast={false} />
      {children ??
        NOTES.map((n, i) => (
          <group key={i} position={[n.x, n.y, 0.041]} rotation-z={n.tilt}>
            <Face size={[n.w, n.h]} at={[0, 0, 0]} mat={M.picture(`note-${n.paper}-${n.lines}`, noteTexture(n.paper, n.lines))} />
            <Ball r={0.012} at={[0, n.h / 2 - 0.025, 0.008]} mat={M.matte(i % 2 ? C.maroon : C.primary, 0.4)} cast={false} />
          </group>
        ))}
    </group>
  )
}

/** Clipboard with a page. Origin: wall surface, board center. */
export function Clipboard({ at, rotY = 0 }: PlaceProps) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.24, 0.32, 0.012]} at={[0, 0, 0.006]} mat={M.wood('#b08a5f')} r={0.008} />
      <Face size={[0.2, 0.26]} at={[0, -0.02, 0.0125]} mat={M.picture('note-page', noteTexture('#fbfaf6', 8))} />
      <Block size={[0.1, 0.035, 0.02]} at={[0, 0.14, 0.018]} mat={M.metal()} r={0.008} />
    </group>
  )
}

/** Wall-mounted display. Origin: wall surface, screen center. */
export function WallScreen({ at, rotY = 0, w = 0.85, h = 0.5, variant = 'chart' }: PlaceProps & { w?: number; h?: number; variant?: 'chart' | 'list' }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h, 0.035]} at={[0, 0, 0.03]} mat={M.matte(C.charcoal, 0.4)} r={0.01} />
      <Face size={[w - 0.035, h - 0.035]} at={[0, 0, 0.0476]} mat={M.picture(`screen-${variant}`, screenTexture(variant), false)} />
    </group>
  )
}

/** Floating wall shelf. Origin: wall surface, shelf top center. */
export function Shelf({ at, rotY = 0, w = 0.6, children }: PlaceProps & { w?: number; children?: ReactNode }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, 0.035, 0.2]} at={[0, -0.0175, 0.1]} mat={M.matte(C.white, 0.45)} r={0.008} />
      {children}
    </group>
  )
}

/** Glass jar filled with mint-green candy (the operatory jar from the reference). Origin: jar bottom. */
export function Jar({ at, fill = '#6fbf96', h = 0.24 }: { at: V3; fill?: string; h?: number }) {
  return (
    <group position={at}>
      <Cyl r={0.085} h={h * 0.78} at={[0, h * 0.39, 0]} mat={M.matte(fill, 0.5)} cast={false} />
      <Cyl r={0.095} h={h} at={[0, h / 2, 0]} mat={M.glass()} />
      <Cyl r={0.08} h={0.03} at={[0, h + 0.015, 0]} mat={M.metal()} />
    </group>
  )
}
