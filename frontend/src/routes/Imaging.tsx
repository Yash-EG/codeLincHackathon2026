import DecodeChatbot from '../components/DecodeChatbot'
import Panel from '../components/Panel'
import RoomIntro from '../components/RoomIntro'
import { ROOMS_BY_ID } from '../rooms'

const room = ROOMS_BY_ID.imaging

export default function Imaging() {
  return (
    <>
      <RoomIntro room={room} />
      <Panel id="ask" eyebrow="Ask anything" title="Decode your plan">
        <DecodeChatbot />
      </Panel>
    </>
  )
}
