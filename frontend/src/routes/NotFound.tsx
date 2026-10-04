import { Link } from 'react-router'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary } from '../components/ui'

export default function NotFound() {
  return (
    <RoomIntro
      room={{ name: 'Room not found', description: 'There’s no room at this address.' }}
    >
      <Link to="/reception" className={buttonPrimary}>
        Back to Reception
      </Link>
    </RoomIntro>
  )
}
