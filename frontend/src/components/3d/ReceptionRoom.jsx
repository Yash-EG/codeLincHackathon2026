/**
 * ReceptionRoom.jsx — room 1 (Req 1: plan details). Matches reference render #1.
 * Preview:  <RoomPreview Room={ReceptionRoom} stops={STOPS} />
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  C, tex, Mat, Box, Cyl, Plane, Rod, OnWall, RoomShell, Door, Window, PalmPlant, Pickable, TaskChair,
  ContactShadow, view,
} from "./roomKit";

/** One stop per content <section> on /reception, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "welcome",      ...view([-0.8, 0.9, -0.3], 7.5, 42, 24) },
  { id: "how-it-works", ...view([1.3, 0.6, -1.9], 4.6, 20, 18),  focus: "waiting" },
  { id: "check-in",     ...view([-1.35, 0.85, 0.4], 4.2, 55, 24), focus: "desk" },
  { id: "privacy",      ...view([-1.3, 1.0, 0.3], 3.4, 70, 20),  focus: "desk" },
  { id: "doors",        ...view([-2.0, 1.2, -2.4], 4.0, 20, 12), focus: "hallway" },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [
  { id: "hallway", wall: "back", u: -2.0, look: { frame: "#9dbfaa", leaf: "#a9c9b5", glass: [0.56, 1.72] } },
];

const deg = THREE.MathUtils.degToRad;

/** Curved slab (annulus sector) extruded upward. Shape angle θ points to world (cosθ, 0, −sinθ). */
function ArcSlab({ r0, r1, a0, a1, h, y = 0, bevel = 0.015, children }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, deg(a0), deg(a1), false);
    s.absarc(0, 0, r0, deg(a1), deg(a0), true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.001, h - bevel * 2),
      bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 64,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    return g;
  }, [r0, r1, a0, a1, h, bevel]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow receiveShadow>
      {children}
    </mesh>
  );
}

function Computer() {
  const alu = <Mat c="#d7dadd" m={0.8} r={0.28} />;
  const screen = tex.uiScreen();
  return (
    <group>
      <Box s={[0.18, 0.01, 0.15]} p={[0, 0.005, 0.02]} r={0.004}>{alu}</Box>
      <Box s={[0.14, 0.24, 0.015]} p={[0, 0.13, -0.03]} rot={[-0.12, 0, 0]} r={0.005}>{alu}</Box>
      <Box s={[0.58, 0.42, 0.025]} p={[0, 0.4, 0]} r={0.01}>{alu}</Box>
      <Plane s={[0.54, 0.31]} p={[0, 0.43, 0.0135]}>
        <Mat c="#000" e="#fff" emap={screen} ei={0.95} r={0.3} />
      </Plane>
    </group>
  );
}

function DeskLamp() {
  const metal = <Mat c="#cfd3d6" m={0.85} r={0.25} />;
  return (
    <group>
      <Cyl a={[0.06, 0.07, 0.015, 24]} p={[0, 0.008, 0]}>{metal}</Cyl>
      <Rod from={[0, 0.01, 0]} to={[0, 0.36, 0]} r={0.007}>{metal}</Rod>
      <Rod from={[0, 0.36, 0]} to={[0.16, 0.38, 0]} r={0.006}>{metal}</Rod>
      <Cyl a={[0.025, 0.045, 0.07, 20]} p={[0.17, 0.35, 0]}>
        <Mat c="#cfd3d6" m={0.85} r={0.25} cc={1} ccr={0.1} />
      </Cyl>
      <mesh position={[0.17, 0.314, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 20]} />
        <Mat c="#fff8e8" e="#fff1d6" ei={1.4} />
      </mesh>
    </group>
  );
}

