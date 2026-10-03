import { Environment, Lightformer } from '@react-three/drei'

/**
 * Soft daylight, like the reference renders: a warm key from the front-left
 * (the window side) and an even fill from a procedural environment of light
 * cards (no HDRI download, so it works offline).
 */
export default function Lighting() {
  return (
    <>
      <hemisphereLight args={['#fdf9f0', '#c9bfae', 0.9]} />
      <directionalLight position={[-1.5, 7, 4.5]} intensity={1.5} color="#fff3e2" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#fff6e8" position={[-6, 3, 3]} rotation-y={Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#e8f1ee" position={[6, 2.5, -2]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#fdf6e3" position={[3, 4, 7]} scale={3} />
      </Environment>
    </>
  )
}
