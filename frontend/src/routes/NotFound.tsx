import { Link } from 'react-router'
import RoomIntro from '../components/RoomIntro'
import { buttonPrimary } from '../components/ui'

export default function NotFound() {
  return (
    <RoomIntro
      room={{ name: 'Room not found', description: 'There’s no room at this address. The directory lists every room in the office.' }}
    >
      <Link to="/hallway" className={buttonPrimary}>
        Go to the hallway
      </Link>
    </RoomIntro>
  )
}
