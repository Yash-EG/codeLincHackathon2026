/**
 * DentalOffice.jsx — the 3D office behind the site (React Three Fiber).
 *
 * One kit room is mounted at a time, framed tight on the section the reader is on. Changing room
 * flies the camera out through a door: the door swings open, the camera passes through the
 * opening, and it comes in through the matching door of the next room, which closes behind it.
 *
 * This grew out of the single-room DentalOffice prototype (see git history). Its STATIONS now
 * live in the kit rooms, and its standalone header, side panel, markers, max bar and 2D mode are
 * replaced by the site's own header, room pages, max bar and traditional view. The stations' panels
 * (PlanInput, TreatmentMap, CostBreakdown, Timeline) are sections of the matching room pages.
 *
 * The canvas is decoration: the wrapper is aria-hidden and the scene takes no pointer input.
 *
 * Props
 *   room            id of the room to show (from the route)
 *   sections        ids of that page's [data-camera] sections, in page order
 *   getProgress     () => scroll position: index of the section in view + fraction scrolled through it
 *   active          index of the section in view (only changes when the reader moves on)
 *   reducedMotion   snap between stations and cross-fade between rooms instead of flying
 *   fadeRef         element the camera fades to while it swaps rooms (a cream overlay above the canvas)
 *   jarFill         share of the annual max still available (fills the coin jars)
 *   onStationChange called with a STATIONS id when the reader reaches that station
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Lights, doorPose } from "./roomKit";
import { DOOR_SWING_TIMELINE_CONFIG } from "./motionConfig";
import { useSceneStore } from "../../store/sceneStore";
import EntranceRoom, { STOPS as ENTRANCE_STOPS, DOORS as ENTRANCE_DOORS } from "./EntranceRoom";
import ReceptionRoom, { STOPS as RECEPTION_STOPS, DOORS as RECEPTION_DOORS } from "./ReceptionRoom";
import HallwayRoom, { STOPS as HALLWAY_STOPS, DOORS as HALLWAY_DOORS } from "./HallwayRoom";
import OperatoryRoom, { STOPS as OPERATORY_STOPS, DOORS as OPERATORY_DOORS } from "./OperatoryRoom";
import ImagingRoom, { STOPS as IMAGING_STOPS, DOORS as IMAGING_DOORS } from "./ImagingRoom";
import ConsultRoom, { STOPS as CONSULT_STOPS, DOORS as CONSULT_DOORS } from "./ConsultRoom";
import BillingRoom, { STOPS as BILLING_STOPS, DOORS as BILLING_DOORS } from "./BillingRoom";
import RecordsRoom, { STOPS as RECORDS_STOPS, DOORS as RECORDS_DOORS } from "./RecordsRoom";
import ProvidersRoom, { STOPS as PROVIDERS_STOPS, DOORS as PROVIDERS_DOORS } from "./ProvidersRoom";

/** Every room: its component, camera stops (one per page section) and doors. Keys are route ids. */
export const ROOMS = {
  entrance: { Room: EntranceRoom, stops: ENTRANCE_STOPS, doors: ENTRANCE_DOORS },
  reception: { Room: ReceptionRoom, stops: RECEPTION_STOPS, doors: RECEPTION_DOORS },
  hallway: { Room: HallwayRoom, stops: HALLWAY_STOPS, doors: HALLWAY_DOORS },
  operatory: { Room: OperatoryRoom, stops: OPERATORY_STOPS, doors: OPERATORY_DOORS },
  imaging: { Room: ImagingRoom, stops: IMAGING_STOPS, doors: IMAGING_DOORS },
  consult: { Room: ConsultRoom, stops: CONSULT_STOPS, doors: CONSULT_DOORS },
  billing: { Room: BillingRoom, stops: BILLING_STOPS, doors: BILLING_DOORS },
  records: { Room: RecordsRoom, stops: RECORDS_STOPS, doors: RECORDS_DOORS },
  providers: { Room: ProvidersRoom, stops: PROVIDERS_STOPS, doors: PROVIDERS_DOORS },
};

