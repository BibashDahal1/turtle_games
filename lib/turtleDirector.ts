/**
 * The turtle's "brain" — continuous, fish-like swimming + a library of 41 moves.
 *
 *  - The turtle LIVES IN THE PAGE (document space), not on the glass of the screen. Scrolling carries the
 *    page past it. It only travels when the section under the middle of the screen changes.
 *  - Base position glides toward waypoints with a critically-damped spring (never stops dead).
 *  - Moves (tornados, flips, sweeps, emotes...) are smooth OFFSETS layered on top (they fade in/out).
 *  - Heading follows real swim velocity (NOT the page scroll) and banks into turns.
 *  - Scroll only picks the SECTION (lib/sectionTracker.ts).
 *
 *  Section change (cinematic):
 *   scroll down -> the turtle dives DOWN from wherever it is into the new section
 *   scroll up   -> the turtle swims UP from wherever it is into the new section
 *   several sections skipped -> the part of the trip that happens off-screen is skipped, so it enters
 *   from the top / bottom edge of the screen and then swims in slowly (fixed calm speed, never a chase).
 *
 *  Hero hand-off (2D mascot <-> 3D turtle):
 *   hero      : 3D turtle pinned exactly under the 2D mascot (same spot / size / upright pose / wave)
 *   leaving   : 2D fades out over the pinned 3D turtle, THEN it dives down into the next section
 *   returning : swims up and settles (upright, facing camera, waving) as it nears the spot; it only
 *               counts as "arrived" when position, depth, scale AND orientation match -> then 2D fades in
 *
 *  Coordinates: x / y are "screen units" (-1..1 = screen edges). y is DOCUMENT space measured in the same
 *  units (1 unit = half a screen height, up = +), so on screen:  sy = y - CY  (CY = screen centre in doc Y).
 */
import * as THREE from "three";
import { newMotion, type ExprId, type Motion } from "@/lib/turtleRig";

/* ------------------------------------------------------------------ habitats */
export interface Zone {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  z: number;
  scale: number;
}
/** cy / ry here are FRACTIONS of the visible part of the section (0 = its middle, 1 = its edge). */
export const ZONE_OVERRIDES: Record<number, Partial<Zone>> = {
  // 2: { cy: 0.2, ry: 0.4 },
};
/** Where the target section is relative to the screen, in document-Y units (top > bottom). */
export interface View {
  cy: number; // screen centre
  top: number; // section top edge
  bottom: number; // section bottom edge
}
/**
 * Roaming area, far behind the page content.
 * With a `view` it is the part of the section that is currently on screen (so the turtle roams in the
 * section you are looking at); without one it is the whole screen (old behaviour).
 */
export function zoneFor(sec: number, aspect: number, view?: View): Zone {
  const narrow = aspect < 0.9;
  const base: Zone = narrow
    ? { cx: 0, cy: 0, rx: 0.8, ry: 0.8, z: -6.5, scale: 0.8 }
    : { cx: 0, cy: 0, rx: 0.82, ry: 0.72, z: -6.5, scale: 0.9 };
  const z: Zone = { ...base, ...ZONE_OVERRIDES[sec] };
  if (!view) return z;

  let lo = Math.max(view.bottom, view.cy - 1);
  let hi = Math.min(view.top, view.cy + 1);
  if (hi < lo) {
    // section is completely off-screen: use its edge that is nearest to the screen
    if (view.bottom > view.cy) {
      lo = view.bottom;
      hi = Math.min(view.top, lo + 2);
    } else {
      hi = view.top;
      lo = Math.max(view.bottom, hi - 2);
    }
  }
  const mid = (hi + lo) / 2;
  const halfBand = Math.max((hi - lo) / 2, 0.3);
  return { ...z, cy: mid + z.cy * halfBand, ry: z.ry * halfBand };
}

