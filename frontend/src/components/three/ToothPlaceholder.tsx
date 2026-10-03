/**
 * ToothPlaceholder: one clickable tooth. This is the ONLY file to change when
 * real tooth models arrive. Keep the outer <group> (it owns placement, events
 * and the hover/selection animation) and replace <PlaceholderShape> with the
 * model, e.g.:
 *
 *   const { nodes } = useGLTF('/models/teeth.glb')   // one mesh per tooth
 *   <mesh geometry={nodes[`tooth_${tooth.number}`].geometry} material={crownMaterial} />
 *
 * Model in the local frame used here: biting surface at y = 0, crown growing
 * toward +y, cheek side toward +z. Lower teeth are flipped for you.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, RoundedBox, useCursor } from '@react-three/drei'
import { Color, ConeGeometry, MathUtils, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, type Group } from 'three'
import type { ToothInfo, ToothType } from '../../data/teeth'
import type { ToothStatus } from '../../types/domain'
import { TOOTH_WIDTHS } from './archLayout'

export interface ToothPlaceholderProps {
  tooth: ToothInfo
  position: [number, number, number]
  rotationY: number
  selected: boolean
  status?: ToothStatus
  onSelect: (toothNumber: number | null) => void
  onHoverChange: (toothNumber: number, hovered: boolean) => void
}

interface ShapeSpec {
  crownHeight: number
  depth: number
  radius: number
  rootHeight: number
  rootRadius: number
  /** [x, z] offsets of each root */
  roots: Array<[number, number]>
  /** [x, z] offsets of each cusp on the biting surface */
  cusps: Array<[number, number]>
  cuspRadius: number
}

const SHAPES: Record<ToothType, ShapeSpec> = {
  incisor: { crownHeight: 0.56, depth: 0.24, radius: 0.07, rootHeight: 0.62, rootRadius: 0.09, roots: [[0, 0]], cusps: [], cuspRadius: 0 },
  canine: { crownHeight: 0.62, depth: 0.32, radius: 0.1, rootHeight: 0.8, rootRadius: 0.11, roots: [[0, 0]], cusps: [[0, 0]], cuspRadius: 0.12 },
  premolar: { crownHeight: 0.5, depth: 0.4, radius: 0.1, rootHeight: 0.62, rootRadius: 0.11, roots: [[0, 0]], cusps: [[0, -0.09], [0, 0.09]], cuspRadius: 0.1 },
  molar: {
    crownHeight: 0.46,
    depth: 0.5,
    radius: 0.12,
    rootHeight: 0.55,
    rootRadius: 0.09,
    roots: [[-0.12, 0.08], [0.12, 0.08], [0, -0.1]],
    cusps: [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]],
    cuspRadius: 0.1,
  },
}

const ENAMEL = '#eef2f4'
const GLOW = {
  selected: '#0e8a6c',
  planned: '#2563a6',
  treated: '#7a5cc7',
  hover: '#6f8fae',
} as const

// Shared across all teeth (never disposed: they live as long as the scene chunk).
const CUSP_GEOMETRY = new SphereGeometry(1, 20, 14)
const ROOT_GEOMETRY = new ConeGeometry(1, 1, 7, 1)
const ROOT_MATERIAL = new MeshStandardMaterial({ color: '#cdbb9a', roughness: 0.75, flatShading: true })

function PlaceholderShape({ type, width, crownMaterial }: { type: ToothType; width: number; crownMaterial: MeshPhysicalMaterial }) {
  const s = SHAPES[type]
  return (
    <>
      <RoundedBox
        args={[width, s.crownHeight, s.depth]}
        radius={s.radius}
        smoothness={4}
        position={[0, s.crownHeight / 2, 0]}
        material={crownMaterial}
      />
      {s.cusps.map(([x, z], i) => (
        <mesh
          key={`cusp-${i}`}
          geometry={CUSP_GEOMETRY}
          material={crownMaterial}
          position={[x, 0.04, z]}
          scale={[s.cuspRadius, s.cuspRadius * 0.8, s.cuspRadius]}
        />
      ))}
      {s.roots.map(([x, z], i) => (
        <mesh
          key={`root-${i}`}
          geometry={ROOT_GEOMETRY}
          material={ROOT_MATERIAL}
          position={[x, s.crownHeight + s.rootHeight / 2 - 0.06, z]}
          rotation={[z * 0.8, 0, -x * 1.2]}
          scale={[s.rootRadius, s.rootHeight, s.rootRadius]}
        />
      ))}
    </>
  )
}

export default function ToothPlaceholder({
  tooth,
  position,
  rotationY,
  selected,
  status,
  onSelect,
  onHoverChange,
}: ToothPlaceholderProps) {
  const [hovered, setHovered] = useState(false)
  const liftRef = useRef<Group>(null)
  useCursor(hovered)

  const crownMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: ENAMEL,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.22,
        emissive: '#000000',
        emissiveIntensity: 0,
      }),
    [],
  )
  useEffect(() => () => crownMaterial.dispose(), [crownMaterial])

  // Target colors for the current state; useFrame eases toward them.
  const { tint, glow } = useMemo(() => {
    const key = selected ? 'selected' : (status ?? (hovered ? 'hover' : null))
    const glowColor = new Color(key ? GLOW[key] : '#000000')
    const tintColor = new Color(ENAMEL)
    if (key && key !== 'hover') tintColor.lerp(new Color(GLOW[key]), key === 'selected' ? 0.35 : 0.45)
    return { tint: tintColor, glow: glowColor }
  }, [selected, status, hovered])

  const shape = SHAPES[tooth.type]
  const isUpper = tooth.arch === 'upper'
  // Upper teeth hang down from the top arch; lower teeth point up.
  const towardBite = isUpper ? -1 : 1

  useFrame((state, delta) => {
    const group = liftRef.current
    if (!group) return
    const liftTarget = (selected ? 0.16 : hovered ? 0.08 : 0) * towardBite
    group.position.y = MathUtils.damp(group.position.y, liftTarget, 10, delta)
    group.scale.setScalar(MathUtils.damp(group.scale.x, selected ? 1.07 : hovered ? 1.035 : 1, 10, delta))

    const intensity = selected
      ? 0.55 + 0.2 * Math.sin(state.clock.elapsedTime * 3.2)
      : hovered
        ? 0.32
        : status
          ? 0.22
          : 0
    const ease = 1 - Math.exp(-8 * delta)
    crownMaterial.emissiveIntensity = MathUtils.damp(crownMaterial.emissiveIntensity, intensity, 8, delta)
    crownMaterial.emissive.lerp(glow, ease)
    crownMaterial.color.lerp(tint, ease)
  })

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    setHovered(true)
    onHoverChange(tooth.number, true)
  }

  function handlePointerOut() {
    setHovered(false)
    onHoverChange(tooth.number, false)
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect(selected ? null : tooth.number)
  }

  const labelY = (shape.crownHeight + shape.rootHeight + 0.2) * (isUpper ? 1 : -1)

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <group ref={liftRef}>
        {/* Flip lower teeth about Z so the crown points up but the cheek side stays at +z. */}
        <group rotation-z={isUpper ? 0 : Math.PI}>
          <PlaceholderShape type={tooth.type} width={TOOTH_WIDTHS[tooth.indexFromMidline]} crownMaterial={crownMaterial} />
        </group>
      </group>

      {hovered && (
        <Html position={[0, labelY, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1 text-xs shadow-lg">
            <span className="font-semibold text-ink">#{tooth.number}</span>{' '}
            <span className="text-ink-muted">{tooth.name}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