/** The five stations, in the order a member moves through them: a room + page section + focal object each. */
export const STATIONS = [
  { id: "chatbot",  room: "imaging",   section: "ask",        focus: "monitor",  label: "Decode Plan",        tag: "Req 2", feature: "Plain-English coverage chat" },
  { id: "chair",    room: "operatory", section: "describe",   focus: "chair",    label: "Add Planned Care",   tag: "Req 1", feature: "Procedure entry + tooth picker" },
  { id: "checkout", room: "billing",   section: "line-items", focus: "terminal", label: "Your Cost",          tag: "Req 2", feature: "In- vs out-of-network ledger" },
  { id: "calendar", room: "consult",   section: "this-year",  focus: "calendar", label: "Plan Year Strategy", tag: "Req 3", feature: "Care sequencing + year-end alerts" },
  { id: "jar",      room: "records",   section: "annual-max", focus: "jar",      label: "Annual Max Tracker", tag: "Bonus 1", feature: "Usage metrics" },
];

/** The camera stop for each section id on a room's page; unknown ids reuse the previous stop. */
function stopsFor(room, sectionIds) {
  const all = ROOMS[room]?.stops ?? [];
  if (!all.length) return [];
  const byId = new Map(all.map((s) => [s.id, s]));
  let last = all[0];
  const out = sectionIds.map((id) => (last = byId.get(id) ?? last));
  return out.length ? out : [all[0]];
}

/* ------------------------------- camera tuning ------------------------------- */
const FOV = 34; // natural lens: rooms read as rooms; close-ups still fill the view beside the text panel
const NEAR = 0.1;
const NEAR_TRANSIT = 0.01; // while flying through door openings
const WIDE_SCREEN = 1024; // above this the text panels sit on the left…
const SHIFT = 0.18; // …so the projection shifts the subject right of centre
const HOLD = 0.6; // share of each section spent on its station before gliding to the next
const BREATH_ORBIT = THREE.MathUtils.degToRad(1.5); // peak orbit while a section is held
const BREATH_PAN = 0.05; // m, peak sideways drift while held
const PULL_BACK = 0.14; // extra distance mid-glide between far-apart stops
const PULL_BACK_LIFT = THREE.MathUtils.degToRad(4); // and a little extra height
const LAMBDA = 3.2; // damping for THREE.MathUtils.damp (lower = softer follow)
const LOOK_AHEAD = 0.9; // m along the fly-through path the camera looks toward
const SWAP_FADE = 0.3; // m either side of the door swap over which the overlay fades in/out

const smooth = (x) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/** The door to use between two rooms: the one leading there, else the hallway door, else any. */
function pickDoor(doors, otherRoom) {
  return doors.find((d) => d.id === otherRoom) ?? doors.find((d) => d.id === "hallway") ?? doors[0] ?? null;
}

/** Centre, normal (into the room) and sideways axis toward the latch for a door. */
function doorFrame(door) {
  const { center, normal } = doorPose(door);
  const n = v3(normal);
  // Doors hinge on their local -x side; local +x is the latch side (world +x on the back wall, -z on the left).
  const latch = door.wall === "left" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(1, 0, 0);
  return { c: v3(center), n, latch };
}

/** Camera offset from its target as distance / azimuth / elevation (the inverse of roomKit's view()). */
function toSpherical(camera, target) {
  const dx = camera.x - target.x, dy = camera.y - target.y, dz = camera.z - target.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  return { d, az: Math.atan2(dx, dz), el: Math.asin(THREE.MathUtils.clamp(dy / d, -1, 1)) };
}

