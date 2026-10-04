/**
 * OperatoryRoom.jsx — room 4 (Req 1: procedure / tooth map; jar = Bonus 1). Matches reference render #4.
 * Props: jarFill (0–1) = share of the annual max still available.
 * Preview:  <RoomPreview Room={OperatoryRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, Cyl, Rod, OnWall, RoomShell, Door, WallArt, WallMonitor, Clipboard, Sanitizer,
  GlassCabinet, CoinJar, JawModel, Molar, SnakePlant, Succulent, StarBase, Pickable,
  Chrome, Porcelain, Upholstery, ContactShadow, view,
} from "./roomKit";

/** One stop per content <section> on /operatory, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "intro",     ...view([-0.4, 1.0, -0.8], 6.5, 42, 22) },
  { id: "explore",   ...view([-0.3, 0.9, -0.4], 5.0, 34, 20),  focus: "chair" },
  { id: "describe",  ...view([-0.3, 0.85, -0.3], 3.6, 50, 24), focus: "chair" },
  { id: "tooth-map", ...view([-2.95, 1.8, -1.0], 2.6, 80, 8),  focus: "monitor" },
  { id: "planned",   ...view([0.9, 1.0, -2.0], 3.4, 20, 18) },
  { id: "missing",   ...view([-0.3, 0.85, -0.3], 3.6, 50, 24), focus: "chair" },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [
  { id: "hallway", plaque: "4", wall: "left", u: 0.9 },
  { id: "imaging", plaque: "3", wall: "back", u: -2.0 },
];

const WAINSCOT = { h: 1.0, color: C.sage };
const shell = <Mat c="#f6f4ef" r={0.35} />;
const porcelain = <Porcelain c="#f6f4ef" r={0.32} />;
const chrome = <Chrome r={0.2} />;
const upholstery = <Upholstery c="#efe6d6" r={0.45} />;

/** Dental chair, headrest toward −z, feet toward +z. */
function DentalChair() {
  return (
    <group>
      <ContactShadow w={0.95} d={1.65} p={[0, 0, 0.25]} o={0.55} />
      <Box s={[0.5, 0.04, 1.0]} p={[0, 0.02, 0.2]} r={0.02}>{porcelain}</Box>
      <Box s={[0.34, 0.42, 0.42]} p={[0, 0.25, 0.05]} r={0.09}>{porcelain}</Box>
      <Box s={[0.6, 0.08, 0.6]} p={[0, 0.46, 0.08]} r={0.03}>{porcelain}</Box>

      <Box s={[0.56, 0.12, 0.56]} p={[0, 0.55, 0.1]} r={0.055}>{upholstery}</Box>
      <Box s={[0.5, 0.1, 0.78]} p={[0, 0.5, 0.74]} rot={[0.2, 0, 0]} r={0.05}>{upholstery}</Box>
      <Box s={[0.44, 0.16, 0.08]} p={[0, 0.38, 1.12]} r={0.03}>{porcelain}</Box>
      <Box s={[0.54, 0.11, 0.74]} p={[0, 0.74, -0.48]} rot={[-0.5, 0, 0]} r={0.05}>{upholstery}</Box>
      <Box s={[0.28, 0.08, 0.24]} p={[0, 1.0, -0.94]} rot={[-0.3, 0, 0]} r={0.04}>{upholstery}</Box>
      <Box s={[0.08, 0.06, 0.42]} p={[0.34, 0.7, 0.12]} r={0.025}>{porcelain}</Box>
      <Rod from={[0.34, 0.5, 0.12]} to={[0.34, 0.68, 0.12]} r={0.02}>{porcelain}</Rod>

      {/* assistant side: cuspidor post + bowl, light pole */}
      <Cyl a={[0.05, 0.06, 0.9, 20]} p={[-0.48, 0.45, -0.12]}>{porcelain}</Cyl>
      <Box s={[0.2, 0.14, 0.24]} p={[-0.48, 0.92, -0.12]} r={0.05}>{porcelain}</Box>
      <Cyl a={[0.09, 0.05, 0.08, 24]} p={[-0.36, 0.98, -0.06]}>
        <Porcelain c="#e9f1f0" r={0.15} />
      </Cyl>
      <Rod from={[-0.48, 0.98, -0.2]} to={[-0.48, 2.1, -0.2]} r={0.025}>{porcelain}</Rod>
      <Rod from={[-0.48, 2.1, -0.2]} to={[-0.1, 2.12, -0.5]} r={0.022}>{porcelain}</Rod>
      <Rod from={[-0.1, 2.12, -0.5]} to={[0, 1.92, -0.6]} r={0.02}>{porcelain}</Rod>
      <group position={[0, 1.88, -0.6]} rotation={[0.55, 0, 0]}>
        <Box s={[0.3, 0.07, 0.16]} r={0.035}>{porcelain}</Box>
        <mesh position={[0, -0.037, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 0.1]} />
          <Mat c="#fffaf0" e="#fff4dc" ei={2} />
        </mesh>
      </group>

      {/* doctor side: delivery arm + tray with handpieces */}
      <Rod from={[0.25, 0.47, 0.2]} to={[0.62, 0.86, 0.1]} r={0.02}>{porcelain}</Rod>
      <Box s={[0.42, 0.05, 0.3]} p={[0.72, 0.88, 0.08]} r={0.02}>{porcelain}</Box>
      {[0, 1, 2, 3].map((i) => (
        <Rod key={i} from={[0.58 + i * 0.09, 0.9, -0.04]} to={[0.6 + i * 0.09, 1.08, -0.12]} r={0.009}>{chrome}</Rod>
      ))}
      <Box s={[0.24, 0.012, 0.14]} p={[0.72, 0.912, 0.14]}>
        <Mat c="#cfeee4" r={0.4} />
      </Box>
    </group>
  );
}

