import * as THREE from "three";
import type { Game } from "@/lib/games";

/**
 * A real 3D game box: one BoxGeometry with SIX materials, so every face has its own image
 * and is physically on its own side of the box (front and back can never overlap).
 *
 * World units: 1 = box width. Height and depth are measured from the artwork itself:
 *   height = front image aspect ratio, depth = height * (side image aspect ratio)
 * so the images are never stretched, whatever size your PNGs are.
 *
 * Three.js BoxGeometry material order:  +x, -x, +y, -y, +z, -z
 *                                       (right-hand side, left-hand side, top, bottom, front, back)
 */

/** Flip to true if your two spine images end up on the wrong sides. */
const SWAP_SIDES = false;
/** Turn the lid / underside artwork if it appears rotated (use 0, Math.PI/2, Math.PI ...). */
const TOP_ROTATION = 0;
const BOTTOM_ROTATION = 0;

const DEFAULT_H = 0.742;
const DEFAULT_D = 0.26;

const WHITE = new THREE.Color(0xffffff);
const GEO = new THREE.BoxGeometry(1, 1, 1);

/* ---------- texture loading (cached, shared by every box and every canvas) ---------- */

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture | null>>();

function loadTexture(url: string, anisotropy: number) {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Texture | null>((resolve) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = anisotropy;
          resolve(t);
        },
        undefined,
        () => resolve(null),
      );
    });
    cache.set(url, p);
  }
  return p;
}

const imgSize = (t: THREE.Texture) => {
  const im = t.image as {
    naturalWidth?: number;
    width: number;
    naturalHeight?: number;
    height: number;
  };
  return { w: im.naturalWidth || im.width, h: im.naturalHeight || im.height };
};

/** Painted spine, used only when a side image is missing. */
function spineTexture(text: string, c1: string, c2: string, accent: string) {
  const cv = document.createElement("canvas");
  cv.width = 192;
  cv.height = 512;
  const g = cv.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, cv.width, 0);
  grad.addColorStop(0, c2);
  grad.addColorStop(0.5, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.strokeRect(10, 10, cv.width - 20, cv.height - 20);
  g.translate(cv.width / 2, cv.height / 2);
  g.rotate(-Math.PI / 2);
  g.fillStyle = "#fff";
  g.font = "700 64px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 0, 0, cv.height * 0.85);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- the box ---------- */

export interface BoxSize {
  w: number;
  h: number;
  d: number;
}

export interface GameBox3D {
  /** Position / yaw / scale this from the scene. Its origin is the centre of the bottom face. */
  root: THREE.Group;
  /** Free rotation by the user (pivot = centre of the box). */
  spin: THREE.Group;
  /** The raycast target. mesh.userData.index is free for the caller to use. */
  mesh: THREE.Mesh;
  /** Live size, updated once the artwork has loaded. */
  size: BoxSize;
  /** 0..1 multiplier on all face colours (used to dim boxes in the background). */
  setBrightness(b: number): void;
  dispose(): void;
}

export function createGameBox(
  game: Game,
  opts: { anisotropy?: number } = {},
): GameBox3D {
  const anisotropy = opts.anisotropy ?? 4;
  const size: BoxSize = { w: 1, h: DEFAULT_H, d: DEFAULT_D };
  let sideAspect = DEFAULT_D / DEFAULT_H;
  let bright = 1;
  let disposed = false;
  const owned: THREE.Texture[] = [];

  const f = game.box;
  const urls = [
    SWAP_SIDES ? f.right : f.left, // +x  (seen when the box is turned to the left)
    SWAP_SIDES ? f.left : f.right, // -x
    f.top, // +y
    f.bottom, // -y
    f.front, // +z
    f.back, // -z
  ];
  const base = [
    game.color,
    game.color,
    game.color2,
    game.color2,
    game.color2,
    game.color2,
  ].map((c) => new THREE.Color(c));
  const hasMap = [false, false, false, false, false, false];

  const mats = base.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c.clone(),
        roughness: 0.55,
        metalness: 0,
      }),
  );
  const paint = (i: number) => {
    mats[i].color.copy(hasMap[i] ? WHITE : base[i]).multiplyScalar(bright);
  };
  mats.forEach((_, i) => paint(i));

  const mesh = new THREE.Mesh(GEO, mats);
  const spin = new THREE.Group();
  spin.rotation.order = "YXZ"; // turntable feel: yaw first, then pitch
  spin.add(mesh);
  const root = new THREE.Group();
  root.add(spin);

  const applySize = () => {
    mesh.scale.set(size.w, size.h, size.d);
    spin.position.y = size.h / 2; // box stands on y = 0
  };
  applySize();

  urls.forEach((url, i) => {
    loadTexture(url, anisotropy).then((tex) => {
      if (disposed) return;
      let t = tex;
      if (!t && (i === 0 || i === 1)) {
        t = spineTexture(game.name, game.color, game.color2, game.accent);
        owned.push(t);
      }
      if (!t) return; // keep the flat colour
      if (i === 2 || i === 3) {
        t.center.set(0.5, 0.5);
        t.rotation = i === 2 ? TOP_ROTATION : BOTTOM_ROTATION;
      }
      mats[i].map = t;
      mats[i].needsUpdate = true;
      hasMap[i] = true;
      paint(i);

      if (tex) {
        const { w, h } = imgSize(tex);
        if (i === 4 && w && h) {
          const aspect = THREE.MathUtils.clamp(h / w, 0.4, 1.4);
          // never taller than the layout envelope: tall artwork is scaled down uniformly
          const k = Math.min(1, DEFAULT_H / aspect);
          size.w = k;
          size.h = aspect * k;
          size.d = size.h * sideAspect;
        } else if ((i === 0 || i === 1) && w && h) {
          sideAspect = THREE.MathUtils.clamp(w / h, 0.1, 0.8);
          size.d = size.h * sideAspect;
        }
        applySize();
      }
    });
  });

  return {
    root,
    spin,
    mesh,
    size,
    setBrightness(b) {
      if (Math.abs(b - bright) < 0.004) return;
      bright = b;
      mats.forEach((_, i) => paint(i));
    },
    dispose() {
      disposed = true;
      mats.forEach((m) => m.dispose());
      owned.forEach((t) => t.dispose());
      // cached image textures are shared, so they stay alive for the next mount
    },
  };
}
