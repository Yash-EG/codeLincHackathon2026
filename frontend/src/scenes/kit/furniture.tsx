import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Euler, Quaternion, Vector3, type InstancedMesh } from 'three'
import { M } from '../common/materials'
import { screenTexture } from '../common/textures'
import { C } from './palette'
import { Ball, Block, Cyl, Face, type V3 } from './parts'

interface PlaceProps {
  at: V3
  rotY?: number
}

// ---------------------------------------------------------------------------
// Seating

/** Cream three-seat sofa with throw pillows. Back at -z, faces +z. */
export function Sofa({ at, rotY = 0, length = 2.0, pillows = [C.maroon, C.red, C.orange] }: PlaceProps & { length?: number; pillows?: string[] }) {
  const fabric = M.fabric(C.cream)
  const seat = (length - 0.32) / 2
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[length, 0.24, 0.86]} at={[0, 0.26, 0]} mat={fabric} r={0.06} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[seat - 0.02, 0.15, 0.66]} at={[(s * seat) / 2, 0.45, 0.08]} mat={fabric} r={0.07} />
      ))}
      <Block size={[length - 0.3, 0.5, 0.2]} at={[0, 0.62, -0.32]} mat={fabric} r={0.09} />
      {[-1, 1].map((s) => (
        <Block key={`arm${s}`} size={[0.16, 0.56, 0.86]} at={[s * (length / 2 - 0.08), 0.4, 0]} mat={fabric} r={0.07} />
      ))}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Cyl key={`leg${sx}${sz}`} r={0.018} h={0.14} at={[sx * (length / 2 - 0.1), 0.07, sz * 0.33]} mat={M.matte(C.charcoal, 0.4)} />
        )),
      )}
      {pillows.map((color, i) => {
        const x = -length / 2 + 0.38 + i * ((length - 0.76) / Math.max(pillows.length - 1, 1))
        return (
          <Block
            key={`p${i}`}
            size={[0.4, 0.38, 0.13]}
            at={[x, 0.7, -0.17]}
            rot={[-0.25, (i - 1) * 0.12, (i - 1) * 0.08]}
            mat={M.fabric(color)}
            r={0.06}
          />
        )
      })}
    </group>
  )
}

/** Chrome cantilever chair with a cream leather seat. Faces +z. */
export function CantileverChair({ at, rotY = 0, color = '#efe9e0' }: PlaceProps & { color?: string }) {
  const chrome = M.metal(C.chrome)
  const leather = M.vinyl(color)
  return (
    <group position={at} rotation-y={rotY}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl r={0.012} h={0.5} at={[s * 0.21, 0.012, -0.02]} rot={[Math.PI / 2, 0, 0]} mat={chrome} />
          <Cyl r={0.012} h={0.42} at={[s * 0.21, 0.22, 0.2]} rot={[-0.18, 0, 0]} mat={chrome} />
        </group>
      ))}
      <Block size={[0.48, 0.08, 0.46]} at={[0, 0.46, 0.02]} mat={leather} r={0.035} />
      <Block size={[0.46, 0.46, 0.08]} at={[0, 0.76, -0.2]} rot={[-0.12, 0, 0]} mat={leather} r={0.035} />
    </group>
  )
}

