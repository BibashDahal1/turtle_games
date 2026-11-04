import * as THREE from "three";

/** radius of the display platform, in box widths */
export const PLATFORM_RADIUS = 0.8;

const TAU = Math.PI * 2;

/* ---------- small canvas helpers ---------- */

function makeCanvas(w: number, h = w) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return { cv, g: cv.getContext("2d")! };
}

function toTexture(cv: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; // three.js clamps this to what the GPU supports
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function radialTexture(stops: [number, string][], size = 256) {
  const { cv, g } = makeCanvas(size);
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return toTexture(cv);
}

/** Warm beach sand: grain, wind ripples and a darker wet edge. */
function sandTexture() {
  const S = 1024;
  const c = S / 2;
  const { cv, g } = makeCanvas(S);
  const grad = g.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "#f6e3b4");
  grad.addColorStop(0.7, "#e8cd98");
  grad.addColorStop(0.92, "#d6b676");
  grad.addColorStop(1, "#b08c52");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  // grains
  for (let i = 0; i < 28000; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * c;
    g.globalAlpha = 0.06 + Math.random() * 0.14;
    g.fillStyle = Math.random() < 0.5 ? "#8a6a35" : "#fff3d1";
    g.beginPath();
    g.arc(
      c + Math.cos(a) * r,
      c + Math.sin(a) * r,
      0.4 + Math.random() * 1.2,
      0,
      TAU,
    );
    g.fill();
  }

  // wavy ripples left by the water
  g.lineWidth = 3;
  for (let r = 50; r < c - 30; r += 24) {
    for (const [col, off] of [
      ["rgba(120,90,40,0.10)", 0],
      ["rgba(255,247,225,0.14)", 4],
    ] as const) {
      g.strokeStyle = col;
      g.beginPath();
      for (let a = 0; a <= 360; a += 2) {
        const t = (a / 180) * Math.PI;
        const rr =
          r + off + Math.sin(t * 5 + r * 0.1) * 4 + Math.sin(t * 11) * 2;
        const x = c + Math.cos(t) * rr;
        const y = c + Math.sin(t) * rr;
        if (a === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  return toTexture(cv);
}

/** Tileable light-net pattern that dances on the bottom of shallow water. */
function causticTexture() {
  const S = 256;
  const { cv, g } = makeCanvas(S);
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * TAU;
      const v = (y / S) * TAU;
      const a =
        Math.sin(u + Math.sin(v * 2) * 1.3) *
        Math.sin(v + Math.sin(u * 2 + 1) * 1.3);
      const b =
        Math.sin(u * 2 + Math.sin(v) * 1.1 + 2) *
        Math.sin(v * 2 + Math.sin(u * 3) * 0.9);
      const l =
        Math.pow(1 - Math.abs(a), 12) + Math.pow(1 - Math.abs(b), 14) * 0.8;
      const k = Math.min(255, l * 255);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(cv, true);
}

/** Foam line where the water laps against the sand (band sits between 0.88 and 1.0 of the half-size). */
function foamTexture() {
  const S = 512;
  const c = S / 2;
  const { cv, g } = makeCanvas(S);
  g.strokeStyle = "#fff";
  g.lineWidth = 6;
  g.globalAlpha = 0.55;
  g.beginPath();
  for (let a = 0; a <= 360; a += 2) {
    const t = (a / 180) * Math.PI;
    const r = (0.885 + Math.sin(t * 9) * 0.006 + Math.sin(t * 23) * 0.004) * c;
    const x = c + Math.cos(t) * r;
    const y = c + Math.sin(t) * r;
    if (a === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke();
  g.fillStyle = "#fff";
  for (let i = 0; i < 1600; i++) {
    const a = Math.random() * TAU;
    const r = (0.88 + Math.pow(Math.random(), 2) * 0.12) * c;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.beginPath();
    g.arc(
      c + Math.cos(a) * r,
      c + Math.sin(a) * r,
      1 + Math.random() * 3.2,
      0,
      TAU,
    );
    g.fill();
  }
  return toTexture(cv);
}

/** Hexagonal scutes for the turtle shell. */
function shellTexture() {
  const S = 512;
  const { cv, g } = makeCanvas(S);
  g.fillStyle = "#5f6f33";
  g.fillRect(0, 0, S, S);
  const s = 46;
  const hw = Math.sqrt(3) * s;
  const fills = ["#7d8c43", "#657536", "#8b7a3a", "#6f8040"];
  let n = 0;
  for (let row = -1; row < S / (1.5 * s) + 1; row++) {
    for (let col = -1; col < S / hw + 1; col++) {
      const cx = col * hw + (row & 1 ? hw / 2 : 0);
      const cy = row * 1.5 * s;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6;
        const px = cx + Math.cos(a) * (s - 2);
        const py = cy + Math.sin(a) * (s - 2);
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillStyle = fills[n++ % fills.length];
      g.fill();
      g.strokeStyle = "#2c3718";
      g.lineWidth = 5;
      g.stroke();
    }
  }
  return toTexture(cv, true);
}

/* ---------- sea turtle ---------- */

interface Flipper {
  pivot: THREE.Group;
  side: 1 | -1;
  amp: number;
}

interface Turtle {
  group: THREE.Group;
  flippers: Flipper[];
}

/** A little sea turtle built from primitives. It faces +x; its flippers pivot around the x axis. */
function buildTurtle(
  mats: {
    shell: THREE.Material;
    skin: THREE.Material;
    plastron: THREE.Material;
    rim: THREE.Material;
    eye: THREE.Material;
  },
  track: <X extends { dispose(): void }>(x: X) => X,
): Turtle {
  const group = new THREE.Group();
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D = group,
  ) => {
    const m = new THREE.Mesh(track(geo), mat);
    parent.add(m);
    return m;
  };

  // shell (dome), rim and belly
  add(
    new THREE.SphereGeometry(0.1, 28, 14, 0, TAU, 0, Math.PI / 2).scale(
      1.25,
      0.7,
      1,
    ),
    mats.shell,
  );
  const rim = add(new THREE.TorusGeometry(0.1, 0.008, 8, 40), mats.rim);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.25, 1, 1);
  add(
    new THREE.CircleGeometry(0.1, 28).rotateX(Math.PI / 2).scale(1.25, 1, 1),
    mats.plastron,
  );

  // head, neck, eyes, tail
  add(
    new THREE.SphereGeometry(0.035, 12, 10).scale(1, 0.9, 1),
    mats.skin,
  ).position.set(0.125, 0.008, 0);
  add(
    new THREE.SphereGeometry(0.042, 16, 12).scale(1.3, 0.95, 0.95),
    mats.skin,
  ).position.set(0.158, 0.012, 0);
  for (const s of [1, -1])
    add(new THREE.SphereGeometry(0.008, 8, 8), mats.eye).position.set(
      0.186,
      0.026,
      s * 0.026,
    );
  add(
    new THREE.ConeGeometry(0.015, 0.05, 8).rotateZ(Math.PI / 2),
    mats.skin,
  ).position.set(-0.13, 0, 0);

  // flippers: pivot at the body, the paddle extends outwards
  const flippers: Flipper[] = [];
  const addFlipper = (
    x: number,
    side: 1 | -1,
    len: number,
    wid: number,
    yaw: number,
    amp: number,
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.005, side * 0.075);
    pivot.rotation.y = side * -yaw; // sweep the tip backwards
    const paddle = add(
      new THREE.SphereGeometry(1, 14, 8).scale(wid, 0.011, len),
      mats.skin,
      pivot,
    );
    paddle.position.z = side * len * 0.85;
    group.add(pivot);
    flippers.push({ pivot, side, amp });
  };
  for (const s of [1, -1] as const) {
    addFlipper(0.06, s, 0.075, 0.032, 0.6, 0.55);
    addFlipper(-0.085, s, 0.042, 0.022, 0.9, 0.3);
  }
  return { group, flippers };
}

/* ---------- platform ---------- */

export interface Platform3D {
  group: THREE.Group;
  /** kept for API compatibility: the ocean theme has a fixed palette */
  setAccent(c: THREE.Color): void;
  /** advance the animation; t = seconds (pass 0 to freeze it for reduced motion) */
  update(t: number): void;
  dispose(): void;
}

/**
 * Sandy island in a shallow turquoise tidepool, with sea turtles swimming round it.
 * The top of the sand is at y = 0, where the boxes stand.
 *
 * Everything is physical geometry lit by the normal scene lights. There are no glow planes or
 * additive halos, so nothing spills outside the platform (and nothing gets cut off at the canvas
 * edge). The only soft shape outside the platform is its own contact shadow.
 */
export function createPlatform(radius = PLATFORM_RADIUS): Platform3D {
  const R = radius;
  const SAND_R = R * 0.78;
  const WATER_R = R * 1.12;
  const T = 0.12; // sand thickness
  const WATER_Y = -0.04;

  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <X extends { dispose(): void }>(x: X) => (
    disposables.push(x),
    x
  );
  const std = (p: THREE.MeshStandardMaterialParameters) =>
    track(new THREE.MeshStandardMaterial(p));
  const mesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    y = 0,
  ) => {
    const m = new THREE.Mesh(track(geo), mat);
    m.position.y = y;
    group.add(m);
    return m;
  };

  /* soft contact shadow under the whole platform (fades to nothing well inside the canvas) */
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: track(
        radialTexture([
          [0, "rgba(0,0,0,0.5)"],
          [0.6, "rgba(0,0,0,0.25)"],
          [1, "rgba(0,0,0,0)"],
        ]),
      ),
      transparent: true,
      depthWrite: false,
    }),
  );
  const shadow = mesh(
    new THREE.PlaneGeometry(R * 3.2, R * 3.2).rotateX(-Math.PI / 2),
    shadowMat,
    -0.215,
  );
  shadow.renderOrder = -2;

  /* wooden base, stone rim, seabed */
  mesh(
    new THREE.CylinderGeometry(WATER_R * 1.04, WATER_R * 1.1, 0.1, 96),
    std({ color: 0x7a5535, roughness: 0.85 }),
    -0.16,
  );
  const rim = mesh(
    new THREE.TorusGeometry(WATER_R + 0.01, 0.03, 12, 128),
    std({ color: 0xb7966a, roughness: 0.9 }),
    WATER_Y + 0.005,
  );
  rim.rotation.x = Math.PI / 2;
  mesh(
    new THREE.CylinderGeometry(WATER_R, WATER_R, 0.02, 96),
    std({ color: 0x1d8f94, roughness: 0.9 }),
    -0.115,
  );

  /* the island: sand disc with a sloping beach */
  const sandMat = std({
    map: track(sandTexture()),
    roughness: 0.95,
    metalness: 0,
  });
  const sandSide = std({ color: 0xb99557, roughness: 1 });
  mesh(
    new THREE.CylinderGeometry(SAND_R, R * 0.9, T, 96),
    [sandSide, sandMat, sandSide],
    -T / 2,
  );

  /* shallow water with moving caustics */
  const caustic = track(causticTexture());
  caustic.repeat.set(2.5, 2.5);
  const waterMat = std({
    color: 0x39cfc9,
    transparent: true,
    opacity: 0.62,
    roughness: 0.2,
    metalness: 0,
    emissive: 0x8ff0ea,
    emissiveMap: caustic,
    emissiveIntensity: 0.5,
    depthWrite: false,
  });
  mesh(
    new THREE.CircleGeometry(WATER_R, 96).rotateX(-Math.PI / 2),
    waterMat,
    WATER_Y,
  );

  /* foam where the water laps the sand */
  const FOAM_HALF = R * 0.92;
  const foamMat = track(
    new THREE.MeshBasicMaterial({
      map: track(foamTexture()),
      transparent: true,
      depthWrite: false,
    }),
  );
  const foam = mesh(
    new THREE.PlaneGeometry(FOAM_HALF * 2, FOAM_HALF * 2).rotateX(-Math.PI / 2),
    foamMat,
    WATER_Y + 0.004,
  );

  /* ripples drifting outwards over the water */
  const ripples = [0, 0.5].map(() => {
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: 0xeafffd,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const m = mesh(
      new THREE.RingGeometry(0.95, 1, 96).rotateX(-Math.PI / 2),
      mat,
      WATER_Y + 0.006,
    );
    return { mat, m };
  });

  /* sun glints twinkling on the water */
  const glintGeo = track(
    new THREE.CircleGeometry(0.012, 8).rotateX(-Math.PI / 2),
  );
  const glints = Array.from({ length: 18 }, () => {
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const m = new THREE.Mesh(glintGeo, mat);
    const a = Math.random() * TAU;
    const r = SAND_R * 1.12 + Math.random() * (WATER_R * 0.94 - SAND_R * 1.12);
    m.position.set(Math.cos(a) * r, WATER_Y + 0.008, Math.sin(a) * r);
    group.add(m);
    return { mat, sp: 0.8 + Math.random() * 1.6, ph: Math.random() * TAU };
  });

  /* beach details: starfish, shells, pebbles (kept on the back and sides, clear of the box) */
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? 0.018 : 0.045;
    const a = (i / 10) * TAU - Math.PI / 2;
    if (i === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  starShape.closePath();
  const starGeo = track(
    new THREE.ExtrudeGeometry(starShape, {
      depth: 0.01,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 2,
    }).rotateX(-Math.PI / 2),
  );
  const starMat = std({ color: 0xe8744a, roughness: 0.8 });
  const shellGeo = track(new THREE.ConeGeometry(0.035, 0.09, 10));
  const shellMat = std({ color: 0xf1d9c4, roughness: 0.55 });
  const pebbleGeo = track(
    new THREE.DodecahedronGeometry(0.02).scale(1, 0.6, 1),
  );
  const pebbleMat = std({ color: 0x8d8a82, roughness: 0.9 });
  const place = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    deg: number,
    rr: number,
    y: number,
    yaw: number,
    tilt = 0,
  ) => {
    const o = new THREE.Mesh(g, m);
    const a = (deg / 180) * Math.PI;
    o.position.set(Math.cos(a) * SAND_R * rr, y, Math.sin(a) * SAND_R * rr);
    o.rotation.set(0, yaw, tilt);
    group.add(o);
  };
  place(starGeo, starMat, 205, 0.82, 0.002, 0.4);
  place(starGeo, starMat, 330, 0.8, 0.002, 1.2);
  place(shellGeo, shellMat, 25, 0.84, 0.03, 0.8, Math.PI / 2.3);
  place(shellGeo, shellMat, 150, 0.8, 0.03, 2.4, Math.PI / 2.3);
  place(shellGeo, shellMat, 255, 0.86, 0.03, 4.0, Math.PI / 2.3);
  place(pebbleGeo, pebbleMat, 280, 0.7, 0.012, 0);
  place(pebbleGeo, pebbleMat, 292, 0.78, 0.01, 1);
  place(pebbleGeo, pebbleMat, 170, 0.74, 0.012, 2);
  place(pebbleGeo, pebbleMat, 15, 0.7, 0.012, 3);

  /* two sea turtles swimming round the island */
  const turtleMats = {
    shell: std({ map: track(shellTexture()), roughness: 0.6 }),
    skin: std({ color: 0x78a24f, roughness: 0.7 }),
    plastron: std({ color: 0xd8c17c, roughness: 0.8, side: THREE.DoubleSide }),
    rim: std({ color: 0xa88f4a, roughness: 0.7 }),
    eye: track(new THREE.MeshBasicMaterial({ color: 0x111111 })),
  };
  const adult = buildTurtle(turtleMats, track);
  const baby = buildTurtle(turtleMats, track);
  baby.group.scale.setScalar(0.6);
  group.add(adult.group, baby.group);
  const ORBIT = (SAND_R * 1.06 + WATER_R * 0.98) / 2;

  const swim = (
    tt: Turtle,
    th: number,
    rr: number,
    t: number,
    ph: number,
    flapSpeed: number,
  ) => {
    tt.group.position.set(
      Math.cos(th) * rr,
      WATER_Y - 0.002 + 0.01 * Math.sin(t * 1.7 + ph),
      Math.sin(th) * rr,
    );
    tt.group.rotation.y = Math.atan2(-Math.cos(th), -Math.sin(th)); // face the direction of travel
    tt.group.rotation.z = 0.06 * Math.sin(t * 1.3 + ph);
    const w = Math.sin(t * flapSpeed + ph);
    tt.flippers.forEach((f) => (f.pivot.rotation.x = f.side * f.amp * w));
  };

  const update = (t: number) => {
    // caustics slide across the water
    caustic.offset.set(t * 0.02, t * 0.014);

    // foam breathes in and out
    foam.scale.setScalar(1 + 0.025 * Math.sin(t * 1.3));
    foamMat.opacity = 0.75 + 0.2 * Math.sin(t * 1.3 + 1);

    // ripples
    ripples.forEach(({ mat, m }, k) => {
      const p = (t / 3.2 + k * 0.5) % 1;
      m.scale.setScalar(SAND_R * 0.9 + (WATER_R * 0.97 - SAND_R * 0.9) * p);
      mat.opacity = t === 0 ? 0 : 0.5 * (1 - p) * Math.min(1, p * 6);
    });

    // glints
    glints.forEach(({ mat, sp, ph }) => {
      mat.opacity =
        t === 0 ? 0 : Math.pow(Math.max(0, Math.sin(t * sp + ph)), 8) * 0.9;
    });

    // turtles
    swim(adult, t * 0.35, ORBIT, t, 0, 2.2);
    swim(baby, t * 0.35 + 2.6, ORBIT * 0.97, t, 1.7, 3.2);
  };
  update(0);

  return {
    group,
    setAccent() {},
    update,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/* ---------- contact shadow ---------- */

const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
let blobTex: THREE.CanvasTexture | null = null;

export interface BlobShadow {
  mesh: THREE.Mesh;
  /** x/z = position on the floor, sx/sz = size, opacity 0..1 */
  place(x: number, z: number, sx: number, sz: number, opacity: number): void;
  dispose(): void;
}

/** A soft dark ellipse lying on the floor under a box. */
export function createBlobShadow(): BlobShadow {
  blobTex ??= radialTexture([
    [0, "rgba(0,0,0,0.85)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  const mat = new THREE.MeshBasicMaterial({
    map: blobTex,
    transparent: true,
    depthWrite: false,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(blobGeo, mat);
  mesh.renderOrder = 2;
  return {
    mesh,
    place(x, z, sx, sz, opacity) {
      mesh.position.set(x, 0.006, z);
      mesh.scale.set(sx, 1, sz);
      mat.opacity = opacity;
    },
    dispose() {
      mat.dispose(); // geometry and texture are shared
    },
  };
}
