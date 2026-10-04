/**
 * HallwayRoom.jsx — room 2 (hub). Matches reference render #2.
 * Doors are data: add/remove entries in DOORS to change which rooms the hallway links to.
 * Preview:  <RoomPreview Room={HallwayRoom} stops={STOPS} />
 */
import { C, OnWall, RoomShell, Door, Clock, WallArt, Sanitizer, SnakePlant, Succulent } from "./roomKit";

/** wall + u (position along that wall). Plaque numbers follow the room numbers in the plan. */
export const DOORS = [
  { id: "reception", plaque: "1", wall: "left", u: 0.6 },
  { id: "operatory", plaque: "4", wall: "back", u: -1.3 },
  { id: "consult",   plaque: "5", wall: "back", u: 1.9 },
];

export const STOPS = [
  { id: "overview",  camera: [8.6, 6.8, 9.6],  target: [-0.2, 0.9, -0.3] },
  { id: "reception", camera: [0.8, 1.9, 1.2],  target: [-3, 1.2, 0.6],  focus: "reception" },
  { id: "operatory", camera: [-0.4, 1.9, 2.6], target: [-1.3, 1.2, -2.5], focus: "operatory" },
  { id: "consult",   camera: [2.4, 1.9, 2.6],  target: [1.9, 1.2, -2.5],  focus: "consult" },
];

const WAINSCOT = { h: 1.0, color: C.sage };

export default function HallwayRoom({ highlight, openDoor, onSelect, doors = DOORS }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      {doors.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} plaque={d.plaque} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}

      <OnWall wall="left" u={1.9} y={1.25}>
        <Sanitizer />
      </OnWall>
      <OnWall wall="left" u={-1.2} y={2.35}>
        <Clock r={0.21} />
      </OnWall>
      <OnWall wall="back" u={0.3} y={1.9}>
        <WallArt w={0.6} h={0.82} />
      </OnWall>

      <group position={[0.95, 0, 1.55]}>
        <SnakePlant seed={4} />
      </group>
      <group position={[0.55, 0, 1.4]}>
        <Succulent seed={6} />
      </group>
    </group>
  );
}
