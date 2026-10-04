/**
 * BillingRoom.jsx — room 6 (Req 2: cost; Bonus 2: in- vs out-of-network). Same kit and style as rooms 1–5.
 * Signature objects: checkout counter with the card terminal and receipt printer; two network doors.
 * Preview:  <RoomPreview Room={BillingRoom} stops={STOPS} />
 */
import {
  C, tex, Mat, Box, Plane, Rod, OnWall, RoomShell, Door, Clock, Sanitizer, SignBoard, WallArt,
  SnakePlant, Succulent, TaskChair, Pickable, Chrome, Upholstery, ContactShadow,
} from "./roomKit";

/** One stop per content section on /billing. */
export const STOPS = [
  { id: "intro",      camera: [4.4, 2.8, 3.4],  target: [0.1, 1.0, -1.4] },
  { id: "you-pay",    camera: [2.2, 1.9, 1.2],  target: [0.2, 1.05, -1.2], focus: "counter" },
  { id: "line-items", camera: [0.95, 1.55, -0.1], target: [0.55, 1.08, -1.0], focus: "terminal" },
  { id: "network",    camera: [0.3, 1.8, 2.9],  target: [0.1, 1.5, -2.5],  focus: "network" },
  { id: "doors",      camera: [1.0, 1.8, 2.6],  target: [-3, 1.2, 1.2],    focus: "records" },
];

const WAINSCOT = { h: 1.0, color: C.sage };

/** Card terminal on its stand: dark body, lit screen, keypad. Faces +z (the customer). */
function CardTerminal() {
  const body = <Mat c="#2b3036" r={0.4} />;
  return (
    <group>
      <Box s={[0.1, 0.025, 0.14]} p={[0, 0.0125, 0]} r={0.008}>{body}</Box>
      <group position={[0, 0.06, 0.01]} rotation={[-0.45, 0, 0]}>
        <Box s={[0.085, 0.024, 0.17]} r={0.012}>{body}</Box>
        <Plane s={[0.065, 0.05]} p={[0, 0.0125, -0.04]} rot={[-Math.PI / 2, 0, 0]}>
          <Mat c="#000000" e="#bfe8d6" ei={1.1} r={0.3} />
        </Plane>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <Box key={`${row}${col}`} s={[0.016, 0.006, 0.014]} p={[(col - 1) * 0.022, 0.0135, 0.02 + row * 0.02]} r={0.002}>
              <Mat c="#e7e9ea" r={0.5} />
            </Box>
          )),
        )}
      </group>
    </group>
  );
}

function ReceiptPrinter() {
  return (
    <group>
      <Box s={[0.16, 0.1, 0.18]} p={[0, 0.05, 0]} r={0.02}><Mat c="#2b3036" r={0.45} /></Box>
      <Box s={[0.07, 0.11, 0.004]} p={[0, 0.14, 0.05]} rot={[-0.35, 0, 0]}><Mat map={tex.paper()} r={0.9} /></Box>
    </group>
  );
}

/** Two-level counter: customer ledge in front (+z), staff desk behind. Origin = floor, centre. */
function CheckoutCounter({ onSelect, highlight }) {
  const speckle = tex.speckle();
  const shell = <Mat c="#ffffff" map={speckle} r={0.55} />;
  const top = <Mat c="#fbfbf9" map={speckle} r={0.3} />;
  return (
    <group>
      <ContactShadow w={2.4} d={1.3} p={[0, 0, -0.1]} o={0.45} />
      <Box s={[2.0, 1.0, 0.3]} p={[0, 0.5, 0.15]} r={0.02}>{shell}</Box>
      <Box s={[2.02, 0.075, 0.02]} p={[0, 0.84, 0.305]}><Mat c={C.maroon} r={0.45} /></Box>
      <Box s={[2.02, 0.024, 0.022]} p={[0, 0.79, 0.306]}><Mat c={C.orange} r={0.45} /></Box>
      <Box s={[2.1, 0.04, 0.38]} p={[0, 1.02, 0.15]} r={0.012}>{top}</Box>
      <Box s={[2.0, 0.72, 0.55]} p={[0, 0.36, -0.27]} r={0.015}><Mat c={C.white} r={0.45} /></Box>
      <Box s={[2.05, 0.04, 0.6]} p={[0, 0.74, -0.27]} r={0.012}>{top}</Box>

      <Pickable id="terminal" onSelect={onSelect} highlighted={highlight === "terminal"} ring={0} position={[0.45, 1.04, 0.18]}>
        <CardTerminal />
      </Pickable>
      <group position={[0.78, 1.04, 0.12]}>
        <ReceiptPrinter />
      </group>
      <group position={[-0.75, 1.04, 0.16]} scale={0.8}>
        <Succulent seed={4} />
      </group>
      <group position={[-0.35, 0.76, -0.4]} rotation={[0, Math.PI, 0]}>
        <Box s={[0.18, 0.01, 0.15]} p={[0, 0.005, 0.02]} r={0.004}><Chrome r={0.28} /></Box>
        <Box s={[0.14, 0.24, 0.015]} p={[0, 0.13, -0.03]} rot={[-0.12, 0, 0]} r={0.005}><Chrome r={0.28} /></Box>
        <Box s={[0.58, 0.42, 0.025]} p={[0, 0.4, 0]} r={0.01}><Chrome r={0.28} /></Box>
        <Plane s={[0.54, 0.31]} p={[0, 0.43, 0.0135]}>
          <Mat c="#000" e="#fff" emap={tex.uiScreen()} ei={0.95} r={0.3} />
        </Plane>
      </group>
      <Box s={[0.21, 0.004, 0.29]} p={[0.35, 0.762, -0.3]} rot={[0, 0.2, 0]}><Mat map={tex.paper()} r={0.9} /></Box>
      <TaskChair p={[0.1, 0, -0.95]} color="#7f9a8b" />
    </group>
  );
}

