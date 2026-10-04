import DoorCard from '../components/DoorCard'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import { ROOMS, ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.hallway
const DOORS = ROOMS.filter((r) => r.id !== 'hallway')

export default function Hallway() {
  return (
    <>
      <RoomIntro room={room} />
      <Panel id="directory" title="Building directory">
        <div className="border-t-2 border-ink">
          {DOORS.map((door) => (
            <DoorCard key={door.id} room={door} />
          ))}
        </div>
      </Panel>
    </>
  )
}
