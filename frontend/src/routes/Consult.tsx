import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import Timeline from '../components/panels/Timeline'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.consult

export default function Consult() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="procedure">
        <Timeline />
      </RoomGate>
    </>
  )
}
