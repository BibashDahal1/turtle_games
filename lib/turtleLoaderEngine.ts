import { COLS, DATA } from "./turtleArt";

declare global {
  interface Window {
    TurtleLoader?: { set(p: number): void; finish(): void };
  }
}

interface Contour {
  xy: Float32Array;
  cum: Float32Array;
  len: number;
  cx: number;
  cy: number;
  s: number;
  d: number;
  u: number;
  ud: number;
}

const W2 = 1584,
  H2 = 1186;

/* timing (ms) */
const START = 200,
  SPREAD = 2400,
  ROWDELAY = 350,
  ROW_SPLIT = 500;
const SPEED = 3.0,
  DMIN = 220,
  DMAX = 2800;
const FILL_GAP = 200,
  FILL = 1200,
  SHEEN = 1300;
const UNDRAW_AFTER = 900,
  USPREAD = 800;
const HOLD = 1100,
  FADE = 700,
  GAP = 300,
  EXIT = 700;

/* perf knobs */
const MAX_DPR = 1.5,
  MIN_QUALITY = 0.6,
  MAX_TIPS = 40;

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp(t));
  };
}

const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement("canvas");
  return [c, c.getContext("2d")!];
};

/**
 * Starts the sketch -> colour -> retract loader. Returns a cleanup function.
 * `onDone` fires after the overlay has finished fading out.
 */