/** Shortest signed angle from a to b. */
function angleDelta(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

/**
 * Pose for a scroll position: hold on a station, then orbit to the next.
 *
 * Between stops the camera moves on a sphere around a moving target (target follows a
 * spline; distance, azimuth and elevation ease), so it arcs around the room instead of
 * cutting across it, and the subject stays framed the whole way. It pulls back a little
 * mid-move when the targets are far apart. While held, it "breathes": a small orbit + pan
 * that is zero at both ends of the hold, so nothing jumps when a glide starts or ends.
 */
function stationPose(path, p, outPos, outTarget) {
  const { stops, tgt, sph } = path;
  const n = stops.length;
  const q = THREE.MathUtils.clamp(p, 0, n - 1);
  const i = Math.min(Math.floor(q), n - 1);
  const f = q - i;
  let k = 0;
  let breath = 0;
  if (i === n - 1 || f <= HOLD) {
    breath = Math.sin(Math.PI * Math.min(f / HOLD, 1));
  } else {
    k = smooth((f - HOLD) / (1 - HOLD));
  }

  const a = sph[i];
  const b = sph[Math.min(i + 1, n - 1)];
  if (n === 1) outTarget.copy(tgt.points[0]);
  else tgt.getPoint((i + k) / (n - 1), outTarget);

  const travel = a.target.distanceTo(b.target);
  const pullBack = 1 + PULL_BACK * Math.sin(Math.PI * k) * Math.min(travel / 2, 1);
  const d = THREE.MathUtils.lerp(a.d, b.d, k) * pullBack;
  const az = a.az + angleDelta(a.az, b.az) * k + breath * BREATH_ORBIT;
  const el = THREE.MathUtils.lerp(a.el, b.el, k) + Math.sin(Math.PI * k) * PULL_BACK_LIFT;

  outPos.set(
    outTarget.x + Math.sin(az) * Math.cos(el) * d,
    outTarget.y + Math.sin(el) * d,
    outTarget.z + Math.cos(az) * Math.cos(el) * d,
  );

  // Sideways drift along the camera's right axis, moving target and camera together.
  if (breath) {
    const pan = breath * BREATH_PAN;
    const rx = Math.cos(az), rz = -Math.sin(az);
    outPos.x += rx * pan;
    outPos.z += rz * pan;
    outTarget.x += rx * pan;
    outTarget.z += rz * pan;
  }
}

const easeInOutCubic = (x) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function setNear(camera, near) {
  if (camera.near === near) return;
  camera.near = near;
  camera.updateProjectionMatrix();
}

/**
 * Follows the stations while settled; runs the door fly-through when `move` is set.
 * Transition legs: approach (door opens 200 ms before arrival) → dwell → through → swap → enter.
 */
function CameraRig({ stops, getProgress, reduced, move, shown, onDoorOpen, onSwap, onDone, fadeRef }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = useRef(new THREE.Vector3());
  const wantP = useMemo(() => new THREE.Vector3(), []);
  const wantT = useMemo(() => new THREE.Vector3(), []);
  const aheadV = useMemo(() => new THREE.Vector3(), []);
  const ready = useRef(false);
  const tr = useRef(null);

  const path = useMemo(() => {
    if (!stops.length) return null;
    const tgt = stops.map((s) => v3(s.target));
    return {
      stops,
      tgt: tgt.length > 1 ? new THREE.CatmullRomCurve3(tgt, false, "centripetal") : { points: tgt },
      sph: stops.map((s, i) => ({ target: tgt[i], ...toSpherical(v3(s.camera), tgt[i]) })),
    };
  }, [stops]);

  // Shift the projection (not the camera) so the subject sits right of the text panels on wide screens.
  useEffect(() => {
    if (size.width >= WIDE_SCREEN) camera.setViewOffset(size.width, size.height, -size.width * SHIFT, 0, size.width, size.height);
    else camera.clearViewOffset();
  }, [camera, size.width, size.height]);

  const fade = (o) => {
    if (fadeRef?.current) fadeRef.current.style.opacity = String(THREE.MathUtils.clamp(o, 0, 1));
  };

  const startMove = () => {
    const from = ROOMS[move.from], to = ROOMS[move.to];
    const exitDoor = from ? pickDoor(from.doors, move.to) : null;
    const plan = { key: move.key, to: move.to, from: move.from, t: 0, opened: false, swapped: false };
    plan.enterDoor = to ? pickDoor(to.doors, move.from) : null;
    if (reduced || !exitDoor) {
      plan.phase = "fadeOut";
    } else {
      const { c, n, latch } = doorFrame(exitDoor);
      const side = latch.clone().multiplyScalar(0.12);
      const front = c.clone().addScaledVector(n, 1.4).add(side).setY(1.48);
      const pass = c.clone().addScaledVector(n, -0.15).add(side).setY(1.45);
      plan.phase = "timeline";
      plan.doorId = exitDoor.id;
      plan.pass = pass;
      plan.exitDir = n.clone().negate(); // straight through the opening

      // Leg 1: room from -> door threshold. The midpoint eases down toward eye height.
      const mid = camera.position.clone().lerp(front, 0.5);
      mid.y = THREE.MathUtils.lerp(camera.position.y, 1.5, 0.6);
      plan.leg1 = new THREE.CatmullRomCurve3([camera.position.clone(), mid, front, pass], false, "centripetal");

      // Destination in the next room:
      const destStop = to?.stops[0];
      const destPos = destStop ? v3(destStop.camera) : camera.position.clone();
      const destLook = destStop ? v3(destStop.target) : look.current.clone();
      plan.destPos = destPos;
      plan.destLook = destLook;

      // Leg 2: door threshold -> destination station
      let enterStart = pass, enterClear = front;
      if (plan.enterDoor) {
        const inFrame = doorFrame(plan.enterDoor);
        const inSide = inFrame.latch.clone().multiplyScalar(0.12);
        enterStart = inFrame.c.clone().addScaledVector(inFrame.n, -0.15).add(inSide).setY(1.45);
        enterClear = inFrame.c.clone().addScaledVector(inFrame.n, 1.2).add(inSide).setY(1.48);
      }
      const mid2 = destPos.clone().lerp(enterClear, 0.4);
      mid2.y = THREE.MathUtils.lerp(destPos.y, 1.5, 0.6);
      plan.leg2 = new THREE.CatmullRomCurve3([enterStart, enterClear, mid2, destPos], false, "centripetal");

      // Arc lengths: the camera keeps one speed across both legs, so there is no jolt at the swap.
      plan.L1 = Math.max(plan.leg1.getLength(), 1e-3);
      plan.L2 = Math.max(plan.leg2.getLength(), 1e-3);
      plan.startLook = look.current.clone();
      plan.closeStart = Infinity;

      setNear(camera, NEAR_TRANSIT);
      onDoorOpen(plan.doorId);
      useSceneStore.getState().setDoorTransition({ doorId: plan.doorId, time: 0, active: true });
    }
    tr.current = plan;
  };

  const finish = () => {
    tr.current = null;
    fade(0);
    setNear(camera, NEAR);
    useSceneStore.getState().setDoorTransition({ doorId: null, time: 0, active: false });
    onDone();
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    if (move && (!tr.current || tr.current.key !== move.key)) startMove();
    const plan = tr.current;

    if (plan) {
      plan.t += dt;

      if (plan.phase === "fadeOut") {
        fade(plan.t / 0.2);
        if (plan.t >= 0.2 && !plan.swapped) {
          plan.swapped = true;
          onSwap(plan.to, null);
        }
        if (plan.t >= 0.4) return finish();
        camera.lookAt(look.current);
        return;
      }

      // One eased move over both legs (slow start, slow landing), measured in metres of path.
      const { flyStart, flyEnd, closeAt, closeAfterSwap, closeEnd, holdOpen } = DOOR_SWING_TIMELINE_CONFIG.camera;
      const u = easeInOutCubic((plan.t - flyStart) / (flyEnd - flyStart));
      const s = u * (plan.L1 + plan.L2);

      if (s < plan.L1) {
        plan.leg1.getPointAt(s / plan.L1, camera.position);
        const a = s + LOOK_AHEAD;
        if (a < plan.L1) plan.leg1.getPointAt(a / plan.L1, aheadV);
        else aheadV.copy(plan.pass).addScaledVector(plan.exitDir, a - plan.L1);
      } else {
        if (!plan.swapped) {
          plan.swapped = true;
          // The door we come in through starts closing once the camera is well clear of it.
          plan.closeStart = Math.max(closeAt, plan.t + closeAfterSwap);
          onSwap(plan.to, plan.enterDoor?.id ?? null);
        }
        const s2 = s - plan.L1;
        plan.leg2.getPointAt(Math.min(s2 / plan.L2, 1), camera.position);
        const a = s2 + LOOK_AHEAD;
        if (a < plan.L2) plan.leg2.getPointAt(a / plan.L2, aheadV);
        else aheadV.copy(plan.destLook);
      }

      // Look along the path, blending in from where we were looking and out to the first station.
      look.current.copy(aheadV);
      look.current.lerp(plan.startLook, 1 - smooth(u / 0.22));
      look.current.lerp(plan.destLook, smooth((u - 0.62) / 0.38));
      camera.lookAt(look.current);

      // Dip to the overlay right at the swap so the room change never shows.
      fade(1 - smooth(Math.abs(s - plan.L1) / SWAP_FADE));

      // Door clock: the exit door runs the open half; after the swap the entry door holds open,
      // then closes behind the camera.
      const doorTime = !plan.swapped
        ? plan.t
        : plan.t < plan.closeStart
          ? holdOpen
          : closeAt + (plan.t - plan.closeStart);
      useSceneStore.getState().setDoorTransition({
        doorId: plan.swapped ? (plan.enterDoor?.id ?? plan.doorId) : plan.doorId,
        time: doorTime,
        active: true,
      });

      if (u >= 1 && doorTime >= closeEnd) return finish();
      return;
    }

    if (!path) return;
    stationPose(path, getProgress(), wantP, wantT);
    if (!ready.current || reduced) {
      ready.current = true;
      camera.position.copy(wantP);
      look.current.copy(wantT);
    } else {
      const d = THREE.MathUtils.damp;
      camera.position.set(d(camera.position.x, wantP.x, LAMBDA, dt), d(camera.position.y, wantP.y, LAMBDA, dt), d(camera.position.z, wantP.z, LAMBDA, dt));
      look.current.set(d(look.current.x, wantT.x, LAMBDA, dt), d(look.current.y, wantT.y, LAMBDA, dt), d(look.current.z, wantT.z, LAMBDA, dt));
    }
    camera.lookAt(look.current);
  });

  return null;
}

