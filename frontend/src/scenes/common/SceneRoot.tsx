import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import type { RoomId } from '../../rooms'
import PlaceholderRoom from '../rooms/PlaceholderRoom'
import CameraRig from './CameraRig'
import Effects from './Effects'
import Lighting from './Lighting'
import { useScrollKeyframes } from './useScrollKeyframes'

/** Wall tint per room until each room has its own model. */
const WALLS: Record<RoomId, string> = {
  entrance: '#d6e6f2',
  reception: '#d3efe3',
  hallway: '#e7eee4',
  operatory: '#d6e6f2',
  imaging: '#cfdde9',
  consult: '#c9d6c0',
  billing: '#d3efe3',
  records: '#e4ddcc',
}

interface SceneRootProps {
  room: RoomId
  reducedMotion: boolean
}

/**
 * The single, persistent 3D layer. It sits behind the router at z-index -1,
 * is hidden from assistive tech, never takes focus, and has no meaning of its
 * own: everything it shows is also text in the page.
 */
export default function SceneRoot({ room, reducedMotion }: SceneRootProps) {
  useScrollKeyframes(room)
  // Pointer events come from #root, so 3D doors can be clickable later
  // without the canvas ever sitting on top of the page.
  const eventSource = useMemo(() => document.getElementById('root') ?? undefined, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-1">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        shadows
        eventSource={eventSource}
        eventPrefix="client"
        camera={{ position: [10, 7, 10], fov: 35, near: 0.1, far: 100 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#d3efe3']} />
        <fog attach="fog" args={['#d3efe3', 22, 45]} />
        <Lighting />
        <Suspense fallback={null}>
          <PlaceholderRoom key={room} wall={WALLS[room]} />
        </Suspense>
        <CameraRig reducedMotion={reducedMotion} />
        <Effects />
      </Canvas>
    </div>
  )
}
