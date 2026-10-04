/**
 * DentalOffice.jsx — the 3D office behind the site (React Three Fiber).
 *
 * One kit room is mounted at a time, framed tight on the section the reader is on. Changing room
 * flies the camera out through a door: the door swings open, the camera passes through the
 * opening, and it comes in through the matching door of the next room, which closes behind it.
 *
 * This grew out of the single-room DentalOffice prototype (see git history). Its eight STATIONS now
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
import EntranceRoom, { STOPS as ENTRANCE_STOPS, DOORS as ENTRANCE_DOORS } from "./EntranceRoom";
import ReceptionRoom, { STOPS as RECEPTION_STOPS, DOORS as RECEPTION_DOORS } from "./ReceptionRoom";
import HallwayRoom, { STOPS as HALLWAY_STOPS, DOORS as HALLWAY_DOORS } from "./HallwayRoom";
import OperatoryRoom, { STOPS as OPERATORY_STOPS, DOORS as OPERATORY_DOORS } from "./OperatoryRoom";
import ImagingRoom, { STOPS as IMAGING_STOPS, DOORS as IMAGING_DOORS } from "./ImagingRoom";
import ConsultRoom, { STOPS as CONSULT_STOPS, DOORS as CONSULT_DOORS } from "./ConsultRoom";
import BillingRoom, { STOPS as BILLING_STOPS, DOORS as BILLING_DOORS } from "./BillingRoom";
import RecordsRoom, { STOPS as RECORDS_STOPS, DOORS as RECORDS_DOORS } from "./RecordsRoom";

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
};

/** The prototype's eight stations, now a room + page section + focal object each. */
export const STATIONS = [
  { id: "reception", room: "reception", section: "check-in",   focus: "desk",     label: "Check-in",   tag: "Req 1",   feature: "Plan details" },
  { id: "chair",     room: "operatory", section: "describe",   focus: "chair",    label: "Procedure",  tag: "Req 1",   feature: "Describe your care" },
  { id: "xray",      room: "imaging",   section: "coverage",   focus: "xray",     label: "Coverage",   tag: "Req 2",   feature: "Plain-English translation" },
  { id: "checkout",  room: "billing",   section: "line-items", focus: "terminal", label: "Your Cost",  tag: "Req 2",   feature: "Cost breakdown" },
  { id: "calendar",  room: "consult",   section: "this-year",  focus: "calendar", label: "Plan Year",  tag: "Req 3",   feature: "Sequence your care" },
  { id: "jar",       room: "records",   section: "annual-max", focus: "jar",      label: "Annual Max", tag: "Bonus 1", feature: "Usage tracker" },
  { id: "doors",     room: "billing",   section: "network",    focus: "network",  label: "Network",    tag: "Bonus 2", feature: "In- vs out-of-network" },
  { id: "board",     room: "records",   section: "reminders",  focus: "board",    label: "Reminders",  tag: "Bonus 3", feature: "Year-end alerts" },
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
const FOV = 24; // narrow lens: focal objects fill the view beside the text panel
const NEAR = 0.1;
const NEAR_TRANSIT = 0.01; // while flying through door openings
const WIDE_SCREEN = 1024; // above this the text panels sit on the left…
const SHIFT = 0.18; // …so the projection shifts the subject right of centre
const HOLD = 0.7; // share of each section spent on its station before gliding to the next
const ORBIT = THREE.MathUtils.degToRad(5); // micro-orbit across a held section
const LAMBDA = 4; // damping for THREE.MathUtils.damp
const APPROACH = 0.85; // s, glide to the point in front of the door
const OPEN_LEAD = 0.2; // s, the door starts opening this long before the camera gets there
const DWELL = 0.35; // s, let the door finish swinging before passing through
const THROUGH = 0.45; // s, through the opening
const ENTER = 1.1; // s, from the next room's door to its first station
const FADE = 0.2; // s, fade to/from the overlay around the room swap

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

/** Pose for a scroll position: hold on a station (with a slow 5° orbit), then glide to the next. */
function stationPose(path, p, outPos, outTarget) {
  const { stops, pos, tgt } = path;
  const n = stops.length;
  const q = THREE.MathUtils.clamp(p, 0, n - 1);
  const i = Math.min(Math.floor(q), n - 1);
  const f = q - i;
  let s, drift;
  if (i === n - 1 || f <= HOLD) {
    s = i;
    drift = Math.min(f / HOLD, 1) * 2 - 1;
  } else {
    const k = smooth((f - HOLD) / (1 - HOLD));
    s = i + k;
    drift = 1 - 2 * k;
  }
  if (n === 1) {
    outPos.copy(pos.points[0]);
    outTarget.copy(tgt.points[0]);
  } else {
    pos.getPoint(s / (n - 1), outPos);
    tgt.getPoint(s / (n - 1), outTarget);
  }
  // Micro-movement: orbit the camera around its target by up to ±2.5° as the section scrolls.
  const angle = drift * (ORBIT / 2);
  const dx = outPos.x - outTarget.x, dz = outPos.z - outTarget.z;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  outPos.x = outTarget.x + dx * cos + dz * sin;
  outPos.z = outTarget.z - dx * sin + dz * cos;
}

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
  const ready = useRef(false);
  const tr = useRef(null);

  const path = useMemo(() => {
    if (!stops.length) return null;
    const pts = (k) => stops.map((s) => v3(s[k]));
    const pos = pts("camera");
    const tgt = pts("target");
    return {
      stops,
      pos: pos.length > 1 ? new THREE.CatmullRomCurve3(pos, false, "centripetal") : { points: pos },
      tgt: tgt.length > 1 ? new THREE.CatmullRomCurve3(tgt, false, "centripetal") : { points: tgt },
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
    const plan = { key: move.key, to: move.to, from: move.from, t: 0, opened: false };
    plan.enterDoor = to ? pickDoor(to.doors, move.from) : null;
    if (reduced || !exitDoor) {
      plan.phase = "fadeOut";
    } else {
      const { c, n, latch } = doorFrame(exitDoor);
      const side = latch.clone().multiplyScalar(0.12);
      const front = c.clone().addScaledVector(n, 1.7).add(side).setY(1.5);
      plan.phase = "approach";
      plan.doorId = exitDoor.id;
      plan.approach = new THREE.CatmullRomCurve3(
        [camera.position.clone(), camera.position.clone().lerp(front, 0.55).setY(Math.max(1.5, camera.position.y * 0.7)), front],
        false,
        "centripetal",
      );
      plan.through = new THREE.CatmullRomCurve3(
        [front, c.clone().addScaledVector(n, 0.45).add(side).setY(1.45), c.clone().addScaledVector(n, -0.05).add(side).setY(1.45)],
        false,
        "centripetal",
      );
      plan.lookFrom = look.current.clone();
      plan.lookDoor = c.clone().setY(1.3);
      plan.lookBeyond = c.clone().addScaledVector(n, -3).setY(1.35);
      setNear(camera, NEAR_TRANSIT);
    }
    tr.current = plan;
  };

  const startEnter = (plan) => {
    const first = path?.stops[0];
    if (!first) return finish();
    stationPose(path, 0, wantP, wantT);
    if (reduced || !plan.enterDoor) {
      camera.position.copy(wantP);
      look.current.copy(wantT);
      camera.lookAt(look.current);
      plan.phase = "fadeIn";
      plan.t = 0;
      return;
    }
    const { c, n, latch } = doorFrame(plan.enterDoor);
    const side = latch.clone().multiplyScalar(0.12);
    const start = c.clone().addScaledVector(n, -0.05).add(side).setY(1.45);
    plan.enter = new THREE.CatmullRomCurve3(
      [start, c.clone().addScaledVector(n, 0.6).add(side).setY(1.45), c.clone().addScaledVector(n, 1.8).setY(1.5), wantP.clone()],
      false,
      "centripetal",
    );
    plan.lookFrom = c.clone().addScaledVector(n, 3).setY(1.35);
    plan.lookTo = wantT.clone();
    camera.position.copy(start);
    look.current.copy(plan.lookFrom);
    camera.lookAt(look.current);
    plan.phase = "enter";
    plan.t = 0;
  };

  const finish = () => {
    tr.current = null;
    fade(0);
    setNear(camera, NEAR);
    onDone();
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    if (move && (!tr.current || tr.current.key !== move.key)) startMove();
    const plan = tr.current;

    if (plan) {
      plan.t += dt;
      if (plan.phase === "approach") {
        const k = smooth(plan.t / APPROACH);
        plan.approach.getPoint(k, camera.position);
        look.current.lerpVectors(plan.lookFrom, plan.lookDoor, k);
        if (!plan.opened && plan.t >= APPROACH - OPEN_LEAD) {
          plan.opened = true;
          onDoorOpen(plan.doorId);
        }
        if (plan.t >= APPROACH) Object.assign(plan, { phase: "dwell", t: 0 });
      } else if (plan.phase === "dwell") {
        if (plan.t >= DWELL) Object.assign(plan, { phase: "through", t: 0 });
      } else if (plan.phase === "through") {
        const k = smooth(plan.t / THROUGH);
        plan.through.getPoint(k, camera.position);
        look.current.lerpVectors(plan.lookDoor, plan.lookBeyond, k);
        fade((plan.t - (THROUGH - FADE)) / FADE);
        if (plan.t >= THROUGH) {
          fade(1);
          Object.assign(plan, { phase: "swap", t: 0, swapped: false });
        }
      } else if (plan.phase === "fadeOut") {
        fade(plan.t / FADE);
        if (plan.t >= FADE) Object.assign(plan, { phase: "swap", t: 0, swapped: false });
      }
      if (plan.phase === "swap") {
        if (!plan.swapped) {
          plan.swapped = true;
          onSwap(plan.to, plan.enterDoor?.id ?? null);
        } else if (shown === plan.to && path) {
          startEnter(plan);
        }
      } else if (plan.phase === "enter") {
        const k = smooth(plan.t / ENTER);
        plan.enter.getPoint(k, camera.position);
        look.current.lerpVectors(plan.lookFrom, plan.lookTo, smooth(plan.t / (ENTER * 0.8)));
        fade(1 - plan.t / FADE);
        if (plan.t >= ENTER) return finish();
      } else if (plan.phase === "fadeIn") {
        fade(1 - plan.t / FADE);
        if (plan.t >= FADE) return finish();
      }
      camera.lookAt(look.current);
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
