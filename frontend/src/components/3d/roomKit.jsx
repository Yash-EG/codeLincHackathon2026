/**
 * roomKit.jsx — shared building blocks for the Lincoln Dental 3D rooms (React Three Fiber).
 * Used by ReceptionRoom.jsx, HallwayRoom.jsx, ConsultRoom.jsx, OperatoryRoom.jsx.
 *
 * Install:  npm i three @react-three/fiber @react-three/drei
 *
 * Nothing is downloaded: textures are painted on <canvas> at runtime and the reflections come
 * from drei <Lightformer>s, so the rooms work offline (venue Wi-Fi can't break the demo).
 *
 * Coordinates (every room): metres, y up, floor W×D centred on the origin.
 *   Back wall  → z = -D/2  (objects face +z)
 *   Left wall  → x = -W/2  (objects face +x)
 *   Camera looks in from +x/+z, like the reference renders.
 *
 * Quick preview while building:
 *   import Reception, { STOPS } from "./ReceptionRoom";
 *   <RoomPreview Room={Reception} stops={STOPS} />          // buttons to jump between camera stops
 *   <RoomPreview Room={Reception} stops={STOPS} debug />    // free orbit; press P to log the camera
 *
 * In the real site (see SITE_NAVIGATION_PLAN.md):
 *   <RoomStage stops={STOPS} progress={scrollIndex}>        // 0 … STOPS.length-1, fractional = between stops
 *     <Reception highlight={hoveredDoorId} openDoor={leavingThrough} onSelect={goToRoom} />
 *   </RoomStage>
 * Next.js: import the stage with dynamic(() => import(...), { ssr: false }).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "../../store/sceneStore";
import { getDoorTimelineState } from "./motionConfig";

/* ================================ constants ================================ */
export const ROOM = { W: 6, D: 5, H: 3, T: 0.16, SLAB: 0.16 };

export const C = {
  cut: "#f3efe9", // white cut edges of walls/slab
  cream: "#efe9e1",
  white: "#f7f5f0",
  sage: "#90b39f", // wainscot
  sageWall: "#8eab91", // reception left wall
  mintWall: "#b5d5c4", // reception back wall
  maroon: "#8a1538",
  orange: "#f26b21",
  chrome: "#dfe3e6",
  dark: "#2f3740",
  leaf: "#4f7d4b",
  upholstery: "#7f998c", // Muted sage perforated upholstery
  mintGlow: "#3fbf8f",
};

/* =========================== PBR Base64 Data Maps =========================== */
const UPHOLSTERY_NORMAL_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABc0lEQVR42l2TvaoCMRCF84aW2wg+gLBgrXFj1FZY8AEEmy19MLGzuSDjfMk9u3tvMUzm78xJZhJiNMvZ7Hw2O53Mdruqt9t67roq+331I4dDrSEnUEgCTs4EEIqVKFBAOB+PVRMLKZnBAjQS1BGbBM7EKVAueQIuACSBiqYTTFSkayH4lAM7agoABaKFTQcBiCparAQMyAiAQ/TxEUwOkjYf6+LEUsDEqQkYdCRIB12hb3/s2rwsLZ62dt26rceeTyuM3VKlhzN74rB+2W3lAMu3rVw3bsduaiZGga7QwiCIXNLHHulp9/QuwEvXC7c37qeBcsseiLqYFAZ+Hq7O4OYM7s7AdeN2/GWpMY5T0IYRwCbQ9/4GgwM8/A1ct27rofXw6KC5aoy6Dh0ScvEp5L/31sKVTdQ/0Py191xH/0RbimjJlBN0f22ZGGmBdCauKwigXAFDI5zPGarlQfPUDdGu4Kc2YHAgqBX+v3Fa3/lHUoMvWQH8q1I51lYAAAAASUVORK5CYII=";

const UPHOLSTERY_ROUGHNESS_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABEUlEQVR42oWTSQ6EMAwE/f9HAglheQOXjMpSoQgxMwcri93txmlinudObNvWW2u57vvej+PopZR+nmeu1LCSd88aFK7rmgDCJEDuCc611mxgbpqm3IeXFhEUsNKNVZUok5BcEizLcgMpooA7lXDPGQBhvZ8cfisAZDkDkuS4IzgTEKBQNfkJMFIEwE6QXtd1ByAHCpiV+gDo1FFBB84j2IDYgdswZ+BLAPwGNsg7H/ahNF8Dwl8EdHaQOYNRutP9R6DxqE8Cuivfp3oD61SVQhYC9ICmepLoDx2qI0PnSeB7ux87Ojj2ksXoPJPj52g0/UEdTf13wgE6FF34tLLPrPFUHDpKAgoYjmQq84dSunb+ALQbsd+K9sKXAAAAAElFTkSuQmCC";

const SURGICAL_STEEL_NORMAL_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAS0lEQVR42q3RSwqAQAwE0T62CGrD+Dn2WHeoWTyoVSBJus9ppA8hpBshpIMQ0o8QFgwoIcS/8SaE9CKE9CWEBUfUb9QrnISQHoTwA/ZM/0/UOo+oAAAAAElFTkSuQmCC";

const SURGICAL_STEEL_ROUGHNESS_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUklEQVR42qXSwQkAIBADwbR0+FAUf56CYP/lxCL2MQ1sojGGCd17Tei9Z0IRYUKlFBNaa5lQrdWEzjkm1Hs3ocw0ob23CR6xtWaCrzDnNIGv/AFfO7mgHj9NUQAAAABJRU5ErkJggg==";

const PORCELAIN_NORMAL_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAATElEQVR42q3SSwqAQBAD0RzbHxhBxVuPdYeaxYNaNk3SjmGkDyGkHyFMuED/YCOEdCGEdCeE9CKE9CWECTu4CSE9CWHCDlZCSA9C+AGF+/4fKuS0bwAAAABJRU5ErkJggg==";

const PORCELAIN_ROUGHNESS_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA/0lEQVR42l2TUQ6FMAgEOZNatd7/Xn0ZkjH7/KilsN3CgnVd17rve40x1nmevXPetm0dx9EL/77va87ZcWLY3C2dALyATfB5ngb7COckZTUBBkEWYAjxJyEE7CzwxCEvgwK8YJqZETa7WfFgZyABiwC+JONsqfi8g118ksCg6ZqNOF7Fx94aCLAuVU5Rs8S0wZZ1Wa8kX8Wz1Zb1lkBA5bOl9trdOYGcvedAAhkFqrq62O7MqDNw8nTYvmyVXVE8sa1BXvRFRTUjX8Vvtu8op9r22WkDoNrfIRP71wUn7juV+uyAGWJXpuo/kf1XD2dAAcWXrTEDbWu2jPxDnQfWD+a8oER+vak+AAAAAElFTkSuQmCC";

const QUARTZ_COLOR_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAkUlEQVR42pWSsQ6AIAxE7/+/w9HJL3Fy8B9cTJwxDE3Ocgc4NCnH8WgpOI+9bOtSnvsqNee1irrPOZxZ6UpDpobRgbMXjpwPRWQ/HHmkN4BRqLa6j6haU9VAGfhgzUOPETMIo7LVzQ1gZgpcAWtQpt7rWwCDcp+qylhjZt68l0HoTYA1/okfgBLdjRn46ye6Fl++7q8WaSb2vQAAAABJRU5ErkJggg==";

const QUARTZ_NORMAL_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAiUlEQVR42q2SSw6AIAxEPTOgBPwRjPjDM1dZsNBUrehiIC3p5NFMZgyAYADhjqr4sb5TNnT4w4r0nEcM0GG5U4xEgnD4hY4ctPAHgjciG4gSoB8QA5dfDymdStBcmxTuxResJBLMnr60uk5cYpTsCAYcCVF7qiebSMDYA4ESyCD7ECTfIj39Y5Q3IDT97Bd5SBkAAAAASUVORK5CYII=";

const QUARTZ_ROUGHNESS_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAX0lEQVR42mPw8vL6n5OT8x9EwzA6Hx9mwKUYmzg2MQZcmol1BQOpTkZXz0CKRpwuINZWrGGAz/nEeI2BkEZCUcxAbGBRLRZIcgHZBhCTCmF86ruA2DxAdBgQMpDipAwAtMboOBFB98wAAAAASUVORK5CYII=";

const OAK_FLOOR_NORMAL_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAX0lEQVR42u3WMREAMAhDUQzhqkLQVgkYotFAlg5/yJp71w4hKu9s03kmFacjqma26bqTitMBAAAAAAAAfABoFSzTrTlWnI5w99y9J8J9QvcLAQAAAAAAgA8A5p6798QDtI7JfoqU5/cAAAAASUVORK5CYII=";

const OAK_FLOOR_ROUGHNESS_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAARUlEQVR42u3VoRUAMAwC0ey/DBtkMEyqukAriDhxlvcdZXuSlaR57Y78bAAAAAAAAAB5QPyOVwC6OxIAAAAAAACwB5DsAEANHFCjarfrAAAAAElFTkSuQmCC";

/* ================================ textures ================================= */
const cache = new Map();
const cached = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};

const texLoader = new THREE.TextureLoader();
function dataTexture(base64, { color = false, repeat } = {}) {
  const t = texLoader.load(base64);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 8;
  return t;
}