/* ------------------------------------------------------------------ helpers */
const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (x: number) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
const sm3 = (x: number, a: number, b: number) => sm((x - a) / (b - a));
const env = (u: number) => sm(u / 0.3) * (1 - sm((u - 0.7) / 0.3));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** soft screen-edge limit: linear inside the knee, eased beyond it (no hard clamping kinks) */
const knee = (x: number, k = 0.6, L = 0.92) => {
  const a = Math.abs(x);
  if (a <= k) return x;
  return Math.sign(x) * (k + (L - k) * Math.tanh((a - k) / (L - k)));
};
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** critically damped spring (SmoothDamp): smooth, no overshoot, never "stops dead" */
function damp(
  cur: number,
  tgt: number,
  vel: { v: number },
  smooth: number,
  dt: number,
  maxSp = Infinity,
) {
  smooth = Math.max(0.0001, smooth);
  const om = 2 / smooth;
  const x = om * dt;
  const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const mx = maxSp * smooth;
  const ch = clamp(cur - tgt, -mx, mx);
  const tt = cur - ch;
  const tmp = (vel.v + om * ch) * dt;
  vel.v = (vel.v - om * tmp) * ex;
  let out = tt + (ch + tmp) * ex;
  if (tgt - cur > 0 === out > tgt) {
    out = tgt;
    vel.v = dt > 0 ? (out - tgt) / dt : 0;
  }
  return out;
}

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);

interface P {
  x: number;
  y: number;
  z: number;
  s: number;
}
const P0 = (): P => ({ x: 0, y: 0, z: 0, s: 1 });

/** How far (screen units) beyond the screen edge the turtle may wait while it is "somewhere else in the page".
 *  Big enough that even the hero-size turtle is fully hidden; the off-screen part of a long trip is skipped. */
const WAIT_EDGE = 2.2;
/** Calm cruising speed (screen units / second) of the section-to-section swim. Lower = slower / more cinematic. */
const TRAVEL_SPEED = 1.0;
const TRAVEL_SMOOTH = 0.75;

/* ------------------------------------------------------------------ motion library */
let ASPECT = 1.6; // updated every frame so circles stay round on screen

/** What a move adds on top of the base swim, this frame. */
interface Out {
  dx: number;
  dy: number;
  dz: number;
  spin: number; // roll about the body axis (barrel roll / pirouette)
  flip: number; // somersault
  loopZ: number; // rotation on screen (loop-the-loop / wiggle)
  wv: number; // right-hand wave 0..1
  jaw: number;
  bub: number; // bubble puff 0..1
  front: number; // face the camera
  away: number; // back to the camera
  glide: number; // stop flapping, just glide
  flapAdd: number; // extra flipper effort
}
const newOut = (): Out => ({
  dx: 0,
  dy: 0,
  dz: 0,
  spin: 0,
  flip: 0,
  loopZ: 0,
  wv: 0,
  jaw: 0,
  bub: 0,
  front: 0,
  away: 0,
  glide: 0,
  flapAdd: 0,
});
const resetOut = (o: Out) => {
  o.dx = o.dy = o.dz = o.spin = o.flip = o.loopZ = 0;
  o.wv = o.jaw = o.bub = o.front = o.away = o.glide = o.flapAdd = 0;
};

type Fn = (u: number, E: number, o: Out, d: number) => void;
type Go = (z: Zone, c: P) => P;
interface Move {
  name: string;
  dur: number;
  face: ExprId;
  fn?: Fn;
  go?: Go; // also sends the turtle to a new waypoint
  still?: boolean; // hovers upright facing the camera (emotes)
  boost?: number; // paddling effort 0..1
  trail?: number; // bubble trail 0..1
  travel?: boolean; // section-to-section swim: calm fixed speed, ends when it arrives
}

const pt = (z: Zone): P => ({
  x: z.cx + rnd(-1, 1) * z.rx,
  y: z.cy + rnd(-1, 1) * z.ry,
  z: z.z + rnd(-1.2, 1.2),
  s: z.scale * rnd(0.9, 1.1),
});
/** to the opposite side of the screen (left <-> right) */
const across: Go = (z, c) => ({
  x: z.cx + (c.x > 0 ? -1 : 1) * z.rx * rnd(0.75, 1),
  y: z.cy + rnd(-0.8, 0.8) * z.ry,
  z: z.z + rnd(-1, 1),
  s: z.scale * rnd(0.9, 1.1),
});
const far: Go = (z, c) => {
  let b = pt(z),
    bd = 0;
  for (let i = 0; i < 5; i++) {
    const p = pt(z),
      dd = Math.hypot(p.x - c.x, p.y - c.y);
    if (dd > bd) {
      bd = dd;
      b = p;
    }
  }
  return b;
};
const any: Go = (z) => pt(z);

/** tornado / spiral: circle of radius R (screen-height units), `turns` times, optional rise + depth swirl */
const circ =
  (turns: number, R: number, rise = 0, zAmp = 0): Fn =>
  (u, E, o, d) => {
    const a = TAU * turns * u * d;
    o.dx += (R * E * Math.sin(a)) / ASPECT;
    o.dy += R * E * (1 - Math.cos(a)) * 0.8 + rise * Math.sin(Math.PI * u);
    o.dz += zAmp * E * Math.cos(a);
  };

