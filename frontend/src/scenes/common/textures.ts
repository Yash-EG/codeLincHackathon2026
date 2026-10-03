// Procedural textures, painted on <canvas> at runtime: no image files, nothing
// to download, works offline. Each surface gets a color map plus a normal map
// derived from a height map painted with the same random seed, so seams, grain
// and grout catch the light.
//
// Tiling textures are sized in meters (metersPerTile). drei's <RoundedBox> and
// ExtrudeGeometry produce UVs in world units, so one texture tiles at the same
// physical scale on every box that uses it.

import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'

export interface SurfaceMaps {
  map: CanvasTexture
  normalMap: CanvasTexture
}

type Mode = 'color' | 'height'
type Painter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number, mode: Mode) => void

const FONT = '"Inter Variable", Inter, system-ui, sans-serif'

/** Small seeded PRNG (mulberry32): the color and height passes must draw the same layout. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeCanvas(width: number, height = width) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const gray = (v: number) => {
  const c = Math.max(0, Math.min(255, Math.round(v)))
  return `rgb(${c},${c},${c})`
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb color. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  )
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}

/** Draws at (x, y) and again across the opposite edges, so the tile repeats without seams. */
function wrapped(size: number, x: number, y: number, reach: number, draw: (x: number, y: number) => void) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const px = x + dx
      const py = y + dy
      if (px + reach < 0 || px - reach > size || py + reach < 0 || py - reach > size) continue
      draw(px, py)
    }
  }
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${alpha})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

/** Grayscale height map -> tangent-space normal map (OpenGL convention, as three.js expects). */
function heightToNormal(height: HTMLCanvasElement, strength: number) {
  const size = height.width
  const src = height.getContext('2d')!.getImageData(0, 0, size, size).data
  const out = makeCanvas(size)
  const ctx = out.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const h = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      img.data[i] = (-dx / len) * 127.5 + 127.5
      img.data[i + 1] = (dy / len) * 127.5 + 127.5
      img.data[i + 2] = (1 / len) * 127.5 + 127.5
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return out
}

function tileable(canvas: HTMLCanvasElement, metersPerTile: number, isColor: boolean) {
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(1 / metersPerTile, 1 / metersPerTile)
  texture.anisotropy = 8
  texture.colorSpace = isColor ? SRGBColorSpace : NoColorSpace
  return texture
}

const surfaces = new Map<string, SurfaceMaps>()

function surface(key: string, size: number, metersPerTile: number, strength: number, paint: Painter): SurfaceMaps {
  const cached = surfaces.get(key)
  if (cached) return cached
  const seed = hash(key)
  const color = makeCanvas(size)
  paint(color.getContext('2d')!, size, random(seed), 'color')
  const height = makeCanvas(size)
  paint(height.getContext('2d')!, size, random(seed), 'height')
  const maps = {
    map: tileable(color, metersPerTile, true),
    normalMap: tileable(heightToNormal(height, strength), metersPerTile, false),
  }
  surfaces.set(key, maps)
  return maps
}

// ---------------------------------------------------------------------------
// Tiling surfaces. "Detail" textures are near-white and take their hue from the
// material color, so one texture serves every wall or fabric color.

/** Light oak floor planks: 20 cm boards, staggered joints, wavy grain. */
export const oakPlanks = () =>
  surface('oak', 1024, 2.4, 3, (ctx, s, rand, mode) => {
    const rows = 12
    const rowH = s / rows
    const tones = ['#c99f70', '#d4ad80', '#ddb98d', '#c49768', '#d8b386', '#cfa679']
    for (let r = 0; r < rows; r++) {
      const y = r * rowH
      const start = rand() * s
      let x = start
      while (x < start + s - 1) {
        const len = Math.min(s * (0.28 + rand() * 0.3), start + s - x)
        const tone = tones[Math.floor(rand() * tones.length)]
        const grainSeed = Math.floor(rand() * 1e9)
        for (const offset of [0, -s]) plank(ctx, x + offset, y, len, rowH, tone, grainSeed, mode)
        x += len
      }
    }
  })

