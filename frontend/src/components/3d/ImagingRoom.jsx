/**
 * ImagingRoom.jsx — room 3 (Req 2: plain-English coverage). Same kit and style as rooms 1, 2, 4, 5.
 * Signature objects: panoramic X-ray unit, X-ray viewing monitor, lead apron rack, control partition.
 * Preview:  <RoomPreview Room={ImagingRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, Cyl, Rod, OnWall, RoomShell, Door, WallMonitor, Sanitizer, SignBoard, Glass,
  SnakePlant, Succulent, TaskChair, Pickable, Chrome, Porcelain, Upholstery, ContactShadow, view,
} from "./roomKit";

/** One stop per content section on /imaging, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "intro",      ...view([-0.1, 1.2, -1.6], 7.0, 45, 22) },
  { id: "ask",        ...view([0.95, 1.7, -2.45], 3.4, -8, 10), focus: "monitor" },
  { id: "coverage",   ...view([-0.5, 1.2, -1.9], 5.0, 35, 10), focus: "xray" },
  { id: "limits",     ...view([0.95, 1.7, -2.45], 2.4, 15, 6), focus: "monitor" },
  { id: "fine-print", ...view([-2.95, 1.5, -0.9], 3.0, 65, 8), focus: "aprons" },
  { id: "missing",    ...view([-0.5, 1.2, -1.9], 5.0, 35, 10), focus: "xray" },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [{ id: "operatory", plaque: "3", wall: "left", u: 1.3 }];

const WAINSCOT = { h: 1.0, color: "#a9c6d8" };
const shell = <Mat c="#f6f4ef" r={0.35} />;
const accent = <Mat c="#2f6fb3" r={0.4} />;

/** Panoramic X-ray: column against the wall, carriage, rotating C-arm. Origin = floor under the column. */
function PanoramicXray() {
  return (
    <group>
      <ContactShadow w={0.95} d={1.4} p={[0, 0, 0.35]} o={0.5} />
      <Box s={[0.7, 0.04, 0.7]} p={[0, 0.02, 0.32]} r={0.015}>{shell}</Box>
      <Box s={[0.32, 2.3, 0.28]} p={[0, 1.15, 0]} r={0.06}>{shell}</Box>
      <Box s={[0.34, 0.1, 0.3]} p={[0, 2.05, 0]} r={0.04}>{accent}</Box>
      <Box s={[0.26, 0.18, 0.8]} p={[0, 1.78, 0.4]} r={0.05}>{shell}</Box>
      <Box s={[0.9, 0.09, 0.2]} p={[0, 1.68, 0.78]} r={0.04}>{shell}</Box>
      <Box s={[0.2, 0.42, 0.22]} p={[-0.42, 1.45, 0.78]} r={0.05}><Porcelain /></Box>
      <Box s={[0.24, 0.44, 0.26]} p={[0.42, 1.45, 0.78]} r={0.06}>{accent}</Box>
      <Box s={[0.3, 0.05, 0.16]} p={[0, 1.18, 0.62]} r={0.02}>{shell}</Box>
      <Cyl a={[0.018, 0.018, 0.14, 12]} p={[0, 1.27, 0.66]}><Chrome /></Cyl>
      <mesh position={[0, 1.35, 0.66]} castShadow>
        <sphereGeometry args={[0.026, 16, 12]} />
        <Mat c="#cfeee4" r={0.4} />
      </mesh>
      <Rod from={[-0.25, 1.22, 0.5]} to={[0.25, 1.22, 0.5]} r={0.016}><Chrome /></Rod>
    </group>
  );
}

