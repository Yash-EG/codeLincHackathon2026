import { M } from '../common/materials'
import { xrayTexture } from '../common/textures'
import { Door, RoomShell, Sanitizer, Sign } from '../kit/architecture'
import { CantileverChair, DesktopComputer, OfficeChair, SnakePlant, WoodDesk } from '../kit/furniture'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Ball, Block, Cyl, Face, type V3 } from '../kit/parts'

/** Imaging: panoramic X-ray unit, light box, lead apron rack, glass partition with the control desk. */
export default function ImagingScene() {
  return (
    <RoomShell paint={{ kind: 'twoTone', lower: '#a9c6d8' }}>
      <Sanitizer at={[-FACE, 1.42, 2.05]} rotY={ON_LEFT} />
      <LightBox at={[-FACE, 1.65, -0.9]} />
      <ApronRack at={[-FACE, 0, 0.9]} />
      <Door at={[-1.6, 0, -FACE]} number="2" />
      <Sign at={[-0.55, 2.3, -FACE]} w={0.62} h={0.2} text="X-RAY" bg={C.white} fg={C.maroon} />
      <PanoramicXray at={[0.2, 0, -FACE + 0.2]} />

      {/* Lead-glass partition and the control station in the back-right corner. */}
      <Block size={[0.12, 1.05, 1.54]} at={[1.35, 0.525, -1.97]} mat={M.matte(C.white, 0.4)} r={0.015} />
      <Block size={[0.16, 0.035, 1.56]} at={[1.35, 1.07, -1.97]} mat={M.wood(C.oak)} r={0.01} />
      <Block size={[0.04, 0.85, 1.5]} at={[1.35, 1.52, -1.97]} mat={M.glass()} r={0.008} cast={false} />
      <WoodDesk at={[2.05, 0, -2.42]} w={1.2} d={0.6} />
      <DesktopComputer at={[2.05, 0.76, -2.55]} />
      <OfficeChair at={[2.05, 0, -1.72]} rotY={Math.PI} />

      <CantileverChair at={[-0.4, 0, 1.7]} rotY={-0.7} />
      <SnakePlant at={[2.25, 0, 1.9]} />
    </RoomShell>
  )
}

/** Wall light box with a panoramic film. */
function LightBox({ at }: { at: V3 }) {
  return (
    <group position={at} rotation-y={ON_LEFT}>
      <Block size={[1.3, 0.72, 0.06]} at={[0, 0, 0.03]} mat={M.matte('#e9edf0', 0.4)} r={0.015} />
      <Face size={[1.22, 0.62]} at={[0, 0.02, 0.0605]} mat={M.picture('xray', xrayTexture(), false)} />
      <Block size={[0.06, 0.03, 0.02]} at={[0.55, -0.31, 0.065]} mat={M.glow('#7fe0b8', 1.2)} r={0.006} cast={false} />
    </group>
  )
}

/** Wall rail with three lead aprons and thyroid collars. */
function ApronRack({ at }: { at: V3 }) {
  const colors = [C.primary, '#3e8f8a', C.maroon]
  return (
    <group position={at} rotation-y={ON_LEFT}>
      <Block size={[1.25, 0.05, 0.05]} at={[0, 1.95, 0.05]} mat={M.metal()} r={0.015} />
      {colors.map((color, i) => {
        const x = (i - 1) * 0.42
        return (
          <group key={color}>
            <Cyl r={0.012} h={0.08} at={[x, 1.92, 0.08]} rot={[Math.PI / 2, 0, 0]} mat={M.metal()} />
            <Block size={[0.38, 0.78, 0.05]} at={[x, 1.5, 0.11]} rot={[0.04, 0, 0]} mat={M.vinyl(color)} r={0.04} />
            <Block size={[0.2, 0.08, 0.06]} at={[x, 1.86, 0.13]} mat={M.vinyl(color)} r={0.03} />
          </group>
        )
      })}
    </group>
  )
}

/** Panoramic X-ray: column against the wall, carriage, rotating C-arm with tube head and sensor. */
function PanoramicXray({ at }: { at: V3 }) {
  const shell = M.matte(C.white, 0.4)
  const accent = M.matte(C.primary, 0.45)
  return (
    <group position={at}>
      <Block size={[0.7, 0.05, 0.7]} at={[0, 0.025, 0.25]} mat={shell} r={0.02} />
      <Block size={[0.32, 2.3, 0.28]} at={[0, 1.15, 0]} mat={shell} r={0.06} />
      <Block size={[0.34, 0.1, 0.3]} at={[0, 2.05, 0]} mat={accent} r={0.04} />
      <Block size={[0.26, 0.18, 0.8]} at={[0, 1.78, 0.4]} mat={shell} r={0.05} />
      <Block size={[0.9, 0.09, 0.2]} at={[0, 1.68, 0.78]} mat={shell} r={0.04} />
      <Block size={[0.2, 0.42, 0.22]} at={[-0.42, 1.45, 0.78]} mat={shell} r={0.05} />
      <Block size={[0.24, 0.44, 0.26]} at={[0.42, 1.45, 0.78]} mat={accent} r={0.06} />
      <Block size={[0.3, 0.05, 0.16]} at={[0, 1.18, 0.62]} mat={shell} r={0.02} />
      <Cyl r={0.018} h={0.14} at={[0, 1.27, 0.66]} mat={M.metal()} />
      <Ball r={0.025} at={[0, 1.35, 0.66]} mat={M.matte('#7cc2ad', 0.4)} />
      <Block size={[0.5, 0.035, 0.035]} at={[0, 1.22, 0.5]} mat={M.metal()} r={0.012} />
    </group>
  )
}
