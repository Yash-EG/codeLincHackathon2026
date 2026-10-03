import { Environment, Lightformer } from '@react-three/drei'

/**
 * Soft, even "clay studio" light. A procedural environment made of light cards
 * stands in for global illumination (no HDRI download, works offline); the
 * hemisphere light adds a cream sky and a sage bounce from the floor.
 */
export default function Lighting() {
  return (
    <>
      <hemisphereLight args={['#fdf9f0', '#b9c9b0', 1.1]} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} color="#fff6e8" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#d6e6f2" position={[-6, 2.5, 2]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#d3efe3" position={[6, 2.5, -2]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#fdf6e3" position={[2, 4, 6]} scale={3} />
      </Environment>
    </>
  )
}
