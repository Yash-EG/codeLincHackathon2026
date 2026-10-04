/**
 * EntranceRoom.jsx — room 0 (landing). The clinic's storefront on a sidewalk diorama, same slab
 * and lighting as the rooms. Signature objects: sign, glass doors (pick → reception), awning, planters.
 * Preview:  <RoomPreview Room={EntranceRoom} stops={STOPS} />
 */
import {
  C, ROOM, tex, Mat, Box, Cyl, Plane, Rod, Glass, SignBoard, SnakePlant, Succulent, Pickable, Chrome, ContactShadow, view,
} from "./roomKit";

export const STOPS = [
  { id: "hero", ...view([0, 1.6, -1.8], 9.0, 35, 12) },
  { id: "what", ...view([0, 1.4, -2.0], 5.6, 25, 8), focus: "doors" },
];

const FRONT = -2.0; // z of the facade's front face

/** The storefront doors lead to reception (they sit 0.5 m in front of the slab's back edge). */
export const DOORS = [{ id: "reception", wall: "back", u: 0, off: ROOM.D / 2 + FRONT }];

function ShopWindow({ x }) {
  const white = <Mat c={C.white} r={0.4} />;
  return (
    <group position={[x, 1.85, FRONT]}>
      <Plane s={[1.2, 1.2]} p={[0, 0, 0.004]}>
        <Mat c="#000000" e="#ffffff" emap={tex.interior()} ei={0.95} r={0.9} />
      </Plane>
      <Box s={[1.3, 0.07, 0.12]} p={[0, 0.63, 0.04]}>{white}</Box>
      <Box s={[1.3, 0.07, 0.12]} p={[0, -0.63, 0.04]}>{white}</Box>
      <Box s={[0.07, 1.3, 0.12]} p={[-0.62, 0, 0.04]}>{white}</Box>
      <Box s={[0.07, 1.3, 0.12]} p={[0.62, 0, 0.04]}>{white}</Box>
      <Box s={[0.05, 1.2, 0.08]} p={[0, 0, 0.04]}>{white}</Box>
      <Plane s={[1.2, 1.2]} p={[0, 0, 0.03]}>
        <Glass o={0.12} />
      </Plane>
      {/* planter box with shrubs */}
      <group position={[0, -1.65, 0.22]}>
        <ContactShadow w={1.6} d={0.6} o={0.4} p={[0, 0, 0]} />
        <Box s={[1.35, 0.4, 0.35]} p={[0, 0.2, 0]} r={0.03}>
          <Mat map={tex.wood("oak")} r={0.55} />
        </Box>
        {[-0.4, 0, 0.4].map((sx) => (
          <mesh key={sx} position={[sx, 0.47, 0]} scale={[1.2, 0.85, 0.9]} castShadow>
            <sphereGeometry args={[0.2, 18, 14]} />
            <Mat c={sx === 0 ? "#79a873" : C.leaf} r={0.75} bump={tex.fabric(2, 2)} bs={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Bench() {
  const legs = <Mat c={C.dark} r={0.4} />;
  const slat = <Mat map={tex.wood("oak")} r={0.5} />;
  return (
    <group>
      <ContactShadow w={1.6} d={0.65} o={0.45} />
      {[0, 1, 2].map((i) => (
        <Box key={i} s={[1.4, 0.035, 0.11]} p={[0, 0.45, -0.13 + i * 0.13]} r={0.01}>{slat}</Box>
      ))}
      {[0, 1].map((i) => (
        <Box key={`b${i}`} s={[1.4, 0.1, 0.03]} p={[0, 0.62 + i * 0.13, -0.22]} rot={[-0.15, 0, 0]} r={0.01}>{slat}</Box>
      ))}
      {[-0.58, 0.58].map((x) => (
        <Box key={x} s={[0.05, 0.45, 0.4]} p={[x, 0.225, 0]} r={0.01}>{legs}</Box>
      ))}
    </group>
  );
}

function LampPost() {
  const iron = <Mat c={C.dark} r={0.4} m={0.3} />;
  return (
    <group>
      <ContactShadow w={0.5} d={0.5} o={0.5} />
      <Cyl a={[0.12, 0.12, 0.06, 20]} p={[0, 0.03, 0]}>{iron}</Cyl>
      <Cyl a={[0.045, 0.045, 2.6, 16]} p={[0, 1.3, 0]}>{iron}</Cyl>
      <Cyl a={[0.1, 0.14, 0.22, 20]} p={[0, 2.68, 0]}>
        <Mat c="#fdf1d8" e="#fdf1d8" ei={1.2} r={0.6} />
      </Cyl>
      <Cyl a={[0.02, 0.16, 0.1, 20]} p={[0, 2.84, 0]}>{iron}</Cyl>
    </group>
  );
}

export default function EntranceRoom({ highlight, onSelect }) {
  const { W, D, T: t, SLAB } = ROOM;
  const white = <Mat c={C.white} r={0.4} />;
  const plaster = tex.plaster(3, 1);
  return (
    <group>
      {/* Sidewalk slab, lawns and the walk up to the door. */}
      <Box s={[W + t, SLAB, D + t]} p={[-t / 2, -SLAB / 2, -t / 2]}>
        <Mat c={C.cut} r={0.9} />
      </Box>
      <Plane s={[W, D]} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]}>
        <Mat map={tex.concrete(3, 2.5)} r={0.9} />
      </Plane>
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[1.9, 0.05, 1.7]} p={[sx * 2.0, 0.025, -1.0]} r={0.015}>
          <Mat map={tex.grass(2, 2)} r={1} />
        </Box>
      ))}
      <Plane s={[1.6, 2.0]} p={[0, 0.004, -1.0]} rot={[-Math.PI / 2, 0, 0]}>
        <Mat c="#ece8e0" map={tex.speckle()} r={0.6} />
      </Plane>

      {/* Facade */}
      <Box s={[W + t, 3.2, 0.5]} p={[-t / 2, 1.6, FRONT - 0.25]} cast={false}>
        <Mat c={C.mintWall} bump={plaster} bs={0.15} rmap={tex.plasterRough(3, 1)} r={1} />
      </Box>
      <Box s={[W + t + 0.04, 0.14, 0.56]} p={[-t / 2, 3.27, FRONT - 0.25]}>{white}</Box>
      <Box s={[W + t + 0.02, 0.25, 0.54]} p={[-t / 2, 0.125, FRONT - 0.25]}>
        <Mat c="#e4ded3" r={0.85} />
      </Box>
      <Box s={[W + t, 0.06, 0.02]} p={[-t / 2, 1.03, FRONT + 0.01]}>
        <Mat c={C.maroon} r={0.5} />
      </Box>
      <Box s={[W + t, 0.02, 0.022]} p={[-t / 2, 1.07, FRONT + 0.012]}>
        <Mat c={C.orange} r={0.5} />
      </Box>
      <group position={[0, 2.95, FRONT]}>
        <SignBoard text="MOLARITY DENTAL" w={2.6} h={0.34} fg="#2f6fb3" />
      </group>

      {/* Entry: lit interior behind sliding glass doors, maroon awning above. */}
      <Pickable id="doors" onSelect={onSelect} highlighted={highlight === "doors"} ring={1.0} ringAt={[0, FRONT + 0.6]}>
        <Plane s={[1.8, 2.35]} p={[0, 1.18, FRONT + 0.005]}>
          <Mat c="#000000" e="#ffffff" emap={tex.interior()} ei={0.95} r={0.9} />
        </Plane>
        {[-0.95, 0.95].map((x) => (
          <Box key={x} s={[0.1, 2.5, 0.16]} p={[x, 1.25, FRONT + 0.04]}>{white}</Box>
        ))}
        <Box s={[2.0, 0.12, 0.16]} p={[0, 2.5, FRONT + 0.04]}>{white}</Box>
        {[-0.45, 0.45].map((x) => (
          <Box key={`g${x}`} s={[0.88, 2.35, 0.03]} p={[x, 1.18, FRONT + 0.05]} cast={false}>
            <Glass o={0.18} />
          </Box>
        ))}
        {[-0.9, 0, 0.9].map((x) => (
          <Box key={`m${x}`} s={[0.04, 2.38, 0.05]} p={[x, 1.19, FRONT + 0.06]}>
            <Chrome r={0.3} />
          </Box>
        ))}
        {[-0.08, 0.08].map((x) => (
          <Rod key={`h${x}`} from={[x, 0.88, FRONT + 0.1]} to={[x, 1.33, FRONT + 0.1]} r={0.012}>
            <Chrome />
          </Rod>
        ))}
      </Pickable>
      <Box s={[2.3, 0.1, 0.85]} p={[0, 2.66, FRONT + 0.42]} rot={[0.12, 0, 0]} r={0.03}>
        <Mat c={C.maroon} bump={tex.fabric(6, 3)} bs={0.6} r={0.85} />
      </Box>
      <Box s={[2.3, 0.05, 0.04]} p={[0, 2.6, FRONT + 0.85]} r={0.015}>
        <Mat c={C.orange} r={0.5} />
      </Box>

      <ShopWindow x={-1.95} />
      <ShopWindow x={1.95} />
      <group position={[-1.2, 0, FRONT + 0.3]} scale={1.3}>
        <SnakePlant seed={31} />
      </group>
      <group position={[1.2, 0, FRONT + 0.3]} scale={1.3}>
        <SnakePlant seed={32} />
      </group>

      <group position={[1.9, 0, 1.3]} rotation={[0, -0.25, 0]}>
        <Bench />
      </group>
      <group position={[1.05, 0, 1.75]}>
        <Succulent seed={33} />
      </group>
      <group position={[-2.1, 0, 1.0]}>
        <LampPost />
      </group>
    </group>
  );
}
