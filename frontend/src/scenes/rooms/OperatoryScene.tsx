import { M } from '../common/materials'
import { Art, Clipboard, Door, Jar, RoomShell, Sanitizer, Shelf, WallScreen } from '../kit/architecture'
import { Books, LowerCabinets, SnakePlant, Succulent, TallCabinet } from '../kit/furniture'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Ball, Block, Cyl, type V3 } from '../kit/parts'

/** Operatory: dental chair with its light and delivery arm, operator stool, cabinets, wall screen, jar shelf. */
export default function OperatoryScene() {
  return (
    <RoomShell>
      <Sanitizer at={[-FACE, 1.42, 2.05]} rotY={ON_LEFT} />
      <Door at={[-FACE, 0, 0.85]} rotY={ON_LEFT} number="1" />
      <Clipboard at={[-FACE, 1.55, 0.0]} rotY={ON_LEFT} />
      <WallScreen at={[-FACE, 1.75, -0.8]} rotY={ON_LEFT} w={0.9} h={0.54} />
      <Clipboard at={[-FACE, 0.8, -0.8]} rotY={ON_LEFT} />
      <Shelf at={[-FACE, 1.42, -1.8]} rotY={ON_LEFT} w={0.7}>
        <Jar at={[0.12, 0, 0.1]} />
        <Jar at={[-0.15, 0, 0.1]} fill="#f4f1ec" h={0.16} />
      </Shelf>

      <Door at={[-1.75, 0, -FACE]} />
      <Art at={[0.35, 1.85, -FACE]} seed={4} />
      <LowerCabinets at={[0.4, 0, -FACE + 0.3]} w={2.5} columns={5} />
      <Block size={[0.32, 0.04, 0.22]} at={[0.9, 0.96, -FACE + 0.28]} mat={M.matte('#7cc2ad', 0.4)} r={0.01} />
      <Cyl r={0.04} h={0.1} at={[-0.4, 0.99, -FACE + 0.3]} mat={M.ceramic('#f4f1ec')} />
      <group position={[2.15, 0, -FACE + 0.225]}>
        <TallCabinet at={[0, 0, 0]} w={0.8} h={2.1} />
        <Books at={[-0.37, 0.85, 0]} length={0.74} depth={0.25} seed={5} maxHeight={0.18} colors={['#f4f1ec', '#d6e6f2', '#9ec3ac']} />
        <Books at={[-0.37, 1.27, 0]} length={0.6} depth={0.22} seed={9} maxHeight={0.14} colors={['#f4f1ec', '#f6d6c8', '#d6e6f2']} />
      </group>

      <DentalChair at={[0.1, 0, 0.35]} rotY={-Math.PI / 4} />
      <OperatorStool at={[-1.0, 0, 1.25]} />

      <SnakePlant at={[-2.2, 0, 2.2]} />
      <Succulent at={[-1.88, 0, 2.42]} />
      <Succulent at={[-1.95, 0, 2.08]} scale={0.9} />
    </RoomShell>
  )
}