function plank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: string,
  grainSeed: number,
  mode: Mode,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = mode === 'color' ? tone : gray(150)
  ctx.fillRect(x, y, w, h)
  const g = random(grainSeed)
  const lines = 8 + Math.floor(g() * 6)
  for (let i = 0; i < lines; i++) {
    const ly = y + g() * h
    const amp = 1 + g() * 3
    const freq = 0.004 + g() * 0.01
    const phase = g() * Math.PI * 2
    const alpha = 0.06 + g() * 0.12
    ctx.lineWidth = 0.6 + g() * 1.6
    ctx.strokeStyle = mode === 'color' ? `rgba(110,72,38,${alpha})` : `rgba(0,0,0,${alpha})`
    ctx.beginPath()
    for (let px = x; px <= x + w + 6; px += 6) {
      const py = ly + Math.sin(px * freq + phase) * amp
      if (px === x) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
  // End joint and the seam along the bottom of the row.
  ctx.fillStyle = mode === 'color' ? 'rgba(92,60,32,0.55)' : gray(15)
  ctx.fillRect(x, y, 2, h)
  ctx.fillRect(x, y + h - 2, w, 2)
}

/** Painted plaster: soft mottling and fine speckle. Tinted by the material color. */
export const plaster = () =>
  surface('plaster', 512, 1.6, 2.2, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#f1f0ec' : gray(128)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 260; i++) {
      const x = rand() * s
      const y = rand() * s
      const r = 8 + rand() * 46
      const rgb = rand() > 0.5 ? '255,255,255' : '0,0,0'
      const a = 0.025 + rand() * 0.04
      wrapped(s, x, y, r, (px, py) => blob(ctx, px, py, r, rgb, a))
    }
    for (let i = 0; i < 3500; i++) {
      const x = rand() * s
      const y = rand() * s
      const a = 0.04 + rand() * 0.08
      ctx.fillStyle = rand() > 0.4 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`
      ctx.fillRect(x, y, 1.2, 1.2)
    }
  })

/** Plain-weave upholstery fabric. Tinted by the material color. */
export const fabric = () =>
  surface('fabric', 512, 0.3, 2.5, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#f4f4f2' : gray(128)
    ctx.fillRect(0, 0, s, s)
    const cell = 4
    for (let y = 0; y < s; y += cell) {
      for (let x = 0; x < s; x += cell) {
        const over = (x / cell + y / cell) % 2 === 0
        const v = rand() * 0.06
        ctx.fillStyle = mode === 'color' ? `rgba(0,0,0,${(over ? 0.02 : 0.1) + v})` : gray(over ? 175 + v * 300 : 85 + v * 300)
        ctx.fillRect(x, y, cell, cell)
      }
    }
    for (let i = 0; i < 420; i++) {
      const x = rand() * s
      const y = Math.floor(rand() * (s / cell)) * cell
      const len = 10 + rand() * 40
      const a = 0.04 + rand() * 0.06
      ctx.fillStyle = mode === 'color' ? `rgba(255,255,255,${a})` : `rgba(255,255,255,${a * 2})`
      wrapped(s, x, y, len, (px, py) => ctx.fillRect(px, py, len, cell))
    }
  })

/** Pebbled vinyl / leatherette (dental chair, aprons). Tinted by the material color. */
export const vinyl = () =>
  surface('vinyl', 512, 0.25, 1.6, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#f3f3f3' : gray(128)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 5200; i++) {
      const x = rand() * s
      const y = rand() * s
      const r = 1 + rand() * 1.8
      const a = 0.03 + rand() * 0.05
      ctx.fillStyle = mode === 'color' ? `rgba(0,0,0,${a})` : `rgba(0,0,0,${a * 3})`
      wrapped(s, x, y, r, (px, py) => {
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  })

/** Terrazzo: warm white base with sage, blue, cream and gray chips (colors baked in). */
export const terrazzo = () =>
  surface('terrazzo', 512, 1.2, 1.6, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#ebe7df' : gray(110)
    ctx.fillRect(0, 0, s, s)
    const chips = ['#a9bea0', '#a9bea0', '#8fb1cf', '#f8f2e6', '#f8f2e6', '#b9b2a6', '#b9b2a6', '#6f7d75', '#d9c6a5']
    for (let i = 0; i < 1100; i++) {
      const x = rand() * s
      const y = rand() * s
      const r = 1.5 + rand() * 6
      const sides = 3 + Math.floor(rand() * 4)
      const rot = rand() * Math.PI * 2
      const color = chips[Math.floor(rand() * chips.length)]
      const lift = 150 + rand() * 50
      ctx.fillStyle = mode === 'color' ? color : gray(lift)
      wrapped(s, x, y, r, (px, py) => {
        ctx.beginPath()
        for (let k = 0; k < sides; k++) {
          const a = rot + (k / sides) * Math.PI * 2
          const rr = r * (0.7 + ((k * 7919) % 5) * 0.08)
          ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr)
        }
        ctx.closePath()
        ctx.fill()
      })
    }
  })

/** 30 cm square tiles with grout. Tinted by the material color. */
export const tiles = () =>
  surface('tiles', 512, 1.2, 3, (ctx, s, rand, mode) => {
    const n = 4
    const t = s / n
    const grout = 5
    ctx.fillStyle = mode === 'color' ? '#cdd3cf' : gray(30)
    ctx.fillRect(0, 0, s, s)
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const tone = rand() * 0.035
        ctx.fillStyle = mode === 'color' ? shade('#fbfbf9', -tone) : gray(190 + tone * 400)
        ctx.fillRect(i * t + grout / 2, j * t + grout / 2, t - grout, t - grout)
      }
    }
  })

/** Brushed metal: fine horizontal streaks. Tinted by the material color. */
export const brushedMetal = () =>
  surface('brushed', 512, 0.5, 0.7, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#e6e9eb' : gray(128)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 1600; i++) {
      const y = rand() * s
      const a = 0.03 + rand() * 0.08
      const light = rand() > 0.5
      const h = 0.6 + rand() * 1.4
      ctx.fillStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
      ctx.fillRect(0, y, s, h)
    }
  })

/** Natural cork board (colors baked in). */
export const cork = () =>
  surface('cork', 512, 0.5, 2.6, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#b88a5a' : gray(120)
    ctx.fillRect(0, 0, s, s)
    const colors = ['#8a5d34', '#d0a46e', '#a67747', '#e3c08c', '#6d4727']
    for (let i = 0; i < 9000; i++) {
      const x = rand() * s
      const y = rand() * s
      const r = 0.6 + rand() * 2.2
      const color = colors[Math.floor(rand() * colors.length)]
      const lift = 70 + rand() * 130
      ctx.fillStyle = mode === 'color' ? color : gray(lift)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  })

/** Continuous wood grain for furniture (no plank seams). Tinted by the material color. */
export const woodGrain = () =>
  surface('wood', 512, 1.2, 1.3, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#f1e6d7' : gray(140)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 150; i++) {
      const y0 = rand() * s
      const periods = 1 + Math.floor(rand() * 3)
      const amp = 2 + rand() * 8
      const phase = rand() * Math.PI * 2
      const alpha = 0.05 + rand() * 0.13
      const width = 0.6 + rand() * 1.8
      ctx.strokeStyle = mode === 'color' ? `rgba(96,60,30,${alpha})` : `rgba(0,0,0,${alpha})`
      ctx.lineWidth = width
      for (const offset of [-s, 0, s]) {
        ctx.beginPath()
        for (let x = 0; x <= s; x += 4) {
          const y = y0 + offset + Math.sin((x / s) * Math.PI * 2 * periods + phase) * amp
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
  })

/** Quartz countertop: warm white with faint veins and speckle (colors baked in). */
export const quartz = () =>
  surface('quartz', 512, 1, 0.5, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#f6f4ef' : gray(140)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 26; i++) {
      const x = rand() * s
      const y = rand() * s
      const dx = (rand() - 0.5) * s * 0.8
      const dy = (rand() - 0.5) * s * 0.8
      const a = 0.05 + rand() * 0.08
      const width = 0.8 + rand() * 2.4
      ctx.strokeStyle = mode === 'color' ? `rgba(120,120,115,${a})` : `rgba(0,0,0,${a})`
      ctx.lineWidth = width
      wrapped(s, x, y, Math.max(Math.abs(dx), Math.abs(dy)), (px, py) => {
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.bezierCurveTo(px + dx * 0.3, py - dy * 0.2, px + dx * 0.6, py + dy * 0.7, px + dx, py + dy)
        ctx.stroke()
      })
    }
    for (let i = 0; i < 2600; i++) {
      const x = rand() * s
      const y = rand() * s
      const a = 0.08 + rand() * 0.12
      ctx.fillStyle = `rgba(90,90,85,${a})`
      ctx.fillRect(x, y, 1.3, 1.3)
    }
  })

/** Sidewalk concrete with expansion joints every 1.5 m (colors baked in). */
export const concrete = () =>
  surface('concrete', 1024, 3, 1.4, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#dcd9d2' : gray(128)
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 320; i++) {
      const x = rand() * s
      const y = rand() * s
      const r = 10 + rand() * 70
      const rgb = rand() > 0.5 ? '255,255,255' : '0,0,0'
      const a = 0.02 + rand() * 0.04
      wrapped(s, x, y, r, (px, py) => blob(ctx, px, py, r, rgb, a))
    }
    for (let i = 0; i < 9000; i++) {
      const x = rand() * s
      const y = rand() * s
      const a = 0.05 + rand() * 0.1
      ctx.fillStyle = rand() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`
      ctx.fillRect(x, y, 1.5, 1.5)
    }
    ctx.fillStyle = mode === 'color' ? 'rgba(80,80,76,0.45)' : gray(10)
    for (const p of [0, s / 2]) {
      ctx.fillRect(p, 0, 3, s)
      ctx.fillRect(0, p, s, 3)
    }
  })