const MOVES: Move[] = [
  /* ---------- tornado family (1-9) ---------- */
  {
    name: "tornado",
    dur: 3.4,
    face: "grin",
    fn: circ(2.5, 0.24, 0, 0.6),
    boost: 0.9,
    trail: 0.6,
  },
  {
    name: "bigTornado",
    dur: 4.2,
    face: "grin",
    fn: circ(2, 0.42, 0, 1.0),
    boost: 1,
    trail: 0.8,
  },
  {
    name: "miniTwister",
    dur: 2.4,
    face: "smirk",
    fn: circ(4, 0.12),
    boost: 1,
    trail: 0.5,
  },
  {
    name: "tornadoUp",
    dur: 3.6,
    face: "grin",
    fn: circ(2.5, 0.22, 0.35),
    boost: 0.9,
    trail: 0.7,
  },
  {
    name: "tornadoDown",
    dur: 3.6,
    face: "grin",
    fn: circ(2.5, 0.22, -0.35),
    boost: 0.9,
    trail: 0.7,
  },
  {
    name: "tornadoSweep",
    dur: 4.4,
    face: "grin",
    fn: circ(3.5, 0.2, 0, 0.5),
    go: across,
    boost: 1,
    trail: 0.9,
  },
  {
    name: "tornadoSweepWide",
    dur: 5.4,
    face: "grin",
    fn: circ(4, 0.3, 0, 0.8),
    go: across,
    boost: 1,
    trail: 1,
  },
  {
    name: "doubleHelix",
    dur: 4,
    face: "smirk",
    fn: circ(3, 0.18, 0, 1.6),
    boost: 0.8,
    trail: 0.6,
  },
  {
    name: "spiralAway",
    dur: 4,
    face: "smile",
    fn: (u, E, o, d) => {
      circ(2.5, 0.2)(u, E, o, d);
      o.dz -= 2 * Math.sin(Math.PI * u);
      o.away = E;
    },
    boost: 0.8,
    trail: 0.5,
  },

  /* ---------- travel paths (10-18) ---------- */
  { name: "sweep", dur: 4, face: "smile", go: across, boost: 0.7 },
  {
    name: "sweepWave",
    dur: 4.6,
    face: "grin",
    go: across,
    boost: 0.7,
    fn: (u, E, o) => {
      o.dy += 0.18 * E * Math.sin(TAU * 2 * u);
    },
  },
  {
    name: "zigzag",
    dur: 3.8,
    face: "smirk",
    go: far,
    boost: 0.8,
    fn: (u, E, o) => {
      o.dy += 0.13 * E * Math.sin(TAU * 3 * u);
      o.dx += (0.05 * E * Math.cos(TAU * 3 * u)) / ASPECT;
    },
  },
  {
    name: "figureEight",
    dur: 4.2,
    face: "grin",
    boost: 0.7,
    trail: 0.3,
    fn: (u, E, o) => {
      const a = TAU * u;
      o.dx += (0.3 * E * Math.sin(a)) / ASPECT;
      o.dy += 0.18 * E * Math.sin(2 * a);
    },
  },
  {
    name: "lazyCircle",
    dur: 5.2,
    face: "smile",
    fn: circ(1, 0.4, 0, 0.5),
    boost: 0.35,
  },
  { name: "dash", dur: 1.9, face: "grin", go: far, boost: 1, trail: 0.9 },
  { name: "cruise", dur: 4.5, face: "smile", go: any, boost: 0.4 },
  {
    name: "deepDive",
    dur: 3.2,
    face: "smile",
    boost: 0.8,
    trail: 0.6,
    fn: (u, E, o) => {
      o.dy -= 0.4 * Math.sin(Math.PI * u);
    },
  },
  {
    name: "surfaceRise",
    dur: 3.2,
    face: "smile",
    boost: 0.8,
    trail: 0.6,
    fn: (u, E, o) => {
      o.dy += 0.35 * Math.sin(Math.PI * u);
    },
  },

  /* ---------- depth + gliding (19-22) ---------- */
  {
    name: "sayHi",
    dur: 4.2,
    face: "smile",
    still: true,
    boost: 0.25,
    fn: (u, E, o) => {
      o.dz += 3.2 * Math.sin(Math.PI * u);
      o.front = E;
      o.wv = E;
    },
  },
  {
    name: "retreat",
    dur: 3.6,
    face: "smile",
    boost: 0.7,
    fn: (u, E, o) => {
      o.dz -= 2.5 * Math.sin(Math.PI * u);
      o.away = E;
    },
  },
  {
    name: "glide",
    dur: 3.6,
    face: "smile",
    go: any,
    boost: 0.3,
    fn: (u, E, o) => {
      o.glide = E;
    },
  },
  {
    name: "bob",
    dur: 3,
    face: "smile",
    boost: 0.3,
    fn: (u, E, o) => {
      o.dy += 0.09 * E * Math.sin(TAU * 3 * u);
    },
  },

  /* ---------- rotations / tricks (23-33) ---------- */
  {
    name: "barrelRoll",
    dur: 2.4,
    face: "grin",
    fn: (u, E, o, d) => {
      o.spin = TAU * sm(u) * d;
    },
    boost: 0.8,
  },
  {
    name: "doubleBarrel",
    dur: 3.2,
    face: "grin",
    fn: (u, E, o, d) => {
      o.spin = 2 * TAU * sm(u) * d;
    },
    boost: 0.9,
  },
  {
    name: "somersault",
    dur: 2.8,
    face: "smirk",
    boost: 0.7,
    fn: (u, E, o) => {
      o.flip = TAU * sm(u);
      o.dy += 0.2 * Math.sin(Math.PI * u);
    },
  },
  {
    name: "backflip",
    dur: 2.8,
    face: "smirk",
    fn: (u, E, o) => {
      o.flip = -TAU * sm(u);
    },
    boost: 0.7,
  },
  {
    name: "loopTheLoop",
    dur: 2.4,
    face: "grin",
    fn: (u, E, o, d) => {
      o.loopZ = TAU * sm(u) * d;
    },
    boost: 0.8,
  },
  {
    name: "cartwheel",
    dur: 3,
    face: "grin",
    boost: 0.7,
    fn: (u, E, o, d) => {
      o.loopZ = TAU * sm(u) * d;
      o.dx += (0.25 * d * Math.sin(Math.PI * u)) / ASPECT;
    },
  },
  {
    name: "pirouette",
    dur: 2.6,
    face: "smile",
    still: true,
    boost: 0.2,
    fn: (u, E, o, d) => {
      o.spin = TAU * sm(u) * d;
    },
  },
  {
    name: "corkscrew",
    dur: 3.6,
    face: "grin",
    go: across,
    boost: 0.9,
    trail: 0.7,
    fn: (u, E, o, d) => {
      o.spin = 3 * TAU * sm(u) * d;
    },
  },
  {
    name: "tumble",
    dur: 3.4,
    face: "smirk",
    boost: 0.7,
    fn: (u, E, o, d) => {
      o.spin = TAU * sm(u) * d;
      o.flip = TAU * sm(sm(u));
    },
  },
  {
    name: "shimmy",
    dur: 2.6,
    face: "smirk",
    boost: 0.5,
    fn: (u, E, o) => {
      o.spin = 0.5 * E * Math.sin(TAU * 4 * u);
      o.loopZ = 0.12 * E * Math.sin(TAU * 6 * u);
    },
  },
  {
    name: "giggle",
    dur: 2.2,
    face: "smile",
    still: true,
    boost: 0.2,
    fn: (u, E, o) => {
      o.loopZ = 0.22 * E * Math.sin(u * 38);
      o.jaw = 0.1 * E;
    },
  },

  /* ---------- emotes (34-41) ---------- */
  {
    name: "wave",
    dur: 3.2,
    face: "smile",
    still: true,
    boost: 0.2,
    fn: (u, E, o) => {
      o.wv = E;
    },
  },
  {
    name: "bubbles",
    dur: 2.4,
    face: "smirk",
    still: true,
    boost: 0.2,
    fn: (u, E, o) => {
      o.bub = E;
    },
  },
  {
    name: "startle",
    dur: 1.8,
    face: "sad",
    still: true,
    boost: 0.3,
    fn: (u, E, o) => {
      const g = Math.sin(Math.PI * sm(u));
      o.flip = -0.45 * g;
      o.dy += 0.12 * g;
      o.jaw = 0.3 * g;
    },
  },
  {
    name: "yawn",
    dur: 2.8,
    face: "sad",
    still: true,
    boost: 0.1,
    fn: (u, E, o) => {
      o.jaw = 0.42 * Math.sin(Math.PI * u);
    },
  },
  {
    name: "lookAround",
    dur: 3.4,
    face: "smile",
    still: true,
    boost: 0.15,
    fn: (u, E, o) => {
      o.spin = 0.45 * E * Math.sin(TAU * 1.5 * u);
    },
  },
  {
    name: "dance",
    dur: 3.6,
    face: "grin",
    still: true,
    boost: 0.4,
    fn: (u, E, o) => {
      o.wv = E;
      o.loopZ = 0.15 * E * Math.sin(u * 30);
      o.dx += (0.06 * E * Math.sin(TAU * 3 * u)) / ASPECT;
    },
  },
  {
    name: "stretch",
    dur: 2.4,
    face: "grin",
    still: true,
    boost: 1,
    fn: (u, E, o) => {
      o.flapAdd = 0.4 * E;
    },
  },
  {
    name: "peekaboo",
    dur: 4,
    face: "grin",
    still: true,
    boost: 0.3,
    fn: (u, E, o) => {
      o.dz += 2.8 * Math.sin(Math.PI * u);
      o.front = E;
      o.wv = E;
      o.jaw = 0.1 * E;
    },
  },
];
export const MOVE_NAMES = MOVES.map((m) => m.name);