/**
 * @param {{
 *   room: string,
 *   sections?: string[],
 *   getProgress?: () => number,
 *   active?: number,
 *   reducedMotion?: boolean,
 *   fadeRef?: { current: HTMLElement | null },
 *   jarFill?: number,
 *   onStationChange?: (stationId: string) => void,
 * }} props
 */
export default function DentalOffice({
  room,
  sections = [],
  getProgress = () => 0,
  active = 0,
  reducedMotion = false,
  fadeRef,
  jarFill = 0.6,
  onStationChange,
}) {
  const [shown, setShown] = useState(room);
  const [openDoor, setOpenDoor] = useState(null);
  const [move, setMove] = useState(null);
  const moves = useRef(0);

  // A new route starts a fly-through; one more queued change runs when this one lands.
  useEffect(() => {
    if (move || room === shown || !ROOMS[room]) return;
    if (!ROOMS[shown]) {
      setShown(room);
      return;
    }
    moves.current += 1;
    setMove({ key: moves.current, from: shown, to: room });
  }, [room, shown, move]);

  const stops = useMemo(() => stopsFor(room, sections), [room, sections]);
  const focus = room === shown ? stops[Math.min(active, stops.length - 1)]?.focus : undefined;

  const cb = useRef(onStationChange);
  cb.current = onStationChange;
  const section = sections[active];
  useEffect(() => {
    const station = STATIONS.find((s) => s.room === shown && s.section === section);
    if (station) cb.current?.(station.id);
  }, [shown, section]);

  const onDoorOpen = useCallback((id) => setOpenDoor(id), []);
  const onSwap = useCallback((to, enterDoorId) => {
    setShown(to);
    setOpenDoor(enterDoorId);
  }, []);
  const onDone = useCallback(() => {
    setOpenDoor(null);
    setMove(null);
  }, []);

  const Room = ROOMS[shown]?.Room;
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: FOV, near: NEAR, far: 80, position: stops[0]?.camera ?? [8, 6, 9] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Lights />
      {Room && <Room key={shown} highlight={focus} openDoor={openDoor} jarFill={jarFill} />}
      <CameraRig
        stops={stops}
        getProgress={getProgress}
        reduced={reducedMotion}
        move={move}
        shown={shown}
        onDoorOpen={onDoorOpen}
        onSwap={onSwap}
        onDone={onDone}
        fadeRef={fadeRef}
      />
    </Canvas>
  );
}
