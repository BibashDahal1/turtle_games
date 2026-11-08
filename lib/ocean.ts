/**
 * Depth + palette for the ocean backdrop. Each top-level <section> is one depth level.
 * The shader reads `cur` every frame; the turtle reads `ocean.mid` to fog itself into the water.
 */
type V3 = [number, number, number];
const hex = (s: string): V3 => {
  const n = parseInt(s.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

interface Stop {
  top: V3; // water near the surface
  mid: V3; // mid-water (also the turtle fog colour)
  bot: V3; // water near the floor
  beam: V3; // sunlight colour
  sand: V3; // seabed colour
  form: V3; // [coral, kelp, rock] amount
  ray: number; // sunlight strength
}
const S = (
  top: string,
  mid: string,
  bot: string,
  beam: string,
  sand: string,
  form: V3,
  ray: number,
): Stop => ({
  top: hex(top),
  mid: hex(mid),
  bot: hex(bot),
  beam: hex(beam),
  sand: hex(sand),
  form,
  ray,
});

/* shallow -> abyss. Tweak freely; matches the logo's sand + brownish-orange. */
/* shallow -> abyss. Water is oceanic; sand + orange live on the seabed, coral and light. */
const STOPS: Stop[] = [
  // 1 sunlit shallows: bright turquoise, golden light, pale sand
  S(
    "#34b39a",
    "#167a66",
    "#0c4a40",
    "#fff1c0",
    "#e8cb92",
    [0.2, 0.05, 0.1],
    1.0,
  ),
  // 2 coral reef: clear teal, strongest orange coral
  S(
    "#1f9488",
    "#0f6258",
    "#083a37",
    "#ffe3a8",
    "#d3a972",
    [1.0, 0.1, 0.25],
    0.8,
  ),
  // 3 kelp forest: green-blue, amber-brown kelp
  S(
    "#177a78",
    "#0b4a4d",
    "#062d33",
    "#f3d9a0",
    "#a98259",
    [0.2, 1.0, 0.4],
    0.6,
  ),
  // 4 twilight: deep blue-teal, dim light, dark rocks
  S(
    "#0f5a66",
    "#083440",
    "#041d27",
    "#d7b27a",
    "#7d5c3b",
    [0.15, 0.3, 1.0],
    0.35,
  ),
  // 5 abyss: near-black blue
  S(
    "#0a3140",
    "#051b27",
    "#020b11",
    "#9a7a50",
    "#4a3524",
    [0.05, 0.1, 1.0],
    0.15,
  ),
];

export const ocean = {
  depth: 0, // smoothed 0..1
  target: 0,
  settling: false,
  mid: [0.66, 0.42, 0.2] as V3, // read by the turtle
  cur: {
    top: [0, 0, 0] as V3,
    mid: [0, 0, 0] as V3,
    bot: [0, 0, 0] as V3,
    beam: [0, 0, 0] as V3,
    sand: [0, 0, 0] as V3,
    form: [0, 0, 0] as V3,
    ray: 1,
  },
};

const sm = (x: number) => {
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
};
const mix3 = (a: V3, b: V3, t: number, o: V3) => {
  o[0] = a[0] + (b[0] - a[0]) * t;
  o[1] = a[1] + (b[1] - a[1]) * t;
  o[2] = a[2] + (b[2] - a[2]) * t;
};

let els: HTMLElement[] = [];
let lastQuery = -1e9;

/** call once per frame; returns the current palette */
export function updateOcean(dt: number, fixedDepth?: number) {
  const now = performance.now();
  if (now - lastQuery > 500) {
    els = Array.from(document.querySelectorAll<HTMLElement>("section")).filter(
      (e) => !e.parentElement?.closest("section"),
    );
    lastQuery = now;
  }
  const vh = window.innerHeight;
  const N = els.length;
  if (fixedDepth !== undefined && Number.isFinite(fixedDepth)) {
    ocean.target = Math.min(1, Math.max(0, fixedDepth));
  } else if (N > 1) {
    let i = 0;
    let p = 0;
    for (let j = 0; j < N; j++) {
      const r = els[j].getBoundingClientRect();
      if (r.top <= vh * 0.5) {
        i = j;
        p = (vh * 0.5 - r.top) / Math.max(1, r.height);
      }
    }
    // hold each section's depth, then ease into the next one over the last 45% of the section
    const lvl = i + (i < N - 1 ? sm((p - 0.55) / 0.45) : 0);
    ocean.target = lvl / (N - 1);
  } else {
    ocean.target =
      window.scrollY / Math.max(1, document.documentElement.scrollHeight - vh);
  }

  ocean.depth += (ocean.target - ocean.depth) * (1 - Math.exp(-dt * 3));
  ocean.settling = Math.abs(ocean.target - ocean.depth) > 0.002;

  const f = Math.min(0.9999, Math.max(0, ocean.depth)) * (STOPS.length - 1);
  const a = STOPS[Math.floor(f)];
  const b = STOPS[Math.floor(f) + 1];
  const t = f - Math.floor(f);
  const c = ocean.cur;
  mix3(a.top, b.top, t, c.top);
  mix3(a.mid, b.mid, t, c.mid);
  mix3(a.bot, b.bot, t, c.bot);
  mix3(a.beam, b.beam, t, c.beam);
  mix3(a.sand, b.sand, t, c.sand);
  mix3(a.form, b.form, t, c.form);
  c.ray = a.ray + (b.ray - a.ray) * t;
  ocean.mid = c.mid;
  return c;
}
