import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import type { RoomId } from '../../rooms'
import { C } from '../kit/palette'
import { ROOM_SCENES } from '../rooms'
import CameraRig from './CameraRig'
import Effects from './Effects'
import Lighting from './Lighting'
import { useScrollKeyframes } from './useScrollKeyframes'

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
  const Scene = ROOM_SCENES[room]

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-1">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        shadows
        eventSource={eventSource}
        eventPrefix="client"
        camera={{ position: [8.6, 7, 8.6], fov: 30, near: 0.1, far: 80 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[C.background]} />
        <fog attach="fog" args={[C.background, 24, 48]} />
        <Lighting />
        <Suspense fallback={null}>
          {/* Keyed so each room mounts fresh and re-bakes its contact shadows. */}
          <Scene key={room} />
        </Suspense>
        <CameraRig reducedMotion={reducedMotion} />
        <Effects />
      </Canvas>
    </div>
  )
}