/** Lawn grass (colors baked in). */
export const grass = () =>
  surface('grass', 512, 1, 2.4, (ctx, s, rand, mode) => {
    ctx.fillStyle = mode === 'color' ? '#8fae7f' : gray(90)
    ctx.fillRect(0, 0, s, s)
    const greens = ['#7a9d6a', '#a9c596', '#86a874', '#6a8e5b', '#b8cfa5']
    ctx.lineCap = 'round'
    for (let i = 0; i < 7000; i++) {
      const x = rand() * s
      const y = rand() * s
      const len = 4 + rand() * 7
      const angle = (rand() - 0.5) * 0.8
      const color = greens[Math.floor(rand() * greens.length)]
      const lift = 140 + rand() * 90
      ctx.strokeStyle = mode === 'color' ? color : gray(lift)
      ctx.lineWidth = 1.2
      wrapped(s, x, y, len, (px, py) => {
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + Math.sin(angle) * len, py - Math.cos(angle) * len)
        ctx.stroke()
      })
    }
  })

// ---------------------------------------------------------------------------
// Pictures: signs, screens, art. Drawn once, not tiled.

const pictures = new Map<string, CanvasTexture>()

function picture(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const cached = pictures.get(key)
  if (cached) return cached
  const canvas = makeCanvas(width, height)
  draw(canvas.getContext('2d')!, width, height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  pictures.set(key, texture)
  return texture
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, maxSize: number, maxWidth: number) {
  let size = maxSize
  do {
    ctx.font = `${weight} ${size}px ${FONT}`
    size -= 2
  } while (ctx.measureText(text).width > maxWidth && size > 8)
}

/** A sign or plaque: centered text, optional smaller second line. Aspect = width / height. */
export function labelTexture(text: string, bg: string, fg: string, aspect: number, sub?: string) {
  const w = 1024
  const h = Math.round(w / aspect)
  return picture(`label:${text}:${sub ?? ''}:${bg}:${fg}:${aspect}`, w, h, (ctx) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    fitText(ctx, text, 650, h * (sub ? 0.42 : 0.56), w * 0.86)
    ctx.fillText(text, w / 2, sub ? h * 0.4 : h / 2)
    if (sub) {
      fitText(ctx, sub, 500, h * 0.2, w * 0.86)
      ctx.globalAlpha = 0.85
      ctx.fillText(sub, w / 2, h * 0.74)
      ctx.globalAlpha = 1
    }
  })
}

