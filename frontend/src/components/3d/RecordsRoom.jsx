/**
 * RecordsRoom.jsx — room 7 (Bonus 1: annual max; Bonus 3: reminders). Same kit and style as rooms 1–6.
 * Signature objects: filing cabinets, cork board of reminders, desk with the coin jar (annual max left).
 * Props: jarFill (0–1) = share of the annual max still available.
 * Preview:  <RoomPreview Room={RecordsRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, OnWall, RoomShell, Door, Clock, CorkBoard, Sanitizer, GlassCabinet, CoinJar,
  PalmPlant, TaskChair, Laptop, Books, Pickable, Chrome, ContactShadow, view,
} from "./roomKit";

/** One stop per content section on /records, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "intro",      ...view([-0.3, 1.0, -1.2], 7.6, 40, 24) },
  { id: "annual-max", ...view([1.3, 0.9, -0.85], 1.8, 30, 22), focus: "jar" },
  { id: "history",    ...view([-1.85, 0.75, -2.0], 3.9, 30, 12), focus: "cabinets" },
  { id: "reminders",  ...view([1.15, 1.95, -2.45], 3.3, 18, 4),  focus: "board" },
  { id: "missing",    ...view([-0.3, 1.0, -1.2], 7.6, 40, 24) },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [
  { id: "consult", plaque: "7", wall: "left", u: 1.4 },
  { id: "billing", plaque: "6", wall: "back", u: 2.35 },
];

const WAINSCOT = { h: 1.0, color: C.sage };

/** Four-drawer steel filing cabinet, front +z. Origin = floor, centre of footprint. */
function FilingCabinet({ color = "#c9d5c4" }) {
  const body = <Mat c={color} m={0.25} r={0.5} rmap={tex.brushed()} />;
  return (
    <group>
      <ContactShadow w={0.7} d={0.85} o={0.45} />
      <Box s={[0.5, 1.32, 0.62]} p={[0, 0.66, 0]} r={0.02}>{body}</Box>
      {[0, 1, 2, 3].map((i) => (
        <group key={i}>
          <Box s={[0.44, 0.28, 0.02]} p={[0, 0.2 + i * 0.315, 0.315]} r={0.01}>{body}</Box>
          <Box s={[0.16, 0.025, 0.03]} p={[0, 0.27 + i * 0.315, 0.335]} r={0.008}><Chrome /></Box>
          <Box s={[0.09, 0.045, 0.006]} p={[0, 0.17 + i * 0.315, 0.328]}><Mat map={tex.paper()} r={0.8} /></Box>
        </group>
      ))}
    </group>
  );
}

/** Oak desk with a white drawer pedestal. Front (+z) faces the camera; the clerk sits on -z. */
function RecordsDesk({ jarFill, onSelect, highlight }) {
  const oak = tex.wood("oak");
  return (
    <group>
      <ContactShadow w={1.6} d={0.95} o={0.5} />
      <Box s={[1.4, 0.04, 0.7]} p={[0, 0.74, 0]} r={0.012}><Mat map={oak} r={0.5} /></Box>
      <Box s={[0.04, 0.72, 0.64]} p={[-0.65, 0.36, 0]}><Mat c={C.white} r={0.45} /></Box>
      <Box s={[0.42, 0.66, 0.64]} p={[0.45, 0.36, 0]} r={0.015}><Mat c={C.white} r={0.45} /></Box>
      {[0, 1, 2].map((i) => (
        <Box key={i} s={[0.14, 0.015, 0.02]} p={[0.45, 0.2 + i * 0.21, 0.33]} r={0.006}><Chrome /></Box>
      ))}
      <Pickable id="jar" onSelect={onSelect} highlighted={highlight === "jar"} ring={0} position={[0.25, 0.76, 0.1]}>
        <CoinJar fill={jarFill} />
      </Pickable>
      <group position={[-0.2, 0.76, -0.05]} rotation={[0, Math.PI, 0]}>
        <Laptop map={tex.uiScreen()} />
      </group>
      <Books p={[-0.5, 0.76, 0.15]} rot={[0, -0.2, 0]} />
      <TaskChair p={[0, 0, -0.65]} color="#7f9a8b" />
    </group>
  );
}

function BinderShelves() {
  const binders = ["#f1efe9", "#2f6fb3", "#f1efe9", "#90b39f", C.maroon, "#f1efe9", "#4f9a96"];
  return (
    <>
      {[0, 0.4, 0.78].map((y, row) =>
        binders.map((c, i) => (
          <Box key={`${row}-${i}`} s={[0.06, 0.3, 0.26]} p={[-0.3 + i * 0.09, y + 0.15, 0]} rot={[0, 0, row === 1 && i === 6 ? 0.18 : 0]} r={0.006}>
            <Mat c={c} r={0.6} />
          </Box>
        )),
      )}
    </>
  );
}

export default function RecordsRoom({ highlight, openDoor, onSelect, jarFill = 0.73 }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      {DOORS.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} plaque={d.plaque} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}
      <OnWall wall="left" u={2.3} y={1.25}>
        <Sanitizer />
      </OnWall>
      <OnWall wall="back" u={0.9} y={1.75}>
        <Pickable id="board" onSelect={onSelect} ring={0}>
          <CorkBoard w={1.1} h={0.8} />
        </Pickable>
      </OnWall>
      <OnWall wall="left" u={-1.6} y={2.3}>
        <Clock r={0.2} />
      </OnWall>

      <Pickable id="cabinets" onSelect={onSelect} highlighted={highlight === "cabinets"} ring={0.95} position={[-1.85, 0, -2.18]}>
        {[-0.55, 0, 0.55].map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <FilingCabinet color={i === 1 ? "#c7d6e2" : "#c9d5c4"} />
          </group>
        ))}
      </Pickable>

      <group position={[-2.79, 0, -0.35]} rotation={[0, Math.PI / 2, 0]}>
        <GlassCabinet>
          <BinderShelves />
        </GlassCabinet>
      </group>

      <group position={[1.1, 0, -0.95]} rotation={[0, -0.12, 0]}>
        <RecordsDesk jarFill={jarFill} onSelect={onSelect} highlight={highlight} />
      </group>

      <group position={[2.5, 0, 0.9]}>
        <PalmPlant seed={5} height={1.1} />
      </group>
    </group>
  );
}
