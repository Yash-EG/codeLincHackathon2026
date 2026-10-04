/**
 * ConsultRoom.jsx — room 5 (Req 3: sequencing; cork board = Bonus 3 reminders). Matches reference render #3.
 * Preview:  <RoomPreview Room={ConsultRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, Cyl, Rod, OnWall, RoomShell, Door, WallArt, CorkBoard, Sanitizer, GlassCabinet,
  SnakePlant, Succulent, StarBase, Laptop, Books, Molar, JawModel, Glass, Pickable,
  Chrome, Upholstery, ContactShadow,
} from "./roomKit";

export const STOPS = [
  { id: "overview",  camera: [8.6, 6.8, 9.6], target: [-0.2, 0.9, -0.3] },
  { id: "timeline",  camera: [3.2, 2.6, 2.9], target: [0.5, 0.8, -0.8],  focus: "desk" },
  { id: "reminders", camera: [0.6, 2.0, 0.6], target: [-3, 1.75, -1.1], focus: "board" },
  { id: "doors",     camera: [2.6, 2.3, 2.6], target: [-2.2, 1.2, -1.2], focus: "hallway" },
];

const WAINSCOT = { h: 1.0, color: C.sage };
const leather = <Upholstery c="#f2ede4" r={0.42} />;
const chrome = <Chrome r={0.2} />;

function ExecChair() {
  return (
    <group>
      <StarBase r={0.3} />
      <Cyl a={[0.025, 0.03, 0.34, 16]} p={[0, 0.26, 0]}>{chrome}</Cyl>
      <Box s={[0.56, 0.13, 0.52]} p={[0, 0.5, 0]} r={0.05}>{leather}</Box>
      <Box s={[0.54, 0.78, 0.13]} p={[0, 1.0, -0.25]} rot={[-0.1, 0, 0]} r={0.06}>{leather}</Box>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Rod from={[s * 0.26, 0.52, 0.05]} to={[s * 0.27, 0.7, 0.05]} r={0.012}>{chrome}</Rod>
          <Box s={[0.07, 0.04, 0.32]} p={[s * 0.27, 0.71, 0.02]} r={0.015}>{leather}</Box>
        </group>
      ))}
    </group>
  );
}

function GuestChair() {
  return (
    <group>
      {[-0.24, 0.24].map((x) => (
        <group key={x}>
          <Rod from={[x, 0.015, -0.22]} to={[x, 0.015, 0.28]} r={0.012}>{chrome}</Rod>
          <Rod from={[x, 0.015, 0.28]} to={[x, 0.44, 0.22]} r={0.012}>{chrome}</Rod>
          <Rod from={[x, 0.44, 0.22]} to={[x, 0.44, -0.18]} r={0.012}>{chrome}</Rod>
          <Rod from={[x, 0.44, -0.18]} to={[x, 0.66, -0.2]} r={0.012}>{chrome}</Rod>
          <Rod from={[x, 0.66, -0.2]} to={[x, 0.66, 0.14]} r={0.012}>{chrome}</Rod>
        </group>
      ))}
      <Box s={[0.48, 0.08, 0.46]} p={[0, 0.49, 0.02]} r={0.035}>{leather}</Box>
      <Box s={[0.48, 0.5, 0.08]} p={[0, 0.84, -0.22]} rot={[-0.12, 0, 0]} r={0.035}>{leather}</Box>
    </group>
  );
}

function Stethoscope() {
  const tube = <Mat c="#2b2f33" r={0.45} />;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} castShadow>
        <torusGeometry args={[0.07, 0.006, 8, 32, Math.PI * 1.6]} />
        {tube}
      </mesh>
      <Cyl a={[0.022, 0.022, 0.012, 20]} p={[0.08, 0.008, 0.04]}>{chrome}</Cyl>
    </group>
  );
}

function DeskLamp() {
  return (
    <group>
      <Cyl a={[0.06, 0.06, 0.012, 24]} p={[0, 0.006, 0]}>{chrome}</Cyl>
      <Rod from={[0, 0.01, 0]} to={[0, 0.34, 0]} r={0.006}>{chrome}</Rod>
      <Rod from={[0, 0.34, 0]} to={[0.18, 0.36, 0]} r={0.005}>{chrome}</Rod>
      <Box s={[0.12, 0.02, 0.05]} p={[0.2, 0.35, 0]} r={0.008}>{chrome}</Box>
    </group>
  );
}

/** Glass-top desk, walnut leg + pedestal. Doctor sits on −z, guests on +z. */
function Desk() {
  const walnut = tex.wood("walnut");
  const wood = <Mat map={walnut} r={0.5} />;
  return (
    <group>
      <ContactShadow w={0.75} d={1.05} p={[-0.64, 0, 0]} o={0.55} />
      <ContactShadow w={0.3} d={1.05} p={[0.86, 0, 0]} o={0.5} />
      <Box s={[0.05, 0.73, 0.82]} p={[0.86, 0.365, 0]}>{wood}</Box>
      <Box s={[0.46, 0.73, 0.78]} p={[-0.64, 0.365, 0]} r={0.01}>{wood}</Box>
      <Box s={[1.3, 0.45, 0.025]} p={[0.15, 0.48, 0.3]}>{wood}</Box>
      <Box s={[1.84, 0.022, 0.9]} p={[0, 0.745, 0]} cast={false} r={0.008}>
        <Glass c="#cfe6df" o={0.42} />
      </Box>
      <group position={[0.1, 0.757, -0.08]} rotation={[0, Math.PI, 0]}>
        <Laptop map={tex.uiScreen()} />
      </group>
      <group position={[-0.6, 0.757, -0.25]} rotation={[0, -0.5, 0]}>
        <DeskLamp />
      </group>
      <Books p={[0.62, 0.757, 0.12]} rot={[0, 0.25, 0]} />
      <group position={[0.62, 0.84, 0.12]}>
        <Molar s={0.9} />
      </group>
      <group position={[-0.25, 0.757, 0.2]}>
        <Stethoscope />
      </group>
      <Box s={[0.21, 0.004, 0.29]} p={[-0.32, 0.759, -0.12]} rot={[0, 0.3, 0]}>
        <Mat map={tex.paper()} r={0.9} />
      </Box>
    </group>
  );
}