/** Swivel chair on a five-star base. `tall` gives the high-back executive version. Faces +z. */
export function OfficeChair({ at, rotY = 0, color = '#efe9e0', tall = false }: PlaceProps & { color?: string; tall?: boolean }) {
  const shell = M.vinyl(color)
  const base = M.matte(tall ? C.chrome : C.white, 0.35)
  const backH = tall ? 0.78 : 0.48
  return (
    <group position={at} rotation-y={rotY}>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation-y={(i / 5) * Math.PI * 2}>
          <Block size={[0.04, 0.035, 0.3]} at={[0, 0.07, 0.15]} mat={base} r={0.012} />
          <Ball r={0.028} at={[0, 0.03, 0.29]} mat={M.matte(C.charcoal, 0.5)} />
        </group>
      ))}
      <Cyl r={0.026} h={0.36} at={[0, 0.26, 0]} mat={M.metal()} />
      <Block size={[0.5, 0.09, 0.48]} at={[0, 0.47, 0.02]} mat={shell} r={0.04} />
      <Block size={[0.46, backH, 0.08]} at={[0, 0.55 + backH / 2, -0.22]} rot={[-0.1, 0, 0]} mat={shell} r={0.04} />
      {tall &&
        [-1, 1].map((s) => (
          <Block key={s} size={[0.05, 0.04, 0.32]} at={[s * 0.27, 0.68, 0.0]} mat={base} r={0.015} />
        ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Desks and storage

/** Glass-top desk on a wood pedestal and a chrome leg panel. Front (visitor side) faces +z. */
export function GlassDesk({ at, rotY = 0, w = 1.6, d = 0.78 }: PlaceProps & { w?: number; d?: number }) {
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, 0.022, d]} at={[0, 0.75, 0]} mat={M.glassTop()} r={0.008} cast={false} />
      <Block size={[0.46, 0.73, d - 0.04]} at={[w / 2 - 0.27, 0.365, 0]} mat={M.wood('#a87d55')} r={0.015} />
      <Block size={[0.04, 0.73, d - 0.12]} at={[-w / 2 + 0.1, 0.365, 0]} mat={M.metal(C.chrome)} r={0.012} />
      <Block size={[w - 0.6, 0.3, 0.025]} at={[-0.1, 0.55, -d / 2 + 0.08]} mat={M.metal(C.chrome)} r={0.008} />
    </group>
  )
}

/** Plain wood desk with a drawer pedestal. Front faces +z. */
export function WoodDesk({ at, rotY = 0, w = 1.4, d = 0.7, wood = '#c9a073' }: PlaceProps & { w?: number; d?: number; wood?: string }) {
  const mat = M.wood(wood)
  const white = M.matte(C.white, 0.45)
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, 0.04, d]} at={[0, 0.74, 0]} mat={mat} r={0.012} />
      <Block size={[0.04, 0.72, d - 0.06]} at={[-w / 2 + 0.05, 0.36, 0]} mat={white} r={0.01} />
      <Block size={[0.42, 0.66, d - 0.06]} at={[w / 2 - 0.25, 0.36, 0]} mat={white} r={0.015} />
      {[0, 1, 2].map((i) => (
        <Block key={`h${i}`} size={[0.14, 0.015, 0.02]} at={[w / 2 - 0.25, 0.2 + i * 0.21, d / 2 - 0.018]} mat={M.metal()} r={0.006} />
      ))}
    </group>
  )
}

/** Run of white lower cabinets with drawers, doors, bar handles and a white top. Against a wall; front faces +z. */
export function LowerCabinets({ at, rotY = 0, w = 2.4, columns = 4 }: PlaceProps & { w?: number; columns?: number }) {
  const d = 0.6
  const h = 0.9
  const body = M.matte(C.white, 0.35)
  const col = w / columns
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h - 0.1, d]} at={[0, 0.1 + (h - 0.1) / 2, 0]} mat={body} r={0.012} />
      <Block size={[w - 0.04, 0.1, d - 0.06]} at={[0, 0.05, -0.03]} mat={M.matte('#d9d4cb', 0.6)} r={0.01} />
      <Block size={[w + 0.03, 0.04, d + 0.03]} at={[0, h + 0.02, 0.01]} mat={M.quartz()} r={0.01} />
      {Array.from({ length: columns }, (_, i) => {
        const x = -w / 2 + col * (i + 0.5)
        const drawers = i % 2 === 0
        return drawers ? (
          <group key={i}>
            {[0, 1, 2].map((k) => (
              <group key={k}>
                <Block size={[col - 0.02, 0.24, 0.02]} at={[x, 0.24 + k * 0.255, d / 2 + 0.008]} mat={body} r={0.008} />
                <Block size={[col * 0.4, 0.014, 0.02]} at={[x, 0.31 + k * 0.255, d / 2 + 0.025]} mat={M.metal()} r={0.006} />
              </group>
            ))}
          </group>
        ) : (
          <group key={i}>
            <Block size={[col - 0.02, h - 0.14, 0.02]} at={[x, 0.11 + (h - 0.14) / 2, d / 2 + 0.008]} mat={body} r={0.008} />
            <Block size={[col * 0.4, 0.014, 0.02]} at={[x, h - 0.12, d / 2 + 0.025]} mat={M.metal()} r={0.006} />
          </group>
        )
      })}
    </group>
  )
}