export function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function canvasTexture(w, h, draw, { color = true, repeat } = {}) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function noise(g, w, h, seed, lo, hi) {
  const img = g.createImageData(w, h);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = lo + r() * (hi - lo);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/* --- oak planks (colour + bump share one layout so seams line up; tiles seamlessly) --- */
function plankLayout(seed) {
  const S = 1024, rows = 8, rh = S / rows, r = rng(seed), planks = [];
  for (let row = 0; row < rows; row++) {
    const off = r() * S;
    let x = off;
    while (x < off + S - 1) {
      let len = 300 + r() * 380;
      if (x + len > off + S - 150) len = off + S - x;
      planks.push({ x, y: row * rh, len, hu: 31 + r() * 5, sa: 40 + r() * 12, li: 62 + r() * 10, seed: 1 + Math.floor(r() * 1e6) });
      x += len;
    }
  }
  return { S, rh, planks };
}

function drawPlanks(g, { S, rh, planks }, bump) {
  g.fillStyle = bump ? "#808080" : "#c89a66";
  g.fillRect(0, 0, S, S);
  for (const shift of [0, -S]) {
    for (const p of planks) {
      const x0 = p.x + shift, pr = rng(p.seed);
      g.save();
      g.beginPath();
      g.rect(x0, p.y, p.len, rh);
      g.clip();
      if (bump) g.fillStyle = "#b4b4b4";
      else {
        const grd = g.createLinearGradient(x0, 0, x0 + p.len, 0);
        grd.addColorStop(0, `hsl(${p.hu},${p.sa}%,${p.li}%)`);
        grd.addColorStop(1, `hsl(${p.hu + 2},${p.sa}%,${p.li - 4}%)`);
        g.fillStyle = grd;
      }
      g.fillRect(x0, p.y, p.len, rh);
      for (let k = 0; k < 18; k++) {
        const y0 = p.y + pr() * rh, amp = 1 + pr() * 3, f = 0.005 + pr() * 0.01, ph = pr() * 6;
        g.strokeStyle = bump ? `rgba(0,0,0,${0.05 + pr() * 0.08})` : `rgba(110,70,35,${0.05 + pr() * 0.12})`;
        g.lineWidth = 0.6 + pr() * 1.6;
        g.beginPath();
        for (let x = x0; x <= x0 + p.len; x += 8) {
          const y = y0 + Math.sin(x * f + ph) * amp;
          if (x === x0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      if (pr() < 0.25) {
        g.fillStyle = bump ? "rgba(0,0,0,0.25)" : "rgba(105,65,35,0.35)";
        g.beginPath();
        g.ellipse(x0 + pr() * p.len, p.y + rh / 2, 10 + pr() * 8, 4 + pr() * 3, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      g.fillStyle = bump ? "#000000" : "rgba(80,50,25,0.45)";
      g.fillRect(x0, p.y, 2, rh);
      g.fillRect(x0, p.y, p.len, 2);
    }
  }
}

/** Plank roughness: each board a slightly different satin, seams and knots matte. */
function drawPlankRough(g, { S, rh, planks }) {
  g.fillStyle = "#c8c8c8";
  g.fillRect(0, 0, S, S);
  for (const shift of [0, -S]) {
    for (const p of planks) {
      const x0 = p.x + shift, pr = rng(p.seed + 7);
      const v = 120 + Math.round(pr() * 70);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x0, p.y, p.len, rh);
      for (let k = 0; k < 6; k++) {
        const w = 20 + pr() * 120;
        g.fillStyle = `rgba(90,90,90,${0.15 + pr() * 0.2})`;
        g.fillRect(x0 + pr() * p.len, p.y + pr() * rh, w, 2 + pr() * 4);
      }
      g.fillStyle = "#ffffff";
      g.fillRect(x0, p.y, 3, rh);
      g.fillRect(x0, p.y, p.len, 3);
    }
  }
}

function drawPlaster(g, w, h) {
  noise(g, w, h, 21, 112, 142);
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 40, v = r() > 0.5 ? 255 : 0;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.06)`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

/** Plain weave plus directional slub noise (thicker weft threads), tile-safe. */
function drawFabric(g, w, h) {
  g.fillStyle = "#808080";
  g.fillRect(0, 0, w, h);
  const r = rng(13);
  for (let y = 0; y < h; y += 4)
    for (let x = 0; x < w; x += 4) {
      const over = ((x + y) >> 2) & 1;
      const v = Math.round((r() - 0.5) * 30);
      g.fillStyle = over ? `rgb(${170 + v},${170 + v},${170 + v})` : `rgb(${86 + v},${86 + v},${86 + v})`;
      if (over) g.fillRect(x, y + 1, 4, 2);
      else g.fillRect(x + 1, y, 2, 4);
    }
  for (let i = 0; i < 70; i++) {
    const y = Math.floor(r() * (h / 4)) * 4 + 1, x = r() * w, len = 8 + r() * 30;
    g.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.18})`;
    g.fillRect(x, y, len, 2);
    if (x + len > w) g.fillRect(x - w, y, len, 2);
  }
}

/** Pebbled leather / vinyl grain for chair upholstery (bump). */
function drawLeather(g, w, h) {
  g.fillStyle = "#808080";
  g.fillRect(0, 0, w, h);
  const r = rng(29);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, y = r() * h, rad = 1 + r() * 2.4, v = r() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.08 + r() * 0.12})`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
}

/** Brushed-metal roughness map: fine streaks so chrome highlights smear along one axis. */
function drawBrushed(g, w, h) {
  g.fillStyle = "rgb(190,190,190)";
  g.fillRect(0, 0, w, h);
  const r = rng(41);
  for (let i = 0; i < 420; i++) {
    const v = 140 + Math.round(r() * 110);
    g.fillStyle = `rgba(${v},${v},${v},${0.35 + r() * 0.4})`;
    g.fillRect(0, r() * h, w, 0.6 + r() * 1.4);
  }
}

/** Plaster roughness: soft mottling between satin and flat, so light glances across walls. */
function drawPlasterRough(g, w, h) {
  noise(g, w, h, 37, 205, 245);
  const r = rng(43);
  for (let i = 0; i < 50; i++) {
    const x = r() * w, y = r() * h, rad = 12 + r() * 50;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, "rgba(150,150,150,0.35)");
    grd.addColorStop(1, "rgba(150,150,150,0)");
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

/** Soft round shadow (alpha map) for contact shadows under footings. */
function drawBlob(g, w, h) {
  g.fillStyle = "#000000";
  g.fillRect(0, 0, w, h);
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.65)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function drawSpeckle(g, w, h) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  const r = rng(9);
  for (let i = 0; i < 900; i++) {
    const v = 150 + r() * 80;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}

const WOODS = {
  walnut: { hu: 27, sa: 38, li: 44, seed: 3 },
  oak: { hu: 34, sa: 42, li: 64, seed: 5 },
  light: { hu: 36, sa: 35, li: 72, seed: 7 },
};
const drawWood = ({ hu, sa, li, seed }) => (g, w, h) => {
  const r = rng(seed);
  g.fillStyle = `hsl(${hu},${sa}%,${li}%)`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x0 = r() * w, amp = 2 + r() * 6, f = 0.004 + r() * 0.01, ph = r() * 6;
    g.strokeStyle = `hsla(${hu - 4},${sa + 5}%,${li - 12 - r() * 10}%,${0.12 + r() * 0.25})`;
    g.lineWidth = 0.5 + r() * 2;
    g.beginPath();
    for (let y = 0; y <= h; y += 6) {
      const x = x0 + Math.sin(y * f + ph) * amp;
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
};

function drawCorkNotes(g, w, h) {
  const r = rng(4);
  g.fillStyle = "hsl(30,42%,56%)";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = `hsla(${22 + r() * 16},45%,${30 + r() * 35}%,0.6)`;
    g.fillRect(r() * w, r() * h, 1.5 + r() * 2, 1.5 + r() * 2);
  }
  const notes = [
    [50, 45, 120, 150, "#fbfaf5"], [205, 35, 110, 110, "#fff3b8"], [345, 55, 120, 150, "#fbfaf5"],
    [85, 225, 110, 110, "#d8efe3"], [235, 190, 130, 150, "#fbfaf5"], [395, 245, 80, 80, "#ffe3a8"],
  ];
  for (const [x, y, nw, nh, c] of notes) {
    g.save();
    g.translate(x + nw / 2, y + nh / 2);
    g.rotate((r() - 0.5) * 0.12);
    g.shadowColor = "rgba(0,0,0,0.25)";
    g.shadowBlur = 6;
    g.shadowOffsetY = 3;
    g.fillStyle = c;
    g.fillRect(-nw / 2, -nh / 2, nw, nh);
    g.shadowColor = "transparent";
    g.strokeStyle = "rgba(60,70,80,0.35)";
    g.lineWidth = 2;
    for (let ly = -nh / 2 + 22; ly < nh / 2 - 10; ly += 13) {
      g.beginPath();
      g.moveTo(-nw / 2 + 12, ly);
      g.lineTo(-nw / 2 + 12 + (nw - 24) * (0.5 + r() * 0.5), ly);
      g.stroke();
    }
    g.fillStyle = r() > 0.5 ? "#8a1538" : "#2f6fb3";
    g.beginPath();
    g.arc(0, -nh / 2 + 8, 6, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function drawOutdoor(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#eef6f0");
  sky.addColorStop(0.45, "#dfeedd");
  sky.addColorStop(1, "#a9c79a");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const r = rng(8);
  g.filter = "blur(5px)"; // ignored by browsers without canvas filters — still looks fine
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `hsla(${85 + r() * 40},${30 + r() * 30}%,${35 + r() * 35}%,${0.35 + r() * 0.4})`;
    g.beginPath();
    g.arc(r() * w, h * 0.15 + r() * h * 0.85, 6 + r() * 22, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = "none";
}

function drawArt(g, w, h) {
  g.fillStyle = "#f3efe6";
  g.fillRect(0, 0, w, h);
  const blob = (c, pts) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (let i = 1; i < pts.length; i += 2) g.quadraticCurveTo(pts[i][0] * w, pts[i][1] * h, pts[i + 1][0] * w, pts[i + 1][1] * h);
    g.closePath();
    g.fill();
  };
  blob("#e3cfae", [[0.1, 0.6], [0.05, 0.98], [0.5, 0.92], [0.92, 0.9], [0.86, 0.62], [0.55, 0.45], [0.1, 0.6]]);
  blob("#9fd3c1", [[0.15, 0.1], [0.05, 0.45], [0.4, 0.5], [0.75, 0.55], [0.7, 0.25], [0.55, 0.02], [0.15, 0.1]]);
  blob("#4f9a96", [[0.45, 0.3], [0.35, 0.65], [0.65, 0.72], [0.95, 0.7], [0.9, 0.42], [0.75, 0.2], [0.45, 0.3]]);
  g.strokeStyle = "#20384a";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(w * 0.2, h * 0.82);
  g.bezierCurveTo(w * 0.4, h * 0.6, w * 0.55, h * 0.95, w * 0.85, h * 0.35);
  g.stroke();
}

function drawClockFace(g, w) {
  g.fillStyle = "#fbfbf9";
  g.fillRect(0, 0, w, w);
  const c = w / 2;
  g.strokeStyle = "#30363c";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, major = i % 5 === 0, r1 = major ? c * 0.76 : c * 0.85;
    g.lineWidth = major ? 6 : 2;
    g.beginPath();
    g.moveTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    g.lineTo(c + Math.sin(a) * c * 0.92, c - Math.cos(a) * c * 0.92);
    g.stroke();
  }
}

function toothPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx - 0.5 * s, cy - 0.3 * s);
  g.bezierCurveTo(cx - 0.55 * s, cy - 0.75 * s, cx - 0.1 * s, cy - 0.7 * s, cx, cy - 0.55 * s);
  g.bezierCurveTo(cx + 0.1 * s, cy - 0.7 * s, cx + 0.55 * s, cy - 0.75 * s, cx + 0.5 * s, cy - 0.3 * s);
  g.bezierCurveTo(cx + 0.48 * s, cy + 0.1 * s, cx + 0.35 * s, cy + 0.2 * s, cx + 0.32 * s, cy + 0.75 * s);
  g.bezierCurveTo(cx + 0.3 * s, cy + 0.9 * s, cx + 0.15 * s, cy + 0.85 * s, cx + 0.12 * s, cy + 0.6 * s);
  g.bezierCurveTo(cx + 0.08 * s, cy + 0.3 * s, cx - 0.08 * s, cy + 0.3 * s, cx - 0.12 * s, cy + 0.6 * s);
  g.bezierCurveTo(cx - 0.15 * s, cy + 0.85 * s, cx - 0.3 * s, cy + 0.9 * s, cx - 0.32 * s, cy + 0.75 * s);
  g.bezierCurveTo(cx - 0.35 * s, cy + 0.2 * s, cx - 0.48 * s, cy + 0.1 * s, cx - 0.5 * s, cy - 0.3 * s);
  g.closePath();
}

function drawToothScreen(g, w, h) {
  g.fillStyle = "#141c25";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#1f2a36";
  g.fillRect(0, 0, w, 26);
  ["#f26b21", "#e7c14a", "#5fb894"].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(16 + i * 16, 13, 5, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#1a2430";
  g.fillRect(0, 26, 64, h - 26);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i === 1 ? "#5fb894" : "#2b3847";
    rr(g, 18, 46 + i * 44, 28, 28, 6);
    g.fill();
  }
  const glow = g.createRadialGradient(215, 170, 10, 215, 170, 150);
  glow.addColorStop(0, "rgba(120,190,255,0.28)");
  glow.addColorStop(1, "rgba(120,190,255,0)");
  g.fillStyle = glow;
  g.fillRect(64, 26, 300, h - 26);
  const tg = g.createLinearGradient(0, 70, 0, 290);
  tg.addColorStop(0, "#f7fbff");
  tg.addColorStop(1, "#bfd2e6");
  g.save();
  g.shadowColor = "rgba(140,200,255,0.7)";
  g.shadowBlur = 25;
  g.fillStyle = tg;
  toothPath(g, 215, 160, 190);
  g.fill();
  g.restore();
  for (let i = 0; i < 3; i++) {
    const y = 40 + i * 92;
    g.fillStyle = "#223040";
    rr(g, 370, y, 128, 80, 8);
    g.fill();
    g.fillStyle = i === 0 ? "#f26b21" : "#cfe0f0";
    toothPath(g, 400, y + 40, 40);
    g.fill();
    g.fillStyle = "#3a4b5e";
    g.fillRect(430, y + 22, 54, 6);
    g.fillRect(430, y + 38, 40, 6);
    g.fillRect(430, y + 54, 48, 6);
  }
}

function drawUiScreen(g, w, h) {
  g.fillStyle = "#f7faf9";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#5fb894";
  g.fillRect(0, 0, w, 34);
  g.fillStyle = "#ffffff";
  g.fillRect(16, 12, 110, 10);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i === 0 ? "#dff1e9" : "#eef2f1";
    rr(g, 16, 50 + i * 42, 200, 32, 6);
    g.fill();
    g.fillStyle = "#9aa7b0";
    g.fillRect(28, 62 + i * 42, 90 + (i % 3) * 30, 8);
  }
  g.fillStyle = "#ffffff";
  rr(g, 236, 50, 260, 250, 10);
  g.fill();
  g.fillStyle = "#c9d3d8";
  for (let i = 0; i < 6; i++) g.fillRect(256, 76 + i * 26, 160 + (i % 2) * 50, 8);
  g.fillStyle = "#8a1538";
  rr(g, 256, 250, 120, 30, 8);
  g.fill();
}

function drawPlaque(g, w, h, text) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#c9cdd1";
  g.lineWidth = 6;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = "#3b4650";
  g.font = "600 64px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text), w / 2, h / 2 + 4);
}

function drawChevron(g, w, h) {
  g.fillStyle = "#8a1538";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#f26b21";
  g.lineWidth = 9;
  for (let y = -16; y < h + 32; y += 32) {
    g.beginPath();
    g.moveTo(0, y + 16);
    for (let x = 0; x <= w; x += 32) g.lineTo(x + 16, y + ((x / 32) % 2 === 0 ? 0 : 16));
    g.stroke();
  }
}

function drawSnakeLeaf(g, w, h) {
  const r = rng(12);
  g.fillStyle = "#3d6b40";
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 6 + r() * 10) {
    g.fillStyle = `rgba(160,200,130,${0.15 + r() * 0.25})`;
    g.fillRect(0, y, w, 2 + r() * 3);
  }
}

function drawFrost(g, w, h) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#f6f8f8");
  grd.addColorStop(0.6, "#e7edec");
  grd.addColorStop(1, "#d6dfdd");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function drawBasket(g, w, h) {
  g.fillStyle = "#c9ae85";
  g.fillRect(0, 0, w, h);
  for (let row = 0; row * 16 < h; row++)
    for (let x = (row % 2) * -12; x < w; x += 24) {
      g.fillStyle = row % 2 ? "#e3cfaa" : "#d9c19a";
      rr(g, x + 1, row * 16 + 1, 22, 14, 6);
      g.fill();
      g.strokeStyle = "rgba(110,80,45,0.35)";
      g.lineWidth = 1.5;
      g.stroke();
    }
}

function drawMagazine(g, w, h, i) {
  const pal = [["#8a1538", "#f6e9dc"], ["#5fb894", "#ffffff"], ["#f2e3c9", "#2f3740"]][i % 3];
  g.fillStyle = pal[0];
  g.fillRect(0, 0, w, h);
  g.fillStyle = pal[1];
  g.fillRect(10, 10, w - 20, 18);
  g.globalAlpha = 0.85;
  rr(g, 18, 42, w - 36, 80, 8);
  g.fill();
  g.globalAlpha = 1;
  g.fillRect(14, 136, 70, 6);
  g.fillRect(14, 148, 50, 6);
}

function drawPaper(g, w, h) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#8a1538";
  g.fillRect(12, 16, 60, 8);
  g.fillStyle = "#b7bec4";
  for (let y = 36; y < h - 12; y += 12) g.fillRect(12, y, 70 + ((y * 7) % 30), 4);
}

/** Panoramic dental X-ray on a viewing monitor: dark film, bright arches. */
function drawXray(g, w, h) {
  const bg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.6);
  bg.addColorStop(0, "#2a3a46");
  bg.addColorStop(1, "#0a141b");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(220,232,240,0.3)";
  g.lineWidth = 14;
  g.beginPath();
  g.ellipse(w / 2, h * 0.98, w * 0.42, h * 0.62, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
  for (const [cy, dir] of [[h * 0.42, -1], [h * 0.58, 1]]) {
    for (let i = 0; i < 14; i++) {
      const t = (i + 0.5) / 14, x = w * (0.16 + t * 0.68);
      g.fillStyle = "rgba(232,240,245,0.8)";
      rr(g, x - 14, dir < 0 ? cy - 46 : cy, 28, 46, 9);
      g.fill();
      g.fillStyle = "rgba(200,214,224,0.32)";
      g.fillRect(x - 5, dir < 0 ? cy - 100 : cy + 44, 10, 56);
    }
  }
  g.fillStyle = "#5fb894";
  g.fillRect(12, 12, 90, 10);
}

/** Sidewalk concrete with expansion joints (tiles seamlessly). */
function drawConcrete(g, w, h) {
  noise(g, w, h, 51, 196, 222);
  const r = rng(53);
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 40, v = r() > 0.5 ? 255 : 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.08)`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.fillStyle = "rgba(90,88,84,0.55)";
  g.fillRect(0, 0, w, 2);
  g.fillRect(0, 0, 2, h);
}

function drawGrass(g, w, h) {
  g.fillStyle = "#8fae7f";
  g.fillRect(0, 0, w, h);
  const r = rng(57);
  g.lineCap = "round";
  for (let i = 0; i < 3500; i++) {
    const x = r() * w, y = r() * h, len = 3 + r() * 6, a = (r() - 0.5) * 0.8;
    g.strokeStyle = `hsl(${92 + r() * 20},${28 + r() * 20}%,${38 + r() * 22}%)`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len);
    g.stroke();
  }
}

