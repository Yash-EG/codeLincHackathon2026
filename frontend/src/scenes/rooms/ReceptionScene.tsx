import { useEffect, useMemo } from 'react'
import { M } from '../common/materials'
import { Door, RoomShell, Window } from '../kit/architecture'
import { DeskLamp, DesktopComputer, MagazineRack, OfficeChair, PalmPlant, Sofa } from '../kit/furniture'
import { arcSlab } from '../kit/geometry'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Block, type V3 } from '../kit/parts'

/** Reception: mint walls, garden window, curved white desk with the maroon and orange band, cream sofa, palm. */
export default function ReceptionScene() {
  return (
    <RoomShell paint={{ kind: 'solid', back: C.mintBack, side: C.mintSide }}>
      <Window at={[-FACE, 1.6, -0.9]} rotY={ON_LEFT} />
      <Door at={[-0.85, 0, -FACE]} color="#8fb9a3" />
      <ReceptionDesk at={[-1.05, 0, -0.3]} rotY={Math.PI / 4} />
      <Sofa at={[1.1, 0, -2.25]} />
      <PalmPlant at={[2.42, 0, -2.3]} />
      <MagazineRack at={[2.15, 0, -1.3]} rotY={-0.4} />
    </RoomShell>
  )
}

/** Curved desk: the convex front faces local +z; the receptionist sits at the arc's center. */
function ReceptionDesk({ at, rotY }: { at: V3; rotY: number }) {
  const parts = useMemo(
    () => ({
      body: arcSlab(0.55, 0.95, 200, 340, 0.93),
      top: arcSlab(0.5, 1.0, 196, 344, 0.04),
      band: arcSlab(0.95, 0.975, 198, 342, 0.075),
      line: arcSlab(0.95, 0.98, 198, 342, 0.022),
      ledge: arcSlab(0.8, 1.0, 300, 344, 0.1),
    }),
    [],
  )
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts])
  const up = -Math.PI / 2
  return (
    <group position={at} rotation-y={rotY}>
      <mesh geometry={parts.body} material={M.quartz()} rotation-x={up} castShadow receiveShadow />
      <mesh geometry={parts.band} material={M.matte(C.maroon, 0.5)} rotation-x={up} position-y={0.79} />
      <mesh geometry={parts.line} material={M.matte(C.orange, 0.5)} rotation-x={up} position-y={0.875} />
      <mesh geometry={parts.top} material={M.quartz()} rotation-x={up} position-y={0.93} castShadow receiveShadow />
      <mesh geometry={parts.ledge} material={M.quartz()} rotation-x={up} position-y={0.97} castShadow receiveShadow />
      <DesktopComputer at={[-0.19, 0.97, 0.69]} rotY={2.88} />
      <DeskLamp at={[-0.58, 0.97, 0.48]} rotY={2.2} />
      <Block size={[0.22, 0.012, 0.3]} at={[0.3, 0.976, 0.62]} rot={[0, 0.5, 0]} mat={M.matte('#fbfaf6', 0.7)} r={0.003} />
      <OfficeChair at={[0, 0, 0.05]} color="#f4f1ec" />
    </group>
  )
}
