/**
 * providersBoard.js: the paper pinned on the Providers room's cork board, drawn on canvases.
 * A street map of Greensboro with the demo offices numbered on it, a directory card listing
 * them, and a sticky note. Pure drawing (no three.js), so it can be previewed on its own.
 */
import { PROVIDERS } from "../../data/mockData";

const INK = "#2f3740";
const MAROON = "#8a1538";
const GREY = "#8d959b";
const PAPER = "#f7f4ec";

/** The board's area: the Greensboro demo offices. */
const AREA = { south: 35.995, north: 36.15, west: -79.885, east: -79.745 };

/** Offices on the board, numbered in list order. */
export const BOARD_OFFICES = PROVIDERS.filter(
  (p) => typeof p.lat === "number" && typeof p.lng === "number" &&
    p.lat > AREA.south && p.lat < AREA.north && p.lng > AREA.west && p.lng < AREA.east,
).map((p, i) => ({ n: i + 1, name: p.practiceName, inNetwork: p.inNetwork, lat: p.lat, lng: p.lng }));

/** Map sheet layout, as fractions of the canvas: a title band on top, the map below it. */
export const MAP_ASPECT = 0.98 / 0.72;
const BAND = 0.2;
const MARGIN = 0.035;

/** Where a lat/lng lands on the map sheet, as fractions (u right, v down) of the whole sheet. */
export function projectOnSheet(lat, lng) {
  const x0 = MARGIN, x1 = 1 - MARGIN, y0 = BAND, y1 = 1 - MARGIN;
  const u = x0 + ((lng - AREA.west) / (AREA.east - AREA.west)) * (x1 - x0);
  const v = y1 - ((lat - AREA.south) / (AREA.north - AREA.south)) * (y1 - y0);
  return { u, v };
}

// Main roads, roughly where they run (lat, lng).
const ROADS = [
  { name: "S ELM ST", w: 9, pts: [[35.995, -79.7905], [36.15, -79.7915]], label: 0.28 },
  { name: "FRIENDLY AVE", w: 9, pts: [[36.081, -79.885], [36.0835, -79.84], [36.075, -79.79]], label: 0.3 },
  { name: "W WENDOVER AVE", w: 11, pts: [[36.045, -79.885], [36.07, -79.835], [36.092, -79.745]], label: 0.62 },
  { name: "BATTLEGROUND AVE", w: 9, pts: [[36.076, -79.795], [36.15, -79.845]], label: 0.55 },
  { name: "LAWNDALE DR", w: 7, pts: [[36.087, -79.806], [36.15, -79.812]], label: 0.9 },
  { name: "CONE BLVD", w: 9, pts: [[36.114, -79.845], [36.11, -79.745]], label: 0.62 },
  { name: "I-40", w: 14, pts: [[36.02, -79.885], [36.035, -79.82], [36.048, -79.745]], label: 0.2, highway: true },
];