const ART_COLORS = ['#3e8f8a', '#a9d6c8', '#1f4e5f', '#e8d9c0', '#6fb7a8', '#cfe7df', '#2f6f73']

/** Soft abstract print in teal and mint (organic overlapping shapes), for wall frames. */
export function artTexture(seed: number) {
  return picture(`art:${seed}`, 512, 680, (ctx, w, h) => {
    const rand = random(seed * 7919 + 13)
    ctx.fillStyle = '#f4efe4'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ART_COLORS[Math.floor(rand() * ART_COLORS.length)]
      ctx.globalAlpha = 0.75 + rand() * 0.25
      const cx = w * (0.15 + rand() * 0.7)
      const cy = h * (0.12 + rand() * 0.76)
      const r = 70 + rand() * 130
      const squash = 0.6 + rand() * 0.6
      const tilt = rand() * Math.PI
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, r * squash, tilt, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

/** What you see through a window: soft sky over blurred garden greenery. */
export function viewTexture() {
  return picture('view', 512, 640, (ctx, w, h) => {
    const rand = random(4242)
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#eef5f4')
    sky.addColorStop(0.45, '#dfeee3')
    sky.addColorStop(1, '#a9c79a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    const greens = ['#7fae6e', '#a8cc8c', '#5f8f55', '#c6dfae', '#8fbd7a', '#eaf3dc']
    ctx.filter = 'blur(6px)'
    for (let i = 0; i < 160; i++) {
      const x = rand() * w
      const y = h * (0.15 + rand() * 0.85)
      const r = 10 + rand() * 46
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)]
      ctx.globalAlpha = 0.5 + rand() * 0.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.filter = 'none'
    ctx.globalAlpha = 1
  })
}

/** Warm, out-of-focus interior seen through a shop window at the entrance. */
export function interiorTexture() {
  return picture('interior', 512, 512, (ctx, w, h) => {
    const rand = random(777)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#fbf3e3')
    g.addColorStop(1, '#e6dccb')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.filter = 'blur(10px)'
    const tones = ['#a9cfbd', '#f4f1ec', '#c9a073', '#8a1538', '#9ec3ac']
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
      ctx.globalAlpha = 0.35 + rand() * 0.4
      ctx.fillRect(rand() * w, h * (0.35 + rand() * 0.6), 40 + rand() * 120, 30 + rand() * 120)
    }
    ctx.filter = 'none'
    ctx.globalAlpha = 1
  })
}

/** Plain wall clock face: ticks and hands at ten past ten. */
export function clockTexture() {
  return picture('clock', 512, 512, (ctx, w) => {
    const c = w / 2
    ctx.fillStyle = '#fbfaf7'
    ctx.fillRect(0, 0, w, w)
    ctx.fillStyle = '#2b3640'
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      const major = i % 5 === 0
      const len = major ? 34 : 14
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(a)
      ctx.fillRect(-(major ? 5 : 2), -c + 26, major ? 10 : 4, len)
      ctx.restore()
    }
    const hand = (angle: number, length: number, width: number, color: string) => {
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(angle)
      ctx.fillStyle = color
      ctx.fillRect(-width / 2, -length, width, length + 20)
      ctx.restore()
    }
    hand((10 / 12) * Math.PI * 2 + (2 / 60) * (Math.PI / 6), c * 0.5, 14, '#2b3640')
    hand((2 / 12) * Math.PI * 2, c * 0.74, 9, '#2b3640')
    hand((40 / 60) * Math.PI * 2, c * 0.8, 3, '#8a1538')
    ctx.fillStyle = '#2b3640'
    ctx.beginPath()
    ctx.arc(c, c, 14, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** A printed page or a sticky note: colored paper with a few lines of "text". */
export function noteTexture(paper: string, lines: number) {
  return picture(`note:${paper}:${lines}`, 256, 320, (ctx, w, h) => {
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(31,42,51,0.45)'
    for (let i = 0; i < lines; i++) {
      const width = w * (0.55 + ((i * 37) % 30) / 100)
      ctx.fillRect(w * 0.12, h * 0.16 + i * (h * 0.7) / Math.max(lines, 1), width, 9)
    }
  })
}

/** Wall calendar for December: Dec 31 (benefits reset) circled, a planned visit marked. */
export function calendarTexture() {
  return picture('calendar', 600, 700, (ctx, w, h) => {
    ctx.fillStyle = '#fbf8f1'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#1f4e79'
    ctx.fillRect(0, 0, w, 130)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 64px ${FONT}`
    ctx.fillText('DECEMBER', w / 2, 68)
    const cols = 7
    const cell = w / cols
    ctx.fillStyle = '#4a5a66'
    ctx.font = `600 26px ${FONT}`
    'SMTWTFS'.split('').forEach((d, i) => ctx.fillText(d, cell * (i + 0.5), 165))
    // December 1 falls on a Tuesday in 2026.
    const offset = 2
    ctx.font = `500 32px ${FONT}`
    for (let day = 1; day <= 31; day++) {
      const slot = day - 1 + offset
      const x = cell * ((slot % cols) + 0.5)
      const y = 220 + Math.floor(slot / cols) * 92
      ctx.fillStyle = '#1f2a33'
      ctx.fillText(String(day), x, y)
      if (day === 8) {
        ctx.fillStyle = '#2563a6'
        ctx.beginPath()
        ctx.arc(x, y + 30, 7, 0, Math.PI * 2)
        ctx.fill()
      }
      if (day === 31) {
        ctx.strokeStyle = '#0e8a6c'
        ctx.lineWidth = 7
        ctx.beginPath()
        ctx.arc(x, y, 34, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  })
}

/** A dashboard-like screen: header, cards and a bar chart in the brand colors. */
export function screenTexture(variant: 'chart' | 'list') {
  return picture(`screen:${variant}`, 800, 500, (ctx, w, h) => {
    ctx.fillStyle = '#16324d'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#1f4e79'
    ctx.fillRect(0, 0, w, 64)
    ctx.fillStyle = '#d3efe3'
    ctx.fillRect(28, 22, 160, 20)
    if (variant === 'chart') {
      const bars = [0.55, 0.8, 0.42, 0.68, 0.9, 0.36, 0.6]
      bars.forEach((v, i) => {
        ctx.fillStyle = i === 4 ? '#3fc39d' : '#8fb1cf'
        const bw = 60
        const x = 60 + i * 100
        ctx.fillRect(x, h - 50 - v * 300, bw, v * 300)
      })
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(40, h - 48, w - 80, 2)
    } else {
      for (let i = 0; i < 6; i++) {
        const y = 100 + i * 62
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'
        ctx.fillRect(30, y, w - 60, 48)
        ctx.fillStyle = '#d6e6f2'
        ctx.fillRect(50, y + 16, 220 + ((i * 53) % 140), 14)
        ctx.fillStyle = '#3fc39d'
        ctx.fillRect(w - 170, y + 16, 110, 14)
      }
    }
  })
}

/** A panoramic film on a light box: soft bright arches on a dark field. */
export function xrayTexture() {
  return picture('xray', 1024, 512, (ctx, w, h) => {
    const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.6)
    bg.addColorStop(0, '#2b3b47')
    bg.addColorStop(1, '#0b151c')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(220,232,240,0.35)'
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.62, 0, Math.PI * 1.08, Math.PI * 1.92)
    ctx.stroke()
    for (const [cy, dir] of [[h * 0.44, -1], [h * 0.58, 1]] as const) {
      for (let i = 0; i < 14; i++) {
        const t = (i + 0.5) / 14
        const x = w * (0.16 + t * 0.68)
        const curve = Math.sin(t * Math.PI) * 26
        ctx.fillStyle = 'rgba(232,240,245,0.78)'
        ctx.beginPath()
        ctx.roundRect(x - 18, cy - curve * dir * 0.3 + (dir < 0 ? -56 : 0), 36, 56, 12)
        ctx.fill()
        ctx.fillStyle = 'rgba(200,214,224,0.35)'
        ctx.fillRect(x - 6, dir < 0 ? cy - 120 : cy + 54, 12, 66)
      }
    }
  })
}

/** The hallway directory sign. */
export function directoryTexture(rooms: string[]) {
  return picture(`directory:${rooms.join('|')}`, 600, 900, (ctx, w) => {
    const h = 900
    ctx.fillStyle = '#1f4e79'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.font = `700 58px ${FONT}`
    ctx.fillText('Directory', 50, 90)
    ctx.fillStyle = '#d3efe3'
    ctx.fillRect(50, 140, w - 100, 4)
    ctx.font = `500 44px ${FONT}`
    rooms.forEach((room, i) => {
      const y = 220 + i * 105
      ctx.fillStyle = '#ffffff'
      ctx.fillText(room, 50, y)
      ctx.fillStyle = '#3fc39d'
      ctx.beginPath()
      ctx.moveTo(w - 90, y - 16)
      ctx.lineTo(w - 58, y)
      ctx.lineTo(w - 90, y + 16)
      ctx.fill()
    })
  })
}
