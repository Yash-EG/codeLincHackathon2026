import { M } from '../common/materials'
import { directoryTexture } from '../common/textures'
import { Art, Clock, Door, RoomShell, Sanitizer } from '../kit/architecture'
import { SnakePlant, Succulent } from '../kit/furniture'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Block, Face } from '../kit/parts'

const DIRECTORY = ['1  Operatory', '2  Imaging', '3  Consult', '4  Billing', '5  Records', 'Reception']

/** Hallway: numbered doors, clock, directory board, sanitizer, art, plants. */
export default function HallwayScene() {
  return (
    <RoomShell>
      <Sanitizer at={[-FACE, 1.42, 2.0]} rotY={ON_LEFT} />
      <Door at={[-FACE, 0, 0.75]} rotY={ON_LEFT} number="1" />
      <Clock at={[-FACE, 2.3, -1.3]} rotY={ON_LEFT} />
      <group position={[-FACE, 1.55, -1.45]} rotation-y={ON_LEFT}>
        <Block size={[0.52, 0.78, 0.03]} at={[0, 0, 0.015]} mat={M.matte(C.primary, 0.5)} r={0.01} />
        <Face size={[0.49, 0.74]} at={[0, 0, 0.031]} mat={M.picture('directory', directoryTexture(DIRECTORY))} />
      </group>
      <Door at={[-1.55, 0, -FACE]} number="2" />
      <Art at={[0.1, 1.8, -FACE]} seed={2} />
      <Door at={[1.65, 0, -FACE]} number="3" />
      <SnakePlant at={[0.9, 0, 1.7]} />
      <Succulent at={[0.58, 0, 1.78]} />
    </RoomShell>
  )
}
