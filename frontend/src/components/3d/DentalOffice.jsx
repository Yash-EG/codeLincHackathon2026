/**
 * DentalOffice.jsx — mint/sage isometric dental office for the codeLinc Dental Benefits Optimizer.
 *
 * Install:  npm i three @react-three/fiber @react-three/drei
 *
 * Usage:
 *   <div style={{ width: "100vw", height: "100vh" }}>
 *     <DentalOffice
 *       annualMax={1500}
 *       used={400}
 *       pending={0}
 *       panels={{
 *         reception: <PlanInput />,
 *         chair: <TreatmentMap />,      // your 3D tooth map
 *         checkout: <CostBreakdown />,
 *         calendar: <Timeline />,
 *       }}
 *       onStationChange={(id) => console.log(id)}
 *     />
 *   </div>
 *
 * Everything is procedural (no models, HDRIs, fonts, or textures are fetched) so it works offline.
 * Tune camera views in STATIONS, colors in T, and lighting in <Lights />.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/* ----------------------------- Theme ----------------------------- */
const T = {
  bg: "#efe8df",
  wallMint: "#bfe3cf",
  wallSage: "#c9dcc3",
  wainscot: "#b9d5e4",
  floorEdge: "#c99c68",
  slab: "#efe2cf",
  cream: "#f6efe3",
  white: "#fbfaf6",
  mint: "#a9dcc4",
  mintDeep: "#5fb894",
  blue: "#8fb9dd",
  wood: "#c79560",
  cork: "#c99a62",
  terracotta: "#d98a5f",
  leaf: "#5e9f6b",
  metal: "#b9c0c6",
  dark: "#3b4650",
  maroon: "#8a1538",
  orange: "#f26b21",
};

const PANEL_W = 400;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* --------------------------- Stations ---------------------------- */
export const OVERVIEW = { camera: [13, 10.5, 13], target: [0, 0.8, 0] };

export const STATIONS = [
  { id: "reception", label: "Check-in",   tag: "Req 1",   feature: "Plan details",
    camera: [5.4, 3.5, 6.4],   target: [1.3, 0.8, 2.1],    anchor: [1.62, 2.0, 2.42],
    blurb: "Pick a sample plan, fill a short form, or upload your benefits summary PDF." },
  { id: "chair",     label: "Procedure",  tag: "Req 1",   feature: "Describe your care",
    camera: [1.8, 3.4, 3.2],   target: [-2, 0.9, -0.8],    anchor: [-2.25, 2.75, -0.8],
    blurb: "Tell us what your dentist recommended, or click the tooth on the treatment map." },
  { id: "xray",      label: "Coverage",   tag: "Req 2",   feature: "Plain-English translation",
    camera: [-1.4, 2.6, 0.6],  target: [-2.9, 2.25, -3.9], anchor: [-2.9, 2.92, -3.9],
    blurb: "What your plan says, translated: category, waiting periods, frequency limits." },
  { id: "checkout",  label: "Your Cost",  tag: "Req 2",   feature: "Cost breakdown",
    camera: [6.2, 3.0, 0.6],   target: [3.6, 0.9, -3.45],  anchor: [3.6, 1.55, -3.45],
    blurb: "You'll pay $X. Expand for deductible → coinsurance → annual max math." },
  { id: "calendar",  label: "Plan Year",  tag: "Req 3",   feature: "Sequence your care",
    camera: [-0.8, 2.4, 3.6],  target: [-4.9, 1.95, 2.4],  anchor: [-4.85, 2.98, 2.4],
    blurb: "Best timing across plan years, e.g. root canal now, crown after Jan 1." },
  { id: "jar",       label: "Annual Max", tag: "Bonus 1", feature: "Usage tracker",
    camera: [-2.2, 3.0, -1.0], target: [-4.6, 2.3, -3.6],  anchor: [-4.6, 2.85, -3.6],
    blurb: "Used, pending, and remaining benefits for this plan year." },
  { id: "doors",     label: "Network",    tag: "Bonus 2", feature: "In- vs out-of-network",
    camera: [2.4, 2.2, 1.6],   target: [0.85, 1.3, -3.9],  anchor: [0.85, 2.65, -3.85],
    blurb: "Side-by-side costs, including balance billing out of network." },
  { id: "board",     label: "Reminders",  tag: "Bonus 3", feature: "Year-end alerts",
    camera: [-1.2, 2.5, -0.6], target: [-4.9, 2.2, -2.0],  anchor: [-4.85, 2.85, -2.0],
    blurb: "Unused benefits expiring Dec 31, with calendar (.ics) export." },
];

