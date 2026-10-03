import { useLayoutEffect, useMemo, useRef } from 'react'
import { Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three'
import { M } from '../common/materials'
import { CorkBoard, Door, RoomShell, Sanitizer } from '../kit/architecture'
import { BookStack, Books, FilingCabinet, Laptop, OfficeChair, PalmPlant, TallCabinet, WoodDesk } from '../kit/furniture'
import { FACE, ON_LEFT } from '../kit/palette'
import { Cyl, type V3 } from '../kit/parts'

/** Records: filing cabinets, binder cabinet, cork board of reminders, desk with the savings coin jar. */
export default function RecordsScene() {
  return (
    <RoomShell>
      <Door at={[-FACE, 0, 1.4]} rotY={ON_LEFT} number="5" />
      <Sanitizer at={[-FACE, 1.42, 2.35]} rotY={ON_LEFT} />
      <group position={[-FACE + 0.225, 0, -0.6]} rotation-y={ON_LEFT}>
        <TallCabinet at={[0, 0, 0]} w={0.85} h={2.0} />
        <Books at={[-0.395, 0.81, 0]} length={0.79} depth={0.3} seed={21} maxHeight={0.33} />
        <Books at={[-0.395, 1.21, 0]} length={0.79} depth={0.3} seed={22} maxHeight={0.33} />
        <Books at={[-0.395, 1.6, 0]} length={0.79} depth={0.3} seed={23} maxHeight={0.3} />
      </group>

      {[-2.2, -1.65, -1.1].map((x, i) => (
        <FilingCabinet key={x} at={[x, 0, -FACE + 0.31]} color={i === 1 ? '#c7d6e2' : '#c9d5c4'} />
      ))}
      <CorkBoard at={[0.75, 1.75, -FACE]} />

      <group position={[1.1, 0, -1.15]} rotation-y={-0.25}>
        <WoodDesk at={[0, 0, 0]} />
        <CoinJar at={[0.35, 0.76, 0.1]} />
        <Laptop at={[-0.2, 0.76, -0.05]} rotY={Math.PI} />
        <BookStack at={[-0.5, 0.76, 0.15]} rotY={-0.2} />
        <OfficeChair at={[0, 0, -0.65]} />
      </group>
      <PalmPlant at={[2.3, 0, -2.25]} scale={0.9} />
    </RoomShell>
  )
}

const COIN_COUNT = 46

/** Glass savings jar of coins: the annual maximum you still have to spend. */
function CoinJar({ at }: { at: V3 }) {
  const ref = useRef<InstancedMesh>(null)
  const coins = useMemo(() => {
    let s = 1234
    const next = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    return Array.from({ length: COIN_COUNT }, (_, i) => {
      const inside = i < 40
      const a = next() * Math.PI * 2
      const r = inside ? next() * 0.07 : 0.14 + next() * 0.08
      const y = inside ? 0.01 + (i / 40) * 0.12 + next() * 0.01 : 0.003
      return { p: new Vector3(Math.cos(a) * r, y, Math.sin(a) * r), e: new Euler((next() - 0.5) * 0.8, next() * 3, (next() - 0.5) * 0.8) }
    })
  }, [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new Matrix4()
    coins.forEach((c, i) => mesh.setMatrixAt(i, m.compose(c.p, new Quaternion().setFromEuler(c.e), new Vector3(1, 1, 1))))
    mesh.instanceMatrix.needsUpdate = true
  }, [coins])

  return (
    <group position={at}>
      <instancedMesh ref={ref} args={[undefined, M.metal('#d4a948'), COIN_COUNT]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.005, 18]} />
      </instancedMesh>
      <Cyl r={0.1} h={0.22} at={[0, 0.11, 0]} mat={M.glass()} cast={false} />
      <Cyl r={0.102} h={0.03} at={[0, 0.2, 0]} mat={M.metal()} cast={false} />
    </group>
  )
}