/** Tall white cabinet: glass doors over shelves on top, solid doors below. Front faces +z. */
export function TallCabinet({ at, rotY = 0, w = 0.8, h = 2.1, d = 0.45, wood }: PlaceProps & { w?: number; h?: number; d?: number; wood?: string }) {
  const body = M.matte(C.white, 0.4)
  const lowerH = h * 0.4
  const lower = wood ? M.wood(wood) : body
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[w, h, 0.02]} at={[0, h / 2, -d / 2 + 0.01]} mat={body} r={0.006} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.03, h, d]} at={[s * (w / 2 - 0.015), h / 2, 0]} mat={body} r={0.008} />
      ))}
      <Block size={[w, 0.03, d]} at={[0, h - 0.015, 0]} mat={body} r={0.008} />
      {[0.06, lowerH, lowerH + (h - lowerH) * 0.33, lowerH + (h - lowerH) * 0.66].map((y) => (
        <Block key={y} size={[w - 0.04, 0.02, d - 0.04]} at={[0, y, 0]} mat={body} r={0.005} />
      ))}
      {[-1, 1].map((s) => (
        <group key={`door${s}`}>
          <Block size={[w / 2 - 0.02, lowerH - 0.08, 0.02]} at={[(s * w) / 4, 0.06 + (lowerH - 0.08) / 2, d / 2]} mat={lower} r={0.006} />
          <Block size={[w / 2 - 0.02, h - lowerH - 0.06, 0.012]} at={[(s * w) / 4, lowerH + (h - lowerH - 0.06) / 2 + 0.01, d / 2]} mat={M.glass()} r={0.004} cast={false} />
          <Block size={[0.012, 0.12, 0.02]} at={[s * 0.04, lowerH - 0.12, d / 2 + 0.018]} mat={M.metal()} r={0.005} />
        </group>
      ))}
    </group>
  )
}

const BINDER_COLORS = ['#f4f1ec', '#dfe7ea', '#1f4e79', '#9ec3ac', '#f4f1ec', '#cfd8dc', '#8a1538', '#efe9df']

/**
 * A shelf of books or binders as one instanced mesh (one draw call).
 * Origin: left end of the shelf surface, spines facing +z.
 */
export function Books({ at, rotY = 0, length, depth = 0.24, seed = 1, colors = BINDER_COLORS, maxHeight = 0.3 }: PlaceProps & {
  length: number
  depth?: number
  seed?: number
  colors?: string[]
  maxHeight?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const list: Array<{ x: number; w: number; h: number; tilt: number; color: string }> = []
    let s = seed * 9301 + 49297
    const next = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    let x = 0.02
    while (x < length - 0.06) {
      const w = 0.03 + next() * 0.045
      const h = maxHeight * (0.7 + next() * 0.3)
      const gap = next() < 0.08 ? 0.08 : 0
      const tilt = next() < 0.06 ? 0.25 : 0
      list.push({ x: x + w / 2, w, h, tilt, color: colors[Math.floor(next() * colors.length)] })
      x += w + 0.004 + gap
    }
    return list
  }, [length, seed, colors, maxHeight])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new Matrix4()
    const q = new Quaternion()
    const color = new Color()
    items.forEach((b, i) => {
      q.setFromEuler(new Euler(0, 0, b.tilt))
      m.compose(new Vector3(b.x, b.h / 2, 0), q, new Vector3(b.w, b.h, depth))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, color.set(b.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, depth])

  return (
    <group position={at} rotation-y={rotY}>
      <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </group>
  )
}

/** Steel filing cabinet with four drawers. Against a wall; front faces +z. */
export function FilingCabinet({ at, rotY = 0, color = '#c9d5c4' }: PlaceProps & { color?: string }) {
  const body = M.paintedMetal(color)
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.5, 1.32, 0.62]} at={[0, 0.66, 0]} mat={body} r={0.02} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i}>
          <Block size={[0.44, 0.28, 0.02]} at={[0, 0.2 + i * 0.315, 0.315]} mat={body} r={0.01} />
          <Block size={[0.16, 0.025, 0.03]} at={[0, 0.27 + i * 0.315, 0.335]} mat={M.metal()} r={0.008} />
          <Block size={[0.09, 0.045, 0.006]} at={[0, 0.17 + i * 0.315, 0.328]} mat={M.matte(C.white, 0.6)} r={0.002} />
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Plants

