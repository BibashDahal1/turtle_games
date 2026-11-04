import * as THREE from "three";

/** vertical field of view, in degrees */
export const FOV = 26;
/** how far above the box the camera looks down (radians) */
export const CAMERA_ELEVATION = THREE.MathUtils.degToRad(14);

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** call when the canvas size may have changed; returns the CSS pixel size */
  resize(): { w: number; h: number };
  dispose(): void;
}

/**
 * One transparent WebGL canvas + a neutral "product photo" light rig.
 * Everything in the games section (carousel and box viewer) is built on this.
 */
export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  // Intensities are higher than you may expect: three.js uses physically based
  // lights, so ~2 gives the artwork its true colours instead of a dull grey.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b4a30, 2.0));

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.5, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffe2b0, 0.7);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  let lastW = 0;
  let lastH = 0;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h && (w !== lastW || h !== lastH)) {
      lastW = w;
      lastH = h;
      renderer.setSize(w, h, false); // CSS decides the size, not three.js
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    return { w, h };
  };
  resize();

  return {
    renderer,
    scene,
    camera,
    resize,
    // NOTE: no forceContextLoss() here. React StrictMode mounts effects twice on the
    // same <canvas>, and a force-lost context cannot be re-created on that element.
    dispose: () => renderer.dispose(),
  };
}

/**
 * Place the camera so that `viewH` world units (1 unit = 1 box width) fill the canvas height
 * at the focus plane, looking down at `targetY` from CAMERA_ELEVATION.
 */
export function frameCamera(
  camera: THREE.PerspectiveCamera,
  viewH: number,
  targetY: number,
) {
  const dist = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
  camera.position.set(
    0,
    targetY + dist * Math.sin(CAMERA_ELEVATION),
    dist * Math.cos(CAMERA_ELEVATION),
  );
  camera.lookAt(0, targetY, 0);
}