function CabinetContents() {
  const binders = ["#f1efe9", "#4f9a96", "#f1efe9", "#2f6fb3", "#f1efe9"];
  return (
    <>
      {binders.map((c, i) => (
        <Box key={i} s={[0.06, 0.3, 0.26]} p={[-0.25 + i * 0.065, 0.15 + 0.02, 0]} r={0.006}>
          <Mat c={c} r={0.6} />
        </Box>
      ))}
      <group position={[0.18, 0.02, 0]}>
        <Molar s={1.3} />
      </group>
      <group position={[-0.12, 0.42, 0]}>
        <JawModel s={1.4} />
      </group>
      <Box s={[0.26, 0.05, 0.2]} p={[0.17, 0.445, 0]} r={0.01}>
        <Mat c="#e9e4da" r={0.6} />
      </Box>
      <Box s={[0.3, 0.06, 0.22]} p={[0, 0.83, 0]} r={0.01}>
        <Mat c="#dfe9e6" r={0.6} />
      </Box>
    </>
  );
}

export default function ConsultRoom({ highlight, openDoor, onSelect }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      <OnWall wall="left" u={0.75}>
        <Door id="hallway" plaque="5" highlighted={highlight === "hallway"} open={openDoor === "hallway" ? 1 : 0} onSelect={onSelect} />
      </OnWall>
      <OnWall wall="back" u={-1.75}>
        <Door id="records" plaque="7" highlighted={highlight === "records"} open={openDoor === "records" ? 1 : 0} onSelect={onSelect} />
      </OnWall>

      <OnWall wall="left" u={1.95} y={1.25}>
        <Sanitizer />
      </OnWall>
      <OnWall wall="left" u={-1.1} y={1.75}>
        <Pickable id="board" onSelect={onSelect} ring={0}>
          <CorkBoard w={1.1} h={0.8} />
        </Pickable>
      </OnWall>
      <OnWall wall="back" u={0.4} y={1.9}>
        <WallArt w={0.6} h={0.82} />
      </OnWall>

      <group position={[2.48, 0, -2.28]}>
        <GlassCabinet lower="wood">
          <CabinetContents />
        </GlassCabinet>
      </group>

      <Pickable id="desk" onSelect={onSelect} highlighted={highlight === "desk"} ring={1.35} position={[0.55, 0, -0.75]}>
        <Desk />
        <group position={[0.1, 0, -0.85]}>
          <ExecChair />
        </group>
        <group position={[-0.4, 0, 0.85]} rotation={[0, Math.PI + 0.18, 0]}>
          <GuestChair />
        </group>
        <group position={[0.45, 0, 0.95]} rotation={[0, Math.PI - 0.15, 0]}>
          <GuestChair />
        </group>
      </Pickable>

      <group position={[-1.15, 0, 1.75]}>
        <SnakePlant seed={8} />
      </group>
      <group position={[-1.55, 0, 1.55]}>
        <Succulent seed={2} />
      </group>
      <group position={[-1.5, 0, 2.0]}>
        <Succulent seed={9} />
      </group>
    </group>
  );
}
