import { AccumulativeShadows, RandomizedLight, RoundedBox } from '@react-three/drei'
import { MATERIALS } from '../common/materials'

interface PlaceholderRoomProps {
  /** Wall color; each room gets its own tint until it has a real model. */
  wall: string
}

/**
 * A rounded, clay-style diorama corner: floor, two walls, a desk, a sofa, a
 * plant and a door. Stand-in for the per-room Spline / glTF scenes, which
 * replace this component one room at a time.
 */
export default function PlaceholderRoom({ wall }: PlaceholderRoomProps) {
  return (
    <group>
      {/* Floor slab and rug */}
      <RoundedBox args={[8, 0.3, 8]} radius={0.12} position={[0, -0.15, 0]} material={MATERIALS.floor} receiveShadow />
      <RoundedBox args={[3, 0.04, 2.2]} radius={0.02} position={[-1.6, 0.02, 1]} material={MATERIALS.rug} receiveShadow />

      {/* Walls with a light-blue wainscot band and a window */}
      <RoundedBox args={[8, 4, 0.3]} radius={0.1} position={[0, 2, -4]} receiveShadow>
        <meshStandardMaterial color={wall} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[0.3, 4, 8]} radius={0.1} position={[-4, 2, 0]} receiveShadow>
        <meshStandardMaterial color={wall} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[8, 1, 0.36]} radius={0.06} position={[0, 0.5, -4]} material={MATERIALS.wainscot} />
      <RoundedBox args={[0.36, 1, 8]} radius={0.06} position={[-4, 0.5, 0]} material={MATERIALS.wainscot} />
      <RoundedBox args={[0.34, 1.6, 2.4]} radius={0.08} position={[-4, 2.5, -0.6]} material={MATERIALS.window} />

      {/* Door to the hallway */}
      <RoundedBox args={[1.3, 2.5, 0.12]} radius={0.05} position={[-1.6, 1.25, -3.82]} material={MATERIALS.door} castShadow />

      {/* Reception desk */}
      <RoundedBox args={[2.6, 1, 1]} radius={0.15} position={[1, 0.5, -1.6]} material={MATERIALS.cream} castShadow receiveShadow />
      <RoundedBox args={[2.9, 0.12, 1.25]} radius={0.05} position={[1, 1.06, -1.6]} material={MATERIALS.wood} castShadow />

      {/* Sofa against the left wall, with a coffee table */}
      <RoundedBox args={[0.95, 0.5, 2.4]} radius={0.15} position={[-3.2, 0.35, 1]} material={MATERIALS.sage} castShadow />
      <RoundedBox args={[0.35, 0.95, 2.4]} radius={0.15} position={[-3.65, 0.75, 1]} material={MATERIALS.sage} castShadow />
      <RoundedBox args={[0.95, 0.7, 0.3]} radius={0.12} position={[-3.2, 0.45, -0.3]} material={MATERIALS.sage} castShadow />
      <RoundedBox args={[0.95, 0.7, 0.3]} radius={0.12} position={[-3.2, 0.45, 2.3]} material={MATERIALS.sage} castShadow />
      <RoundedBox args={[1.2, 0.4, 0.8]} radius={0.1} position={[-1.7, 0.2, 1]} material={MATERIALS.wood} castShadow />

      {/* Plant */}
      <mesh position={[3.1, 0.35, -3.1]} material={MATERIALS.pot} castShadow>
        <cylinderGeometry args={[0.32, 0.26, 0.7, 24]} />
      </mesh>
      {[
        [3.1, 1.15, -3.1, 0.45],
        [2.85, 1.5, -2.95, 0.32],
        [3.3, 1.55, -3.25, 0.3],
      ].map(([x, y, z, r]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} material={MATERIALS.leaf} castShadow>
          <sphereGeometry args={[r, 24, 16]} />
        </mesh>
      ))}

      {/* Soft contact shadows, accumulated once on mount (static scene). */}
      <AccumulativeShadows frames={40} alphaTest={0.85} opacity={0.75} scale={10} position={[0, 0.01, 0]} color="#3d4f45">
        <RandomizedLight amount={8} radius={5} ambient={0.55} intensity={1.2} position={[5, 8, 4]} bias={0.001} />
      </AccumulativeShadows>
    </group>
  )
}