const AUTO_FACES: ExprId[] = ["smile", "grin", "smirk", "smile", "grin"];

/** the section-to-section swim lasts at most this long (it normally ends sooner, when the turtle arrives) */
const TRANSIT_MAX = 8;
/**
 * Section change: dir = +1 -> dive DOWN into the new section, dir = -1 -> swim UP into it.
 * It starts from wherever the turtle is, swims at a calm fixed speed and ends when it arrives.
 */
const transitMove = (dir: number): Move => ({
  name: "transit",
  dur: TRANSIT_MAX,
  face: "grin",
  boost: 0.9,
  trail: 1,
  travel: true,
  go: (z, c) => {
    const p = pt(z);
    p.x = clamp(c.x + rnd(-0.3, 0.3), z.cx - z.rx, z.cx + z.rx); // mostly straight down / up
    p.y = z.cy + dir * rnd(0.05, 0.8) * z.ry; // settle on the side it came from
    return p;
  },
  fn: (u, E, o) => {
    const tt = u * TRANSIT_MAX;
    o.dx += (0.05 * sm(tt / 0.8) * Math.sin(tt * 1.7)) / ASPECT; // gentle weave
  },
});

/* ------------------------------------------------------------------ director */
export interface DirectorIn {
  dt: number;
  aspect: number;
  desired: number; // from the section tracker (0 = hero)
  count: number;
  mascotMix: number; // 1 = 2D mascot fully visible, 0 = gone
  hero: { sx: number; sy: number }; // where the 2D mascot stands at scrollY = 0 (screen units)
  scrollY: number; // window.scrollY (px)
  vh: number; // viewport height (px)
  sectionBounds: (i: number) => { top: number; bottom: number }; // section edges in document px
}
export interface TurtleOut {
  sx: number;
  sy: number; // screen units, may be far outside +-1 while the turtle waits off-screen
  z: number;
  scale: number;
  bumpY: number;
  moveAmt: number;
  trail: number;
  atHero: boolean; // true = the 2D mascot should be showing
  quat: THREE.Quaternion;
  motion: Motion;
}