function rounded(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Text shrunk until it fits maxW. */
function fitFont(g, text, maxW, size, min, font) {
  let s = size;
  do {
    g.font = font(s);
    s -= 1;
  } while (g.measureText(text).width > maxW && s >= min);
}

export function drawMap(g, w, h) {
  const px = (lat, lng) => {
    const { u, v } = projectOnSheet(lat, lng);
    return [u * w, v * h];
  };
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);

  // Title band.
  const pad = w * MARGIN;
  g.fillStyle = MAROON;
  g.fillRect(pad, h * 0.045, w * 0.07, Math.max(4, h * 0.008));
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  g.font = `500 ${Math.round(h * 0.085)}px Georgia, "Times New Roman", serif`;
  g.fillText("Greensboro, NC", pad, h * 0.14);
  g.font = `600 ${Math.round(h * 0.03)}px ui-monospace, Menlo, monospace`;
  g.fillStyle = "rgba(47, 55, 64, 0.7)";
  g.fillText("DENTISTS NEAR YOU · DEMO LISTINGS", pad, h * 0.182);

  // Legend, right of the title.
  const lx = w * 0.66, ly = h * 0.09, lr = h * 0.016;
  g.font = `500 ${Math.round(h * 0.032)}px system-ui, sans-serif`;
  g.fillStyle = MAROON;
  g.beginPath();
  g.arc(lx, ly, lr, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.fillText("In-network", lx + lr * 2.2, ly + lr * 0.7);
  g.strokeStyle = GREY;
  g.lineWidth = 4;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(lx, ly + h * 0.06, lr, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.fillText("Out-of-network", lx + lr * 2.2, ly + h * 0.06 + lr * 0.7);

  // Map frame; everything below is clipped to it.
  const mx = pad, my = h * BAND, mw = w - 2 * pad, mh = h * (1 - BAND) - pad;
  g.save();
  g.beginPath();
  g.rect(mx, my, mw, mh);
  g.clip();
  g.fillStyle = "#efeadf";
  g.fillRect(mx, my, mw, mh);

  // Faint street grid.
  g.strokeStyle = "rgba(47, 55, 64, 0.07)";
  g.lineWidth = 2;
  for (let x = mx; x < mx + mw; x += w * 0.04) {
    g.beginPath();
    g.moveTo(x, my);
    g.lineTo(x, my + mh);
    g.stroke();
  }
  for (let y = my; y < my + mh; y += w * 0.04) {
    g.beginPath();
    g.moveTo(mx, y);
    g.lineTo(mx + mw, y);
    g.stroke();
  }

  // Parks and Lake Brandt.
  g.fillStyle = "#dfe7d3";
  const [p1x, p1y] = px(36.103, -79.835);
  rounded(g, p1x - w * 0.05, p1y - h * 0.04, w * 0.1, h * 0.07, 12);
  g.fill();
  const [p2x, p2y] = px(36.052, -79.805);
  rounded(g, p2x - w * 0.04, p2y - h * 0.035, w * 0.08, h * 0.06, 12);
  g.fill();
  g.fillStyle = "#cfdde6";
  const [lkx, lky] = px(36.145, -79.86);
  g.beginPath();
  g.ellipse(lkx, lky, w * 0.08, h * 0.05, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5d7a8c";
  g.font = `italic 500 ${Math.round(h * 0.026)}px Georgia, serif`;
  g.fillText("Lake Brandt", lkx - w * 0.04, lky + h * 0.065);

  // Roads: grey casing, white (or amber, for the interstate) fill, names along them.
  for (const road of ROADS) {
    const pts = road.pts.map(([la, ln]) => px(la, ln));
    const line = () => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    };
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "rgba(47, 55, 64, 0.28)";
    g.lineWidth = road.w + 4;
    line();
    g.stroke();
    g.strokeStyle = road.highway ? "#f1d39a" : "#ffffff";
    g.lineWidth = road.w;
    line();
    g.stroke();
  }
  for (const road of ROADS) {
    const pts = road.pts.map(([la, ln]) => px(la, ln));
    const seg = Math.min(Math.floor(road.label * (pts.length - 1)), pts.length - 2);
    const t = road.label * (pts.length - 1) - seg;
    const [ax, ay] = pts[seg], [bx, by] = pts[seg + 1];
    let ang = Math.atan2(by - ay, bx - ax);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    g.save();
    g.translate(ax + (bx - ax) * t, ay + (by - ay) * t);
    g.rotate(ang);
    g.font = `700 ${Math.round(h * 0.022)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.fillStyle = "rgba(47, 55, 64, 0.62)";
    g.fillText(road.name, 0, -road.w - 4);
    g.restore();
  }

  // Office number tags (the 3D pins sit on the dots).
  g.textAlign = "center";
  for (const o of BOARD_OFFICES) {
    const [x, y] = px(o.lat, o.lng);
    g.fillStyle = "rgba(47, 55, 64, 0.35)";
    g.beginPath();
    g.arc(x, y, h * 0.012, 0, Math.PI * 2);
    g.fill();
    const tw = h * 0.05, th = h * 0.042, tx = x + h * 0.022, ty = y - h * 0.062;
    g.fillStyle = o.inNetwork ? MAROON : "#ffffff";
    g.strokeStyle = o.inNetwork ? MAROON : GREY;
    g.lineWidth = 3;
    rounded(g, tx, ty, tw, th, 6);
    g.fill();
    g.stroke();
    g.fillStyle = o.inNetwork ? "#ffffff" : INK;
    g.font = `700 ${Math.round(h * 0.03)}px ui-monospace, Menlo, monospace`;
    g.fillText(String(o.n), tx + tw / 2, ty + th * 0.74);
  }

  // Compass and scale.
  g.textAlign = "center";
  const cx = mx + mw - w * 0.045, cy = my + mh - h * 0.11;
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(cx, cy - h * 0.045);
  g.lineTo(cx + h * 0.018, cy + h * 0.01);
  g.lineTo(cx, cy);
  g.lineTo(cx - h * 0.018, cy + h * 0.01);
  g.closePath();
  g.fill();
  g.font = `700 ${Math.round(h * 0.03)}px system-ui, sans-serif`;
  g.fillText("N", cx, cy + h * 0.05);
  const mile = ((1 / 69) / (AREA.north - AREA.south)) * (mh - h * 0); // ~1 mile of latitude, in px
  const sx = mx + w * 0.03, sy = my + mh - h * 0.05;
  g.fillStyle = INK;
  g.fillRect(sx, sy, mile, 4);
  g.fillRect(sx, sy - 8, 3, 12);
  g.fillRect(sx + mile - 3, sy - 8, 3, 12);
  g.textAlign = "left";
  g.font = `600 ${Math.round(h * 0.024)}px ui-monospace, Menlo, monospace`;
  g.fillText("1 MI", sx + mile + 10, sy + 6);

  g.restore();
  g.strokeStyle = "rgba(47, 55, 64, 0.35)";
  g.lineWidth = 2;
  g.strokeRect(mx, my, mw, mh);
}

/** The index card beside the map: every office, numbered, in-network first marked. */
export function drawDirectory(g, w, h) {
  const pad = w * 0.08;
  g.fillStyle = "#fbfaf6";
  g.fillRect(0, 0, w, h);
  // Index-card rules.
  g.strokeStyle = "rgba(47, 111, 179, 0.18)";
  g.lineWidth = 2;
  for (let y = h * 0.2; y < h; y += h * 0.085) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(138, 21, 56, 0.35)";
  g.beginPath();
  g.moveTo(pad * 0.7, 0);
  g.lineTo(pad * 0.7, h);
  g.stroke();

  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = INK;
  g.font = `600 ${Math.round(w * 0.05)}px ui-monospace, Menlo, monospace`;
  g.fillText("NEARBY OFFICES", pad, h * 0.08);
  g.font = `500 ${Math.round(w * 0.075)}px Georgia, "Times New Roman", serif`;
  g.fillText(`${BOARD_OFFICES.filter((o) => o.inNetwork).length} in your network`, pad, h * 0.155);

  const rowH = Math.min(h * 0.085, (h * 0.78) / Math.max(BOARD_OFFICES.length, 1));
  BOARD_OFFICES.forEach((o, i) => {
    const base = h * 0.2 + rowH * (i + 1) - rowH * 0.28;
    g.fillStyle = o.inNetwork ? MAROON : GREY;
    g.font = `700 ${Math.round(w * 0.05)}px ui-monospace, Menlo, monospace`;
    g.fillText(String(o.n).padStart(2, "0"), pad, base);
    const nameX = pad + w * 0.12;
    g.fillStyle = o.inNetwork ? INK : "rgba(47, 55, 64, 0.62)";
    fitFont(g, o.name, w - nameX - pad * 0.6, Math.round(w * 0.052), Math.round(w * 0.034), (s) => `500 ${s}px system-ui, sans-serif`);
    g.fillText(o.name, nameX, base);
  });

  g.fillStyle = "rgba(47, 55, 64, 0.5)";
  g.font = `600 ${Math.round(w * 0.034)}px ui-monospace, Menlo, monospace`;
  g.fillText("FICTIONAL DEMO OFFICES \u00b7 555 NUMBERS", pad, h - pad * 0.8);
}

/** A sticky note: the one thing to do before booking. */
export function drawSticky(g, w, h) {
  g.fillStyle = "#f3e39b";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0, 0, 0, 0.05)";
  g.fillRect(0, 0, w, h * 0.16);
  g.fillStyle = "#4a3f1c";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  const size = Math.round(h * 0.15);
  g.font = `italic 500 ${size}px Georgia, "Times New Roman", serif`;
  const lines = ["Before you book:", "ask if they're", "in-network with", "your plan!"];
  lines.forEach((l, i) => g.fillText(l, w * 0.09, h * 0.33 + i * size * 1.18));
}