function OperatorStool() {
  return (
    <group>
      <StarBase r={0.25} />
      <Cyl a={[0.022, 0.026, 0.36, 16]} p={[0, 0.27, 0]}>{chrome}</Cyl>
      <Cyl a={[0.21, 0.2, 0.08, 32]} p={[0, 0.5, 0]}>{upholstery}</Cyl>
      <Rod from={[0, 0.5, -0.17]} to={[0, 0.72, -0.2]} r={0.014}>{chrome}</Rod>
      <Box s={[0.3, 0.16, 0.06]} p={[0, 0.8, -0.2]} r={0.03}>{upholstery}</Box>
    </group>
  );
}

/** Base cabinets with drawers + quartz top. Origin = floor, centre of front edge at z = depth/2. */
function BaseCabinets({ w = 2.0, d = 0.58, h = 0.88 }) {
  const cols = 4, cw = w / cols;
  return (
    <group>
      <ContactShadow w={w + 0.3} d={d + 0.3} o={0.4} />
      <Box s={[w, 0.1, d - 0.06]} p={[0, 0.05, -0.03]}>
        <Mat c="#dcd8d0" r={0.7} />
      </Box>
      <Box s={[w, h - 0.14, d - 0.03]} p={[0, 0.1 + (h - 0.14) / 2, -0.015]}>{shell}</Box>
      {Array.from({ length: cols }, (_, c) => {
        const x = -w / 2 + cw * (c + 0.5);
        const rows = c === 0 ? 4 : 1;
        const rh = (h - 0.16) / rows;
        return Array.from({ length: rows }, (_, r) => (
          <group key={`${c}-${r}`}>
            <Box s={[cw - 0.012, rh - 0.012, 0.02]} p={[x, 0.11 + rh * (r + 0.5), d / 2 + 0.002]} r={0.004}>{shell}</Box>
            <Box s={[rows > 1 ? 0.12 : 0.012, rows > 1 ? 0.012 : 0.14, 0.015]} p={[rows > 1 ? x : x + cw / 2 - 0.05, rows > 1 ? 0.11 + rh * (r + 0.5) + rh / 2 - 0.04 : 0.11 + rh * 0.75, d / 2 + 0.02]} r={0.005}>
              {chrome}
            </Box>
          </group>
        ));
      })}
      <Box s={[w + 0.04, 0.04, d + 0.02]} p={[0, h - 0.02, 0]} r={0.008}>
        <Mat c="#ffffff" map={tex.speckle()} r={0.25} />
      </Box>
      <Box s={[0.3, 0.02, 0.2]} p={[-0.45, h + 0.01, 0.02]} r={0.006}>
        <Mat c="#cfeee4" r={0.4} />
      </Box>
      <Rod from={[0.35, h + 0.01, 0.0]} to={[0.62, h + 0.01, 0.08]} r={0.005}>
        <Mat c="#2b2f33" r={0.45} />
      </Rod>
    </group>
  );
}