/* --------------------------- Primitives -------------------------- */
/* Shared bump textures (lazy, canvas-generated) give every surface a little tooth. */
const bumpCache = {};
function bumpTex(kind) {
  if (bumpCache[kind]) return bumpCache[kind];
  const W = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = W;
  const g = cv.getContext("2d");
  let seed = kind.length * 31 + 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, W, W);
  if (kind === "fabric") {
    for (let y = 0; y < W; y += 4) for (let x = 0; x < W; x += 4) {
      g.fillStyle = (x + y) % 8 ? "#5a5a5a" : "#b4b4b4";
      g.fillRect(x, y, 3, 3);
    }
  } else if (kind === "wood") {
    for (let i = 0; i < 60; i++) {
      const v = 90 + rnd() * 90;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, rnd() * W, W, 1 + rnd() * 2);
    }
  } else {
    for (let i = 0; i < 2500; i++) {
      const v = 70 + rnd() * 120;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(rnd() * W, rnd() * W, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (bumpCache[kind] = t);
}

const Mat = ({ c, e, ei = 0.6, r = 0.7, m = 0.02, o, map, bump }) => {
  const kind = bump ?? (c === T.wood || c === T.cork ? "wood" : "noise");
  return (
    <meshStandardMaterial
      color={c}
      map={map}
      roughness={r}
      metalness={m}
      emissive={e ?? "#000000"}
      emissiveIntensity={e ? ei : 0}
      transparent={o !== undefined}
      opacity={o ?? 1}
      bumpMap={e || o !== undefined ? undefined : bumpTex(kind)}
      bumpScale={kind === "fabric" ? 1.2 : 0.6}
    />
  );
};

function Box({ s = [1, 1, 1], p, rot, rad = 0, shadow = true, ...mat }) {
  if (rad > 0) {
    return (
      <RoundedBox args={s} radius={rad} smoothness={4} position={p} rotation={rot}
        castShadow={shadow} receiveShadow>
        <Mat {...mat} />
      </RoundedBox>
    );
  }
  return (
    <mesh position={p} rotation={rot} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <Mat {...mat} />
    </mesh>
  );
}

function Cyl({ a, p, rot, shadow = true, ...mat }) {
  return (
    <mesh position={p} rotation={rot} castShadow={shadow} receiveShadow>
      <cylinderGeometry args={a} />
      <Mat {...mat} />
    </mesh>
  );
}

function Ball({ rad, p, ...mat }) {
  return (
    <mesh position={p} castShadow>
      <sphereGeometry args={[rad, 20, 14]} />
      <Mat {...mat} />
    </mesh>
  );
}

/** Flat curved slab (annulus sector) extruded upward — used for the curved reception desk. */
function ArcSlab({ r0, r1, a0, a1, h, y = 0, bevel = 0.03, ...mat }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r1, a0, a1, false);
    shape.absarc(0, 0, r0, a1, a0, true);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, h - bevel * 2),
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 48,
    });
    g.rotateX(-Math.PI / 2); // extrusion axis → +Y, shape Y → -Z
    g.translate(0, bevel, 0);
    return g;
  }, [r0, r1, a0, a1, h, bevel]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow receiveShadow>
      <Mat {...mat} />
    </mesh>
  );
}

/* ------------------------ Procedural textures -------------------- */
function useCanvasTexture(draw, w, h, rx = 1, ry = 1) {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  }, [draw, w, h, rx, ry]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const drawFloor = (g, W, H) => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = 19;
  const rh = H / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 200;
    while (x < W) {
      const len = 220 + rnd() * 260;
      g.fillStyle = `hsl(32, 52%, ${69 + rnd() * 7}%)`;
      g.fillRect(x, r * rh, len, rh);
      g.strokeStyle = "rgba(150,100,60,0.09)";
      for (let k = 0; k < 3; k++) {
        const y = r * rh + rnd() * rh;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + len, y + (rnd() - 0.5) * 4);
        g.stroke();
      }
      g.fillStyle = "rgba(120,80,45,0.35)";
      g.fillRect(x, r * rh, 2, rh);
      x += len;
    }
    g.fillStyle = "rgba(120,80,45,0.35)";
    g.fillRect(0, r * rh, W, 2);
  }
};