/** Curved reception counter: speckled white shell, maroon/orange band, inner work surface. */
function ReceptionDesk() {
  const speckle = tex.speckle();
  const shell = <Mat c="#ffffff" map={speckle} r={0.55} />;
  return (
    <group>
      <ContactShadow w={1.6} d={2.9} p={[0.7, 0, 0]} o={0.35} />
      <ArcSlab r0={0.95} r1={1.25} a0={-95} a1={95} h={1.02}>{shell}</ArcSlab>
      <ArcSlab r0={0.9} r1={1.31} a0={-96} a1={96} h={0.04} y={1.02} bevel={0.012}>
        <Mat c="#fbfbf9" r={0.3} />
      </ArcSlab>
      <ArcSlab r0={1.24} r1={1.268} a0={-93} a1={93} h={0.075} y={0.8} bevel={0.004}>
        <Mat c={C.maroon} r={0.45} />
      </ArcSlab>
      <ArcSlab r0={1.24} r1={1.266} a0={-93} a1={93} h={0.024} y={0.76} bevel={0.003}>
        <Mat c={C.orange} r={0.45} />
      </ArcSlab>
      <ArcSlab r0={0.35} r1={0.96} a0={-80} a1={80} h={0.03} y={0.72} bevel={0.006}>
        <Mat c="#f6f4ef" r={0.4} />
      </ArcSlab>
      <group position={[0.72, 0.75, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Computer />
      </group>
      <group position={[0.55, 1.06, -0.95]} rotation={[0, 0.6, 0]}>
        <DeskLamp />
      </group>
      <Box s={[0.21, 0.02, 0.29]} p={[0.55, 0.745, 0.35]} rot={[0, 0.2, 0]}>
        <Mat map={tex.paper()} r={0.9} />
      </Box>
      <TaskChair p={[-0.25, 0, 0]} rot={[0, Math.PI / 2, 0]} color="#7f9a8b" />
    </group>
  );
}

function Pillow({ p, rot, c, map, s = 0.42 }) {
  const fab = tex.fabric(4, 4);
  return (
    <Box s={[s, s, 0.13]} p={p} rot={rot} r={0.06}>
      <Mat c={map ? "#ffffff" : c} map={map} bump={fab} bs={0.9} r={0.9} />
    </Box>
  );
}

/** Three-seat sofa facing +z, origin on the floor at its centre. */
function Sofa() {
  const fab = tex.fabric(8, 8);
  const cloth = <Mat c={C.upholstery} bump={fab} bs={0.9} r={0.92} />;
  const leg = <Mat c="#2a2622" r={0.5} />;
  return (
    <group>
      <ContactShadow w={2.5} d={1.15} o={0.5} />
      {[[-0.95, 0.33], [0.95, 0.33], [-0.95, -0.33], [0.95, -0.33]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} a={[0.018, 0.012, 0.13, 10]} p={[x, 0.065, z]}>{leg}</Cyl>
      ))}
      <Box s={[2.1, 0.2, 0.9]} p={[0, 0.23, 0]} r={0.04}>{cloth}</Box>
      {[-0.47, 0.47].map((x) => (
        <Box key={x} s={[0.92, 0.16, 0.68]} p={[x, 0.41, 0.09]} r={0.06}>{cloth}</Box>
      ))}
      <Box s={[1.86, 0.52, 0.2]} p={[0, 0.58, -0.35]} r={0.07}>{cloth}</Box>
      {[-0.46, 0.46].map((x) => (
        <Box key={`b${x}`} s={[0.9, 0.42, 0.18]} p={[x, 0.64, -0.22]} rot={[-0.12, 0, 0]} r={0.08}>{cloth}</Box>
      ))}
      {[-0.98, 0.98].map((x) => (
        <Box key={`a${x}`} s={[0.15, 0.6, 0.9]} p={[x, 0.4, 0]} r={0.06}>{cloth}</Box>
      ))}
      <Pillow p={[-0.62, 0.7, -0.08]} rot={[-0.25, 0.15, 0.05]} c={C.maroon} />
      <Pillow p={[-0.22, 0.7, -0.05]} rot={[-0.25, -0.05, -0.04]} map={tex.pillow()} />
      <Pillow p={[0.72, 0.65, -0.05]} rot={[-0.3, -0.3, 0.2]} c={C.orange} s={0.34} />
    </group>
  );
}

function MagazineRack() {
  const wire = <Mat c="#2b2b2b" m={0.6} r={0.4} />;
  const pts = [[-0.17, 0], [0.17, 0]];
  return (
    <group>
      {pts.map(([x]) => (
        <group key={x}>
          <Rod from={[x, 0, -0.12]} to={[x, 0.42, -0.06]} r={0.005}>{wire}</Rod>
          <Rod from={[x, 0, 0.12]} to={[x, 0.32, 0.08]} r={0.005}>{wire}</Rod>
          <Rod from={[x, 0.02, -0.12]} to={[x, 0.02, 0.12]} r={0.005}>{wire}</Rod>
        </group>
      ))}
      <Rod from={[-0.17, 0.42, -0.06]} to={[0.17, 0.42, -0.06]} r={0.005}>{wire}</Rod>
      <Rod from={[-0.17, 0.32, 0.08]} to={[0.17, 0.32, 0.08]} r={0.005}>{wire}</Rod>
      <Rod from={[-0.17, 0.12, 0.1]} to={[0.17, 0.12, 0.1]} r={0.005}>{wire}</Rod>
      {[0, 1, 2].map((i) => (
        <Plane key={i} s={[0.21, 0.28]} p={[-0.06 + i * 0.06, 0.18, 0.05 - i * 0.07]} rot={[-0.28 + i * 0.05, 0, 0]}>
          <Mat map={tex.magazine(i)} r={0.6} side={THREE.DoubleSide} />
        </Plane>
      ))}
    </group>
  );
}

export default function ReceptionRoom({ highlight, openDoor, onSelect }) {
  return (
    <group>
      <RoomShell leftColor={C.sageWall} backColor={C.mintWall} />

      <OnWall wall="left" u={-1.2} y={0.95}>
        <Window w={1.5} h={1.55} />
      </OnWall>

      {DOORS.map((d) => (
        <OnWall key={d.id} wall={d.wall} u={d.u}>
          <Door id={d.id} {...d.look} highlighted={highlight === d.id} open={openDoor === d.id ? 1 : 0} onSelect={onSelect} />
        </OnWall>
      ))}

      <Pickable id="desk" onSelect={onSelect} highlighted={highlight === "desk"} ring={1.45} position={[-2.0, 0, 0.4]}>
        <ReceptionDesk />
      </Pickable>

      <Pickable id="waiting" onSelect={onSelect} highlighted={highlight === "waiting"} ring={1.2} position={[0.95, 0, -2.03]}>
        <Sofa />
      </Pickable>

      <group position={[2.5, 0, -2.05]}>
        <PalmPlant height={1.25} />
      </group>
      <group position={[2.05, 0, -1.2]} rotation={[0, -0.5, 0]}>
        <MagazineRack />
      </group>
    </group>
  );
}
