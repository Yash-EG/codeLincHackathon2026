import { M } from '../common/materials'
import { calendarTexture, noteTexture } from '../common/textures'
import { Art, CorkBoard, Door, RoomShell, Sanitizer } from '../kit/architecture'
import { BookStack, Books, CantileverChair, DeskLamp, GlassDesk, Laptop, OfficeChair, SnakePlant, Succulent, TallCabinet } from '../kit/furniture'
import { C, FACE, ON_LEFT } from '../kit/palette'
import { Ball, Face } from '../kit/parts'

/** Consult office: glass desk, high-back chair, two visitor chairs, cork board with the December calendar, bookcase. */
export default function ConsultScene() {
  return (
    <RoomShell>
      <Sanitizer at={[-FACE, 1.42, 2.05]} rotY={ON_LEFT} />
      <Door at={[-FACE, 0, 0.8]} rotY={ON_LEFT} number="3" />
      <CorkBoard at={[-FACE, 1.75, -1.25]} rotY={ON_LEFT}>
        <Face size={[0.34, 0.4]} at={[-0.27, 0, 0.041]} mat={M.picture('calendar', calendarTexture())} />
        <Ball r={0.012} at={[-0.27, 0.18, 0.05]} mat={M.matte(C.maroon, 0.4)} cast={false} />
        <Face size={[0.2, 0.26]} at={[0.08, 0.1, 0.041]} rot={[0, 0, -0.04]} mat={M.picture('note-page-6', noteTexture('#fbfaf6', 6))} />
        <Face size={[0.13, 0.13]} at={[0.33, 0.17, 0.041]} rot={[0, 0, 0.07]} mat={M.picture('note-sticky', noteTexture('#f6e7a1', 3))} />
        <Face size={[0.13, 0.13]} at={[0.3, -0.16, 0.041]} rot={[0, 0, -0.05]} mat={M.picture('note-mint', noteTexture('#d3efe3', 3))} />
        <Face size={[0.19, 0.2]} at={[0.06, -0.17, 0.041]} rot={[0, 0, 0.03]} mat={M.picture('note-page-4', noteTexture('#fbfaf6', 4))} />
      </CorkBoard>
      <Door at={[-1.5, 0, -FACE]} />
      <Art at={[0.65, 1.8, -FACE]} seed={3} />

      <group position={[2.2, 0, -FACE + 0.225]}>
        <TallCabinet at={[0, 0, 0]} w={0.85} h={2.0} wood="#a87d55" />
        <Books at={[-0.395, 0.81, 0]} length={0.79} depth={0.28} seed={3} maxHeight={0.32} />
        <Books at={[-0.395, 1.21, 0]} length={0.79} depth={0.28} seed={7} maxHeight={0.3} />
        <Books at={[-0.395, 1.6, 0]} length={0.5} depth={0.22} seed={11} maxHeight={0.22} />
      </group>

      <group position={[0.45, 0, -0.85]} rotation-y={-0.3}>
        <GlassDesk at={[0, 0, 0]} />
        <Laptop at={[0.05, 0.761, -0.05]} rotY={Math.PI} />
        <DeskLamp at={[-0.62, 0.761, -0.22]} rotY={0.6} />
        <BookStack at={[0.55, 0.761, 0.15]} rotY={0.3} />
        <OfficeChair at={[0, 0, -0.7]} tall />
        <CantileverChair at={[-0.38, 0, 0.78]} rotY={Math.PI + 0.15} />
        <CantileverChair at={[0.38, 0, 0.78]} rotY={Math.PI - 0.15} />
      </group>

      <SnakePlant at={[0.5, 0, 2.0]} />
      <Succulent at={[0.17, 0, 2.06]} />
      <Succulent at={[0.3, 0, 2.32]} scale={0.85} />
    </RoomShell>
  )
}
