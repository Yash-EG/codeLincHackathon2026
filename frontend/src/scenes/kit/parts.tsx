import { RoundedBox } from '@react-three/drei'
import type { Material } from 'three'

export type V3 = [number, number, number]

interface PartProps {
  at: V3
  rot?: V3
  mat: Material
  /** Casts into the baked contact shadows (default true). */
  cast?: boolean
}

/** A soft-edged box: the basic building block of the clay-style office. Sizes in meters. */
export function Block({ size, at, rot, mat, r = 0.03, cast = true }: PartProps & { size: V3; r?: number }) {
  const radius = Math.max(0.002, Math.min(r, Math.min(...size) / 2 - 0.002))
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      bevelSegments={2}
      position={at}
      rotation={rot}
      material={mat}
      castShadow={cast}
      receiveShadow
    />
  )
}

/** Cylinder (or cone frustum with rTop). */
export function Cyl({
  r,
  rTop,
  h,
  at,
  rot,
  mat,
  seg = 24,
  cast = true,
}: PartProps & { r: number; rTop?: number; h: number; seg?: number }) {
  return (
    <mesh position={at} rotation={rot} material={mat} castShadow={cast} receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
    </mesh>
  )
}

export function Ball({ r, at, scale, mat, cast = true }: PartProps & { r: number; scale?: V3 }) {
  return (
    <mesh position={at} scale={scale} material={mat} castShadow={cast} receiveShadow>
      <sphereGeometry args={[r, 24, 16]} />
    </mesh>
  )
}

/** A flat face (signs, screens, pictures). Faces +z before rotation. */
export function Face({ size, at, rot, mat }: Omit<PartProps, 'cast'> & { size: [number, number] }) {
  return (
    <mesh position={at} rotation={rot} material={mat}>
      <planeGeometry args={size} />
    </mesh>
  )
}

/** A round flat face (clock dials). Faces +z. */
export function Disc({ r, at, rot, mat }: Omit<PartProps, 'cast'> & { r: number }) {
  return (
    <mesh position={at} rotation={rot} material={mat}>
      <circleGeometry args={[r, 48]} />
    </mesh>
  )
}
