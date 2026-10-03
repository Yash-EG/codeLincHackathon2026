import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3 } from 'three'
import { useSceneStore } from '../../store/sceneStore'

/** How quickly the camera catches up with the scroll position (higher = snappier). */
const FOLLOW = 3.5

/**
 * Glides the camera along a smooth curve through the current room's keyframes.
 * Scroll position arrives through the scene store (written by GSAP
 * ScrollTrigger on the DOM side), so the page scrolls natively: no
 * <ScrollControls>, no scroll hijacking. With reduced motion it snaps between stops.
 */
export default function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const keyframes = useSceneStore((s) => s.keyframes)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const lookAt = useRef(new Vector3(0, 1, 0))
  const desired = useMemo(() => ({ position: new Vector3(), target: new Vector3() }), [])

  const curves = useMemo(() => {
    if (keyframes.length < 2) return null
    return {
      position: new CatmullRomCurve3(keyframes.map((k) => new Vector3(...k.position)), false, 'centripetal'),
      target: new CatmullRomCurve3(keyframes.map((k) => new Vector3(...k.target)), false, 'centripetal'),
    }
  }, [keyframes])

  // frameloop="demand": render only when the scroll position changes.
  useEffect(() => useSceneStore.subscribe(() => invalidate()), [invalidate])

  useFrame((_, delta) => {
    const { progress } = useSceneStore.getState()
    const n = keyframes.length
    if (n === 0) return

    if (!curves) {
      desired.position.set(...keyframes[0].position)
      desired.target.set(...keyframes[0].target)
    } else {
      const clamped = Math.min(Math.max(progress, 0), n - 1)
      const t = (reducedMotion ? Math.round(clamped) : clamped) / (n - 1)
      curves.position.getPoint(t, desired.position)
      curves.target.getPoint(t, desired.target)
    }

    if (reducedMotion) {
      camera.position.copy(desired.position)
      lookAt.current.copy(desired.target)
    } else {
      // Frame-rate independent damping; delta is capped so the first frame after idle doesn't jump.
      const k = 1 - Math.exp(-FOLLOW * Math.min(delta, 1 / 30))
      camera.position.lerp(desired.position, k)
      lookAt.current.lerp(desired.target, k)
    }
    camera.lookAt(lookAt.current)

    const settled =
      camera.position.distanceToSquared(desired.position) < 1e-5 && lookAt.current.distanceToSquared(desired.target) < 1e-5
    if (!settled) invalidate()
  })

  return null
}
