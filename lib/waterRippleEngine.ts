/**
 * Realistic underwater backdrop + refraction ripples (WebGL1, no dependencies).
 * Procedural scene: sun shafts, caustics, sandy floor, reef, kelp, marine snow; colours and
 * amounts come from lib/ocean.ts (one depth level per page section). Pointer ripples bend all of it.
 */
import { ocean, updateOcean } from "@/lib/ocean";

export interface WaterOptions {
  intensity: number;
  lifetime: number;
  spawnDistance: number;
  quality: number;
  backgroundDepth?: number;
  src?: string;
  calm: boolean;
}

const MAXR = 24;

const VERT = `
attribute vec2 a;
varying vec2 vUv;
void main() {
  vUv = a * 0.5 + 0.5;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform int uN;
uniform vec4 uR[${MAXR}];
uniform sampler2D uTex;
uniform float uUseTex;
uniform float uImgAspect;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
uniform vec3 uBeam;
uniform vec3 uSand;
uniform vec3 uForm;   // coral, kelp, rock amounts
uniform float uRay;
uniform float uDepth;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s;
}

// soft caustic web, 0..1
float caustics(vec2 uv, float t) {
  vec2 q = uv * 6.0;
  float c = 0.0;
  for (int n = 0; n < 3; n++) {
    float fn = float(n);
    q += vec2(sin(q.y + t * 0.7 + fn), cos(q.x - t * 0.6 + fn * 1.7)) * 0.6;
    c += 1.0 - abs(sin(q.x) + sin(q.y)) * 0.5;
  }
  c /= 3.0;
  return pow(clamp(c, 0.0, 1.0), 6.0);
}

// swaying kelp strands (0..1)
float kelp(vec2 w, float d0) {
  float m = 0.0;
  for (int j = 0; j < 2; j++) {
    float fj = float(j);
    float gx = w.x * 7.0 + fj * 3.7;
    float id = floor(gx);
    float h1 = hash(vec2(id, fj + 1.0));
    float h2 = hash(vec2(id, fj + 7.0));
    float cx = (id + 0.25 + 0.5 * h1 + 0.0) / 7.0 - fj * 3.7 / 7.0;
    float sway = sin(uTime * 0.45 + d0 * 5.0 + h1 * 6.28) * 0.03 * clamp(0.92 - d0, 0.0, 1.0);
    float wd = 0.004 + 0.004 * h2;
    float top = 0.18 + 0.45 * h2;
    float strand = 1.0 - smoothstep(wd * 0.5, wd, abs(w.x - cx - sway));
    m = max(m, step(0.4, h1) * strand * smoothstep(top, top + 0.05, d0));
  }
  return m;
}

// drifting particles (marine snow)
float snow(vec2 w, float t) {
  float s = 0.0;
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    vec2 g = (w - vec2(t * 0.006 * (fl + 1.0), t * 0.02 * (fl + 1.0))) * (18.0 + fl * 14.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 o = (vec2(hash(id), hash(id + 3.1)) - 0.5) * 0.6;
    float r = 0.04 + 0.05 * hash(id + 9.7);
    s += step(0.7, hash(id + 5.5)) * smoothstep(r, 0.0, length(f - o)) * (0.4 + 0.6 * hash(id + 1.3));
  }
  return s;
}

vec3 proceduralScene(vec2 q) {
  vec2 uv = q / uRes;
  float ra = uRes.x / uRes.y;
  vec2 w = vec2(uv.x * ra, uv.y);       // square-ish units, y down
  float d0 = clamp(uv.y, 0.0, 1.0);
  float t = uTime;

  // oceanic water column: bright at the surface, darker with depth
  vec3 col = mix(uTop, uMid, smoothstep(0.0, 0.55, d0));
  col = mix(col, uBot, smoothstep(0.45, 1.0, d0));

  // golden sunlight shafts from above + surface glow
  float k = w.x + w.y * 0.55;
  float r1 = vnoise(vec2(k * 2.2 + t * 0.05, 3.0));
  float r2 = vnoise(vec2(k * 5.5 - t * 0.07, 9.0));
  float r3 = vnoise(vec2(k * 11.0 + t * 0.11, 1.0));
  float rays = smoothstep(0.35, 0.95, r1 * 0.55 + r2 * 0.35 + r3 * 0.2);
  rays *= pow(1.0 - d0, 1.25);
  col += uBeam * rays * 0.34 * uRay;
  col += uBeam * pow(1.0 - d0, 3.0) * 0.22 * uRay;

  // caustics, strongest near the surface (like the original scene)
  float cs = caustics(q / uRes.y, t * 0.35 + 23.0);
  col += uBeam * cs * pow(1.0 - d0, 1.1) * 0.45 * uRay;

  // colours: orange coral / dark rock, both fading into the water with depth (red light is absorbed)
  float dim = 0.25 + 0.6 * uDepth;
  vec3 coralHi = mix(vec3(0.95, 0.48, 0.16), uMid * 1.2, dim);
  vec3 coralLo = mix(vec3(0.62, 0.28, 0.10), uMid, dim);
  vec3 rockCol = mix(uSand * vec3(0.45, 0.35, 0.28), uMid * 0.8, 0.35 + 0.5 * uDepth);

  // far reef / rock silhouette, hazy with distance
  float cH = smoothstep(0.38, 0.82, fbm(vec2(w.x * 3.2, 2.0))) * 0.17 * uForm.x;
  cH += vnoise(vec2(w.x * 34.0, 5.0)) * 0.02 * step(0.001, cH);
  float rH = pow(fbm(vec2(w.x * 1.5, 7.0)), 2.2) * 0.36 * uForm.z;
  float top = 0.86 - max(cH, rH);
  float rm = smoothstep(0.0, 0.006, uv.y - top);
  float rockN = fbm(vec2(w.x * 9.0, uv.y * 9.0));
  vec3 reef = mix(rockCol, mix(coralLo, coralHi, rockN), step(rH, cH));
  reef *= 1.0 + 0.35 * (1.0 - smoothstep(0.0, 0.05, uv.y - top));   // lit from above
  reef = mix(reef, uMid, 0.38 + 0.3 * uDepth);                      // water haze
  col = mix(col, reef, rm);

  // amber-brown kelp
  float km = kelp(w, d0) * clamp(uForm.y, 0.0, 1.0);
  vec3 kcol = mix(vec3(0.42, 0.30, 0.10), uMid, 0.3 + 0.5 * uDepth);
  col = mix(col, kcol, km * 0.85);

  // sandy floor: dunes, ripples, caustics, nearer coral / rock
  float dune = 0.9 + 0.022 * sin(w.x * 2.3 + 1.0) + 0.03 * fbm(vec2(w.x * 3.0, 3.0));
  float nearH = smoothstep(0.55, 0.9, fbm(vec2(w.x * 6.5 + 11.0, 4.0))) * 0.085 * (uForm.x + 0.6 * uForm.z);
  float dTop = dune - nearH;
  float dm = smoothstep(0.0, 0.006, uv.y - dTop);
  vec3 sandCol = uSand * (0.8 + 0.2 * fbm(w * vec2(40.0, 18.0)));
  float rip = 0.5 + 0.5 * sin(w.x * 70.0 + fbm(vec2(w.x * 5.0, uv.y * 60.0)) * 7.0 + uv.y * 40.0);
  sandCol *= 0.94 + 0.06 * rip;
  sandCol += uBeam * cs * 0.5 * uRay;
  vec3 nearCol = mix(rockCol, mix(coralLo, coralHi, 0.5 + 0.5 * fbm(w * vec2(18.0, 12.0))), clamp(uForm.x, 0.0, 1.0));
  nearCol *= 1.0 + 0.3 * (1.0 - smoothstep(0.0, 0.03, uv.y - dTop));
  sandCol = mix(nearCol, sandCol, smoothstep(dune - 0.004, dune + 0.004, uv.y));
  sandCol = mix(sandCol, uMid * 1.4, 0.15 + 0.5 * uDepth);          // the water tints the seabed
  col = mix(col, sandCol, dm);

  // marine snow, lit by the shafts
  col += uBeam * snow(w, t) * (0.12 + 0.35 * rays) * (1.0 - 0.5 * uDepth);

  // depth dimming + vignette
  col *= mix(1.0, 0.85, uDepth);
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * mix(0.25, 0.6, uDepth);
  return col;
}

vec2 coverUv(vec2 q) {
  vec2 uv = q / uRes;
  float ra = uRes.x / uRes.y;
  vec2 s = ra > uImgAspect ? vec2(1.0, uImgAspect / ra) : vec2(ra / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;

  vec2 grad = vec2(0.0);
  float h = 0.0;
  const float SPEED = 125.0;
  const float K = 6.2832 / 105.0;
  for (int i = 0; i < ${MAXR}; i++) {
    if (i >= uN) break;
    vec4 r = uR[i];
    vec2 d = p - r.xy;
    float dist = length(d);
    float age = r.z;
    float u = dist - age * SPEED;
    float w = 60.0 + age * 40.0;
    float env = exp(-(u * u) / (w * w));
    float life = exp(-age * 0.85) * smoothstep(0.0, 0.3, age);
    float amp = r.w * life / (1.0 + dist * 0.005);
    float ph = K * u;
    float c = cos(ph);
    float s = sin(ph);
    h += amp * env * c;
    float dh = amp * env * (-2.0 * u / (w * w) * c - K * s);
    grad += dh * d / max(dist, 1.0);
  }

  vec2 amb = vec2(sin(p.y * 0.011 + uTime * 0.6), cos(p.x * 0.009 + uTime * 0.5)) * 2.5;
  vec2 off = grad * (uIntensity * 760.0) + amb;

  vec3 col;
  if (uUseTex > 0.5) {
    col.r = texture2D(uTex, coverUv(p + off * 1.10)).r;
    col.g = texture2D(uTex, coverUv(p + off)).g;
    col.b = texture2D(uTex, coverUv(p + off * 0.90)).b;
  } else {
    col = proceduralScene(p + off);
  }

  vec3 n = normalize(vec3(-grad * 14.0 * uIntensity, 1.0));
  float hl = pow(max(dot(n, normalize(vec3(-0.35, 0.55, 0.75))), 0.0), 28.0);
  float darkK = 1.0 - dot(uMid, vec3(0.3, 0.6, 0.1));
  col += uBeam * hl * 0.30 * mix(0.35, 1.0, darkK);
  col *= 1.0 + h * mix(0.12, 0.40, darkK) * uIntensity;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Ripple {
  x: number;
  y: number;
  t0: number;
  amp: number;
}

export function startWaterBackdrop(
  canvas: HTMLCanvasElement,
  o: WaterOptions,
): () => void {
  let disposed = false;
  let raf = 0;
  let visible = true;
  let cssW = 1;
  let cssH = 1;
  let lastX = -1e9;
  let lastY = -1e9;
  let lastT = 0;
  let lastNow = performance.now();
  let drewOnce = false;
  const t0 = performance.now();
  const ripples: Ripple[] = [];
  const buf = new Float32Array(MAXR * 4);

  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let vbo: WebGLBuffer | null = null;
  let tex: WebGLTexture | null = null;
  let loc: Record<string, WebGLUniformLocation | null> = {};
  let useTex = 0;
  let imgAspect = 1;

  const compile = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      console.warn("[WaterRipple] shader error:", gl!.getShaderInfoLog(s));
      return null;
    }
    return s;
  };

  const init = (): boolean => {
    gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    if (!gl) return false;
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[WaterRipple] link error:", gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const a = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    loc = {};
    for (const n of [
      "uRes",
      "uTime",
      "uIntensity",
      "uN",
      "uTex",
      "uUseTex",
      "uImgAspect",
      "uTop",
      "uMid",
      "uBot",
      "uBeam",
      "uSand",
      "uForm",
      "uRay",
      "uDepth",
    ])
      loc[n] = gl.getUniformLocation(program, n);
    loc.uR = gl.getUniformLocation(program, "uR[0]");
    gl.uniform1i(loc.uTex, 0);
    gl.uniform1f(loc.uIntensity, o.intensity);
    if (o.src) loadImage(o.src);
    return true;
  };

  const loadImage = (src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed || !gl) return;
      tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      useTex = 1;
    };
    img.onerror = () =>
      console.warn(
        "[WaterRipple] could not load",
        src,
        "- using the procedural scene.",
      );
    img.src = src;
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    cssW = Math.max(1, r.width);
    cssH = Math.max(1, r.height);
    const w = Math.max(2, Math.round(cssW * o.quality));
    const h = Math.max(2, Math.round(cssH * o.quality));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed || !gl || gl.isContextLost()) return;
    resize();

    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    const c = updateOcean(dt, o.backgroundDepth);

    let n = 0;
    for (let i = ripples.length - 1; i >= 0; i--)
      if (now - ripples[i].t0 > o.lifetime) ripples.splice(i, 1);
    for (const rp of ripples) {
      buf[n * 4] = rp.x;
      buf[n * 4 + 1] = rp.y;
      buf[n * 4 + 2] = (now - rp.t0) / 1000;
      buf[n * 4 + 3] = rp.amp;
      n++;
    }
    gl.uniform2f(loc.uRes, cssW, cssH);
    gl.uniform1f(loc.uTime, o.calm ? 0 : (now - t0) / 1000);
    gl.uniform1i(loc.uN, n);
    gl.uniform4fv(loc.uR, buf);
    gl.uniform1f(loc.uUseTex, useTex);
    gl.uniform1f(loc.uImgAspect, imgAspect);
    gl.uniform3f(loc.uTop, c.top[0], c.top[1], c.top[2]);
    gl.uniform3f(loc.uMid, c.mid[0], c.mid[1], c.mid[2]);
    gl.uniform3f(loc.uBot, c.bot[0], c.bot[1], c.bot[2]);
    gl.uniform3f(loc.uBeam, c.beam[0], c.beam[1], c.beam[2]);
    gl.uniform3f(loc.uSand, c.sand[0], c.sand[1], c.sand[2]);
    gl.uniform3f(loc.uForm, c.form[0], c.form[1], c.form[2]);
    gl.uniform1f(loc.uRay, c.ray);
    gl.uniform1f(loc.uDepth, ocean.depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    schedule();
  };

  const schedule = () => {
    if (disposed || raf || !visible || document.hidden) return;
    // reduced motion: only draw while ripples are alive, or the depth is still easing
    if (o.calm && ripples.length === 0 && drewOnce && !ocean.settling) return;
    drewOnce = true;
    raf = requestAnimationFrame(frame);
  };

  const spawn = (cx: number, cy: number, amp: number) => {
    const r = canvas.getBoundingClientRect();
    const x = cx - r.left;
    const y = cy - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    ripples.push({ x, y, t0: performance.now(), amp });
    if (ripples.length > MAXR) ripples.shift();
    schedule();
  };

  const onMove = (e: Event) => {
    const pe = e as PointerEvent;
    const r = canvas.getBoundingClientRect();
    if (
      pe.clientX < r.left ||
      pe.clientX > r.right ||
      pe.clientY < r.top ||
      pe.clientY > r.bottom
    ) {
      lastX = -1e9;
      return;
    }
    const now = performance.now();
    const dist = Math.hypot(pe.clientX - lastX, pe.clientY - lastY);
    if (dist < o.spawnDistance) return;
    const speed = dist / Math.max(16, now - lastT);
    lastX = pe.clientX;
    lastY = pe.clientY;
    lastT = now;
    spawn(pe.clientX, pe.clientY, clamp(0.35 + speed * 0.5, 0.35, 0.9));
  };
  const onDown = (e: Event) => {
    const pe = e as PointerEvent;
    spawn(pe.clientX, pe.clientY, 1.0);
  };
  const onScroll = () => {
    drewOnce = false;
    schedule();
  };
  const onVis = () => schedule();
  const onLost = (e: Event) => {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    if (init()) {
      resize();
      drewOnce = false;
      schedule();
    }
  };

  if (!init()) return () => {};
  resize();

  const opts = { passive: true, capture: true } as const;
  window.addEventListener("pointermove", onMove, opts);
  window.addEventListener("pointerdown", onDown, opts);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  const ro = new ResizeObserver(() => {
    resize();
    drewOnce = false;
    schedule();
  });
  ro.observe(canvas);
  const io = new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    schedule();
  });
  io.observe(canvas);
  schedule();

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove, opts);
    window.removeEventListener("pointerdown", onDown, opts);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVis);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    ro.disconnect();
    io.disconnect();
    if (gl && !gl.isContextLost()) {
      if (tex) gl.deleteTexture(tex);
      if (vbo) gl.deleteBuffer(vbo);
      if (program) gl.deleteProgram(program);
    }
    ripples.length = 0;
  };
}
