/**
 * DentalScene: the 3D centerpiece. Everything Three.js / React Three Fiber
 * lives under components/three/. The rest of the app only sees this component's
 * props: which tooth is selected, plus click and hover callbacks.
 *
 * Swap the placeholder geometry in ToothPlaceholder.tsx; this file only
 * handles the camera, lights, controls and arch layout.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { CatmullRomCurve3, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { TEETH, type Arch } from '../../data/teeth'
import type { ToothStatus } from '../../types/domain'
import { ARCH_TILT, OCCLUSAL_GAP, archCurvePoints, placeTooth } from './archLayout'
import ToothPlaceholder from './ToothPlaceholder'

export interface DentalSceneProps {
  selectedTooth: number | null
  /** Called with a tooth number on click, or null when the background is clicked. */
  onToothSelect: (toothNumber: number | null) => void
  /** Called with the tooth under the pointer, or null when none. */
  onToothHover?: (toothNumber: number | null) => void
  toothStatus?: Partial<Record<number, ToothStatus>>
}

/** Height of the gum line above the biting surface. */
const GUM_LINE = 0.68
const GUM_MATERIAL = new MeshStandardMaterial({
  color: '#b8466a',
  roughness: 0.55,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
})

function Gum({ arch }: { arch: Arch }) {
  const geometry = useMemo(() => {
    const y = (arch === 'upper' ? 1 : -1) * (OCCLUSAL_GAP + GUM_LINE)
    const curve = new CatmullRomCurve3(archCurvePoints(y).map(([px, py, pz]) => new Vector3(px, py, pz)))
    return new TubeGeometry(curve, 160, 0.2, 14, false)
  }, [arch])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Decorative only: ignore raycasts so clicks reach the teeth behind it.
  return <mesh geometry={geometry} material={GUM_MATERIAL} raycast={() => null} />
}

const NO_STATUS: Partial<Record<number, ToothStatus>> = {}

export default function DentalScene({
  selectedTooth,
  onToothSelect,
  onToothHover,
  toothStatus = NO_STATUS,
}: DentalSceneProps) {
  const placements = useMemo(() => TEETH.map(placeTooth), [])
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)

  // Pointer-out on tooth A can arrive after pointer-over on tooth B, so only
  // clear the hover if it still belongs to the tooth that was left.
  const handleHoverChange = useCallback((toothNumber: number, isOver: boolean) => {
    setHoveredTooth((current) => (isOver ? toothNumber : current === toothNumber ? null : current))
  }, [])

  useEffect(() => {
    onToothHover?.(hoveredTooth)
  }, [hoveredTooth, onToothHover])

  const renderArch = (arch: Arch) =>
    placements
      .filter((p) => p.tooth.arch === arch)
      .map((p) => (
        <ToothPlaceholder
          key={p.tooth.number}
          tooth={p.tooth}
          position={p.position}
          rotationY={p.rotationY}
          selected={selectedTooth === p.tooth.number}
          status={toothStatus[p.tooth.number]}
          onSelect={onToothSelect}
          onHoverChange={handleHoverChange}
        />
      ))

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 1.4, 6.8], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onToothSelect(null)}
    >
      {/* Fog matches the stage panel so the back molars fade into the card. */}
      <fog attach="fog" args={['#e9eef0', 8.5, 15]} />

      {/* Lighting: sky fill, warm-white key, soft mint rim from behind the arch. */}
      <hemisphereLight args={['#f4f8ff', '#b9c9b0', 1.1]} />
      <directionalLight position={[3, 6, 5]} intensity={2.2} />
      <directionalLight position={[-4, -3, 4]} intensity={0.6} color="#9fb4ff" />
      <pointLight position={[0, 0.4, -3.2]} intensity={14} distance={12} color="#d3efe3" />

      <group rotation-x={-ARCH_TILT}>
        <Gum arch="upper" />
        {renderArch('upper')}
      </group>
      <group rotation-x={ARCH_TILT} scale={0.94}>
        <Gum arch="lower" />
        {renderArch('lower')}
      </group>

      <ContactShadows position={[0, -1.8, 0]} opacity={0.35} scale={10} blur={2.6} far={3.5} resolution={512} color="#1f2a33" />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={11}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.78}
      />
    </Canvas>
  )
}