/** Cantilever waiting chair facing +z. */
function WaitingChair() {
  const leather = <Upholstery c="#f2ede4" r={0.42} />;
  return (
    <group>
      <ContactShadow w={0.65} d={0.65} o={0.4} />
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <Rod from={[x, 0.015, -0.2]} to={[x, 0.015, 0.26]} r={0.012}><Chrome /></Rod>
          <Rod from={[x, 0.015, 0.26]} to={[x, 0.44, 0.2]} r={0.012}><Chrome /></Rod>
          <Rod from={[x, 0.44, 0.2]} to={[x, 0.44, -0.18]} r={0.012}><Chrome /></Rod>
        </group>
      ))}
      <Box s={[0.48, 0.08, 0.44]} p={[0, 0.49, 0.02]} r={0.035}>{leather}</Box>
      <Box s={[0.48, 0.48, 0.08]} p={[0, 0.82, -0.2]} rot={[-0.12, 0, 0]} r={0.035}>{leather}</Box>
    </group>
  );
}

export default function BillingRoom({ highlight, openDoor, onSelect }) {
  return (
    <group>
      <RoomShell leftColor={C.cream} backColor={C.cream} wainscot={WAINSCOT} />

      <OnWall wall="left" u={1.2}>
        <Door id="records" plaque="6" highlighted={highlight === "records"} open={openDoor === "records" ? 1 : 0} onSelect={onSelect} />
      </OnWall>
      <OnWall wall="left" u={2.15} y={1.25}>
        <Sanitizer />
      </OnWall>

      {/* The two "network" doors are a visual metaphor for the in- vs out-of-network comparison. */}
      <Pickable id="network" onSelect={onSelect} ring={0}>
        <OnWall wall="back" u={-1.9}>
          <Door id="in-network" highlighted={highlight === "network"} onSelect={onSelect} />
        </OnWall>
        <OnWall wall="back" u={-1.9} y={2.45}>
          <SignBoard text="In-network" w={0.95} h={0.24} bg="#2f6fb3" fg="#ffffff" />
        </OnWall>
        <OnWall wall="back" u={2.0}>
          <Door id="out-of-network" highlighted={highlight === "network"} onSelect={onSelect} />
        </OnWall>
        <OnWall wall="back" u={2.0} y={2.45}>
          <SignBoard text="Out-of-network" w={1.05} h={0.24} bg={C.maroon} fg="#ffffff" />
        </OnWall>
      </Pickable>
      <OnWall wall="back" u={0.15} y={2.35}>
        <Clock r={0.2} />
      </OnWall>
      <OnWall wall="left" u={-0.9} y={1.95}>
        <WallArt w={0.7} h={0.5} />
      </OnWall>

      <Pickable id="counter" onSelect={onSelect} highlighted={highlight === "counter"} ring={1.3} position={[0.2, 0, -1.2]}>
        <CheckoutCounter onSelect={onSelect} highlight={highlight} />
      </Pickable>

      {[-1.5, -0.3].map((z) => (
        <group key={z} position={[-2.6, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <WaitingChair />
        </group>
      ))}
      <group position={[-2.45, 0, 2.0]}>
        <SnakePlant seed={21} />
      </group>
    </group>
  );
}