/** Wall rail with three lead aprons and thyroid collars. Mount with <OnWall>. */
function ApronRack() {
  const colors = ["#2f6fb3", "#4f9a96", C.maroon];
  return (
    <group>
      <Rod from={[-0.65, 1.95, 0.05]} to={[0.65, 1.95, 0.05]} r={0.018}><Chrome /></Rod>
      {colors.map((c, i) => {
        const x = (i - 1) * 0.42;
        return (
          <group key={c}>
            <Rod from={[x, 1.95, 0.02]} to={[x, 1.92, 0.1]} r={0.008}><Chrome /></Rod>
            <Box s={[0.38, 0.78, 0.05]} p={[x, 1.5, 0.11]} rot={[0.04, 0, 0]} r={0.04}>
              <Upholstery c={c} r={0.5} />
            </Box>
            <Box s={[0.2, 0.08, 0.06]} p={[x, 1.86, 0.13]} r={0.03}>
              <Upholstery c={c} r={0.5} />
            </Box>
          </group>
        );
      })}
    </group>
  );
}

/** Lead-glass partition with the technician's desk behind it. Origin = floor, back wall at z = -0.82. */
function ControlStation() {
  const walnut = tex.wood("light");
  return (
    <group>
      <Box s={[0.12, 1.05, 1.5]} p={[0, 0.525, 0]} r={0.015}>{shell}</Box>
      <Box s={[0.16, 0.035, 1.52]} p={[0, 1.07, 0]} r={0.01}><Mat map={walnut} r={0.5} /></Box>
      <Box s={[0.04, 0.85, 1.46]} p={[0, 1.52, 0]} cast={false} r={0.008}><Glass o={0.22} /></Box>
      <group position={[0.78, 0, -0.43]}>
        <ContactShadow w={1.3} d={0.8} o={0.4} />
        <Box s={[1.1, 0.04, 0.6]} p={[0, 0.74, 0]} r={0.01}><Mat map={walnut} r={0.5} /></Box>
        <Box s={[0.04, 0.72, 0.55]} p={[-0.5, 0.36, 0]}>{shell}</Box>
        <Box s={[0.4, 0.66, 0.55]} p={[0.32, 0.36, 0]} r={0.01}>{shell}</Box>
        <group position={[-0.05, 0.76, -0.12]}>
          <Box s={[0.16, 0.012, 0.13]} p={[0, 0.006, 0]} r={0.004}><Chrome r={0.3} /></Box>
          <Box s={[0.5, 0.32, 0.02]} p={[0, 0.3, 0]} r={0.008}><Mat c="#1d232a" r={0.35} /></Box>
          <mesh position={[0, 0.3, 0.011]}>
            <planeGeometry args={[0.47, 0.28]} />
            <Mat c="#000000" e="#ffffff" emap={tex.xray()} ei={0.9} r={0.3} />
          </mesh>
        </group>
        <TaskChair p={[0, 0, 0.62]} rot={[0, Math.PI, 0]} color="#6f8796" />
      </group>
    </group>
  );
}

export default function ImagingRoom({ highlight, openDoor, onSelect }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      {DOORS.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} plaque={d.plaque} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}
      <OnWall wall="left" u={2.2} y={1.25}>
        <Sanitizer />
      </OnWall>
      <OnWall wall="left" u={-0.9}>
        <Pickable id="aprons" onSelect={onSelect} ring={0}>
          <ApronRack />
        </Pickable>
      </OnWall>
      <OnWall wall="back" u={-1.75} y={2.35}>
        <SignBoard text="X-RAY" w={0.62} h={0.2} fg={C.maroon} />
      </OnWall>
      <OnWall wall="back" u={0.95} y={1.7}>
        <Pickable id="monitor" onSelect={onSelect} ring={0}>
          <WallMonitor w={0.95} h={0.56} map={tex.xray()} />
        </Pickable>
      </OnWall>

      <Pickable id="xray" onSelect={onSelect} highlighted={highlight === "xray"} ring={0.9} ringAt={[0, 0.5]} position={[-0.5, 0, -2.36]}>
        <PanoramicXray />
      </Pickable>

      <group position={[1.6, 0, -1.68]}>
        <ControlStation />
      </group>

      <group position={[2.45, 0, 1.6]}>
        <SnakePlant seed={14} />
      </group>
      <group position={[2.1, 0, 1.85]}>
        <Succulent seed={12} />
      </group>
    </group>
  );
}