/** Patient chair: head toward local -x, feet toward +x, light pole behind, tool tray on the +z side. */
function DentalChair({ at, rotY }: { at: V3; rotY: number }) {
  const vinyl = M.vinyl('#efe8dc')
  const shell = M.matte(C.white, 0.35)
  const metal = M.metal()
  return (
    <group position={at} rotation-y={rotY}>
      <Block size={[1.15, 0.07, 0.62]} at={[0.15, 0.035, 0]} mat={shell} r={0.03} />
      <Block size={[0.5, 0.34, 0.38]} at={[0.05, 0.23, 0]} rot={[0, 0, 0.12]} mat={shell} r={0.08} />
      <Block size={[0.62, 0.15, 0.6]} at={[0.05, 0.5, 0]} mat={vinyl} r={0.07} />
      <Block size={[0.85, 0.15, 0.58]} at={[-0.58, 0.78, 0]} rot={[0, 0, -0.62]} mat={vinyl} r={0.07} />
      <Block size={[0.26, 0.12, 0.34]} at={[-1.05, 1.13, 0]} rot={[0, 0, -0.4]} mat={vinyl} r={0.05} />
      <Block size={[0.95, 0.14, 0.5]} at={[0.78, 0.43, 0]} rot={[0, 0, -0.22]} mat={vinyl} r={0.06} />
      <Block size={[0.45, 0.06, 0.09]} at={[-0.05, 0.75, 0.35]} mat={shell} r={0.03} />
      <Cyl r={0.02} h={0.2} at={[0.05, 0.63, 0.35]} mat={metal} />

      {/* Light: pole behind the backrest, two arm segments, lamp head over the face. */}
      <Cyl r={0.035} h={1.65} at={[-0.35, 1.0, -0.38]} mat={shell} />
      <Block size={[0.06, 0.06, 0.44]} at={[-0.35, 1.84, -0.17]} mat={shell} r={0.025} />
      <Ball r={0.04} at={[-0.35, 1.84, 0.05]} mat={shell} />
      <Block size={[0.34, 0.05, 0.05]} at={[-0.5, 1.84, 0.05]} mat={shell} r={0.02} />
      <Block size={[0.32, 0.12, 0.22]} at={[-0.72, 1.77, 0.05]} rot={[0, 0, 0.35]} mat={shell} r={0.05} />
      <Block size={[0.24, 0.02, 0.15]} at={[-0.7, 1.71, 0.05]} rot={[0, 0, 0.35]} mat={M.glow('#fff4dc', 0.8)} r={0.008} cast={false} />

      {/* Delivery unit: post, tray arm, handpieces, instrument tray. */}
      <Cyl r={0.03} h={0.6} at={[0.35, 0.36, 0.42]} mat={shell} />
      <Block size={[0.5, 0.05, 0.3]} at={[0.3, 0.86, 0.5]} mat={shell} r={0.02} />
      {[0, 1, 2, 3].map((i) => (
        <Cyl key={i} r={0.012} h={0.22} at={[0.12 + i * 0.075, 0.98, 0.6]} rot={[-0.35, 0, 0]} mat={i % 2 ? metal : M.matte(C.charcoal, 0.4)} />
      ))}
      <Block size={[0.3, 0.02, 0.2]} at={[0.45, 0.9, 0.44]} mat={M.matte('#7cc2ad', 0.4)} r={0.008} />
      <Cyl r={0.06} rTop={0.08} h={0.08} at={[-0.15, 0.92, -0.42]} mat={M.ceramic('#f4f1ec')} />
      <Cyl r={0.018} h={0.4} at={[-0.15, 0.68, -0.42]} mat={shell} />
    </group>
  )
}

/** Operator's stool on casters with a small backrest. */
function OperatorStool({ at }: { at: V3 }) {
  const shell = M.matte(C.white, 0.35)
  return (
    <group position={at}>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation-y={(i / 5) * Math.PI * 2}>
          <Block size={[0.04, 0.035, 0.28]} at={[0, 0.07, 0.14]} mat={shell} r={0.012} />
          <Ball r={0.026} at={[0, 0.028, 0.27]} mat={M.matte(C.charcoal, 0.5)} />
        </group>
      ))}
      <Cyl r={0.025} h={0.4} at={[0, 0.27, 0]} mat={M.metal()} />
      <Cyl r={0.2} h={0.08} at={[0, 0.5, 0]} mat={M.vinyl('#efe8dc')} seg={32} />
      <Cyl r={0.012} h={0.25} at={[0, 0.66, -0.17]} mat={M.metal()} />
      <Block size={[0.3, 0.13, 0.05]} at={[0, 0.8, -0.18]} mat={M.vinyl('#efe8dc')} r={0.025} />
    </group>
  )
}
