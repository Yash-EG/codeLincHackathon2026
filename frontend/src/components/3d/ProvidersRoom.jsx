/**
 * ProvidersRoom.jsx — room 8 (in-network providers). Same kit and style as rooms 1–7.
 * Signature objects: the referral desk, and a cork-board "map" of nearby offices
 * pinned in maroon (in-network) and grey (out-of-network) under a FIND A DENTIST sign.
 * Preview:  <RoomPreview Room={ProvidersRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, Cyl, OnWall, RoomShell, Door, Window, Clock, CorkBoard, SignBoard, Laptop, Books,
  TaskChair, PalmPlant, SnakePlant, Pickable, Chrome, ContactShadow, view,
} from "./roomKit";

/** One stop per content section on /providers, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "intro",        ...view([-0.3, 1.0, -1.0], 7.4, 40, 24) },
  { id: "find",         ...view([-0.6, 1.55, -2.45], 3.3, 20, 6), focus: "map" },
  { id: "results",      ...view([0.9, 0.85, -0.9], 3.4, 35, 22), focus: "desk" },
  { id: "no-directory", ...view([-0.6, 1.55, -2.45], 3.3, 20, 6), focus: "map" },
  { id: "missing",      ...view([-0.3, 1.0, -1.0], 7.4, 40, 24) },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [{ id: "hallway", plaque: "8", wall: "left", u: 1.3 }];

const WAINSCOT = { h: 1.0, color: C.sage };

/** Map pins on the board: [x, y, in-network]. Board-local, metres from its centre. */
const PINS = [
  [-0.52, 0.2, true], [-0.31, -0.08, true], [-0.05, 0.27, true], [0.12, -0.2, true],
  [0.34, 0.12, true], [0.5, -0.05, true], [-0.4, -0.3, false], [0.58, 0.3, false],
];

/** The board as a street map: cork, a few paper "streets", and pins for each office. */
function OfficeMap() {
  const paper = <Mat map={tex.paper()} r={0.85} />;
  return (
    <group>
      <CorkBoard w={1.6} h={1.0} />
      <Box s={[1.4, 0.03, 0.004]} p={[0, 0.05, 0.016]}>{paper}</Box>
      <Box s={[1.4, 0.03, 0.004]} p={[0, -0.22, 0.016]} rot={[0, 0, 0.08]}>{paper}</Box>
      <Box s={[0.03, 0.82, 0.004]} p={[-0.18, 0, 0.016]}>{paper}</Box>
      <Box s={[0.03, 0.82, 0.004]} p={[0.28, 0, 0.016]} rot={[0, 0, -0.12]}>{paper}</Box>
      {PINS.map(([x, y, inNetwork]) => (
        <group key={`${x}${y}`} position={[x, y, 0.02]}>
          <Cyl a={[0.003, 0.003, 0.03, 6]} p={[0, 0, 0.015]} rot={[Math.PI / 2, 0, 0]}>
            <Chrome r={0.3} />
          </Cyl>
          <mesh position={[0, 0, 0.034]} castShadow>
            <sphereGeometry args={[0.018, 16, 12]} />
            <Mat c={inNetwork ? C.maroon : "#9aa1a6"} r={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The referral desk: oak top on white pedestals, a laptop, brochures and a phone. Front faces +z. */
function ReferralDesk() {
  const oak = tex.wood("oak");
  const white = <Mat c={C.white} r={0.45} />;
  return (
    <group>
      <ContactShadow w={1.8} d={1.0} o={0.5} />
      <Box s={[1.6, 0.04, 0.72]} p={[0, 0.74, 0]} r={0.012}><Mat map={oak} r={0.5} /></Box>
      <Box s={[0.42, 0.7, 0.66]} p={[-0.58, 0.36, 0]} r={0.015}>{white}</Box>
      <Box s={[0.42, 0.7, 0.66]} p={[0.58, 0.36, 0]} r={0.015}>{white}</Box>
      <Box s={[1.5, 0.5, 0.02]} p={[0, 0.45, 0.32]}>{white}</Box>
      <group position={[-0.2, 0.76, -0.08]} rotation={[0, 0.25, 0]}>
        <Laptop map={tex.uiScreen()} />
      </group>
      {/* Brochure stack: printed directories to take away. */}
      {[0, 1, 2].map((i) => (
        <Box key={i} s={[0.21, 0.008, 0.29]} p={[0.42 + i * 0.01, 0.765 + i * 0.009, 0.12]} rot={[0, -0.15 + i * 0.08, 0]}>
          <Mat map={tex.paper()} r={0.85} />
        </Box>
      ))}
      <Books p={[0.62, 0.76, -0.2]} rot={[0, 0.4, 0]} />
      <Box s={[0.16, 0.05, 0.2]} p={[0.15, 0.785, -0.22]} r={0.01}><Mat c="#2b3036" r={0.4} /></Box>
      <TaskChair p={[0.0, 0, -0.75]} rot={[0, Math.PI, 0]} color="#7f9a8b" />
    </group>
  );
}

export default function ProvidersRoom({ highlight, openDoor, onSelect }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.mintWall} wainscot={WAINSCOT} />

      {DOORS.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} plaque={d.plaque} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}
      <OnWall wall="left" u={-1.2} y={0.95}>
        <Window w={1.4} h={1.5} />
      </OnWall>
      <OnWall wall="left" u={0.15} y={2.3}>
        <Clock r={0.19} />
      </OnWall>

      <OnWall wall="back" u={-0.6} y={2.38}>
        <SignBoard text="FIND A DENTIST" w={1.3} h={0.22} />
      </OnWall>
      <OnWall wall="back" u={-0.6} y={1.55}>
        <Pickable id="map" onSelect={onSelect} highlighted={highlight === "map"} ring={0}>
          <OfficeMap />
        </Pickable>
      </OnWall>

      <Pickable id="desk" onSelect={onSelect} highlighted={highlight === "desk"} ring={1.2} position={[0.9, 0, -0.9]} rotation={[0, -0.1, 0]}>
        <ReferralDesk />
      </Pickable>

      <group position={[2.5, 0, -2.05]}>
        <PalmPlant seed={7} height={1.2} />
      </group>
      <group position={[-2.45, 0, 1.6]}>
        <SnakePlant seed={2} />
      </group>
    </group>
  );
}
