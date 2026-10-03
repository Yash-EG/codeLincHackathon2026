// Shared materials: one instance per surface and color, created on first use
// and reused by every mesh that needs it. Textured materials pair a color map
// with a normal map from textures.ts. Detail textures are near-white, so the
// material color sets the hue (one plaster texture serves every wall color).

import {
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector2,
  type Material,
  type MeshStandardMaterialParameters,
  type Texture,
} from 'three'
import * as T from './textures'

const cache = new Map<string, Material>()

function memo<M extends Material>(key: string, make: () => M): M {
  const cached = cache.get(key)
  if (cached) return cached as M
  const material = make()
  cache.set(key, material)
  return material
}

function textured(key: string, maps: T.SurfaceMaps, params: MeshStandardMaterialParameters, normal = 1) {
  return memo(
    key,
    () =>
      new MeshStandardMaterial({
        ...params,
        map: maps.map,
        normalMap: maps.normalMap,
        normalScale: new Vector2(normal, normal),
      }),
  )
}

export const M = {
  // Floors and walls
  oakFloor: () => textured('oakFloor', T.oakPlanks(), { roughness: 0.62 }),
  terrazzo: () => textured('terrazzo', T.terrazzo(), { roughness: 0.42 }),
  tile: (color = '#ffffff') => textured(`tile:${color}`, T.tiles(), { color, roughness: 0.35 }),
  plaster: (color: string) => textured(`plaster:${color}`, T.plaster(), { color, roughness: 0.95 }),
  concrete: () => textured('concrete', T.concrete(), { roughness: 0.9 }),
  grass: () => textured('grass', T.grass(), { roughness: 1 }),

  // Furniture
  wood: (color = '#d6b48a') => textured(`wood:${color}`, T.woodGrain(), { color, roughness: 0.55 }),
  fabric: (color: string) => textured(`fabric:${color}`, T.fabric(), { color, roughness: 0.95 }),
  vinyl: (color: string) => textured(`vinyl:${color}`, T.vinyl(), { color, roughness: 0.42 }, 0.8),
  quartz: () => textured('quartz', T.quartz(), { roughness: 0.22 }, 0.5),
  cork: () => textured('cork', T.cork(), { roughness: 0.95 }),
  metal: (color = '#cfd4d8') => textured(`metal:${color}`, T.brushedMetal(), { color, roughness: 0.32, metalness: 0.85 }),
  paintedMetal: (color: string) =>
    textured(`paintedMetal:${color}`, T.brushedMetal(), { color, roughness: 0.5, metalness: 0.25 }, 0.6),

  // Untextured
  matte: (color: string, roughness = 0.85) =>
    memo(`matte:${color}:${roughness}`, () => new MeshStandardMaterial({ color, roughness })),
  ceramic: (color = '#efe6d6') =>
    memo(`ceramic:${color}`, () => new MeshStandardMaterial({ color, roughness: 0.3 })),
  leaf: (color: string) => memo(`leaf:${color}`, () => new MeshStandardMaterial({ color, roughness: 0.75 })),
  glass: () =>
    memo(
      'glass',
      () =>
        new MeshStandardMaterial({
          color: '#e3f1f4',
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
    ),
  glassTop: () =>
    memo(
      'glassTop',
      () =>
        new MeshStandardMaterial({
          color: '#cfe3df',
          roughness: 0.08,
          metalness: 0.05,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
    ),
  frosted: () =>
    memo(
      'frosted',
      () => new MeshStandardMaterial({ color: '#e6edec', roughness: 0.35, transparent: true, opacity: 0.88 }),
    ),
  /** Self-lit surface: lamp shades, windows with daylight behind them. */
  glow: (color: string, intensity = 1) =>
    memo(
      `glow:${color}:${intensity}`,
      () => new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 1 }),
    ),
  /** A picture on a surface (sign, art, calendar). Screens and light boxes are unlit. */
  picture: (key: string, texture: Texture, lit = true) =>
    memo(`picture:${key}:${lit}`, () =>
      lit ? new MeshStandardMaterial({ map: texture, roughness: 0.7 }) : new MeshBasicMaterial({ map: texture }),
    ),
}
