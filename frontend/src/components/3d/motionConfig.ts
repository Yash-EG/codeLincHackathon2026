/**
 * motionConfig.ts
 *
 * Motion graphics animation parameter data objects and math utilities for
 * Three.js, CameraControls, and Framer Motion.
 */

/* =========================================================================
   1. Camera Fly-Through Ease Configuration
   ========================================================================= */
export const CAMERA_FLY_THROUGH_CONFIG = {
  /**
   * Snappy, deliberate, and frictionless Cubic-Bezier easing curve
   * Matching [0.22, 1.0, 0.36, 1.0] (high initial velocity with asymptotic settle).
   */
  curve: [0.22, 1.0, 0.36, 1.0] as const,
  duration: 0.55, // seconds (from timeline 0.25s to 0.80s)
  startTime: 0.25,
  settleTime: 0.80,

  /** Framer Motion transition preset */
  framerMotionTransition: {
    duration: 0.55,
    ease: [0.22, 1.0, 0.36, 1.0],
  },

  /** Three.js CameraControls.setLookAt transition preset */
  cameraControlsTransition: {
    transitionStyle: 'setLookAt' as const,
    duration: 0.55,
    easing: [0.22, 1.0, 0.36, 1.0] as const,
  },

  /** Spring physics alternative */
  springAlternative: {
    mass: 1.0,
    stiffness: 72.0,
    damping: 18.5,
    restDelta: 0.001,
  },
} as const;

/* =========================================================================
   2. Station Panning Transition Configuration
   ========================================================================= */
export const STATION_PANNING_CONFIG = {
  /** Normalized horizontal panel scroll progress */
  inputDomain: [0.0, 1.0] as const,

  outputs: {
    orbitRotationDeltaRad: {
      range: [-5 * (Math.PI / 180), 5 * (Math.PI / 180)] as const,
      equivalentDegrees: [-5.0, 5.0] as const,
      unit: 'radians' as const,
    },
    focalOffsetPanDelta: {
      range: [-0.5, 0.5] as const,
      unit: 'meters' as const,
      axis: 'x' as const,
    },
  },

  smoothing: {
    framerMotionSpring: {
      stiffness: 140.0,
      damping: 24.0,
      mass: 0.35,
      restDelta: 0.0001,
    },
    threeLerpAlpha: 0.08,
    dampLambda: 4.0,
  },
} as const;

/* =========================================================================
   3. Seamless Door Swing & Camera Timeline Configuration
   ========================================================================= */
export const DOOR_SWING_TIMELINE_CONFIG = {
  totalDuration: 1.7,
  timeUnit: 'seconds' as const,

  /**
   * What DentalOffice's camera rig and getDoorTimelineState() actually run on.
   * The camera eases (in-out cubic) along both legs between flyStart and flyEnd;
   * the exit door is fully open by openEnd, well before the camera reaches it.
   * After the room swap the entry door holds open (time pinned at holdOpen) until
   * max(closeAt, swap + closeAfterSwap), then runs closeAt -> closeEnd.
   */
  camera: {
    flyStart: 0.05, // the camera sets off almost with the click; the door is already swinging
    flyEnd: 1.6,
    holdOpen: 0.6,
    closeAt: 1.2,
    closeAfterSwap: 0.3,
    closeEnd: 1.7,
  },

  keyframes: [
    {
      time: 0.0,
      target: 'door.plaque.material',
      property: 'emissiveIntensity',
      value: 1.0,
      description: 'Door plaque light activates',
    },
    {
      time: 0.15,
      target: 'door.mesh.rotation',
      property: 'y',
      fromValue: 0.0,
      toValue: -1.25,
      easing: 'back-out' as const,
      description: 'Door starts swinging open (0 to -1.25 rad) with custom back-out easing',
    },
    {
      time: 0.25,
      target: 'cameraControls',
      method: 'setLookAt',
      description: 'Camera setLookAt to next room station begins',
    },
    {
      time: 0.8,
      target: 'cameraControls',
      description: 'Camera arrives and settles',
    },
    {
      time: 0.9,
      target: ['door.mesh.rotation', 'door.plaque.material'],
      description: 'Door swings shut, plaque light deactivates',
    },
    {
      time: 1.35,
      description: 'Door fully shut, transition completed',
    },
  ],

  tracks: {
    plaqueLight: {
      activateTime: 0.0,
      activeIntensity: 1.0,
      deactivateTime: 0.9,
      inactiveIntensity: 0.0,
    },
    doorSwing: {
      openStartTime: 0.15,
      openEndTime: 0.65,
      closedRad: 0.0,
      openRad: -1.25,
      easing: 'back-out' as const,
      backOutOvershoot: 1.35,
      closeStartTime: 0.9,
      closeEndTime: 1.3,
    },
    cameraFlyThrough: {
      startTime: 0.25,
      settleTime: 0.8,
      duration: 0.55,
      easing: [0.22, 1.0, 0.36, 1.0] as const,
    },
  },
} as const;