function FloatingShelf({ w = 1.4 }) {
  return (
    <Box s={[w, 0.04, 0.22]} p={[0, 0, 0.11]} r={0.008}>
      <Mat c={C.white} r={0.45} />
    </Box>
  );
}

function CabinetContents() {
  return (
    <>
      <Box s={[0.5, 0.08, 0.24]} p={[0, 0.04, 0]} r={0.01}>
        <Mat c="#f2f2ee" r={0.5} />
      </Box>
      <group position={[-0.18, 0.4, 0]}>
        <JawModel s={1.6} />
      </group>
      <group position={[0.15, 0.4, 0]}>
        <JawModel s={1.6} />
      </group>
      <group position={[-0.15, 0.78, 0]}>
        <Molar s={1.4} />
      </group>
      <Box s={[0.26, 0.1, 0.2]} p={[0.15, 0.83, 0]} r={0.01}>
        <Mat c="#dfe9e6" r={0.6} />
      </Box>
    </>
  );
}

export default function OperatoryRoom({ highlight, openDoor, onSelect, jarFill = 0.73 }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      {DOORS.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} plaque={d.plaque} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}

      <OnWall wall="left" u={2.0} y={1.25}>
        <Sanitizer />
      </OnWall>
      <OnWall wall="left" u={-0.15} y={1.45}>
        <Clipboard />
      </OnWall>
      <OnWall wall="left" u={-0.95} y={0.72}>
        <Clipboard />
      </OnWall>
      <OnWall wall="left" u={-1.35} y={1.42}>
        <FloatingShelf w={1.5} />
      </OnWall>
      <OnWall wall="left" u={-1.0} y={1.82}>
        <Pickable id="monitor" onSelect={onSelect} ring={0}>
          <WallMonitor w={0.95} h={0.56} map={tex.toothScreen()} />
        </Pickable>
      </OnWall>
      <OnWall wall="left" u={-1.85} y={1.44}>
        <group position={[0, 0, 0.11]}>
          <Pickable id="jar" onSelect={onSelect} ring={0}>
            <CoinJar fill={jarFill} />
          </Pickable>
        </group>
      </OnWall>
      <OnWall wall="back" u={0.55} y={1.95}>
        <WallArt w={0.58} h={0.8} />
      </OnWall>

      <group position={[0.95, 0, -2.21]}>
        <BaseCabinets />
      </group>
      <group position={[2.5, 0, -2.28]}>
        <GlassCabinet>
          <CabinetContents />
        </GlassCabinet>
      </group>

      <Pickable id="chair" onSelect={onSelect} highlighted={highlight === "chair"} ring={1.15} ringAt={[0, 0.15]} position={[-0.3, 0, -0.35]} rotation={[0, 0.75, 0]}>
        <DentalChair />
      </Pickable>
      <group position={[-1.15, 0, 0.55]} rotation={[0, 2.3, 0]}>
        <OperatorStool />
      </group>

      <group position={[-2.25, 0, 1.3]}>
        <SnakePlant seed={11} />
      </group>
      <group position={[-1.85, 0, 1.6]}>
        <Succulent seed={3} />
      </group>
      <group position={[-2.4, 0, 1.75]}>
        <Succulent seed={7} />
      </group>
    </group>
  );
}