/** Warm, out-of-focus interior seen through the storefront glass. */
function drawInterior(g, w, h) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#fbf3e3");
  grd.addColorStop(1, "#e6dccb");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const r = rng(61);
  g.filter = "blur(8px)";
  const tones = ["#b5d5c4", "#f7f5f0", "#c89a66", "#8a1538", "#90b39f"];
  for (let i = 0; i < 24; i++) {
    g.fillStyle = tones[Math.floor(r() * tones.length)];
    g.globalAlpha = 0.35 + r() * 0.4;
    g.fillRect(r() * w, h * (0.35 + r() * 0.6), 30 + r() * 90, 20 + r() * 90);
  }
  g.filter = "none";
  g.globalAlpha = 1;
}

function drawSign(g, w, h, text, bg, fg) {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = Math.round(h * 0.55);
  do {
    g.font = `700 ${size}px system-ui, sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > w * 0.88 && size > 10);
  g.fillText(text, w / 2, h / 2 + 2);
}

/** Lazily-built, shared textures. Call inside components (client-side only). */
export const tex = {
  floor: (rx = 4, ry = 3.4) =>
    cached(`floor:${rx}:${ry}`, () => {
      const L = plankLayout(11);
      return {
        map: canvasTexture(L.S, L.S, (g) => drawPlanks(g, L, false), { repeat: [rx, ry] }),
        bump: canvasTexture(L.S, L.S, (g) => drawPlanks(g, L, true), { color: false, repeat: [rx, ry] }),
        rough: dataTexture(OAK_FLOOR_ROUGHNESS_BASE64, { repeat: [rx, ry] }),
        normal: dataTexture(OAK_FLOOR_NORMAL_BASE64, { repeat: [rx, ry] }),
      };
    }),
  perforatedNormal: (rx = 12, ry = 12) => cached(`perfNorm:${rx}:${ry}`, () => dataTexture(UPHOLSTERY_NORMAL_BASE64, { repeat: [rx, ry] })),
  perforatedRough: (rx = 12, ry = 12) => cached(`perfRough:${rx}:${ry}`, () => dataTexture(UPHOLSTERY_ROUGHNESS_BASE64, { repeat: [rx, ry] })),
  surgicalNormal: (rx = 1, ry = 16) => cached(`surgNorm:${rx}:${ry}`, () => dataTexture(SURGICAL_STEEL_NORMAL_BASE64, { repeat: [rx, ry] })),
  surgicalRough: (rx = 1, ry = 16) => cached(`surgRough:${rx}:${ry}`, () => dataTexture(SURGICAL_STEEL_ROUGHNESS_BASE64, { repeat: [rx, ry] })),
  porcelainNormal: (rx = 2, ry = 4) => cached(`porcNorm:${rx}:${ry}`, () => dataTexture(PORCELAIN_NORMAL_BASE64, { repeat: [rx, ry] })),
  porcelainRough: (rx = 2, ry = 2) => cached(`porcRough:${rx}:${ry}`, () => dataTexture(PORCELAIN_ROUGHNESS_BASE64, { repeat: [rx, ry] })),
  quartzColor: (rx = 4, ry = 4) => cached(`quartzCol:${rx}:${ry}`, () => dataTexture(QUARTZ_COLOR_BASE64, { color: true, repeat: [rx, ry] })),
  quartzNormal: (rx = 4, ry = 4) => cached(`quartzNorm:${rx}:${ry}`, () => dataTexture(QUARTZ_NORMAL_BASE64, { repeat: [rx, ry] })),
  quartzRough: (rx = 4, ry = 4) => cached(`quartzRough:${rx}:${ry}`, () => dataTexture(QUARTZ_ROUGHNESS_BASE64, { repeat: [rx, ry] })),
  plaster: (rx = 2, ry = 1) => cached(`plaster:${rx}:${ry}`, () => canvasTexture(256, 256, drawPlaster, { color: false, repeat: [rx, ry] })),
  fabric: (rx = 6, ry = 6) => cached(`fabric:${rx}:${ry}`, () => canvasTexture(128, 128, drawFabric, { color: false, repeat: [rx, ry] })),
  leather: (rx = 3, ry = 3) => cached(`leather:${rx}:${ry}`, () => canvasTexture(256, 256, drawLeather, { color: false, repeat: [rx, ry] })),
  brushed: () => cached("brushed", () => canvasTexture(256, 256, drawBrushed, { color: false, repeat: [2, 2] })),
  plasterRough: (rx = 2, ry = 1) => cached(`plasterRough:${rx}:${ry}`, () => canvasTexture(256, 256, drawPlasterRough, { color: false, repeat: [rx, ry] })),
  blob: () => cached("blob", () => canvasTexture(128, 128, drawBlob, { color: false })),
  speckle: () => cached("speckle", () => canvasTexture(256, 256, drawSpeckle, { repeat: [1, 1] })),
  wood: (kind = "walnut") => cached(`wood:${kind}`, () => canvasTexture(512, 512, drawWood(WOODS[kind]))),
  cork: () => cached("cork", () => canvasTexture(512, 384, drawCorkNotes)),
  outdoor: () => cached("outdoor", () => canvasTexture(256, 256, drawOutdoor)),
  art: () => cached("art", () => canvasTexture(384, 512, drawArt)),
  clock: () => cached("clock", () => canvasTexture(256, 256, drawClockFace)),
  toothScreen: () => cached("toothScreen", () => canvasTexture(512, 320, drawToothScreen)),
  uiScreen: () => cached("uiScreen", () => canvasTexture(512, 320, drawUiScreen)),
  plaque: (text) => cached(`plaque:${text}`, () => canvasTexture(128, 128, (g, w, h) => drawPlaque(g, w, h, text))),
  pillow: () => cached("pillow", () => canvasTexture(128, 128, drawChevron)),
  snakeLeaf: () => cached("snake", () => canvasTexture(64, 256, drawSnakeLeaf, { repeat: [10, 2] })),
  frost: () => cached("frost", () => canvasTexture(64, 256, drawFrost)),
  basket: () => cached("basket", () => canvasTexture(256, 256, drawBasket, { repeat: [6, 1] })),
  magazine: (i) => cached(`mag:${i}`, () => canvasTexture(128, 170, (g, w, h) => drawMagazine(g, w, h, i))),
  paper: () => cached("paper", () => canvasTexture(128, 170, drawPaper)),
  xray: () => cached("xray", () => canvasTexture(512, 288, drawXray)),
  concrete: (rx = 3, ry = 3) => cached(`concrete:${rx}:${ry}`, () => canvasTexture(256, 256, drawConcrete, { repeat: [rx, ry] })),
  grass: (rx = 3, ry = 3) => cached(`grass:${rx}:${ry}`, () => canvasTexture(256, 256, drawGrass, { repeat: [rx, ry] })),
  interior: () => cached("interior", () => canvasTexture(256, 256, drawInterior)),
  /** Text on a colored board. aspect = width / height. */
  sign: (text, bg = "#ffffff", fg = "#2f3740", aspect = 4) =>
    cached(`sign:${text}:${bg}:${fg}:${aspect}`, () => canvasTexture(512, Math.round(512 / aspect), (g, w, h) => drawSign(g, w, h, text, bg, fg))),
};

/* =============================== primitives =============================== */
/**
 * Standard material shorthand. Supports PBR normalMap, roughnessMap, metalnessMap,
 * and cc = clearcoat (0–1): switches to meshPhysicalMaterial for porcelain, enamel, glazed shades.
 */
export function Mat({
  c = "#ffffff",
  r = 0.7,
  m = 0,
  map,
  bump,
  bs = 1,
  rmap,
  roughnessMap,
  normal,
  normalMap,
  normalScale,
  metalnessMap,
  e,
  ei = 1,
  emap,
  o,
  side,
  cc,
  ccr = 0.1,
  ...rest
}) {
  const normMap = normal ?? normalMap ?? null;
  const rMap = rmap ?? roughnessMap ?? null;
  const nScale = normalScale
    ? Array.isArray(normalScale)
      ? new THREE.Vector2(normalScale[0], normalScale[1])
      : normalScale
    : normMap
    ? new THREE.Vector2(1, 1)
    : null;

  const props = {
    color: c,
    roughness: r,
    metalness: m,
    map: map ?? null,
    bumpMap: bump ?? null,
    bumpScale: bs,
    roughnessMap: rMap,
    metalnessMap: metalnessMap ?? null,
    normalMap: normMap,
    normalScale: nScale,
    emissive: e ?? "#000000",
    emissiveMap: emap ?? null,
    emissiveIntensity: e ? ei : 0,
    transparent: o !== undefined,
    opacity: o ?? 1,
    side: side ?? THREE.FrontSide,
    ...rest,
  };
  if (cc) return <meshPhysicalMaterial {...props} clearcoat={cc} clearcoatRoughness={ccr} />;
  return <meshStandardMaterial {...props} />;
}

/** Polished surgical steel: low roughness, high metalness, precise anisotropic brushed grain. */
export function Chrome({ c = "#dce2e6", r = 0.20 }) {
  return (
    <Mat
      c={c}
      m={0.98}
      r={r}
      rmap={tex.surgicalRough(1, 16)}
      normal={tex.surgicalNormal(1, 16)}
      normalScale={[0.2, 0.2]}
    />
  );
}

/** Glazed dental porcelain / enamel with active clearcoat for specular depth. */
export function Porcelain({ c = "#f7f5ec", r = 0.22, cc = 1.0, ccr = 0.1 }) {
  return (
    <Mat
      c={c}
      r={r}
      m={0.0}
      cc={cc}
      ccr={ccr}
      normal={tex.porcelainNormal(4, 4)}
      normalScale={[0.15, 0.15]}
      rmap={tex.porcelainRough(4, 4)}
    />
  );
}

/** Upholstery: muted sage with perforated grain normal map and high roughness map. */
export function Upholstery({ c = "#7f998c", kind = "perforated", r }) {
  if (kind === "perforated") {
    return (
      <Mat
        c={c}
        r={r ?? 0.88}
        m={0.02}
        normal={tex.perforatedNormal(12, 12)}
        normalScale={[0.85, 0.85]}
        rmap={tex.perforatedRough(12, 12)}
      />
    );
  }
  return kind === "leather" ? (
    <Mat c={c} r={r ?? 0.45} bump={tex.leather()} bs={0.35} />
  ) : (
    <Mat c={c} r={r ?? 0.92} bump={tex.fabric(8, 8)} bs={0.9} />
  );
}

/** Speckled white quartz countertop with mineral aggregate flecks and differential roughness. */
export function Quartz({ c = "#f4f2ec", r = 0.32, rx = 4, ry = 4 }) {
  return (
    <Mat
      c={c}
      m={0.0}
      r={r}
      map={tex.quartzColor(rx, ry)}
      normal={tex.quartzNormal(rx, ry)}
      normalScale={[0.28, 0.28]}
      rmap={tex.quartzRough(rx, ry)}
    />
  );
}

/**
 * Contact shadow: a soft dark ellipse just above the floor under a footing, so chairs,
 * desks and cabinets sit on the slab instead of floating. p is the floor point [x, 0, z].
 */
export function ContactShadow({ w = 0.6, d = 0.6, o = 0.5, p = [0, 0, 0] }) {
  return (
    <mesh position={[p[0], 0.005, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color="#1f1a15" alphaMap={tex.blob()} transparent opacity={o} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function Glass({ c = "#dbe9e6", o = 0.28, r = 0.05 }) {
  return (
    <meshPhysicalMaterial
      color={c}
      roughness={r}
      metalness={0}
      transparent
      opacity={o}
      clearcoat={1}
      clearcoatRoughness={0.05}
      depthWrite={false}
      side={THREE.DoubleSide}
      envMapIntensity={1.4}
    />
  );
}

export function Box({ s = [1, 1, 1], r = 0, p, rot, cast = true, children, ...rest }) {
  const shared = { position: p, rotation: rot, castShadow: cast, receiveShadow: true, ...rest };
  const rad = Math.min(r, Math.min(...s) / 2 - 0.001);
  if (rad > 0.002)
    return (
      <RoundedBox args={s} radius={rad} smoothness={4} {...shared}>
        {children}
      </RoundedBox>
    );
  return (
    <mesh {...shared}>
      <boxGeometry args={s} />
      {children}
    </mesh>
  );
}

export function Cyl({ a, p, rot, cast = true, children, ...rest }) {
  return (
    <mesh position={p} rotation={rot} castShadow={cast} receiveShadow {...rest}>
      <cylinderGeometry args={a} />
      {children}
    </mesh>
  );
}

export function Plane({ s, p, rot, children, ...rest }) {
  return (
    <mesh position={p} rotation={rot} receiveShadow {...rest}>
      <planeGeometry args={s} />
      {children}
    </mesh>
  );
}

/** A cylinder stretched between two points — tubes, chair frames, lamp arms. */
export function Rod({ from, to, r = 0.012, seg = 12, children }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const len = d.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return (
    <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={quat} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      {children}
    </mesh>
  );
}

/**
 * A camera stop from its target: distance d (m), azimuth az (degrees from +z toward +x,
 * so 45 looks in from the open front-right corner) and elevation el (degrees above the target).
 */
export function view(target, d, az = 45, el = 22) {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return {
    camera: [target[0] + Math.sin(a) * Math.cos(e) * d, target[1] + Math.sin(e) * d, target[2] + Math.cos(a) * Math.cos(e) * d],
    target,
  };
}

/** World pose of a door mounted with <OnWall>: centre of the opening and the normal into the room. */
export function doorPose({ wall, u, off = 0 }) {
  const { W, D } = ROOM;
  return wall === "left"
    ? { center: [-W / 2 + off, 1.15, u], normal: [1, 0, 0] }
    : { center: [u, 1.15, -D / 2 + off], normal: [0, 0, 1] };
}

/** Mount children on a wall. Children are modelled facing +z with the wall surface at z = 0. */
export function OnWall({ wall = "back", u = 0, y = 0, off = 0, children }) {
  const { W, D } = ROOM;
  if (wall === "left")
    return (
      <group position={[-W / 2 + off, y, u]} rotation={[0, Math.PI / 2, 0]}>
        {children}
      </group>
    );
  return <group position={[u, y, -D / 2 + off]}>{children}</group>;
}

/* ============================== room shell ================================= */
function WallFinish({ wall, length, color, wainscot }) {
  const { W, D, H } = ROOM;
  const plaster = tex.plaster(2, 1);
  const rough = tex.plasterRough(2, 1);
  const tf = wall === "left" ? { position: [-W / 2, 0, 0], rotation: [0, Math.PI / 2, 0] } : { position: [0, 0, -D / 2] };
  return (
    <group {...tf}>
      <Plane s={[length, H]} p={[0, H / 2, 0.002]}>
        <Mat c={color} bump={plaster} bs={0.15} rmap={rough} r={1} />
      </Plane>
      {wainscot && (
        <>
          <Plane s={[length, wainscot.h]} p={[0, wainscot.h / 2, 0.004]}>
            <Mat c={wainscot.color} bump={plaster} bs={0.15} rmap={rough} r={0.95} />
          </Plane>
          <Box s={[length, 0.06, 0.016]} p={[0, wainscot.h + 0.03, 0.008]}>
            <Mat c={C.maroon} r={0.5} />
          </Box>
          <Box s={[length, 0.02, 0.018]} p={[0, wainscot.h + 0.07, 0.009]}>
            <Mat c={C.orange} r={0.5} />
          </Box>
        </>
      )}
      <Box s={[length, 0.09, 0.018]} p={[0, 0.045, 0.009]}>
        <Mat c={C.white} r={0.5} />
      </Box>
    </group>
  );
}

/**
 * Floor slab + oak planks + two cut-away walls.
 * wainscot: { h: 1.0, color: C.sage } adds the sage lower wall with the maroon/orange rail.
 */
export function RoomShell({ leftColor = C.cream, backColor = C.cream, wainscot = null }) {
  const { W, D, H, T: t, SLAB } = ROOM;
  const floor = tex.floor(+(W / 1.5).toFixed(2), +(D / 1.5).toFixed(2));
  const cut = <Mat c={C.cut} r={0.9} />;
  return (
    <group>
      <Box s={[W + t, SLAB, D + t]} p={[-t / 2, -SLAB / 2, -t / 2]}>
        {cut}
      </Box>
      <Plane s={[W, D]} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]}>
        <Mat map={floor.map} normal={floor.normal} normalScale={[1.2, 1.2]} rmap={floor.rough} r={0.72} m={0.0} />
      </Plane>
      <Box s={[W + t, H, t]} p={[-t / 2, H / 2, -D / 2 - t / 2]}>
        {cut}
      </Box>
      <Box s={[t, H, D]} p={[-W / 2 - t / 2, H / 2, 0]}>
        {cut}
      </Box>
      <WallFinish wall="back" length={W} color={backColor} wainscot={wainscot} />
      <WallFinish wall="left" length={D} color={leftColor} wainscot={wainscot} />
    </group>
  );
}

/* ============================ interactive parts ============================ */
const pointerHandlers = (setHover, onClick) => ({
  onPointerOver: (e) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = "pointer";
  },
  onPointerOut: () => {
    setHover(false);
    document.body.style.cursor = "";
  },
  onClick: (e) => {
    e.stopPropagation();
    onClick?.();
  },
});

/** Wraps furniture so hover/click/highlight shows a soft mint ring on the floor. */
export function Pickable({ id, onSelect, highlighted = false, ring = 0.6, ringAt = [0, 0], children, ...props }) {
  const [hover, setHover] = useState(false);
  const mat = useRef();
  useFrame(({ clock }, dt) => {
    if (!mat.current) return;
    const target = hover || highlighted ? 0.45 + Math.sin(clock.elapsedTime * 2.5) * 0.12 : 0;
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, target, 8, dt);
  });
  return (
    <group {...props} {...pointerHandlers(setHover, () => onSelect?.(id))}>
      {children}
      {ring > 0 && (
        <mesh position={[ringAt[0], 0.012, ringAt[1]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[ring * 0.9, ring, 64]} />
          <meshBasicMaterial ref={mat} color={C.mintGlow} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function Plaque({ text, p, matRef, lightRef }) {
  const map = tex.plaque(text);
  return (
    <group position={p}>
      <Box s={[0.13, 0.13, 0.012]} p={[0, 0, 0.006]} cast={false}>
        <Mat c="#ffffff" r={0.4} />
      </Box>
      <Plane s={[0.11, 0.11]} p={[0, 0, 0.0125]}>
        <meshStandardMaterial ref={matRef} map={map} roughness={0.5} emissive={C.mintGlow} emissiveIntensity={0} />
      </Plane>
      <pointLight ref={lightRef} position={[0, 0, 0.08]} intensity={0} color={C.mintGlow} distance={0.8} decay={2} />
    </group>
  );
}

/**
 * Door with casing, frosted glass and lever. Mount with <OnWall>.
 * open: 0 → closed, 1 → swung into the room (animate this during room transitions).
 * glass: [w, h] of the frosted panel, or false.
 */
export function Door({ id, plaque, plaqueSide = 1, frame = C.white, leaf = C.white, glass = [0.5, 1.5], highlighted = false, open = 0, onSelect }) {
  const [hover, setHover] = useState(false);
  const hinge = useRef();
  const plaqueMat = useRef();
  const plaqueLight = useRef();
  const frost = tex.frost();
  const glow = hover || highlighted;
  // A door that mounts open (the camera is coming through it) starts open instead of swinging.
  useLayoutEffect(() => {
    if (hinge.current) hinge.current.rotation.y = -open * 1.25;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    const dtState = useSceneStore.getState().doorTransition;
    if (dtState && dtState.active && dtState.doorId === id) {
      const anim = getDoorTimelineState(dtState.time);
      if (hinge.current) hinge.current.rotation.y = anim.doorRotationY;
      if (plaqueMat.current) plaqueMat.current.emissiveIntensity = anim.plaqueEmissive;
      if (plaqueLight.current) plaqueLight.current.intensity = anim.plaqueEmissive * 0.45;
    } else {
      if (hinge.current) hinge.current.rotation.y = THREE.MathUtils.damp(hinge.current.rotation.y, -open * 1.25, 5, dt);
      const targetEmissive = glow ? 0.35 : 0;
      if (plaqueMat.current) {
        plaqueMat.current.emissiveIntensity = THREE.MathUtils.damp(plaqueMat.current.emissiveIntensity, targetEmissive, 8, dt);
      }
      if (plaqueLight.current) {
        plaqueLight.current.intensity = THREE.MathUtils.damp(plaqueLight.current.intensity, targetEmissive * 0.2, 8, dt);
      }
    }
  });
  const casing = <Mat c={frame} r={0.45} e={glow ? C.mintGlow : undefined} ei={0.25} />;
  const chrome = <Chrome r={0.22} />;
  return (
    <group {...pointerHandlers(setHover, () => onSelect?.(id))}>
      <Plane s={[0.88, 2.13]} p={[0, 1.065, 0.003]}>
        <Mat c="#39424a" r={1} />
      </Plane>
      <Box s={[0.08, 2.21, 0.04]} p={[-0.48, 1.105, 0.02]}>{casing}</Box>
      <Box s={[0.08, 2.21, 0.04]} p={[0.48, 1.105, 0.02]}>{casing}</Box>
      <Box s={[1.04, 0.08, 0.04]} p={[0, 2.17, 0.02]}>{casing}</Box>
      <group ref={hinge} position={[-0.44, 0, 0.025]}>
        <Box s={[0.87, 2.12, 0.04]} p={[0.435, 1.06, 0]}>
          <Mat c={leaf} r={0.45} />
        </Box>
        {glass && (
          <Box s={[glass[0], glass[1], 0.012]} p={[0.435, 1.98 - glass[1] / 2, 0.017]} cast={false}>
            <meshPhysicalMaterial map={frost} roughness={0.25} clearcoat={0.7} clearcoatRoughness={0.15} emissive={C.mintGlow} emissiveIntensity={glow ? 0.3 : 0} />
          </Box>
        )}
        <Cyl a={[0.028, 0.028, 0.012, 20]} p={[0.8, 1.0, 0.026]} rot={[Math.PI / 2, 0, 0]}>{chrome}</Cyl>
        <Box s={[0.13, 0.018, 0.018]} p={[0.75, 1.0, 0.042]} r={0.007}>{chrome}</Box>
      </group>
      {plaque && <Plaque text={plaque} p={[plaqueSide * 0.68, 1.55, 0]} matRef={plaqueMat} lightRef={plaqueLight} />}
    </group>
  );
}

/* =============================== wall décor ================================ */
export function Window({ w = 1.4, h = 1.55 }) {
  const out = tex.outdoor();
  const f = 0.07;
  const white = <Mat c={C.white} r={0.4} />;
  return (
    <group>
      <Plane s={[w - 2 * f, h - 2 * f]} p={[0, h / 2, 0.004]}>
        <Mat c="#000000" e="#ffffff" emap={out} ei={1.15} r={0.9} />
      </Plane>
      <Box s={[w, f, 0.09]} p={[0, h - f / 2, 0.045]}>{white}</Box>
      <Box s={[w, f, 0.09]} p={[0, f / 2, 0.045]}>{white}</Box>
      <Box s={[f, h, 0.09]} p={[-w / 2 + f / 2, h / 2, 0.045]}>{white}</Box>
      <Box s={[f, h, 0.09]} p={[w / 2 - f / 2, h / 2, 0.045]}>{white}</Box>
      <Box s={[0.05, h - 2 * f, 0.07]} p={[0, h / 2, 0.035]}>{white}</Box>
      <Box s={[0.015, 0.1, 0.03]} p={[0.045, h * 0.5, 0.08]} r={0.005}>
        <Chrome r={0.25} />
      </Box>
      <Plane s={[w - 2 * f, h - 2 * f]} p={[0, h / 2, 0.03]}>
        <Glass o={0.1} />
      </Plane>
      <Box s={[w + 0.14, 0.04, 0.18]} p={[0, -0.02, 0.09]}>{white}</Box>
    </group>
  );
}

export function Sanitizer() {
  return (
    <group>
      <Box s={[0.3, 0.44, 0.012]} p={[-0.05, 0, 0.006]}>
        <Chrome r={0.3} />
      </Box>
      <Box s={[0.12, 0.22, 0.1]} p={[0.02, 0.06, 0.062]} r={0.02}>
        <Mat c="#f8f8f6" r={0.35} />
      </Box>
      <Box s={[0.11, 0.05, 0.09]} p={[0.02, -0.07, 0.065]} r={0.015}>
        <Mat c="#dfe3e6" r={0.35} />
      </Box>
      <Box s={[0.07, 0.13, 0.06]} p={[-0.12, 0.04, 0.042]} r={0.012}>
        <Mat c="#f2f2ee" r={0.4} />
      </Box>
      <Box s={[0.26, 0.012, 0.12]} p={[-0.05, -0.2, 0.06]}>
        <Chrome r={0.3} />
      </Box>
    </group>
  );
}

function ClockHands({ r }) {
  const hR = useRef(), mR = useRef(), sR = useRef();
  useFrame(() => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    if (hR.current) hR.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (mR.current) mR.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (sR.current) sR.current.rotation.z = -(Math.floor(s) / 60) * Math.PI * 2;
  });
  const ink = <Mat c="#2b3036" r={0.5} />;
  return (
    <group position={[0, 0, 0.044]}>
      <group ref={hR}>
        <mesh position={[0, r * 0.25, 0]}><boxGeometry args={[0.014, r * 0.5, 0.004]} />{ink}</mesh>
      </group>
      <group ref={mR}>
        <mesh position={[0, r * 0.36, 0.003]}><boxGeometry args={[0.01, r * 0.72, 0.004]} />{ink}</mesh>
      </group>
      <group ref={sR}>
        <mesh position={[0, r * 0.3, 0.006]}><boxGeometry args={[0.004, r * 0.8, 0.002]} /><Mat c={C.orange} /></mesh>
      </group>
    </group>
  );
}

/** Wall clock that shows the real time. */
export function Clock({ r = 0.2 }) {
  const face = tex.clock();
  return (
    <group>
      <Cyl a={[r, r, 0.04, 48]} p={[0, 0, 0.02]} rot={[Math.PI / 2, 0, 0]}>
        <Mat c="#d9dcdf" m={0.6} r={0.3} />
      </Cyl>
      <mesh position={[0, 0, 0.041]}>
        <circleGeometry args={[r * 0.9, 48]} />
        <Mat map={face} r={0.5} />
      </mesh>
      <ClockHands r={r * 0.9} />
      <mesh position={[0, 0, 0.052]}>
        <circleGeometry args={[r * 0.92, 48]} />
        <Glass o={0.12} />
      </mesh>
    </group>
  );
}

export function WallArt({ w = 0.62, h = 0.85 }) {
  const art = tex.art();
  return (
    <group>
      <Box s={[w + 0.05, h + 0.05, 0.03]} p={[0, 0, 0.015]}>
        <Mat c="#f4f1ea" r={0.5} />
      </Box>
      <Plane s={[w - 0.04, h - 0.04]} p={[0, 0, 0.031]}>
        <Mat map={art} r={0.85} />
      </Plane>
    </group>
  );
}

/** Wall sign with lettering. Mount with <OnWall>; children face +z. */
export function SignBoard({ text, w = 1, h = 0.25, bg = "#ffffff", fg = "#2f3740" }) {
  const map = tex.sign(text, bg, fg, +(w / h).toFixed(2));
  return (
    <group>
      <Box s={[w, h, 0.03]} p={[0, 0, 0.015]} r={0.01}>
        <Mat c={bg} r={0.5} />
      </Box>
      <Plane s={[w - 0.03, h - 0.03]} p={[0, 0, 0.031]}>
        <Mat map={map} r={0.6} />
      </Plane>
    </group>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Plan-year wall calendar (from the DentalOffice prototype): months still left this plan year in
 * orange, January (when the max and deductible reset) in green, past months grey. month = 0–11.
 */
export function PlanYearCalendar({ month = new Date().getMonth(), s = 1 }) {
  const tw = 0.34, th = 0.27, gx = 0.04, gy = 0.05;
  return (
    <group scale={s}>
      <Box s={[1.3, 1.62, 0.04]} p={[0, 0, 0.02]} r={0.015}><Mat c={C.white} r={0.5} /></Box>
      <Box s={[1.3, 0.2, 0.045]} p={[0, 0.71, 0.025]}><Mat c="#8fb9dd" r={0.5} /></Box>
      {[-0.35, 0.35].map((x) => (
        <Cyl key={x} a={[0.025, 0.025, 0.06, 10]} p={[x, 0.81, 0.04]} rot={[Math.PI / 2, 0, 0]}><Chrome /></Cyl>
      ))}
      {MONTHS.map((m, i) => {
        const x = ((i % 3) - 1) * (tw + gx);
        const y = 0.43 - Math.floor(i / 3) * (th + gy);
        const reset = i === 0 && month > 0;
        const left = i >= month;
        const c = reset ? C.mintGlow : left ? C.orange : "#dbe4ea";
        return (
          <group key={m} position={[x, y, 0.046]}>
            <Box s={[tw, th, 0.012]} cast={false}>
              <Mat c={c} e={left || reset ? c : undefined} ei={0.15} r={0.6} />
            </Box>
            <Box s={[tw, 0.05, 0.014]} p={[0, th / 2 - 0.025, 0.001]} cast={false}>
              <Mat c={reset || left ? "#ffffff" : "#c4d0d8"} r={0.6} />
            </Box>
          </group>
        );
      })}
    </group>
  );
}

export function CorkBoard({ w = 1.1, h = 0.8 }) {
  const cork = tex.cork();
  const oak = tex.wood("oak");
  const f = 0.04;
  const frame = <Mat map={oak} r={0.6} />;
  return (
    <group>
      <Plane s={[w - 2 * f, h - 2 * f]} p={[0, 0, 0.012]}>
        <Mat map={cork} r={0.95} />
      </Plane>
      <Box s={[w, f, 0.035]} p={[0, h / 2 - f / 2, 0.018]}>{frame}</Box>
      <Box s={[w, f, 0.035]} p={[0, -h / 2 + f / 2, 0.018]}>{frame}</Box>
      <Box s={[f, h, 0.035]} p={[-w / 2 + f / 2, 0, 0.018]}>{frame}</Box>
      <Box s={[f, h, 0.035]} p={[w / 2 - f / 2, 0, 0.018]}>{frame}</Box>
    </group>
  );
}

export function WallMonitor({ w = 0.95, h = 0.56, map }) {
  return (
    <group>
      <Box s={[0.2, 0.2, 0.05]} p={[0, 0, 0.025]}>
        <Mat c={C.dark} m={0.5} r={0.4} />
      </Box>
      <Box s={[w, h, 0.03]} p={[0, 0, 0.065]} r={0.008}>
        <Porcelain c="#1a2026" r={0.2} cc={1.0} ccr={0.08} />
      </Box>
      <Plane s={[w - 0.04, h - 0.04]} p={[0, 0, 0.081]}>
        <Mat c="#000000" e="#ffffff" emap={map} ei={1} r={0.25} />
      </Plane>
    </group>
  );
}

export function Clipboard() {
  const paper = tex.paper();
  return (
    <group>
      <Box s={[0.21, 0.29, 0.008]} p={[0, 0, 0.004]} r={0.003}>
        <Mat c="#c7a57a" r={0.6} />
      </Box>
      <Plane s={[0.18, 0.24]} p={[0, -0.015, 0.0085]}>
        <Mat map={paper} r={0.9} />
      </Plane>
      <Box s={[0.08, 0.035, 0.014]} p={[0, 0.13, 0.012]} r={0.005}>
        <Chrome r={0.25} />
      </Box>
    </group>
  );
}

/* ================================ plants =================================== */
export function Pot({ r = 0.14, h = 0.22, c = "#ecebe6", map }) {
  const geo = useMemo(() => {
    const pts = [[0, 0], [r * 0.72, 0], [r * 0.8, 0.01], [r * 0.98, h * 0.85], [r, h], [r * 0.92, h], [r * 0.9, h * 0.92]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, [r, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  const plaster = tex.plaster(3, 1);
  return (
    <group>
      <ContactShadow w={r * 2.8} d={r * 2.8} o={0.45} />
      <mesh geometry={geo} castShadow receiveShadow>
        <Mat c={c} map={map} bump={map ? undefined : plaster} bs={0.4} r={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.9, 32]} />
        <Mat c="#4a3a2c" r={1} />
      </mesh>
    </group>
  );
}

export function SnakePlant({ seed = 3 }) {
  const leafTex = tex.snakeLeaf();
  const leaves = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 11 }, (_, i) => {
      const w = 0.035 + r() * 0.02, h = 0.45 + r() * 0.3;
      const s = new THREE.Shape();
      s.moveTo(-w, 0);
      s.quadraticCurveTo(-w * 1.25, h * 0.55, 0, h);
      s.quadraticCurveTo(w * 1.25, h * 0.55, w, 0);
      s.lineTo(-w, 0);
      return {
        geo: new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false, curveSegments: 10 }),
        a: (i / 11) * Math.PI * 2 + r() * 0.4,
        tilt: 0.05 + r() * 0.22,
        off: r() * 0.06,
        twist: (r() - 0.5) * 0.8,
      };
    });
  }, [seed]);
  useEffect(() => () => leaves.forEach((l) => l.geo.dispose()), [leaves]);
  return (
    <group>
      <Pot r={0.13} h={0.26} />
      <group position={[0, 0.22, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.a, 0]}>
            <group position={[0, 0, l.off]} rotation={[l.tilt, 0, 0]}>
              <mesh geometry={l.geo} rotation={[0, l.twist, 0]} castShadow>
                <Mat map={leafTex} r={0.55} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

export function Succulent({ seed = 5 }) {
  const leaves = useMemo(() => {
    const r = rng(seed), out = [];
    [[9, 0.07, 0.35, 1], [7, 0.045, 0.75, 0.8], [5, 0.02, 1.1, 0.6]].forEach(([n, rad, up, sc], ring) => {
      for (let i = 0; i < n; i++) out.push({ a: (i / n) * Math.PI * 2 + ring * 0.4 + r() * 0.2, rad, up, sc });
    });
    return out;
  }, [seed]);
  return (
    <group>
      <Pot r={0.12} h={0.13} />
      <group position={[0, 0.12, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.a, 0]}>
            <group position={[0, 0, l.rad]} rotation={[-l.up, 0, 0]}>
              <mesh position={[0, 0, 0.03 * l.sc]} scale={[0.03 * l.sc, 0.012, 0.055 * l.sc]} castShadow>
                <sphereGeometry args={[1, 12, 8]} />
                <Mat c="#86ab9f" r={0.55} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Tall parlor palm in a woven basket (reception corner). */
export function PalmPlant({ seed = 2, fronds = 11, height = 1.2 }) {
  const basket = tex.basket();
  const leafRef = useRef();
  const leafGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.03, 0.11, 0, 0.24);
    s.quadraticCurveTo(-0.03, 0.11, 0, 0);
    const g = new THREE.ShapeGeometry(s, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const data = useMemo(() => {
    const r = rng(seed), curves = [], leaves = [];
    const up = new THREE.Vector3(0, 1, 0), zAxis = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + r() * 0.5;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const reach = 0.35 + r() * 0.35, rise = height * (0.55 + r() * 0.45);
      const start = new THREE.Vector3(dir.x * 0.03, 0.3, dir.z * 0.03);
      const ctrl = start.clone().add(dir.clone().multiplyScalar(reach * 0.35)).setY(0.3 + rise * 1.1);
      const end = start.clone().add(dir.clone().multiplyScalar(reach)).setY(0.3 + rise * 0.75);
      curves.push(new THREE.QuadraticBezierCurve3(start, ctrl, end));
    }
    curves.forEach((cv) => {
      for (let k = 0; k < 14; k++) {
        const t = 0.25 + (k / 14) * 0.73;
        const P = cv.getPoint(t), Tg = cv.getTangent(t);
        const side = new THREE.Vector3().crossVectors(Tg, up).normalize();
        for (const sgn of [-1, 1]) {
          const d = side.clone().multiplyScalar(sgn).add(Tg.clone().multiplyScalar(0.9)).add(new THREE.Vector3(0, -0.45, 0)).normalize();
          leaves.push({ P, q: new THREE.Quaternion().setFromUnitVectors(zAxis, d), s: new THREE.Vector3(1, 1, 0.9 - Math.abs(t - 0.55) * 0.9), hue: 0.27 + r() * 0.06, l: 0.28 + r() * 0.1 });
        }
      }
    });
    return { curves, leaves };
  }, [seed, fronds, height]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), col = new THREE.Color();
    data.leaves.forEach((l, i) => {
      m.compose(l.P, l.q, l.s);
      leafRef.current.setMatrixAt(i, m);
      leafRef.current.setColorAt(i, col.setHSL(l.hue, 0.45, l.l));
    });
    leafRef.current.instanceMatrix.needsUpdate = true;
    if (leafRef.current.instanceColor) leafRef.current.instanceColor.needsUpdate = true;
  }, [data]);
  return (
    <group>
      <Pot r={0.22} h={0.32} c="#ffffff" map={basket} />
      {data.curves.map((cv, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[cv, 12, 0.006, 5, false]} />
          <Mat c="#5d7f3f" r={0.7} />
        </mesh>
      ))}
      <instancedMesh ref={leafRef} args={[leafGeo, undefined, data.leaves.length]} castShadow receiveShadow>
        <Mat c="#ffffff" r={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/* =============================== furniture ================================= */
export function StarBase({ r = 0.28 }) {
  const metal = <Chrome />;
  return (
    <group>
      <ContactShadow w={r * 2.6} d={r * 2.6} o={0.55} />
      <Cyl a={[0.04, 0.05, 0.06, 16]} p={[0, 0.08, 0]}>{metal}</Cyl>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <Box s={[r, 0.03, 0.045]} p={[r / 2, 0.075, 0]} r={0.012}>{metal}</Box>
          <mesh position={[r - 0.01, 0.03, 0]} castShadow>
            <sphereGeometry args={[0.03, 14, 10]} />
            <Mat c="#2b2f33" r={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Office chair facing +z. */
export function TaskChair({ p, rot, color = "#4a5560" }) {
  const fab = tex.fabric(3, 3);
  const chrome = <Chrome r={0.25} />;
  const cloth = <Mat c={color} bump={fab} bs={0.85} r={0.85} />;
  return (
    <group position={p} rotation={rot}>
      <StarBase r={0.27} />
      <Cyl a={[0.022, 0.026, 0.34, 16]} p={[0, 0.26, 0]}>{chrome}</Cyl>
      <Box s={[0.46, 0.07, 0.44]} p={[0, 0.46, 0]} r={0.03}>{cloth}</Box>
      <Rod from={[0, 0.46, -0.18]} to={[0, 0.62, -0.23]} r={0.014}>{chrome}</Rod>
      <Box s={[0.42, 0.46, 0.06]} p={[0, 0.8, -0.23]} rot={[-0.08, 0, 0]} r={0.03}>{cloth}</Box>
    </group>
  );
}

/** Laptop facing +z (user sits on the +z side). */
export function Laptop({ map }) {
  const alu = <Mat c="#d5d8db" m={0.75} r={0.3} />;
  return (
    <group>
      <Box s={[0.34, 0.015, 0.23]} p={[0, 0.0075, 0]} r={0.005}>{alu}</Box>
      <group position={[0, 0.015, -0.112]} rotation={[-0.25, 0, 0]}>
        <Box s={[0.34, 0.23, 0.008]} p={[0, 0.115, 0]} r={0.003}>{alu}</Box>
        <Plane s={[0.31, 0.2]} p={[0, 0.118, 0.0045]}>
          <Mat c="#000000" e="#ffffff" emap={map} ei={0.9} r={0.3} />
        </Plane>
      </group>
    </group>
  );
}

export function Books({ colors = ["#8a1538", "#efe6d6", "#4f9a96"], p, rot }) {
  let y = 0;
  return (
    <group position={p} rotation={rot}>
      {colors.map((c, i) => {
        const h = 0.025 + (i % 2) * 0.01;
        y += h;
        return (
          <Box key={i} s={[0.24 - i * 0.02, h, 0.17 - i * 0.01]} p={[0, y - h / 2, 0]} rot={[0, (i - 1) * 0.12, 0]} r={0.004}>
            <Mat c={c} r={0.7} />
          </Box>
        );
      })}
    </group>
  );
}

/** Model tooth (crown + two roots). */
export function Molar({ s = 1 }) {
  const enamel = <Porcelain c="#f7f5ef" r={0.28} />;
  return (
    <group scale={s}>
      <Box s={[0.07, 0.055, 0.065]} p={[0, 0.1, 0]} r={0.022}>{enamel}</Box>
      <Cyl a={[0.014, 0.006, 0.075, 12]} p={[-0.018, 0.04, 0]} rot={[0, 0, 0.15]}>{enamel}</Cyl>
      <Cyl a={[0.014, 0.006, 0.075, 12]} p={[0.018, 0.04, 0]} rot={[0, 0, -0.15]}>{enamel}</Cyl>
    </group>
  );
}

/** Teaching jaw model (gum arch + teeth). */
export function JawModel({ s = 1 }) {
  const teeth = Array.from({ length: 10 }, (_, i) => 0.2 + (i / 9) * (Math.PI - 0.4));
  return (
    <group scale={s}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} castShadow>
        <torusGeometry args={[0.06, 0.02, 10, 24, Math.PI]} />
        <Mat c="#e79aa0" r={0.45} />
      </mesh>
      {teeth.map((a, i) => (
        <Box key={i} s={[0.017, 0.022, 0.02]} p={[Math.cos(a) * 0.06, 0.042, -Math.sin(a) * 0.06]} rot={[0, a, 0]} r={0.006}>
          <Porcelain c="#fbfaf6" r={0.28} />
        </Box>
      ))}
    </group>
  );
}

/** Glass jar of coins. fill 0–1 = share of annual max remaining. */
export function CoinJar({ fill = 0.6, r = 0.085, h = 0.22 }) {
  const ref = useRef();
  const count = 120;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
    const rand = rng(17);
    const n = Math.round(count * THREE.MathUtils.clamp(fill, 0, 1));
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, rr2 = Math.sqrt(rand()) * (r - 0.028);
      p.set(Math.cos(a) * rr2, 0.016 + (i / count) * (h - 0.05) + rand() * 0.006, Math.sin(a) * rr2);
      e.set((rand() - 0.5) * 0.8, rand() * Math.PI, (rand() - 0.5) * 0.8);
      q.setFromEuler(e);
      m.compose(p, q, i < n ? one : zero);
      ref.current.setMatrixAt(i, m);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [fill, r, h]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.005, 20]} />
        <Mat c="#7fcfb0" m={0.35} r={0.35} />
      </instancedMesh>
      <Cyl a={[r, r, h, 40]} p={[0, h / 2, 0]} cast={false}>
        <Glass o={0.22} />
      </Cyl>
      <Cyl a={[r + 0.006, r + 0.006, 0.03, 40]} p={[0, h + 0.015, 0]}>
        <Chrome r={0.25} />
      </Cyl>
    </group>
  );
}

/**
 * Tall cabinet: closed cupboard below, glass doors above. Origin = floor, centre of footprint.
 * Children are placed on the shelves: local y = 0 (bottom), 0.38, 0.76.
 */
export function GlassCabinet({ w = 0.8, h = 2.1, d = 0.42, lower = "white", children }) {
  const walnut = tex.wood("walnut");
  const lowerH = 0.86, t = 0.025, iw = w - 2 * t;
  const lowerMat = lower === "wood" ? <Mat map={walnut} r={0.55} /> : <Mat c={C.white} r={0.45} />;
  const frame = <Mat c={C.white} r={0.4} />;
  return (
    <group>
      <ContactShadow w={w + 0.25} d={d + 0.25} o={0.45} />
      <Box s={[t, h, d]} p={[-w / 2 + t / 2, h / 2, 0]}>{frame}</Box>
      <Box s={[t, h, d]} p={[w / 2 - t / 2, h / 2, 0]}>{frame}</Box>
      <Box s={[w, t, d]} p={[0, h - t / 2, 0]}>{frame}</Box>
      <Box s={[iw, h - lowerH, 0.012]} p={[0, lowerH + (h - lowerH) / 2, -d / 2 + 0.006]}>
        <Mat c="#f1eee8" r={0.6} />
      </Box>
      <Box s={[iw, lowerH, d - 0.02]} p={[0, lowerH / 2, -0.01]}>{lowerMat}</Box>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Box s={[iw / 2 - 0.006, lowerH - 0.08, 0.018]} p={[(sd * iw) / 4, lowerH / 2 + 0.02, d / 2 - 0.011]}>{lowerMat}</Box>
          <Box s={[0.012, 0.14, 0.02]} p={[sd * 0.035, lowerH * 0.62, d / 2 + 0.008]} r={0.005}>
            <Chrome r={0.25} />
          </Box>
        </group>
      ))}
      <Box s={[iw, t, d - 0.02]} p={[0, lowerH + t / 2, -0.01]}>{frame}</Box>
      {[0.4, 0.78].map((y) => (
        <Box key={y} s={[iw - 0.01, 0.01, d - 0.06]} p={[0, lowerH + y, -0.02]} cast={false}>
          <Glass o={0.3} />
        </Box>
      ))}
      <group position={[0, lowerH + t, -0.02]}>{children}</group>
      {[-1, 1].map((sd) => {
        const gh = h - lowerH - 2 * t;
        return (
          <group key={`g${sd}`} position={[(sd * iw) / 4, lowerH + t + gh / 2, d / 2 - 0.01]}>
            <Box s={[iw / 2 - 0.006, gh, 0.006]} cast={false}>
              <Glass o={0.16} />
            </Box>
            <Box s={[0.02, gh, 0.016]} p={[-sd * (iw / 4 - 0.01), 0, 0]}>{frame}</Box>
          </group>
        );
      })}
    </group>
  );
}

/* ========================== stage, lights, camera ========================== */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** Warm key light with soft shadows plus a procedural environment. Shared by every room. */
export function Lights() {
  return (
    <>
      <hemisphereLight args={["#fffaf2", "#c9a27a", 0.8]} />
      <directionalLight
        castShadow
        position={[5, 9, 6]}
        intensity={2.2}
        color="#fff4e6"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <directionalLight position={[-6, 5, -2]} intensity={0.25} color="#dfefff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#fff1df" position={[-8, 3, 2]} rotation-y={Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#e3f1ff" position={[8, 3, 6]} rotation-y={-Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="ring" intensity={0.6} position={[4, 5, 8]} scale={3} />
      </Environment>
    </>
  );
}

/**
 * Moves the camera along a smooth curve through the stops.
 * progress (number, may be fractional) wins over active (index or stop id).
 */
function CameraRig({ stops, active, progress, reduce }) {
  const camera = useThree((s) => s.camera);
  const curves = useMemo(() => {
    if (!stops.length) return null;
    const pos = stops.map((s) => new THREE.Vector3(...s.camera));
    const tgt = stops.map((s) => new THREE.Vector3(...s.target));
    if (pos.length === 1) {
      pos.push(pos[0].clone());
      tgt.push(tgt[0].clone());
    }
    return { pos: new THREE.CatmullRomCurve3(pos, false, "centripetal"), tgt: new THREE.CatmullRomCurve3(tgt, false, "centripetal"), n: stops.length };
  }, [stops]);
  const look = useRef(new THREE.Vector3());
  const wantP = useMemo(() => new THREE.Vector3(), []);
  const wantT = useMemo(() => new THREE.Vector3(), []);

  const sample = () => {
    const idx = typeof progress === "number" ? progress : typeof active === "string" ? Math.max(0, stops.findIndex((s) => s.id === active)) : active;
    const t = curves.n > 1 ? THREE.MathUtils.clamp(idx / (curves.n - 1), 0, 1) : 0;
    curves.pos.getPoint(t, wantP);
    curves.tgt.getPoint(t, wantT);
  };

  useLayoutEffect(() => {
    if (!curves) return;
    sample();
    camera.position.copy(wantP);
    look.current.copy(wantT);
    camera.lookAt(look.current);
  }, [curves]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!curves) return;
    sample();
    const k = reduce ? 1 : 1 - Math.exp(-dt * 4);
    camera.position.lerp(wantP, k);
    look.current.lerp(wantT, k);
    camera.lookAt(look.current);
  });
  return null;
}

function DebugLog() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "p") return;
      const r = (v) => v.toArray().map((n) => +n.toFixed(2));
      console.log(JSON.stringify({ camera: r(camera.position), target: controls ? r(controls.target) : null }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camera, controls]);
  return null;
}

/**
 * Full-bleed 3D background. aria-hidden: all meaning lives in the HTML on top of it.
 * stops: [{ id, camera:[x,y,z], target:[x,y,z], focus? }]
 */
export function RoomStage({ children, stops = [], active = 0, progress, debug = false, reducedMotion, style, className }) {
  const prefersReduced = useReducedMotion();
  const reduce = reducedMotion ?? prefersReduced;
  const first = stops[0] ?? { camera: [10, 8, 10.5], target: [0, 1, 0] };
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 35%, #f1ede7 0%, #ddd6cd 65%, #cfc7bd 100%)", ...style }}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 30, near: 0.1, far: 80, position: first.camera }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Lights />
        {children}
        {debug ? (
          <>
            <OrbitControls makeDefault target={first.target} />
            <DebugLog />
          </>
        ) : (
          <CameraRig stops={stops} active={active} progress={progress} reduce={reduce} />
        )}
      </Canvas>
    </div>
  );
}

/** Dev-only viewer: jump between a room's camera stops; click doors to swing them open. */
export function RoomPreview({ Room, stops, debug = false }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(null);
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <RoomStage stops={stops} active={i} debug={debug}>
        <Room highlight={stops[i]?.focus} openDoor={open} onSelect={(id) => setOpen((o) => (o === id ? null : id))} />
      </RoomStage>
      <nav aria-label="Camera stops" style={{ position: "absolute", left: 16, bottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {stops.map((s, k) => (
          <button
            key={s.id}
            onClick={() => setI(k)}
            aria-pressed={k === i}
            style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #8a1538", background: k === i ? "#8a1538" : "#fff", color: k === i ? "#fff" : "#8a1538", font: "600 14px system-ui", cursor: "pointer" }}
          >
            {s.id}
          </button>
        ))}
      </nav>
    </div>
  );
}