export function startTurtleLoader(
  loader: HTMLElement,
  cv: HTMLCanvasElement,
  onDone: () => void,
): () => void {
  const ctx = cv.getContext("2d");
  if (!ctx || DATA.length === 0) {
    if (DATA.length === 0)
      console.warn(
        "[TurtleLoader] lib/turtleArt.ts is empty - paste COLS and DATA from the original loader.",
      );
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("turtleloader:done"));
      onDone();
    }, 60);
    return () => window.clearTimeout(id);
  }

  let ready = document.readyState === "complete";
  let over = false;
  let stopped = false;
  let raf = 0;
  let exitTimer = 0;

  window.TurtleLoader = {
    set(p) {
      if ((+p || 0) >= 100) ready = true;
    },
    finish() {
      ready = true;
    },
  };
  const onLoad = () => {
    ready = true;
  };
  window.addEventListener("load", onLoad);

  const finish = () => {
    if (over) return;
    over = true;
    loader.classList.add("done");
    exitTimer = window.setTimeout(() => {
      window.dispatchEvent(new Event("turtleloader:done"));
      onDone();
    }, EXIT);
  };

  /* ---------- parse outlines (duplicates across colour layers traced once) ---------- */
  const fillPaths: (Path2D | undefined)[] = new Array(DATA.length);
  const contours: Contour[] = [];
  const seen = new Set<string>();
  DATA.forEach((e) => {
    e[1].split("z").forEach((sub) => {
      if (seen.has(sub)) return;
      const m = /^M(-?\d+) (-?\d+)l(.*)$/.exec(sub);
      if (!m) return;
      seen.add(sub);
      let x = +m[1],
        y = +m[2];
      const pts: number[] = [x, y];
      const nums = m[3].match(/-?\d+/g) || [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        x += +nums[i];
        y += +nums[i + 1];
        pts.push(x, y);
      }
      pts.push(pts[0], pts[1]);
      const n = pts.length / 2;
      const cum = new Float32Array(n);
      let minx = 1e9,
        maxx = -1e9,
        miny = 1e9,
        maxy = -1e9;
      for (let i = 1; i < n; i++)
        cum[i] =
          cum[i - 1] +
          Math.hypot(
            pts[2 * i] - pts[2 * i - 2],
            pts[2 * i + 1] - pts[2 * i - 1],
          );
      for (let i = 0; i < n; i++) {
        if (pts[2 * i] < minx) minx = pts[2 * i];
        if (pts[2 * i] > maxx) maxx = pts[2 * i];
        if (pts[2 * i + 1] < miny) miny = pts[2 * i + 1];
        if (pts[2 * i + 1] > maxy) maxy = pts[2 * i + 1];
      }
      contours.push({
        xy: Float32Array.from(pts),
        cum,
        len: cum[n - 1],
        cx: (minx + maxx) / 2,
        cy: (miny + maxy) / 2,
        s: 0,
        d: 0,
        u: 0,
        ud: 0,
      });
    });
  });
  const N = contours.length;

  /* ---------- schedule ---------- */
  let drawEnd = 0;
  contours.forEach((c, i) => {
    const row = c.cy < ROW_SPLIT ? 0 : 1;
    const big = Math.min(1, c.len / 6000);
    c.s =
      c.len > 7000
        ? 0
        : START +
          (c.cx / W2) * SPREAD * (1 - 0.8 * big) +
          row * ROWDELAY +
          ((i * 37) % 90);
    c.d = Math.min(DMAX, Math.max(DMIN, c.len / SPEED));
    drawEnd = Math.max(drawEnd, c.s + c.d);
  });
  const fillAt = drawEnd + FILL_GAP;
  const sheenAt = fillAt + 700;
  const undrawAt = fillAt + UNDRAW_AFTER;
  const order = contours
    .map((_, i) => i)
    .sort((a, b) => contours[a].s - contours[b].s);
  let undrawEnd = 0;
  order.forEach((i, r) => {
    const c = contours[i];
    c.u = undrawAt + (r / Math.max(1, N - 1)) * USPREAD;
    c.ud = Math.min(900, Math.max(300, c.d * 0.6));
    undrawEnd = Math.max(undrawEnd, c.u + c.ud);
  });
  const settled = Math.max(undrawEnd, fillAt + FILL, sheenAt + SHEEN);
  const holdEnd = settled + HOLD;

  const eDraw = bezier(0.45, 0.05, 0.35, 1);
  const eUndraw = bezier(0.55, 0, 0.4, 1);
  const eSoft = bezier(0.42, 0, 0.58, 1);
  const eSheen = bezier(0.25, 0.6, 0.3, 1);

  /* ---------- canvases ---------- */
  const [colorCv, cctx] = mk();
  const [sheenCv, sctx] = mk();
  const LAYERS = [
    { w: 3.4, alpha: 0.16, glow: true, dx: 0, dy: 0 },
    { w: 0.65, alpha: 0.4, glow: false, dx: 0.75, dy: -0.6 },
    { w: 1, alpha: 1, glow: false, dx: 0, dy: 0 },
  ].map((L) => {
    const [c, x] = mk();
    return { ...L, cv: c, ctx: x };
  });

  const lightMQ = matchMedia("(prefers-color-scheme: light)");
  const dp = new Float64Array(N);
  const dq = new Float64Array(N);
  let cw = 0,
    ch = 0,
    scale = 1,
    pxr = 1,
    quality = 1;
  let dirty = true,
    needResize = false,
    finalDrawn = false,
    cIdx = 0;

  const invalidate = () => {
    for (const L of LAYERS) {
      L.ctx.setTransform(1, 0, 0, 1, 0, 0);
      L.ctx.clearRect(0, 0, cw, ch);
    }
    dp.fill(0);
    dq.fill(0);
    dirty = true;
    finalDrawn = false;
  };

  const resize = () => {
    const cssW = cv.clientWidth;
    if (!cssW) return;
    const r = Math.min(window.devicePixelRatio || 1, MAX_DPR) * quality;
    const w = Math.max(2, Math.round(cssW * r));
    const h = Math.round((w * H2) / W2);
    if (w === cw && h === ch) return;
    cw = w;
    ch = h;
    cv.width = colorCv.width = sheenCv.width = w;
    cv.height = colorCv.height = sheenCv.height = h;
    for (const L of LAYERS) {
      L.cv.width = w;
      L.cv.height = h;
    }
    scale = cw / W2;
    pxr = cw / cssW;
    cIdx = 0;
    invalidate();
  };

  const buildColor = (budget: number) => {
    if (cIdx >= DATA.length) return;
    const t0 = performance.now();
    cctx.setTransform(scale, 0, 0, scale, 0, 0);
    while (cIdx < DATA.length && performance.now() - t0 < budget) {
      const p = (fillPaths[cIdx] ??= new Path2D(DATA[cIdx][1]));
      cctx.fillStyle = COLS[DATA[cIdx][0]];
      cctx.fill(p, "evenodd");
      cIdx++;
    }
  };

  const ro = new ResizeObserver(() => {
    needResize = true;
  });
  ro.observe(cv);
  lightMQ.addEventListener("change", invalidate);
  resize();

  /* ---------- geometry helpers ---------- */
  let PX = 0,
    PY = 0;
  const at = (c: Contour, l: number) => {
    const { cum, xy } = c;
    if (l < 0) l = 0;
    else if (l > c.len) l = c.len;
    let lo = 0,
      hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= l) lo = m;
      else hi = m;
    }
    const span = cum[hi] - cum[lo] || 1;
    const t = (l - cum[lo]) / span;
    PX = xy[2 * lo] + t * (xy[2 * hi] - xy[2 * lo]);
    PY = xy[2 * lo + 1] + t * (xy[2 * hi + 1] - xy[2 * lo + 1]);
    return lo;
  };
  const addRange = (path: Path2D, c: Contour, a: number, b: number) => {
    const xy = c.xy;
    const i0 = at(c, a * c.len),
      sx = PX,
      sy = PY;
    const i1 = at(c, b * c.len);
    path.moveTo(sx, sy);
    for (let i = i0 + 1; i <= i1; i++) path.lineTo(xy[2 * i], xy[2 * i + 1]);
    path.lineTo(PX, PY);
  };

  /* ---------- per-frame work ---------- */
  const tipX = new Float32Array(MAX_TIPS);
  const tipY = new Float32Array(MAX_TIPS);
  let tipN = 0;

  const advance = (t: number) => {
    const add = new Path2D();
    const del = new Path2D();
    let hasAdd = false,
      hasDel = false;
    tipN = 0;
    for (let i = 0; i < N; i++) {
      const c = contours[i];
      const p = eDraw(clamp((t - c.s) / c.d));
      const q = eUndraw(clamp((t - c.u) / c.ud));
      if (p > dp[i] && ((p - dp[i]) * c.len >= 1.5 || p === 1)) {
        addRange(add, c, dp[i], p);
        dp[i] = p;
        hasAdd = true;
      }
      if (q > dq[i] && ((q - dq[i]) * c.len >= 1.5 || q === 1)) {
        addRange(del, c, dq[i], q);
        dq[i] = q;
        hasDel = true;
      }
      if (q === 0 && p > 0 && p < 1 && tipN < MAX_TIPS) {
        at(c, p * c.len);
        tipX[tipN] = PX;
        tipY[tipN] = PY;
        tipN++;
      }
    }
    if (!hasAdd && !hasDel) return;
    const light = lightMQ.matches;
    const lineCol = light ? "#5a2d0c" : "#ffeab0";
    const glowCol = light ? "#e0a72e" : "#ffd45a";
    const base = (2.6 * pxr) / scale;
    for (const L of LAYERS) {
      const x = L.ctx;
      const lw = base * L.w;
      x.setTransform(scale, 0, 0, scale, L.dx * pxr, L.dy * pxr);
      x.lineCap = "round";
      x.lineJoin = "round";
      if (hasAdd) {
        x.globalCompositeOperation = "source-over";
        x.strokeStyle = L.glow ? glowCol : lineCol;
        x.lineWidth = lw;
        x.stroke(add);
      }
      if (hasDel) {
        x.globalCompositeOperation = "destination-out";
        x.lineWidth = lw + (2 * pxr) / scale;
        x.stroke(del);
      }
    }
  };

  const compose = (t: number) => {
    const light = lightMQ.matches;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cw, ch);

    const fa = eSoft(clamp((t - fillAt) / FILL));
    if (fa > 0) {
      ctx.globalAlpha = fa;
      ctx.drawImage(colorCv, 0, 0);
      ctx.globalAlpha = 1;
    }

    const sp = clamp((t - sheenAt) / SHEEN);
    if (sp > 0 && sp < 1) {
      const bw = cw * 0.34;
      const x = (-0.45 + eSheen(sp) * 1.9) * cw;
      const pad = ch * 0.2;
      const x0 = Math.max(0, Math.floor(x - pad));
      const x1 = Math.min(cw, Math.ceil(x + bw + pad));
      if (x1 > x0) {
        const w = x1 - x0;
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = "source-over";
        sctx.clearRect(x0, 0, w, ch);
        const g = sctx.createLinearGradient(x, 0, x + bw, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,248,226,.95)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        sctx.save();
        sctx.transform(1, 0, -0.36, 1, ch * 0.18, 0);
        sctx.fillStyle = g;
        sctx.fillRect(x, 0, bw, ch);
        sctx.restore();
        sctx.globalCompositeOperation = "destination-in";
        sctx.drawImage(colorCv, x0, 0, w, ch, x0, 0, w, ch);
        ctx.globalCompositeOperation = light ? "source-over" : "screen";
        ctx.drawImage(sheenCv, x0, 0, w, ch, x0, 0, w, ch);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    if (t < undrawEnd + 120) {
      for (const L of LAYERS) {
        ctx.globalAlpha = L.alpha;
        ctx.drawImage(L.cv, 0, 0);
      }
      ctx.globalAlpha = 1;
      if (tipN) {
        const w = (2.6 * pxr) / scale;
        const glowCol = light ? "#e0a72e" : "#ffd45a";
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        for (let i = 0; i < tipN; i++) {
          ctx.fillStyle = glowCol;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(tipX[i], tipY[i], w * 2.2, 0, 6.2832);
          ctx.fill();
          ctx.fillStyle = "#fffaf0";
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(tipX[i], tipY[i], w * 0.8, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  /* ---------- main loop ---------- */
  let cycle0 = 0,
    idle = false,
    fadeStarted = false;
  let lastTs = 0,
    slow = 0,
    seenFrames = 0,
    lastOpacity = "1";

  const watchPerf = (now: number) => {
    if (lastTs) {
      const d = now - lastTs;
      if (d < 250) {
        seenFrames++;
        if (d > 24) slow++;
      }
      if (seenFrames >= 20) {
        if (slow > 8 && quality > MIN_QUALITY) {
          quality = Math.max(MIN_QUALITY, quality * 0.75);
          resize();
        }
        seenFrames = 0;
        slow = 0;
      }
    }
    lastTs = now;
  };

  const frame = (now: number) => {
    if (over || stopped) return;
    if (!cycle0) cycle0 = now;
    let t = now - cycle0;

    if (needResize) {
      needResize = false;
      resize();
    }
    if (t > fillAt - 300) buildColor(1e9);
    else buildColor(4);

    if (!idle && t > fillAt + FILL) {
      idle = true;
      loader.classList.add("idle");
    }

    if (t >= holdEnd) {
      if (!fadeStarted) {
        if (ready) {
          finish();
          return;
        }
        fadeStarted = true;
      }
      const o = String(1 - eSoft(clamp((t - holdEnd) / FADE)));
      if (o !== lastOpacity) {
        cv.style.opacity = o;
        lastOpacity = o;
      }
      if (t >= holdEnd + FADE + GAP) {
        cycle0 = now;
        t = 0;
        fadeStarted = false;
        cv.style.opacity = lastOpacity = "1";
        invalidate();
      }
    }

    if (dirty || t < settled || !finalDrawn) {
      if (t < settled) watchPerf(now);
      advance(t);
      compose(t);
      dirty = false;
      finalDrawn = t >= settled;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(exitTimer);
    ro.disconnect();
    lightMQ.removeEventListener("change", invalidate);
    window.removeEventListener("load", onLoad);
    delete window.TurtleLoader;
  };
}