export function createTurtleDirector() {
  const motion = newMotion();
  const quat = new THREE.Quaternion();
  const qOut = new THREE.Quaternion();
  const qa = new THREE.Quaternion(),
    qb = new THREE.Quaternion(),
    qMove = new THREE.Quaternion(),
    qHover = new THREE.Quaternion();

  let t = 0;
  let mode: "hero" | "leaving" | "free" | "returning" = "hero";
  let target = 0;
  let active: { m: Move; t0: number; d: number } | null = null;
  let bag: Move[] = [];
  let nextMoveT = 2;
  let wayT = 0;
  let retT = 0;
  let lastHalf = 0;
  let lastView: View | undefined;

  const cur: P = P0(); // smooth base position (y = document space)
  const way: P = P0(); // waypoint it glides to
  const pos: P = P0(); // final position (base + move offsets)
  const prev: P = P0();
  const V = { x: { v: 0 }, y: { v: 0 }, z: { v: 0 }, s: { v: 0 } };
  const M = newOut();
  let snapped = true;
  let vsx = 0,
    vsy = 0,
    vsz = 0;
  let lastPhi = -Math.PI / 2;
  let turn = 0,
    bank = 0;
  let orient = 0,
    front = 0,
    away = 0,
    glideS = 0,
    stillW = 0;
  let boostS = 0.4,
    trailS = 0,
    nextAuto = 3;
  /** 1 = exactly in the 2D mascot's pose/spot, 0 = out roaming (smooth ramp while returning) */
  let nearHero = 1;
  /** how strongly the soft screen-edge limit is applied to the on-screen y (0 while off-screen / leaving) */
  let kneeS = 0;

  const out: TurtleOut = {
    sx: 0,
    sy: 0,
    z: 0,
    scale: 1,
    bumpY: 0,
    moveAmt: 0,
    trail: 0,
    atHero: true,
    quat: qOut,
    motion,
  };

  const stop = () => {
    V.x.v = V.y.v = V.z.v = V.s.v = 0;
  };
  const nextFromBag = () => {
    if (!bag.length) {
      bag = MOVES.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
  const startMove = (m: Move, zn: Zone) => {
    active = { m, t0: t, d: Math.random() < 0.5 ? -1 : 1 };
    if (m.go) {
      Object.assign(way, m.go(zn, cur));
      wayT = t + 99;
    }
    if (m.still) {
      way.x = cur.x;
      way.y = cur.y; // glide to a gentle stop
    }
  };
  const wander = (zn: Zone) => {
    const side = cur.x > 0 ? -1 : 1;
    way.x =
      Math.random() < 0.7
        ? zn.cx + side * zn.rx * rnd(0.3, 1)
        : zn.cx + rnd(-1, 1) * zn.rx;
    way.y = zn.cy + rnd(-1, 1) * zn.ry;
    way.z = zn.z + rnd(-1.2, 1.2);
    way.s = zn.scale * rnd(0.9, 1.1);
    wayT = t + rnd(3, 6);
  };
  const follow = (st: number, msp: number, dt: number) => {
    cur.x = damp(cur.x, way.x, V.x, st, dt, msp);
    cur.y = damp(cur.y, way.y, V.y, st, dt, msp);
    cur.z = damp(cur.z, way.z, V.z, st * 1.4, dt, msp * 6);
    cur.s = damp(cur.s, way.s, V.s, st * 1.4, dt, msp * 3);
  };

  /** debugging / key triggers: director.play("tornadoSweep") */
  function play(name: string) {
    const m = MOVES.find((x) => x.name === name);
    if (m && mode === "free")
      startMove(m, zoneFor(Math.max(1, target), ASPECT, lastView));
  }

  function update(i: DirectorIn): TurtleOut {
    const { dt, aspect, hero } = i;
    t += dt;
    ASPECT = aspect;
    const k = (r: number) => 1 - Math.exp(-dt * r);

    /* ---- 0) document space ---- */
    const half = Math.max(1, i.vh) / 2;
    if (lastHalf > 0 && Math.abs(half - lastHalf) > 0.5) {
      // viewport height changed (resize, mobile URL bar): keep the same spot in the page
      const r = lastHalf / half;
      cur.y *= r;
      way.y *= r;
      prev.y *= r;
      V.y.v *= r;
    }
    lastHalf = half;
    const CY = -(i.scrollY + half) / half; // document Y at the screen centre
    const heroY = hero.sy - 1; // document Y of the hero spot (it stays put in the page)
    /** the roaming area inside the section the turtle belongs to (the part of it you can see) */
    const zoneNow = (sec: number) => {
      const s = Math.max(1, sec);
      const b = i.sectionBounds(s);
      lastView = { cy: CY, top: -b.top / half, bottom: -b.bottom / half };
      return zoneFor(s, aspect, lastView);
    };
    /** waiting somewhere else in the page: stay just outside the screen so it can swim in from there */
    const pinOffscreen = () => {
      const sy = cur.y - CY;
      if (Math.abs(sy) > WAIT_EDGE) {
        cur.y = CY + Math.sign(sy) * WAIT_EDGE;
        V.y.v = 0;
      }
    };

    /* ---- 1) which section? ---- */
    if (i.desired !== target) {
      if (i.desired === 0) {
        // back to the hero: swim to the mascot's spot (from the top or bottom, wherever it is)
        target = 0;
        mode = "returning";
        active = null;
        retT = t;
      } else if (mode === "hero" || mode === "leaving") {
        // leaving the hero: wait for the 2D -> 3D cross-fade, then dive (also if the target changes meanwhile)
        target = i.desired;
        mode = "leaving";
      } else {
        const dir = i.desired > target ? 1 : -1;
        target = i.desired;
        mode = "free";
        startMove(transitMove(dir), zoneNow(target));
      }
    }
    if (mode === "leaving" && i.mascotMix < 0.25) {
      // 3D is fully showing exactly where the 2D mascot was -> dive straight down into the new section
      cur.x = hero.sx;
      cur.y = heroY;
      cur.z = 0;
      cur.s = 1;
      stop();
      mode = "free";
      startMove(transitMove(1), zoneNow(target));
    }

    /* ---- 2) position ---- */
    resetOut(M);
    if (mode === "hero" || mode === "leaving") {
      cur.x = hero.sx;
      cur.y = heroY;
      cur.z = 0;
      cur.s = 1;
      stop();
      active = null;
      nearHero = 1;
      kneeS = 0;
      Object.assign(pos, cur);
    } else if (mode === "returning") {
      way.x = hero.sx;
      way.y = heroY;
      way.z = 0;
      way.s = 1;
      follow(0.9, 1.4, dt);
      pinOffscreen();
      kneeS = 0;
      const dist = Math.hypot(cur.x - hero.sx, cur.y - heroY);
      nearHero = 1 - sm3(dist, 0.02, 0.35); // ramps the upright pose + wave in as it gets close
      const arrived =
        dist < 0.03 &&
        Math.abs(cur.z) < 0.06 &&
        Math.abs(cur.s - 1) < 0.03 &&
        quat.angleTo(qHover) < 0.08; // orientation has settled too
      if (arrived || t - retT > 9) {
        mode = "hero"; // -> Scene starts fading the 2D mascot back in
        snapped = true;
        stop();
        cur.x = hero.sx;
        cur.y = heroY;
        cur.z = 0;
        cur.s = 1;
        nearHero = 1;
      }
      Object.assign(pos, cur);
    } else {
      nearHero = 0;
      const zn = zoneNow(target);

      if (active) {
        const u = (t - active.t0) / active.m.dur;
        const arrived =
          !!active.m.travel &&
          t - active.t0 > 0.8 &&
          Math.hypot(cur.x - way.x, cur.y - way.y) < 0.12;
        if (u >= 1 || arrived) {
          active = null;
          nextMoveT = t + rnd(0.8, 1.8);
        } else active.m.fn?.(u, env(u), M, active.d);
      }
      if (!active && t >= nextMoveT) startMove(nextFromBag(), zn);

      const canWander = !active || (!active.m.go && !active.m.still);
      if (
        canWander &&
        (t >= wayT || Math.hypot(cur.x - way.x, cur.y - way.y) < 0.1)
      )
        wander(zn);

      // the section's visible part slides with the page: keep the waypoint inside it
      way.y = clamp(way.y, zn.cy - zn.ry, zn.cy + zn.ry);

      const travel = !!active?.m.travel;
      const boostT = active ? (active.m.boost ?? 0.6) : 0.5;
      boostS += (boostT - boostS) * k(2.5);
      if (travel) follow(TRAVEL_SMOOTH, TRAVEL_SPEED, dt);
      else follow(lerp(1.6, 0.55, boostS), 0.5 + 0.9 * boostS, dt);
      pinOffscreen();

      // soft screen-edge limit, only while the turtle is actually on screen
      const base = cur.y - CY;
      const w = 1 - sm3(Math.abs(base), 0.9, 1.1);
      kneeS = w < kneeS ? w : Math.min(w, kneeS + 1.2 * dt);
      const rawY = base + M.dy + Math.sin(t * 1.3 + 1) * 0.015;

      pos.x = knee(cur.x + M.dx + Math.sin(t * 0.9) * 0.012);
      pos.y = lerp(rawY, knee(rawY, 0.55, 0.85), kneeS) + CY;
      pos.z = cur.z + M.dz;
      pos.s = cur.s;
    }

    /* ---- 3) velocity -> heading (+ banking) ---- */
    // measured in DOCUMENT space, so page scrolling never turns the turtle: only its own swimming does
    if (snapped) {
      snapped = false;
      vsx = vsy = vsz = 0;
    } else {
      const inv = 1 / Math.max(dt, 1e-3);
      vsx += ((pos.x - prev.x) * aspect * inv - vsx) * k(7);
      vsy += ((pos.y - prev.y) * inv - vsy) * k(7);
      vsz += ((pos.z - prev.z) * inv - vsz) * k(7);
    }
    prev.x = pos.x;
    prev.y = pos.y;
    prev.z = pos.z;
    prev.s = pos.s;
    const sp = Math.hypot(vsx, vsy);
    const sp3 = Math.hypot(vsx, vsy, vsz * 0.2);
    if (sp > 0.06) {
      const phi = Math.atan2(vsy, vsx);
      turn +=
        (clamp(wrapPi(phi - lastPhi) / Math.max(dt, 1e-3), -9, 9) - turn) *
        k(5);
      lastPhi = phi;
    } else turn += (0 - turn) * k(5);
    bank += (clamp(turn * 0.1, -0.7, 0.7) - bank) * k(4);

    front += (M.front - front) * k(3);
    away += (M.away - away) * k(2.5);
    glideS += (M.glide - glideS) * k(4);
    stillW += ((active?.m.still ? 1 : 0) - stillW) * k(3);
    // (1 - nearHero): while returning, the swim heading eases into the upright pose
    orient +=
      (sm3(sp, 0.06, 0.25) * (1 - front) * (1 - stillW) * (1 - nearHero) -
        orient) *
      k(3);

    /* ---- 4) face / jaw / wave / bubbles ---- */
    if (nearHero > 0.5) {
      motion.expr = "grin"; // same cheerful face as the 2D mascot
      nextAuto = t + 2.5;
    } else if (active) {
      motion.expr = active.m.face;
      nextAuto = t + 2.5;
    } else if (t >= nextAuto) {
      motion.expr = AUTO_FACES[(Math.random() * AUTO_FACES.length) | 0];
      nextAuto = t + 2.5 + Math.random() * 2.5;
    }
    // it waves like the 2D mascot while it is the hero (and ramps in as it returns)
    const wv = Math.max(M.wv, 0.85 * nearHero);

    /* ---- 5) orientation ---- */
    qMove
      .setFromAxisAngle(AZ, lastPhi - Math.PI / 2)
      .multiply(
        qb.setFromAxisAngle(
          AY,
          Math.PI * away + bank + 0.3 * Math.sin(t * 0.5),
        ),
      );
    qHover
      .setFromAxisAngle(AZ, 0.05 * Math.sin(t * 0.7))
      .multiply(qb.setFromAxisAngle(AY, 0.22 * Math.sin(t * 0.5)))
      .multiply(qb.setFromAxisAngle(AX, 0.3 * front));
    qa.copy(qHover).slerp(qMove, orient);
    quat.slerp(qa, k(7));
    qOut
      .copy(quat)
      .multiply(qb.setFromAxisAngle(AY, M.spin))
      .multiply(qb.setFromAxisAngle(AX, M.flip))
      .premultiply(qa.setFromAxisAngle(AZ, M.loopZ));

    /* ---- 6) body animation (all smoothed) ---- */
    const swimming =
      clamp(Math.max(orient, sm3(sp3, 0.08, 0.3) * 0.7), 0, 1) *
      (0.45 + 0.55 * boostS) *
      (1 - 0.85 * glideS);
    const calm = 1 - 0.45 * nearHero; // calmer flippers while posing as the hero
    const flapT = 0.22 * calm + 0.55 * swimming + M.flapAdd;
    const kickT = 0.22 * calm + 0.45 * swimming + M.flapAdd * 0.7;
    motion.flap += (flapT - motion.flap) * k(5);
    motion.kick += (kickT - motion.kick) * k(5);
    motion.rate += (2 + 2 * swimming - motion.rate) * k(3);
    motion.krate += (2 + 1.8 * swimming - motion.krate) * k(3);
    motion.wave += (wv - motion.wave) * k(8);
    motion.sleep = 0;
    motion.live = 1;
    motion.jawOpen += (M.jaw - motion.jawOpen) * k(12);

    const trailT = Math.max(
      active
        ? (active.m.trail ?? 0) *
            (active.m.travel ? 1 : env((t - active.t0) / active.m.dur))
        : 0,
      M.bub,
      mode === "leaving" ? 0.9 : 0,
      mode === "returning" ? 0.6 * (1 - nearHero) : 0,
    );
    trailS += (trailT - trailS) * k(4);

    out.sx = clamp(pos.x, -0.95, 0.95);
    out.sy = pos.y - CY; // document -> screen (no clamp: it may be waiting off-screen)
    out.z = pos.z;
    out.scale = pos.s;
    out.bumpY = 0;
    out.moveAmt = orient;
    out.trail = trailS;
    out.atHero = mode === "hero";
    return out;
  }

  return { update, play, moves: MOVE_NAMES };
}
