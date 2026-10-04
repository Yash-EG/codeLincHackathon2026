/**
 * ProvidersRoom.jsx — room 8 (in-network providers). Same kit and style as rooms 1–7.
 * Signature objects: the referral desk, and a cork board under a FIND A DENTIST sign with a
 * street map of the demo offices pinned in maroon (in-network) and grey (out-of-network),
 * a numbered directory card and a sticky note (drawn in providersBoard.js).
 * Preview:  <RoomPreview Room={ProvidersRoom} stops={STOPS} />
 */
import * as THREE from "three";
import {
  C, tex, Mat, Box, Cyl, Plane, OnWall, RoomShell, Door, Window, Clock, CorkBoard, SignBoard, Laptop, Books,
  TaskChair, PalmPlant, SnakePlant, Pickable, Chrome, ContactShadow, view,
} from "./roomKit";
import { BOARD_OFFICES, MAP_ASPECT, drawDirectory, drawMap, drawSticky, projectOnSheet } from "./providersBoard";

/** One stop per content section on /providers, framed tight on its focal object (fov 24). */
export const STOPS = [
  { id: "intro",        ...view([-0.3, 1.0, -1.0], 7.4, 40, 24) },
  { id: "find",         ...view([-0.6, 1.55, -2.45], 3.3, 20, 6), focus: "map" },
  { id: "map",          ...view([-0.6, 1.55, -2.45], 2.5, 8, 3), focus: "map" },
  { id: "results",      ...view([0.9, 0.85, -0.9], 3.4, 35, 22), focus: "desk" },
  { id: "no-directory", ...view([-0.6, 1.55, -2.45], 3.3, 20, 6), focus: "map" },
  { id: "missing",      ...view([-0.3, 1.0, -1.0], 7.4, 40, 24) },
];

/** Doors out of this room (id = the room it leads to). Also used for the camera fly-through. */
export const DOORS = [{ id: "hallway", plaque: "8", wall: "left", u: 1.3 }];

const WAINSCOT = { h: 1.0, color: C.sage };

/** Canvas textures for the board's paper, made once. */
const paperTextures = new Map();
function paperTexture(key, w, h, draw) {
  if (!paperTextures.has(key)) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    paperTextures.set(key, t);
  }
  return paperTextures.get(key);
}

/** A map pin: steel needle and a round head, maroon for in-network, grey for out-of-network. */
function MapPin({ p, inNetwork }) {
  return (
    <group position={p}>
      <Cyl a={[0.003, 0.003, 0.03, 6]} p={[0, 0, 0.015]} rot={[Math.PI / 2, 0, 0]}>
        <Chrome r={0.3} />
      </Cyl>
      <mesh position={[0, 0, 0.034]} castShadow>
        <sphereGeometry args={[0.016, 16, 12]} />
        <Mat c={inNetwork ? C.maroon : "#9aa1a6"} r={0.35} />
      </mesh>
    </group>
  );
}

/** A flat brass thumbtack holding a sheet up. */
function Tack({ p }) {
  return (
    <Cyl a={[0.011, 0.011, 0.005, 16]} p={p} rot={[Math.PI / 2, 0, 0]}>
      <Mat c="#c9a227" m={0.7} r={0.35} />
    </Cyl>
  );
}

const MAP_W = 0.98, MAP_H = MAP_W / MAP_ASPECT;
const CARD_W = 0.4, CARD_H = CARD_W / 0.75;
const NOTE_W = 0.28, NOTE_H = NOTE_W / 1.4;

/**
 * The board: a paper street map of Greensboro with every demo office pinned and numbered,
 * an index card listing them, and a sticky note, all on cork.
 */
function OfficeMap() {
  const map = paperTexture("map", 1024, Math.round(1024 / MAP_ASPECT), drawMap);
  const card = paperTexture("card", 512, Math.round(512 / 0.75), drawDirectory);
  const note = paperTexture("note", 384, Math.round(384 / 1.4), drawSticky);
  return (
    <group>
      <CorkBoard w={1.6} h={1.0} />

      <group position={[-0.22, -0.02, 0.0145]} rotation={[0, 0, 0.008]}>
        <Plane s={[MAP_W, MAP_H]}>
          <Mat map={map} r={0.85} />
        </Plane>
        {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => (
          <Tack key={`${sx}${sy}`} p={[sx * (MAP_W / 2 - 0.025), sy * (MAP_H / 2 - 0.025), 0.003]} />
        ))}
        {BOARD_OFFICES.map((o) => {
          const { u, v } = projectOnSheet(o.lat, o.lng);
          return <MapPin key={o.n} p={[(u - 0.5) * MAP_W, (0.5 - v) * MAP_H, 0.001]} inNetwork={o.inNetwork} />;
        })}
      </group>

      <group position={[0.5, -0.08, 0.015]} rotation={[0, 0, -0.025]}>
        <Plane s={[CARD_W, CARD_H]}>
          <Mat map={card} r={0.85} />
        </Plane>
        <Tack p={[-CARD_W / 2 + 0.03, CARD_H / 2 - 0.025, 0.003]} />
        <Tack p={[CARD_W / 2 - 0.03, CARD_H / 2 - 0.025, 0.003]} />
      </group>

      <group position={[0.52, 0.31, 0.0155]} rotation={[0, 0, 0.04]}>
        <Plane s={[NOTE_W, NOTE_H]}>
          <Mat map={note} r={0.9} />
        </Plane>
      </group>
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
