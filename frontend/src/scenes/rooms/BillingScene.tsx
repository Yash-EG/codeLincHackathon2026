import { M } from '../common/materials'
import { Art, Clock, Door, RoomShell, Sanitizer, Sign } from '../kit/architecture'
import { CantileverChair, DesktopComputer, OfficeChair, SnakePlant, Succulent } from '../kit/furniture'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Block, type V3 } from '../kit/parts'

/** Billing: two-level checkout counter with card terminal and receipt printer; in- and out-of-network doors. */
export default function BillingScene() {
  return (
    <RoomShell>
      <Door at={[-1.7, 0, -FACE]} number="4" />
      <Sign at={[-1.7, 2.45, -FACE]} w={0.95} h={0.24} text="In-network" bg={C.primary} fg="#ffffff" />
      <Door at={[1.75, 0, -FACE]} />
      <Sign at={[1.75, 2.45, -FACE]} w={1.05} h={0.24} text="Out-of-network" bg={C.maroon} fg="#ffffff" />
      <Clock at={[0.0, 2.3, -FACE]} />

      <CheckoutCounter at={[0, 0, -1.0]} />
      <OfficeChair at={[0.1, 0, -2.0]} />

      {[0.4, 1.1, 1.8].map((z) => (
        <CantileverChair key={z} at={[-2.35, 0, z]} rotY={ON_LEFT} />
      ))}
      <Art at={[-FACE, 1.85, 1.1]} rotY={ON_LEFT} w={0.75} h={0.55} seed={5} />
      <Sanitizer at={[-FACE, 1.42, -0.6]} rotY={ON_LEFT} />
      <SnakePlant at={[-2.3, 0, -1.6]} />
    </RoomShell>
  )
}

/** Customer ledge at counter height in front, staff desk behind. Customer side faces +z. */
function CheckoutCounter({ at }: { at: V3 }) {
  const white = M.matte(C.white, 0.35)
  const charcoal = M.matte(C.charcoal, 0.4)
  return (
    <group position={at}>
      <Block size={[2.0, 1.0, 0.3]} at={[0, 0.5, 0.15]} mat={M.quartz()} r={0.02} />
      <Block size={[2.02, 0.075, 0.02]} at={[0, 0.84, 0.305]} mat={M.matte(C.maroon, 0.5)} r={0.006} />
      <Block size={[2.02, 0.022, 0.024]} at={[0, 0.89, 0.307]} mat={M.matte(C.orange, 0.5)} r={0.006} />
      <Block size={[2.1, 0.04, 0.38]} at={[0, 1.02, 0.15]} mat={M.quartz()} r={0.012} />
      <Block size={[2.0, 0.72, 0.55]} at={[0, 0.36, -0.27]} mat={white} r={0.015} />
      <Block size={[2.05, 0.04, 0.6]} at={[0, 0.74, -0.27]} mat={M.quartz()} r={0.012} />

      {/* Card terminal and receipt printer on the ledge. */}
      <Block size={[0.1, 0.025, 0.16]} at={[0.45, 1.053, 0.18]} mat={charcoal} r={0.008} />
      <Block size={[0.09, 0.03, 0.15]} at={[0.45, 1.08, 0.17]} rot={[-0.35, 0, 0]} mat={charcoal} r={0.01} />
      <Block size={[0.065, 0.004, 0.05]} at={[0.45, 1.1, 0.13]} rot={[-0.35, 0, 0]} mat={M.glow('#bfe3d6', 0.9)} r={0.001} cast={false} />
      <Block size={[0.16, 0.1, 0.18]} at={[0.78, 1.09, 0.12]} mat={charcoal} r={0.02} />
      <Block size={[0.06, 0.12, 0.004]} at={[0.78, 1.18, 0.19]} rot={[-0.3, 0, 0]} mat={M.matte('#fbfaf6', 0.7)} r={0.001} />
      <Succulent at={[-0.75, 1.04, 0.15]} scale={0.8} />

      <DesktopComputer at={[-0.35, 0.76, -0.4]} rotY={Math.PI} />
      <Block size={[0.3, 0.012, 0.22]} at={[0.35, 0.766, -0.3]} rot={[0, 0.2, 0]} mat={M.matte('#fbfaf6', 0.7)} r={0.003} />
    </group>
  )
}
