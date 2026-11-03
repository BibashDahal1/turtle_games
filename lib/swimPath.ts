/**
 * The turtle's cinematic route through the page, as a function of scroll progress p (0..1).
 *
 * Positions are screen-relative: sx / sy in -1..1 (0 = centre), z = depth behind the page plane.
 * The route is a smooth spline (cubic Hermite) through the waypoints, so it curves instead of
 * moving in straight lines. A waypoint with `dwell` has zero velocity: two of them at the same
 * place make the turtle stop there for that stretch of scrolling (it hovers and looks around).
 * `style: "away"` marks legs where it swims away from the camera (back view).
 * `scale` is relative to the 2D hero mascot's size (1.0 = same size as the mascot).
 */
export type LegStyle = "auto" | "away";

export interface Waypoint {
  p: number;
  sx: number;
  sy: number;
  z: number;
  scale: number;
  dwell?: boolean;
  style?: LegStyle;
}

export const WAYPOINTS: Waypoint[] = [
  { p: 0.035, sx: 0.5, sy: -0.05, z: 0, scale: 1.0, dwell: true }, // exactly where the 2D mascot stands = hand-over
  { p: 0.11, sx: 0.46, sy: -0.55, z: -1.5, scale: 0.8 }, // dives straight down (head first)
  { p: 0.18, sx: -0.1, sy: -0.7, z: -4, scale: 0.62 }, // turns and swims left, into the background
  { p: 0.25, sx: -0.62, sy: -0.5, z: -5, scale: 0.55, dwell: true }, // reaches the reef, hovers + waves
  { p: 0.31, sx: -0.62, sy: -0.5, z: -5, scale: 0.55, dwell: true },
  { p: 0.4, sx: -0.58, sy: 0.12, z: -5, scale: 0.55 }, // swims up the left side (barrel roll)
  { p: 0.48, sx: -0.25, sy: 0.48, z: -6, scale: 0.5 }, // crosses the top (somersault)
  { p: 0.57, sx: 0.5, sy: 0.5, z: -6.5, scale: 0.5, dwell: true }, // stops, spots something (startle)
  { p: 0.62, sx: 0.5, sy: 0.5, z: -6.5, scale: 0.5, dwell: true },
  { p: 0.665, sx: 0.8, sy: 0.0, z: -1.5, scale: 0.7, dwell: true }, // swims toward the camera, comes to the FRONT
  { p: 0.7, sx: 0.8, sy: 0.0, z: -1.5, scale: 0.7, dwell: true }, // hovers close and waves hello
  { p: 0.77, sx: 0.5, sy: -0.35, z: -8.5, scale: 0.5, style: "away" }, // turns and swims away from the camera
  { p: 0.83, sx: 0.05, sy: -0.66, z: -9.5, scale: 0.5, style: "away" },
  { p: 0.89, sx: -0.4, sy: -0.52, z: -5, scale: 0.6 }, // comes back
  { p: 0.945, sx: 0.15, sy: -0.62, z: -3.5, scale: 0.65 },
  { p: 0.97, sx: 0.3, sy: -0.58, z: -3.5, scale: 0.65, dwell: true }, // settles down to sleep (zZz)
  { p: 1.0, sx: 0.3, sy: -0.58, z: -3.5, scale: 0.65, dwell: true },
];

/** Scroll progress from which it sleeps (the "zZz" clip). */
export const SLEEP_FROM = 0.972;
/** Scroll progress marks where it reacts once (startled / noticing something). */
export const REACT_AT = [0.585];

export interface PathSample {
  sx: number;
  sy: number;
  z: number;
  scale: number;
  /** velocity per unit of scroll progress, in screen-height units (x is aspect-corrected) */
  vx: number;
  vy: number;
  vz: number;
  /** which leg we are on, and how far through it (0..1) */
  seg: number;
  legT: number;
  style: LegStyle;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function tangent(i: number, k: "sx" | "sy" | "z" | "scale"): number {
  const W = WAYPOINTS;
  if (W[i].dwell) return 0;
  const a = W[Math.max(0, i - 1)];
  const b = W[Math.min(W.length - 1, i + 1)];
  return (b[k] - a[k]) / (b.p - a.p);
}

function hermite(
  i: number,
  t: number,
  h: number,
  k: "sx" | "sy" | "z" | "scale",
): [number, number] {
  const W = WAYPOINTS;
  const p0 = W[i][k],
    p1 = W[i + 1][k];
  const m0 = tangent(i, k) * h,
    m1 = tangent(i + 1, k) * h;
  const t2 = t * t,
    t3 = t2 * t;
  const v =
    (2 * t3 - 3 * t2 + 1) * p0 +
    (t3 - 2 * t2 + t) * m0 +
    (-2 * t3 + 3 * t2) * p1 +
    (t3 - t2) * m1;
  const d =
    ((6 * t2 - 6 * t) * p0 +
      (3 * t2 - 4 * t + 1) * m0 +
      (-6 * t2 + 6 * t) * p1 +
      (3 * t2 - 2 * t) * m1) /
    h;
  return [v, d];
}

export function samplePath(p: number, aspect = 1.78): PathSample {
  const W = WAYPOINTS;
  const first = W[0],
    last = W[W.length - 1];
  if (p <= first.p)
    return {
      sx: first.sx,
      sy: first.sy,
      z: first.z,
      scale: first.scale,
      vx: 0,
      vy: 0,
      vz: 0,
      seg: 0,
      legT: 0,
      style: "auto",
    };
  if (p >= last.p)
    return {
      sx: last.sx,
      sy: last.sy,
      z: last.z,
      scale: last.scale,
      vx: 0,
      vy: 0,
      vz: 0,
      seg: W.length - 2,
      legT: 1,
      style: "auto",
    };
  let i = 0;
  while (i < W.length - 2 && p > W[i + 1].p) i++;
  const h = W[i + 1].p - W[i].p;
  const t = clamp((p - W[i].p) / h, 0, 1);
  const [sx, dsx] = hermite(i, t, h, "sx");
  const [sy, dsy] = hermite(i, t, h, "sy");
  const [z, dz] = hermite(i, t, h, "z");
  const [scale] = hermite(i, t, h, "scale");
  return {
    sx: clamp(sx, -0.92, 0.92),
    sy: clamp(sy, -0.85, 0.85),
    z,
    scale,
    vx: dsx * aspect,
    vy: dsy,
    vz: dz,
    seg: i,
    legT: t,
    style: W[i + 1].style ?? "auto",
  };
}