/** Snake plant in a ribbed white pot. */
export function SnakePlant({ at, scale = 1 }: { at: V3; scale?: number }) {
  const leaves = [
    [0, 0.0, 0.62, 0.05],
    [0.05, 0.03, 0.55, -0.12],
    [-0.05, 0.02, 0.58, 0.14],
    [0.03, -0.05, 0.48, 0.2],
    [-0.03, -0.04, 0.52, -0.2],
    [0.06, -0.01, 0.4, 0.3],
    [-0.06, 0.04, 0.44, -0.28],
  ]
  return (
    <group position={at} scale={scale}>
      <Cyl r={0.13} rTop={0.16} h={0.26} at={[0, 0.13, 0]} mat={M.vinyl('#f1ede6')} seg={28} />
      <Cyl r={0.15} h={0.02} at={[0, 0.255, 0]} mat={M.matte('#6b4f3a', 1)} cast={false} />
      {leaves.map(([x, z, h, tilt], i) => (
        <mesh key={i} position={[x, 0.26 + h / 2, z]} rotation={[tilt * 0.6, i * 0.9, tilt]} scale={[1, 1, 0.3]} material={M.leaf(i % 2 ? C.leaf : '#3f6b47')} castShadow>
          <coneGeometry args={[0.035, h, 6]} />
        </mesh>
      ))}
    </group>
  )
}

/** Small succulent rosette in a round pot. */
export function Succulent({ at, scale = 1 }: { at: V3; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Cyl r={0.08} rTop={0.1} h={0.12} at={[0, 0.06, 0]} mat={M.vinyl('#f1ede6')} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        const ring = i % 2 ? 0.05 : 0.035
        return (
          <Ball
            key={i}
            r={0.04}
            at={[Math.cos(a) * ring, 0.15, Math.sin(a) * ring]}
            scale={[0.6, 0.45, 1.2]}
            mat={M.leaf(i % 3 ? '#7fa88a' : '#9cc0a4')}
          />
        )
      })}
      <Ball r={0.035} at={[0, 0.17, 0]} mat={M.leaf('#8fb59a')} />
    </group>
  )
}

/** Areca palm in a woven basket. */
export function PalmPlant({ at, scale = 1 }: { at: V3; scale?: number }) {
  const fronds = 11
  return (
    <group position={at} scale={scale}>
      <Cyl r={0.2} rTop={0.24} h={0.42} at={[0, 0.21, 0]} mat={M.fabric('#cdb48e')} seg={28} />
      <Cyl r={0.23} h={0.02} at={[0, 0.41, 0]} mat={M.matte('#6b4f3a', 1)} cast={false} />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} r={0.018} h={0.7} at={[(i - 1) * 0.04, 0.75, (i % 2) * 0.03]} rot={[0, 0, (i - 1) * 0.12]} mat={M.wood('#8a7a52')} />
      ))}
      {Array.from({ length: fronds }, (_, i) => {
        const yaw = (i / fronds) * Math.PI * 2
        const height = 0.95 + (i % 3) * 0.18
        return (
          <group key={i} position={[0, height, 0]} rotation-y={yaw}>
            <group rotation-x={[-0.35, 0.45, 0.85][i % 3]}>
              <Ball r={0.3} at={[0, 0, 0.26]} scale={[0.22, 0.03, 1]} mat={M.leaf(i % 2 ? C.leafLight : C.leaf)} />
            </group>
          </group>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Small things

/** All-in-one computer (aluminum stand, white chin). Screen faces +z. */
export function DesktopComputer({ at, rotY = 0 }: PlaceProps) {
  const alu = M.metal('#d8dbde')
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.18, 0.012, 0.15]} at={[0, 0.006, 0]} mat={alu} r={0.004} />
      <Block size={[0.15, 0.24, 0.015]} at={[0, 0.13, -0.03]} rot={[0.18, 0, 0]} mat={alu} r={0.004} />
      <Block size={[0.56, 0.4, 0.02]} at={[0, 0.36, 0.01]} mat={alu} r={0.012} />
      <Face size={[0.53, 0.3]} at={[0, 0.4, 0.0205]} mat={M.picture('screen-list', screenTexture('list'), false)} />
    </group>
  )
}

/** Open laptop. Screen faces +z. */
export function Laptop({ at, rotY = 0 }: PlaceProps) {
  const alu = M.metal('#d8dbde')
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[0.32, 0.014, 0.22]} at={[0, 0.007, 0.05]} mat={alu} r={0.004} />
      <group position={[0, 0.012, -0.06]} rotation-x={-0.25}>
        <Block size={[0.32, 0.21, 0.008]} at={[0, 0.105, 0]} mat={alu} r={0.004} />
        <Face size={[0.29, 0.18]} at={[0, 0.11, 0.0045]} mat={M.picture('screen-chart', screenTexture('chart'), false)} />
      </group>
    </group>
  )
}

