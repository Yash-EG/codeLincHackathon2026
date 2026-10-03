import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'
import { M } from '../common/materials'
import { interiorTexture } from '../common/textures'
import { Sign } from '../kit/architecture'
import { Bench, SnakePlant, Succulent } from '../kit/furniture'
import { C, ROOM } from '../kit/palette'
import { Ball, Block, Cyl, Face } from '../kit/parts'

const FRONT = -2.25 // z of the facade's front face

/** Entrance: the clinic's storefront on a sidewalk diorama, with sign, glass doors, awning, planters, bench and lamp. */
export default function EntranceScene() {
  const { half, wall } = ROOM
  const span = half * 2 + wall
  const white = M.matte(C.white, 0.45)
  return (
    <group>
      <Block size={[span, 0.3, span]} at={[-wall / 2, -0.18, -wall / 2]} mat={M.matte(C.shell, 0.8)} r={0.02} cast={false} />
      <Block size={[half * 2, 0.03, half * 2]} at={[0, -0.015, 0]} mat={M.concrete()} r={0.004} cast={false} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[1.85, 0.06, 1.9]} at={[s * 1.82, 0.03, -0.85]} mat={M.grass()} r={0.02} cast={false} />
      ))}
      <Block size={[1.6, 0.012, 2.2]} at={[0, 0.006, -1.1]} mat={M.tile('#ece8e0')} r={0.003} cast={false} />

      {/* Facade */}
      <Block size={[span, 3.1, 0.5]} at={[-wall / 2, 1.55, FRONT - 0.25]} mat={M.plaster(C.mintBack)} r={0.02} cast={false} />
      <Block size={[span + 0.04, 0.14, 0.56]} at={[-wall / 2, 3.17, FRONT - 0.25]} mat={white} r={0.02} cast={false} />
      <Block size={[span + 0.02, 0.25, 0.54]} at={[-wall / 2, 0.125, FRONT - 0.25]} mat={M.matte('#e4ded3', 0.8)} r={0.02} cast={false} />
      <Block size={[span, 0.075, 0.52]} at={[-wall / 2, 1.04, FRONT - 0.24]} mat={M.matte(C.maroon, 0.5)} r={0.01} cast={false} />
      <Block size={[span, 0.022, 0.53]} at={[-wall / 2, 1.09, FRONT - 0.235]} mat={M.matte(C.orange, 0.5)} r={0.008} cast={false} />
      <Sign at={[0, 2.9, FRONT]} w={2.6} h={0.34} text="MOLARITY DENTAL" bg={C.white} fg={C.primary} />

      {/* Entry: warm interior behind sliding glass doors, awning above. */}
      <Face size={[1.8, 2.4]} at={[0, 1.2, FRONT + 0.005]} mat={M.picture('interior', interiorTexture(), false)} />
      {[-1, 1].map((s) => (
        <Block key={`jamb${s}`} size={[0.1, 2.5, 0.16]} at={[s * 0.95, 1.25, FRONT + 0.04]} mat={white} r={0.015} />
      ))}
      <Block size={[2.0, 0.12, 0.16]} at={[0, 2.5, FRONT + 0.04]} mat={white} r={0.015} />
      {[-1, 1].map((s) => (
        <group key={`door${s}`}>
          <Block size={[0.88, 2.35, 0.03]} at={[s * 0.45, 1.18, FRONT + 0.05]} mat={M.glass()} r={0.005} cast={false} />
          <Cyl r={0.012} h={0.45} at={[s * 0.08, 1.1, FRONT + 0.09]} mat={M.metal()} />
        </group>
      ))}
      {[-0.9, 0, 0.9].map((x) => (
        <Block key={`mullion${x}`} size={[0.04, 2.38, 0.05]} at={[x, 1.19, FRONT + 0.06]} mat={M.metal()} r={0.01} />
      ))}
      <Block size={[2.3, 0.1, 0.85]} at={[0, 2.66, FRONT + 0.42]} rot={[0.12, 0, 0]} mat={M.fabric(C.maroon)} r={0.03} />
      <Block size={[2.3, 0.05, 0.04]} at={[0, 2.6, FRONT + 0.85]} mat={M.matte(C.orange, 0.5)} r={0.015} />

      {/* Shop windows with planter boxes. */}
      {[-1, 1].map((s) => (
        <group key={`window${s}`} position={[s * 1.85, 1.85, FRONT]}>
          <Face size={[1.2, 1.2]} at={[0, 0, 0.005]} mat={M.picture('interior', interiorTexture(), false)} />
          <Block size={[1.3, 0.07, 0.12]} at={[0, 0.63, 0.04]} mat={white} r={0.01} />
          <Block size={[1.3, 0.07, 0.12]} at={[0, -0.63, 0.04]} mat={white} r={0.01} />
          <Block size={[0.07, 1.3, 0.12]} at={[-0.62, 0, 0.04]} mat={white} r={0.01} />
          <Block size={[0.07, 1.3, 0.12]} at={[0.62, 0, 0.04]} mat={white} r={0.01} />
          <Block size={[0.05, 1.2, 0.08]} at={[0, 0, 0.04]} mat={white} r={0.01} />
          <Block size={[1.2, 0.04, 0.06]} at={[0, 0.12, 0.04]} mat={white} r={0.01} />
          <Block size={[1.35, 0.4, 0.35]} at={[0, -1.65, 0.2]} mat={M.wood(C.oak)} r={0.03} />
          {[-0.4, 0, 0.4].map((x) => (
            <Ball key={x} r={0.2} at={[x, -1.38, 0.2]} scale={[1.2, 0.85, 0.9]} mat={M.leaf(x === 0 ? C.leafLight : C.leaf)} />
          ))}
        </group>
      ))}
      <SnakePlant at={[-1.18, 0, FRONT + 0.3]} scale={1.3} />
      <SnakePlant at={[1.18, 0, FRONT + 0.3]} scale={1.3} />

      {/* Street furniture */}
      <Bench at={[1.75, 0, 1.2]} rotY={-0.25} />
      <Succulent at={[1.0, 0, 1.55]} scale={1.2} />
      <group position={[-1.9, 0, 1.0]}>
        <Cyl r={0.12} h={0.06} at={[0, 0.03, 0]} mat={M.matte(C.charcoal, 0.4)} />
        <Cyl r={0.045} h={2.6} at={[0, 1.3, 0]} mat={M.matte(C.charcoal, 0.4)} />
        <Cyl r={0.14} rTop={0.1} h={0.22} at={[0, 2.68, 0]} mat={M.glow('#fdf1d8', 0.7)} />
        <Cyl r={0.16} rTop={0.02} h={0.1} at={[0, 2.84, 0]} mat={M.matte(C.charcoal, 0.4)} />
      </group>

      <AccumulativeShadows frames={24} alphaTest={0.8} opacity={0.75} scale={5.5} position={[0, 0.003, 0]} color="#3b4a42">
        <RandomizedLight amount={4} radius={3} ambient={0.55} intensity={1.1} position={[-1.5, 7, 4.5]} bias={0.001} mapSize={1024} />
      </AccumulativeShadows>
    </group>
  )
}