const drawPlaster = (g, W, H) => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#f4f4f4";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const r = 10 + rnd() * 40;
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    const a = 0.05 + rnd() * 0.05;
    gr.addColorStop(0, rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(120,140,120,${a})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save();
    g.translate(rnd() * W, rnd() * H);
    g.fillStyle = gr;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(90,110,90,${rnd() * 0.06})`;
    g.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
};

const drawBeadboard = (g, W, H) => {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.28)");
  grad.addColorStop(0.08, "rgba(0,0,0,0)");
  grad.addColorStop(0.92, "rgba(255,255,255,0.0)");
  grad.addColorStop(1, "rgba(0,0,0,0.18)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(0,0,0,0.12)";
  g.fillRect(W - 3, 0, 3, H);
};

const drawXray = (g, W, H) => {
  const grd = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W / 1.6);
  grd.addColorStop(0, "#2d4d66");
  grd.addColorStop(1, "#0d1a26");
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(200,225,245,0.18)";
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(W / 2, H / 2, 230, 120, 0, 0, Math.PI * 2);
  g.stroke();
  const tooth = (cx, cy, rot, hot) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.fillStyle = hot ? "rgba(242,107,33,0.9)" : "rgba(235,245,255,0.85)";
    g.beginPath();
    if (g.roundRect) g.roundRect(-11, -29, 22, 58, 9);
    else g.rect(-11, -29, 22, 58);
    g.fill();
    g.restore();
  };
  for (let i = 0; i < 14; i++) {
    const t = (i - 6.5) / 6.5;
    tooth(W / 2 + t * 200, 118 + (1 - t * t) * 14, t * 0.25, false);
    tooth(W / 2 + t * 200, 202 - (1 - t * t) * 14, -t * 0.25, i === 10); // one "care planned" tooth
  }
};

/* ---------------------- Interactive wrapper ---------------------- */
function Station({ id, position, rotation, active, onSelect, children }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  const target = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const s = hover && !active ? 1.035 : 1;
    target.set(s, s, s);
    ref.current.scale.lerp(target, 1 - Math.exp(-dt * 12));
  });

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
    >
      {children}
    </group>
  );
}

/* ----------------------------- Room ------------------------------ */
// Interior: x ∈ [-4.98, 5.2], z ∈ [-3.98, 4.2]. Back wall faces +z, left wall faces +x.
function Room() {
  const floorTex = useCanvasTexture(drawFloor, 1024, 832);
  const plasterBack = useCanvasTexture(drawPlaster, 256, 256, 5, 1.6);
  const plasterLeft = useCanvasTexture(drawPlaster, 256, 256, 4, 1.6);
  const beadBack = useCanvasTexture(drawBeadboard, 64, 128, 41, 1);
  const beadLeft = useCanvasTexture(drawBeadboard, 64, 128, 33, 1);
  return (
    <group>
      {/* Base slab + floor */}
      <Box s={[10.8, 0.22, 8.8]} p={[0, -0.25, 0]} rad={0.08} c={T.slab} />
      <Box s={[10.4, 0.14, 8.4]} p={[0, -0.07, 0]} c={T.floorEdge} shadow={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[10.4, 8.4]} />
        <meshStandardMaterial map={floorTex} bumpMap={floorTex} bumpScale={1.5} roughness={0.6} />
      </mesh>

      {/* Walls (rounded, thick, cutaway diorama) */}
      <Box s={[10.4, 3.2, 0.22]} p={[0, 1.6, -4.09]} rad={0.08} c={T.wallSage} map={plasterBack} />
      <Box s={[0.22, 3.2, 8.4]} p={[-5.09, 1.6, 0]} rad={0.08} c={T.wallMint} map={plasterLeft} />

      {/* Light-blue wainscot + maroon chair rail */}
      <Box s={[10.18, 1.1, 0.02]} p={[0.11, 0.55, -3.97]} c={T.wainscot} map={beadBack} shadow={false} />
      <Box s={[0.02, 1.1, 8.18]} p={[-4.97, 0.55, 0.11]} c={T.wainscot} map={beadLeft} shadow={false} />
      <Box s={[10.18, 0.07, 0.05]} p={[0.11, 1.12, -3.955]} c={T.maroon} shadow={false} />
      <Box s={[0.05, 0.07, 8.18]} p={[-4.955, 1.12, 0.11]} c={T.maroon} shadow={false} />

      {/* Window on left wall with sill plants */}
      <group position={[-4.96, 2.05, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <Box s={[1.25, 1.35, 0.06]} rad={0.02} c={T.white} />
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[1.08, 1.18]} />
          <meshBasicMaterial color="#fffbea" toneMapped={false} />
        </mesh>
        <Box s={[0.05, 1.18, 0.04]} p={[0, 0, 0.05]} c={T.white} shadow={false} />
        <Box s={[1.08, 0.05, 0.04]} p={[0, 0.1, 0.05]} c={T.white} shadow={false} />
        <Box s={[1.4, 0.07, 0.3]} p={[0, -0.7, 0.13]} rad={0.02} c={T.white} />
        <Plant p={[-0.4, -0.665, 0.15]} s={0.55} />
        <Plant p={[0.42, -0.665, 0.15]} s={0.5} leaves={5} />
      </group>
    </group>
  );
}

/* --------------------------- Furniture --------------------------- */
function Plant({ p, s = 1, leaves = 6 }) {
  const items = useMemo(
    () => Array.from({ length: leaves }, (_, i) => ({ a: (i / leaves) * Math.PI * 2, tilt: 0.45 + (i % 2) * 0.3 })),
    [leaves]
  );
  return (
    <group position={p} scale={s}>
      <Cyl a={[0.2, 0.15, 0.32, 24]} p={[0, 0.16, 0]} c={T.terracotta} />
      <Cyl a={[0.185, 0.185, 0.02, 24]} p={[0, 0.315, 0]} c="#6b4a35" shadow={false} />
      {items.map(({ a, tilt }, i) => (
        <group key={i} position={[0, 0.32, 0]} rotation={[0, a, tilt]}>
          <mesh position={[0, 0.22, 0]} scale={[0.07, 0.24, 0.035]} castShadow>
            <sphereGeometry args={[1, 16, 12]} />
            <Mat c={T.leaf} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Sofa() {
  return (
    <group>
      {[-0.85, 0.85].flatMap((x) =>
        [-0.3, 0.3].map((z) => <Cyl key={`${x}${z}`} a={[0.04, 0.03, 0.12, 10]} p={[x, 0.06, z]} c={T.wood} />)
      )}
      <Box s={[1.95, 0.22, 0.8]} p={[0, 0.23, 0]} rad={0.06} c={T.cream} bump="fabric" />
      <Box s={[1.9, 0.05, 0.78]} p={[0, 0.14, 0]} c={T.mint} shadow={false} />
      {[-0.44, 0.44].map((x) => (
        <group key={x}>
          <Box s={[0.86, 0.14, 0.62]} p={[x, 0.41, 0.06]} rad={0.06} c={T.cream} bump="fabric" />
          <Box s={[0.86, 0.52, 0.18]} p={[x, 0.66, -0.3]} rot={[-0.12, 0, 0]} rad={0.08} c={T.cream} bump="fabric" />
        </group>
      ))}
      {[-0.99, 0.99].map((x) => <Box key={x} s={[0.16, 0.5, 0.8]} p={[x, 0.45, 0]} rad={0.06} c={T.cream} bump="fabric" />)}
      <Box s={[1.82, 0.035, 0.035]} p={[0, 0.92, -0.36]} c={T.maroon} shadow={false} />
    </group>
  );
}

function DentalChair() {
  return (
    <group>
      {/* Base + column */}
      <Box s={[1.1, 0.08, 0.7]} p={[0.15, 0.04, 0]} rad={0.035} c={T.cream} />
      <Cyl a={[0.17, 0.2, 0.5, 24]} p={[0.15, 0.32, 0]} c={T.cream} />
      {/* Seat */}
      <Box s={[1.0, 0.16, 0.74]} p={[0.3, 0.62, 0]} rad={0.06} c={T.cream} />
      <Box s={[0.92, 0.14, 0.68]} p={[0.3, 0.76, 0]} rad={0.06} c={T.mint} bump="fabric" />
      {/* Backrest + headrest (reclined toward -x) */}
      <Box s={[1.04, 0.08, 0.68]} p={[-0.64, 0.91, 0]} rot={[0, 0, -0.45]} rad={0.035} c={T.cream} />
      <Box s={[1.0, 0.14, 0.64]} p={[-0.6, 1.0, 0]} rot={[0, 0, -0.45]} rad={0.06} c={T.mint} bump="fabric" />
      <Box s={[0.32, 0.1, 0.42]} p={[-1.2, 1.31, 0]} rot={[0, 0, -0.45]} rad={0.045} c={T.mint} bump="fabric" />
      {/* Leg rest */}
      <Box s={[0.88, 0.07, 0.64]} p={[1.13, 0.55, 0]} rot={[0, 0, -0.35]} rad={0.03} c={T.cream} />
      <Box s={[0.85, 0.12, 0.6]} p={[1.16, 0.636, 0]} rot={[0, 0, -0.35]} rad={0.05} c={T.mint} bump="fabric" />
      {/* Armrest */}
      <Box s={[0.06, 0.22, 0.06]} p={[0.2, 0.86, 0.4]} c={T.cream} />
      <Box s={[0.6, 0.06, 0.1]} p={[0.2, 0.99, 0.4]} rad={0.025} c={T.cream} />
      {/* Cuspidor */}
      <Cyl a={[0.05, 0.05, 0.85, 12]} p={[-0.4, 0.42, -0.62]} c={T.cream} />
      <Cyl a={[0.13, 0.08, 0.1, 20]} p={[-0.4, 0.9, -0.62]} c={T.white} />
      <Cyl a={[0.1, 0.1, 0.01, 20]} p={[-0.4, 0.951, -0.62]} c={T.mint} shadow={false} />
      {/* Overhead light: pole, arm, head */}
      <Cyl a={[0.05, 0.06, 2.4, 14]} p={[-1.3, 1.2, -0.55]} c={T.cream} />
      <Box s={[1.18, 0.08, 0.08]} p={[-0.775, 2.38, -0.275]} rot={[0, -0.482, 0]} rad={0.035} c={T.cream} />
      <Cyl a={[0.03, 0.03, 0.16, 10]} p={[-0.25, 2.3, 0]} c={T.cream} />
      <group position={[-0.25, 2.18, 0]} rotation={[0, 0, 0.25]}>
        <Box s={[0.55, 0.1, 0.28]} rad={0.045} c={T.cream} />
        <mesh position={[0, -0.052, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.45, 0.18]} />
          <meshBasicMaterial color="#fff7d6" toneMapped={false} />
        </mesh>
      </group>
      {/* Instrument tray */}
      <Cyl a={[0.035, 0.035, 1.1, 10]} p={[1.0, 0.55, -0.6]} c={T.metal} m={0.5} r={0.35} />
      <Box s={[0.6, 0.04, 0.36]} p={[0.85, 1.13, -0.45]} rad={0.015} c={T.cream} />
      <Box s={[0.52, 0.01, 0.28]} p={[0.85, 1.155, -0.45]} c={T.mint} shadow={false} />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} a={[0.008, 0.008, 0.35, 6]} p={[0.85, 1.17, -0.53 + i * 0.08]} rot={[0, 0, Math.PI / 2]}
          c={T.metal} m={0.6} r={0.3} shadow={false} />
      ))}
    </group>
  );
}

const DESK_A0 = -1.833;
const DESK_A1 = 0.262;

function ReceptionDesk() {
  return (
    <group>
      <ArcSlab r0={1.12} r1={1.46} a0={DESK_A0} a1={DESK_A1} h={0.14} bevel={0.02} c={T.blue} />
      <ArcSlab r0={1.1} r1={1.45} a0={DESK_A0} a1={DESK_A1} h={0.86} y={0.12} c={T.cream} />
      <ArcSlab r0={1.0} r1={1.55} a0={DESK_A0 - 0.05} a1={DESK_A1 + 0.05} h={0.07} y={0.98} bevel={0.02} c={T.white} />
      {/* Monitor (screen faces the receptionist) */}
      <group position={[0.82, 1.05, 0.82]} rotation={[0, (-3 * Math.PI) / 4, 0]}>
        <Box s={[0.28, 0.02, 0.18]} p={[0, 0.01, 0]} c={T.dark} />
        <Box s={[0.05, 0.25, 0.05]} p={[0, 0.14, -0.02]} c={T.dark} />
        <Box s={[0.66, 0.42, 0.05]} p={[0, 0.45, 0]} rad={0.02} c={T.dark} />
        <mesh position={[0, 0.45, 0.027]}>
          <planeGeometry args={[0.6, 0.36]} />
          <meshBasicMaterial color="#cdeee0" toneMapped={false} />
        </mesh>
      </group>
      {/* Receptionist chair */}
      <group position={[0.2, 0, 0.2]} rotation={[0, Math.PI / 4, 0]}>
        <Cyl a={[0.25, 0.28, 0.05, 20]} p={[0, 0.03, 0]} c={T.dark} />
        <Cyl a={[0.04, 0.04, 0.4, 10]} p={[0, 0.25, 0]} c={T.metal} m={0.5} />
        <Box s={[0.5, 0.1, 0.48]} p={[0, 0.5, 0]} rad={0.045} c={T.blue} />
        <Box s={[0.46, 0.5, 0.1]} p={[0, 0.82, -0.24]} rad={0.045} c={T.blue} />
      </group>
    </group>
  );
}

function Checkout() {
  return (
    <group>
      <Box s={[1.3, 0.12, 0.8]} p={[0, 0.06, 0]} rad={0.03} c={T.blue} />
      <Box s={[1.26, 0.84, 0.76]} p={[0, 0.54, 0]} rad={0.04} c={T.cream} />
      <Box s={[1.4, 0.07, 0.88]} p={[0, 1.0, 0.02]} rad={0.025} c={T.white} />
      {/* Card terminal */}
      <group position={[0.2, 1.035, 0.08]} rotation={[0, -0.3, 0]}>
        <Box s={[0.26, 0.06, 0.34]} p={[0, 0.03, 0]} rad={0.02} c={T.dark} />
        <mesh position={[0, 0.062, -0.06]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.18, 0.13]} />
          <meshBasicMaterial color="#bfeedd" toneMapped={false} />
        </mesh>
      </group>
      <Box s={[0.24, 0.008, 0.15]} p={[-0.3, 1.04, 0.15]} rot={[0, 0.4, 0]} c={T.mintDeep} shadow={false} />
    </group>
  );
}

function Door({ x, sign }) {
  return (
    <group position={[x, 0, 0]}>
      <Box s={[1.12, 2.35, 0.06]} p={[0, 1.175, 0.03]} rad={0.02} c={T.white} />
      <Box s={[0.92, 2.2, 0.06]} p={[0, 1.1, 0.08]} rad={0.02} c={T.cream} />
      <Box s={[0.92, 0.22, 0.02]} p={[0, 0.14, 0.12]} c="#c9ced1" shadow={false} />
      <Box s={[0.44, 0.2, 0.04]} p={[0, 1.8, 0.125]} rad={0.015} c={sign} e={sign} ei={0.25} />
      <Box s={[0.06, 0.5, 0.03]} p={[0.36, 1.15, 0.125]} rad={0.01} c={sign} />
      <Cyl a={[0.025, 0.025, 0.06, 10]} p={[-0.34, 1.05, 0.13]} rot={[Math.PI / 2, 0, 0]} c={T.metal} m={0.6} r={0.3} />
      <Box s={[0.16, 0.03, 0.03]} p={[-0.29, 1.05, 0.16]} c={T.metal} m={0.6} r={0.3} />
    </group>
  );
}

function XrayViewer() {
  const tex = useCanvasTexture(drawXray, 512, 320);
  return (
    <group>
      <Box s={[1.3, 0.9, 0.08]} p={[0, 0, 0.04]} rad={0.03} c="#dfe7ec" />
      <mesh position={[0, 0.02, 0.085]}>
        <planeGeometry args={[1.12, 0.68]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Box s={[0.3, 0.035, 0.02]} p={[0.4, -0.39, 0.085]} c={T.mintDeep} e={T.mintDeep} ei={0.6} shadow={false} />
    </group>
  );
}

function CornerJar({ fill }) {
  const h = 0.42;
  const fh = Math.max(0.02, h * 0.88 * fill);
  const coins = [[0.05, 0.03, 0.3], [-0.06, -0.02, -0.4], [0.0, 0.07, 0.15], [-0.04, 0.05, 0.6]];
  return (
    <group>
      {/* Quarter-round corner shelf */}
      <Cyl a={[0.62, 0.62, 0.05, 32, 1, false, 0, Math.PI / 2]} p={[0, 0, 0]} c={T.white} />
      <group position={[0.36, 0.025, 0.36]}>
        <mesh position={[0, fh / 2 + 0.01, 0]}>
          <cylinderGeometry args={[0.17, 0.17, fh, 24]} />
          <Mat c={T.mint} />
        </mesh>
        {coins.map(([x, z, r], i) => (
          <Cyl key={i} a={[0.05, 0.05, 0.015, 16]} p={[x, fh + 0.02 + i * 0.006, z]} rot={[r, 0, r / 2]}
            c="#8fd9b9" m={0.3} r={0.4} shadow={false} />
        ))}
        <mesh position={[0, h / 2, 0]}>
          <cylinderGeometry args={[0.2, 0.2, h, 32, 1, true]} />
          <meshStandardMaterial color="#e8f6ff" roughness={0.1} transparent opacity={0.28}
            depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <Cyl a={[0.21, 0.21, 0.06, 32]} p={[0, h + 0.03, 0]} c={T.cream} />
        <Ball rad={0.04} p={[0, h + 0.08, 0]} c={T.cream} />
      </group>
    </group>
  );
}

function WallCalendar({ month }) {
  const tw = 0.34, th = 0.27, gx = 0.04, gy = 0.05;
  return (
    <group>
      <Box s={[1.3, 1.62, 0.04]} p={[0, 0, 0.02]} rad={0.015} c={T.white} />
      <Box s={[1.3, 0.2, 0.045]} p={[0, 0.71, 0.025]} c={T.blue} />
      {[-0.35, 0.35].map((x) => (
        <Cyl key={x} a={[0.025, 0.025, 0.06, 10]} p={[x, 0.81, 0.04]} rot={[Math.PI / 2, 0, 0]} c={T.metal} m={0.6} />
      ))}
      {MONTHS.map((m, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = (col - 1) * (tw + gx);
        const y = 0.43 - row * (th + gy);
        const reset = i === 0 && month > 0;
        const left = i >= month;
        const c = reset ? T.mintDeep : left ? T.orange : "#dbe4ea";
        return (
          <group key={m} position={[x, y, 0.046]}>
            <Box s={[tw, th, 0.012]} c={c} e={left || reset ? c : undefined} ei={0.15} shadow={false} />
            <Box s={[tw, 0.05, 0.014]} p={[0, th / 2 - 0.025, 0.001]} c={reset || left ? "#ffffff" : "#c4d0d8"} shadow={false} />
          </group>
        );
      })}
    </group>
  );
}

function BulletinBoard() {
  const notes = [
    { p: [-0.3, 0.15], c: "#fff3b0", r: 0.08 },
    { p: [0.05, 0.2], c: "#ffffff", r: -0.05 },
    { p: [0.33, 0.08], c: "#cdeee0", r: 0.06 },
    { p: [-0.2, -0.18], c: "#ffd7c2", r: -0.07 },
    { p: [0.22, -0.2], c: "#fff3b0", r: 0.04 },
  ];
  return (
    <group>
      <Box s={[1.15, 0.9, 0.05]} p={[0, 0, 0.025]} rad={0.02} c={T.wood} />
      <Box s={[1.03, 0.78, 0.02]} p={[0, 0, 0.055]} c={T.cork} shadow={false} />
      {notes.map((n, i) => (
        <group key={i} position={[n.p[0], n.p[1], 0.068]} rotation={[0, 0, n.r]}>
          <Box s={[0.24, 0.24, 0.006]} c={n.c} shadow={false} />
          <Box s={[0.15, 0.012, 0.002]} p={[0, 0.03, 0.004]} c="#9aa6a1" shadow={false} />
          <Box s={[0.12, 0.012, 0.002]} p={[0, -0.01, 0.004]} c="#9aa6a1" shadow={false} />
          <Ball rad={0.022} p={[0, 0.1, 0.012]} c={i % 2 ? T.maroon : T.orange} />
        </group>
      ))}
    </group>
  );
}

/* ----------------------------- Scene ----------------------------- */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#e8d9c4", 1.0]} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <directionalLight position={[-8, 6, 2]} intensity={0.6} />
      <pointLight position={[-4.2, 2.2, 0.4]} intensity={2} distance={5} color="#fff4dc" />
    </>
  );
}

function Marker({ s, index, active, onSelect }) {
  return (
    <Html position={s.anchor} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <button
        type="button"
        className={`dbo-marker${active ? " is-active" : ""}`}
        style={{ pointerEvents: "auto" }}
        onClick={(e) => { e.stopPropagation(); onSelect(s.id); }}
        aria-label={`${index + 1}. ${s.label}`}
      >
        <span className="dbo-marker-num">{index + 1}</span>
        <span className="dbo-marker-label">{s.label}</span>
      </button>
    </Html>
  );
}

function Scene({ active, onSelect, fill, month }) {
  const sp = (id) => ({ id, active: active === id, onSelect });
  return (
    <>
      <Room />
      <group position={[-3.0, 0, 3.05]}><Sofa /></group>
      <Plant p={[-4.45, 0, 3.55]} s={1.5} leaves={7} />
      <Plant p={[4.6, 0, -3.5]} s={1.3} />

      <Station {...sp("reception")} position={[0.8, 0, 1.6]}><ReceptionDesk /></Station>
      <Station {...sp("chair")} position={[-2, 0, -0.8]}><DentalChair /></Station>
      <Station {...sp("xray")} position={[-2.9, 2.25, -3.98]}><XrayViewer /></Station>
      <Station {...sp("checkout")} position={[3.6, 0, -3.45]}><Checkout /></Station>
      <Station {...sp("calendar")} position={[-4.98, 1.95, 2.4]} rotation={[0, Math.PI / 2, 0]}>
        <WallCalendar month={month} />
      </Station>
      <Station {...sp("jar")} position={[-4.98, 2.05, -3.98]}><CornerJar fill={fill} /></Station>
      <Station {...sp("doors")} position={[0.85, 0, -3.98]}>
        <Door x={-0.65} sign={T.mintDeep} />
        <Door x={0.65} sign="#9aa3a8" />
      </Station>
      <Station {...sp("board")} position={[-4.98, 2.2, -2.0]} rotation={[0, Math.PI / 2, 0]}>
        <BulletinBoard />
      </Station>

      {STATIONS.map((s, i) => (
        <Marker key={s.id} s={s} index={i} active={active === s.id} onSelect={onSelect} />
      ))}
    </>
  );
}

/** Flies the camera between stations and shifts the view left so the side panel doesn't cover the object. */
function CameraRig({ active, reduced, panelOpen }) {
  const ref = useRef();
  const { size, camera } = useThree();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = STATIONS.find((x) => x.id === active) ?? OVERVIEW;
    const [px, py, pz] = s.camera;
    const [tx, ty, tz] = s.target;
    c.setLookAt(px, py, pz, tx, ty, tz, !reduced);

    const dist = Math.hypot(px - tx, py - ty, pz - tz);
    const halfW = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (size.width / size.height);
    const shift = panelOpen && size.width > 820 ? halfW * (PANEL_W / size.width) : 0;
    c.setFocalOffset(shift, 0, 0, !reduced);
  }, [active, reduced, panelOpen, size.width, size.height, camera.fov]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={reduced ? 0 : 0.7}
      minDistance={2}
      maxDistance={30}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minAzimuthAngle={-0.15}
      maxAzimuthAngle={Math.PI / 2 + 0.15}
    />
  );
}

/* ------------------------------ UI ------------------------------- */
function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const h = (e) => setR(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return r;
}

const usd = (n) => `$${Math.round(n).toLocaleString()}`;

function DefaultPanel({ station, annualMax, used, pending, remaining, month }) {
  if (station.id === "jar") {
    return (
      <div className="dbo-stats">
        <div><span>Used</span><b style={{ color: T.maroon }}>{usd(used)}</b></div>
        <div><span>Pending</span><b style={{ color: T.orange }}>{usd(pending)}</b></div>
        <div><span>Remaining</span><b style={{ color: T.mintDeep }}>{usd(remaining)}</b></div>
        <div><span>Annual max</span><b>{usd(annualMax)}</b></div>
      </div>
    );
  }
  if (station.id === "calendar") {
    const left = 12 - month;
    return (
      <p className="dbo-note">
        <b>{left} month{left === 1 ? "" : "s"}</b> left in this plan year ({MONTHS[month]}–Dec, orange).
        Your max and deductible reset on <b>Jan 1</b> (green).
      </p>
    );
  }
  return (
    <div className="dbo-placeholder">
      Drop your component here via <code>panels.{station.id}</code>
    </div>
  );
}

export default function DentalOffice({
  annualMax = 1500,
  used = 0,
  pending = 0,
  panels = {},
  initialStation = null,
  onStationChange,
}) {
  const [active, setActive] = useState(initialStation);
  const [mode2d, setMode2d] = useState(false);
  const reduced = usePrefersReducedMotion();
  const month = useMemo(() => new Date().getMonth(), []);

  const remaining = Math.max(0, annualMax - used - pending);
  const fill = annualMax > 0 ? remaining / annualMax : 0;
  const pct = (n) => `${annualMax > 0 ? Math.min(100, (n / annualMax) * 100) : 0}%`;

  const cbRef = useRef(onStationChange);
  cbRef.current = onStationChange;
  const select = useCallback((id) => {
    setActive(id);
    cbRef.current?.(id);
  }, []);

  const idx = STATIONS.findIndex((s) => s.id === active);
  const station = idx >= 0 ? STATIONS[idx] : null;

  const go = useCallback(
    (d) => {
      const n = STATIONS.length;
      const i = idx < 0 ? (d > 0 ? 0 : n - 1) : (idx + d + n) % n;
      select(STATIONS[i].id);
    },
    [idx, select]
  );

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, select]);

  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);

  const panelProps = { annualMax, used, pending, remaining, month };

  return (
    <div className="dbo-root">
      <style>{CSS}</style>

      {!mode2d && (
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: OVERVIEW.camera, fov: 35, near: 0.1, far: 100 }}>
          <color attach="background" args={[T.bg]} />
          <Lights />
          <Scene active={active} onSelect={select} fill={fill} month={month} />
          <ContactShadows position={[0, -0.37, 0]} scale={[16, 13]} opacity={0.35} blur={2.6} far={1.5}
            frames={1} color="#6b5a48" />
          <CameraRig active={active} reduced={reduced} panelOpen={!!station} />
        </Canvas>
      )}

      {/* Top bar */}
      <header className="dbo-top">
        <div className="dbo-brand dbo-glass">
          <small>codeLinc 11</small>Dental Benefits Optimizer
        </div>
        <nav className="dbo-steps" aria-label="Stations">
          {STATIONS.map((s, i) => (
            <button key={s.id} type="button" className={`dbo-step${active === s.id ? " is-active" : ""}`}
              onClick={() => select(s.id)} aria-current={active === s.id ? "step" : undefined}>
              <span className="n">{i + 1}</span>
              <span className="lbl">{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="dbo-actions">
          <button type="button" className="dbo-btn" onClick={() => select(null)} disabled={!active || mode2d}>
            Overview
          </button>
          <button type="button" className={`dbo-btn${mode2d ? " is-on" : ""}`} aria-pressed={mode2d}
            onClick={() => setMode2d((v) => !v)}>
            2D mode
          </button>
        </div>
      </header>

      {/* Side panel (3D mode) */}
      {!mode2d && (
        <aside className={`dbo-panel dbo-glass${station ? "" : " is-hidden"}`} aria-hidden={!station}>
          {station && (
            <>
              <div className="dbo-panel-head">
                <span className="dbo-tag">{station.tag}</span>
                <span className="dbo-feature">{station.feature}</span>
                <button type="button" className="dbo-close" onClick={() => select(null)} aria-label="Close">×</button>
              </div>
              <h2>{station.label}</h2>
              <p className="dbo-blurb">{station.blurb}</p>
              <div className="dbo-content">
                {panels[station.id] ?? <DefaultPanel station={station} {...panelProps} />}
              </div>
              <div className="dbo-panel-foot">
                <button type="button" className="dbo-btn" onClick={() => go(-1)}>← Back</button>
                <span>{idx + 1} / {STATIONS.length}</span>
                <button type="button" className="dbo-btn is-primary" onClick={() => go(1)}>Next →</button>
              </div>
            </>
          )}
        </aside>
      )}

      {/* 2D fallback */}
      {mode2d && (
        <main className="dbo-2d">
          {STATIONS.map((s, i) => (
            <section key={s.id} className="dbo-card dbo-glass">
              <div className="dbo-panel-head">
                <span className="dbo-tag">{s.tag}</span>
                <span className="dbo-feature">{s.feature}</span>
              </div>
              <h2>{i + 1}. {s.label}</h2>
              <p className="dbo-blurb">{s.blurb}</p>
              <div className="dbo-content">
                {panels[s.id] ?? <DefaultPanel station={s} {...panelProps} />}
              </div>
            </section>
          ))}
        </main>
      )}

      {/* Annual max bar */}
      <footer className="dbo-max dbo-glass">
        <b>Annual max</b>
        <div className="dbo-bar" role="img"
          aria-label={`${usd(used)} used, ${usd(pending)} pending, ${usd(remaining)} remaining of ${usd(annualMax)}`}>
          <span style={{ width: pct(used), background: T.maroon }} />
          <span style={{ width: pct(pending), background: T.orange }} />
        </div>
        <span className="dbo-max-text">
          {usd(used)} used{pending > 0 ? ` · ${usd(pending)} pending` : ""} · <b>{usd(remaining)} left</b> of {usd(annualMax)}
        </span>
        {!mode2d && <span className="dbo-hint">←/→ move · Esc overview</span>}
      </footer>
    </div>
  );
}

/* ------------------------------ CSS ------------------------------ */
const CSS = `
.dbo-root{position:relative;width:100%;height:100%;overflow:hidden;background:${T.bg};color:#22302b;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.dbo-root canvas{display:block}
.dbo-glass{background:rgba(255,255,255,.74);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.9);box-shadow:0 8px 30px rgba(60,70,60,.12)}
.dbo-top{position:absolute;top:14px;left:16px;right:16px;display:flex;align-items:center;gap:12px;z-index:60;pointer-events:none}
.dbo-top>*{pointer-events:auto}
.dbo-brand{padding:8px 14px;border-radius:14px;font-weight:700;font-size:14px;white-space:nowrap}
.dbo-brand small{display:block;font-weight:600;color:${T.maroon};font-size:10px;letter-spacing:.1em;text-transform:uppercase}
.dbo-steps{flex:1;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.dbo-step{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border-radius:999px;border:1px solid rgba(34,48,43,.08);
  background:rgba(255,255,255,.75);font:inherit;font-size:12px;color:#22302b;cursor:pointer;transition:background .2s,color .2s}
.dbo-step:hover{background:#fff}
.dbo-step.is-active{background:${T.maroon};color:#fff;border-color:${T.maroon}}
.dbo-step .n{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#cfe7da;font-size:11px;font-weight:700;color:#22302b}
.dbo-step.is-active .n{background:${T.orange};color:#fff}
.dbo-actions{display:flex;gap:6px}
.dbo-btn{padding:7px 12px;border-radius:10px;border:1px solid rgba(34,48,43,.12);background:rgba(255,255,255,.85);
  font:inherit;font-size:12px;font-weight:600;color:#22302b;cursor:pointer}
.dbo-btn:hover:not(:disabled){background:#fff}
.dbo-btn:disabled{opacity:.45;cursor:default}
.dbo-btn.is-on,.dbo-btn.is-primary{background:${T.maroon};border-color:${T.maroon};color:#fff}
.dbo-panel{position:absolute;top:72px;right:16px;bottom:78px;width:${PANEL_W - 32}px;border-radius:20px;padding:20px;
  display:flex;flex-direction:column;gap:10px;z-index:50;overflow:auto;
  transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
.dbo-panel.is-hidden{transform:translateX(calc(100% + 32px));opacity:0;pointer-events:none}
.dbo-panel h2,.dbo-card h2{margin:0;font-size:22px}
.dbo-panel-head{display:flex;align-items:center;gap:8px}
.dbo-tag{padding:3px 8px;border-radius:999px;background:${T.orange};color:#fff;font-size:11px;font-weight:700}
.dbo-feature{font-size:12px;color:#5d6b66;font-weight:600;flex:1}
.dbo-close{border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#5d6b66}
.dbo-blurb{margin:0;color:#4a5853;font-size:14px;line-height:1.45}
.dbo-content{flex:1;min-height:120px}
.dbo-panel-foot{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#5d6b66}
.dbo-placeholder{height:100%;min-height:140px;border:2px dashed #b9d5c7;border-radius:14px;display:grid;place-items:center;
  text-align:center;padding:16px;color:#5d6b66;font-size:13px}
.dbo-placeholder code{background:#e3f1ea;padding:1px 5px;border-radius:5px}
.dbo-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dbo-stats div{background:rgba(255,255,255,.8);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px}
.dbo-stats span{font-size:12px;color:#5d6b66}
.dbo-stats b{font-size:20px}
.dbo-note{margin:0;font-size:14px;line-height:1.5}
.dbo-max{position:absolute;left:16px;right:16px;bottom:14px;z-index:55;border-radius:14px;padding:10px 14px;
  display:flex;align-items:center;gap:14px;font-size:13px}
.dbo-bar{flex:1;height:10px;border-radius:999px;background:#cfe9dc;overflow:hidden;display:flex}
.dbo-bar span{height:100%;transition:width .6s}
.dbo-max-text{white-space:nowrap}
.dbo-hint{color:#7a8783;font-size:11px;white-space:nowrap}
.dbo-marker{display:flex;align-items:center;padding:4px;border-radius:999px;border:none;background:rgba(255,255,255,.92);
  box-shadow:0 4px 14px rgba(40,50,45,.18);font:600 12px/1 ui-sans-serif,system-ui,sans-serif;color:#22302b;cursor:pointer;
  white-space:nowrap;transition:transform .2s}
.dbo-marker:hover{transform:translateY(-2px)}
.dbo-marker-num{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:${T.maroon};color:#fff;font-size:11px}
.dbo-marker.is-active .dbo-marker-num{background:${T.orange}}
.dbo-marker-label{max-width:0;overflow:hidden;opacity:0;transition:max-width .25s,opacity .25s,padding .25s}
.dbo-marker:hover .dbo-marker-label,.dbo-marker.is-active .dbo-marker-label{max-width:120px;opacity:1;padding:0 8px 0 6px}
.dbo-2d{position:absolute;inset:72px 16px 78px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.dbo-card{border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px}
@media (max-width:820px){
  .dbo-panel{top:auto;left:12px;right:12px;width:auto;height:52%;bottom:72px}
  .dbo-panel.is-hidden{transform:translateY(120%)}
  .dbo-step .lbl,.dbo-hint,.dbo-brand small{display:none}
  .dbo-max-text{font-size:11px}
}
@media (prefers-reduced-motion:reduce){.dbo-panel,.dbo-bar span,.dbo-marker,.dbo-marker-label{transition:none}}
`;