/** Adjustable desk lamp. */
export function DeskLamp({ at, rotY = 0 }: PlaceProps) {
  const metal = M.metal('#cfd4d8')
  return (
    <group position={at} rotation-y={rotY}>
      <Cyl r={0.07} h={0.018} at={[0, 0.009, 0]} mat={metal} />
      <Cyl r={0.008} h={0.38} at={[0.03, 0.2, 0]} rot={[0, 0, -0.18]} mat={metal} />
      <Cyl r={0.008} h={0.22} at={[0.15, 0.4, 0]} rot={[0, 0, -1.2]} mat={metal} />
      <Cyl r={0.05} rTop={0.022} h={0.09} at={[0.26, 0.36, 0]} rot={[0, 0, 0.4]} mat={M.matte(C.white, 0.4)} />
    </group>
  )
}

/** Wire magazine rack with a few magazines. */
export function MagazineRack({ at, rotY = 0 }: PlaceProps) {
  const wire = M.matte(C.charcoal, 0.35)
  const mags = ['#d6e6f2', '#f4f1ec', '#9ec3ac', '#e8c9a0']
  return (
    <group position={at} rotation-y={rotY}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl r={0.006} h={0.4} at={[s * 0.17, 0.2, 0.08]} mat={wire} seg={8} />
          <Cyl r={0.006} h={0.4} at={[s * 0.17, 0.2, -0.08]} mat={wire} seg={8} />
        </group>
      ))}
      <Block size={[0.36, 0.01, 0.18]} at={[0, 0.05, 0]} mat={wire} r={0.003} />
      {mags.map((color, i) => (
        <Block key={i} size={[0.26, 0.34, 0.01]} at={[(i - 1.5) * 0.02, 0.25, 0.05 - i * 0.035]} rot={[-0.18, 0, 0]} mat={M.matte(color, 0.6)} r={0.003} />
      ))}
    </group>
  )
}

/** Stack of books lying flat. */
export function BookStack({ at, rotY = 0 }: PlaceProps) {
  const covers = [C.primary, C.maroon, '#e8d9c0']
  return (
    <group position={at} rotation-y={rotY}>
      {covers.map((color, i) => (
        <Block key={i} size={[0.22 - i * 0.02, 0.035, 0.16]} at={[0, 0.0175 + i * 0.036, 0]} rot={[0, i * 0.15, 0]} mat={M.matte(color, 0.6)} r={0.004} />
      ))}
    </group>
  )
}

/** Park bench (wood slats on dark legs). Faces +z. */
export function Bench({ at, rotY = 0, length = 1.4 }: PlaceProps & { length?: number }) {
  const legs = M.matte(C.charcoal, 0.4)
  return (
    <group position={at} rotation-y={rotY}>
      {[0, 1, 2].map((i) => (
        <Block key={i} size={[length, 0.035, 0.11]} at={[0, 0.45, -0.13 + i * 0.13]} mat={M.wood(C.oak)} r={0.01} />
      ))}
      {[0, 1].map((i) => (
        <Block key={`b${i}`} size={[length, 0.1, 0.03]} at={[0, 0.62 + i * 0.13, -0.22]} rot={[-0.15, 0, 0]} mat={M.wood(C.oak)} r={0.01} />
      ))}
      {[-1, 1].map((s) => (
        <Block key={`l${s}`} size={[0.05, 0.45, 0.4]} at={[s * (length / 2 - 0.12), 0.225, 0]} mat={legs} r={0.01} />
      ))}
    </group>
  )
}
