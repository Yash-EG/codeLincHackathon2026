import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import CostBreakdown from '../components/panels/CostBreakdown'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.billing

export default function Billing() {
  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="procedure">
        <CostBreakdown />
      </RoomGate>
    </>
  )
}