/* =========================================================================
   Easing Solvers and Mathematical Utilities
   ========================================================================= */

/**
 * Creates a high-precision Cubic-Bezier easing evaluator matching CSS / Framer Motion.
 */
export function createCubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3.0 * x1;
  const bx = 3.0 * (x2 - x1) - cx;
  const ax = 1.0 - cx - bx;

  const cy = 3.0 * y1;
  const by = 3.0 * (y2 - y1) - cy;
  const ay = 1.0 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx;

  const solveCurveX = (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson iteration for fast, exact convergence
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleCurveX(t) - x;
      if (Math.abs(xEst) < 1e-6) return t;
      const dX = sampleCurveDerivativeX(t);
      if (Math.abs(dX) < 1e-6) break;
      t -= xEst / dX;
    }

    // Binary subdivision fallback
    let t0 = 0.0;
    let t1 = 1.0;
    t = x;
    while (t0 < t1) {
      const xEst = sampleCurveX(t);
      if (Math.abs(xEst - x) < 1e-6) return t;
      if (x > xEst) t0 = t;
      else t1 = t;
      t = (t1 + t0) * 0.5;
      if (Math.abs(t1 - t0) < 1e-6) break;
    }
    return t;
  };

  return function ease(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleCurveY(solveCurveX(t));
  };
}

/** Pre-compiled camera fly-through cubic bezier evaluator [0.22, 1, 0.36, 1] */
export const cameraFlyThroughEasing = createCubicBezier(0.22, 1.0, 0.36, 1.0);

/** Custom back-out easing with overshoot parameter */
export function backOutEasing(t: number, s = 1.35): number {
  const p = Math.max(0, Math.min(1, t)) - 1;
  return p * p * ((s + 1) * p + s) + 1;
}

/** Hermite smoothstep */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Maps normalized horizontal panel scroll progress (0.0 to 1.0) to:
 * - Local camera orbit rotation delta (-5deg to +5deg)
 * - Focal offset pan delta (-0.5m to +0.5m)
 */
export function mapStationPanning(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const normDelta = p * 2.0 - 1.0; // [-1.0, +1.0]

  const DEG_TO_RAD = Math.PI / 180;
  const orbitDeltaDeg = normDelta * 5.0;
  const orbitDeltaRad = orbitDeltaDeg * DEG_TO_RAD;
  const panDeltaMeters = normDelta * 0.5;

  return {
    orbitDeltaDeg,
    orbitDeltaRad,
    panDeltaMeters,
  };
}

/**
 * Evaluates the sequential timeline state in seconds:
 * - Time 0s: Door plaque light activates (emissiveIntensity to 1.0).
 * - Time 0.15s: Door starts swinging open (rotation y from 0 to -1.25 rad) using custom back-out easing.
 * - Time 0.25s: Camera setLookAt to next room station begins.
 * - Time 0.8s: Camera arrives and settles.
 * - Time 0.9s: Door swings shut, plaque light deactivates.
 */
export function getDoorTimelineState(t: number) {
  const { flyStart, flyEnd, closeAt, closeEnd } = DOOR_SWING_TIMELINE_CONFIG.camera;
  const OPEN_START = 0.0;
  const OPEN_END = 0.45;
  const OPEN_RAD = -1.25;

  // 1. Plaque light: quick ramp up, on while the door is in use, fades as it closes.
  let plaqueEmissive = 0.0;
  if (t < closeAt) plaqueEmissive = smoothstep(t / 0.15);
  else plaqueEmissive = 1.0 - smoothstep((t - closeAt) / 0.3);

  // 2. Door hinge rotation.y: ease in-out open (no overshoot), hold, ease in-out close.
  let doorRotationY = 0.0;
  if (t < closeAt) {
    doorRotationY = OPEN_RAD * smoothstep((t - OPEN_START) / (OPEN_END - OPEN_START));
  } else {
    doorRotationY = OPEN_RAD * (1.0 - smoothstep((t - closeAt) / (closeEnd - closeAt)));
  }

  // 3. Camera phase metadata
  const cameraActive = t >= flyStart && t <= flyEnd;
  const cameraProgress = Math.max(0, Math.min(1, (t - flyStart) / (flyEnd - flyStart)));

  return {
    plaqueEmissive,
    doorRotationY,
    cameraActive,
    cameraProgress,
  };
}
