import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import TreatmentMap from '../components/panels/TreatmentMap'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.operatory

export default function Operatory() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="plan">
        <TreatmentMap />
      </RoomGate>
    </>
  )
}
