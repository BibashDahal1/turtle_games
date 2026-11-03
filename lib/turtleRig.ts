/**
 * Bone animation for public/turtle/turtle_rigged.glb (36 bones, no baked clips).
 * Ported from your prototype: arms flap like flippers, legs flutter-kick, tail wags,
 * snorkel sways, jaw / mouth corners / cheeks / lip give facial expressions.
 *
 * Model axes (every bone rests with identity rotation): +X = turtle's left, +Y = up/head, +Z = face.
 */
import * as THREE from "three";

/** Scale that makes the standing model ~3.9 world units tall = same size as the 2D hero mascot. */
export const MS = 2.25;
/** Point of the body (model space) that every rotation happens around. */
export const CENTER = new THREE.Vector3(0, 0.8, -0.1);

/**
 * How far the right hand rolls (about the forearm axis) so the palm faces the screen while waving.
 * If you see the back of the hand instead of the palm, flip the sign (or try Math.PI / 2).
 * If the palm is not quite square to the camera, tune it (e.g. -1.3 or -1.8).
 */
const WAVE_PALM_TWIST = -Math.PI / 2;
/**
 * The twist is shared between forearm and hand so the skin spreads it over the wrist instead of
 * pinching ("candy-wrapper") at a single bone. 0.5 = half each; must be 0..1.
 */
const WAVE_TWIST_FOREARM = 0.5;
/**
 * Thumb pose while waving (radians, scaled by the wave amount). The thumb is pulled in toward the
 * fingers so it doesn't stick out. If it tucks the wrong way, flip the sign of the value;
 * if it is still too open, increase the magnitude.
 */
const THUMB_TUCK_Y = 0.35; // pulls the thumb in toward the fingers (sideways)
const THUMB_TUCK_X = 0.0; // raises / lowers it relative to the palm
const THUMB_CURL = 0.25; // bends the tip joint slightly
const AXIS_X = new THREE.Vector3(1, 0, 0);

export type ExprId = "grin" | "smile" | "sad" | "smirk" | "grr";

/** Everything the director tells the rig each frame. */
export interface Motion {
  flap: number; // arm stroke amplitude
  rate: number; // arm stroke speed
  kick: number; // leg stroke amplitude
  krate: number; // leg stroke speed
  wave: number; // 0..1 right hand waving
  sleep: number; // 0..1 arms down, head nodding, no idle fidgets
  live: number; // 0..1 idle fidget amount (head look, tail wag, snorkel sway)
  jawOpen: number; // extra jaw opening (startle)
  expr: ExprId;
}
export const newMotion = (): Motion => ({
  flap: 0.3,
  rate: 2,
  kick: 0.3,
  krate: 2,
  wave: 0,
  sleep: 0,
  live: 1,
  jawOpen: 0,
  expr: "grin",
});

const FACE0 = {
  jaw: 0,
  cu: 0,
  cuL: 0,
  cuR: 0,
  co: 0,
  coL: 0,
  coR: 0,
  cf: 0,
  lip: 0,
  ck: 0,
};
type Face = typeof FACE0;
const FACE_KEYS = Object.keys(FACE0) as (keyof Face)[];

const EXPR: Record<ExprId, Partial<Face>> = {
  grin: {},
  smile: { jaw: -0.2, cu: 0.012, co: 0.02, ck: 0.012 },
  sad: { jaw: -0.12, cu: -0.08, co: -0.03, lip: -0.01 },
  smirk: {
    jaw: -0.14,
    cuL: 0.045,
    cuR: -0.012,
    coL: 0.02,
    coR: -0.015,
    lip: 0.004,
  },
  grr: { jaw: -0.06, cu: -0.045, co: -0.01, lip: 0.02, ck: -0.01 },
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
// GLTFLoader strips . [ ] : / and spaces from node names ("upper_arm.L" -> "upper_armL")
const norm = (s: string) => s.replace(/[.\[\]:\/\s]/g, "");

export function createPoser(root: THREE.Object3D) {
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    const b = o as THREE.Bone;
    if (b.isBone) {
      bones[norm(b.name)] = b;
      b.userData.rest = b.quaternion.clone();
      b.userData.restPos = b.position.clone();
    }
  });
  const get = (n: string) => bones[norm(n)];

  const eq = new THREE.Quaternion();
  const tq = new THREE.Quaternion();
  const ee = new THREE.Euler();
  /**
   * rotate a bone from its rest pose (Euler, radians, in the parent's frame),
   * optionally followed by a roll about the bone's own X (arm) axis
   */
  const swing = (
    n: string,
    x: number,
    y: number,
    z: number,
    roll = 0,
    preRoll = 0,
  ) => {
    const b = get(n);
    if (!b) return;
    eq.setFromEuler(ee.set(x, y, z));
    // preRoll cancels a roll already applied on the parent bone, so this bone's swing
    // (e.g. the hand flick) keeps moving in the screen plane instead of turning with the parent
    if (preRoll !== 0)
      b.quaternion.setFromAxisAngle(AXIS_X, preRoll).multiply(eq);
    else b.quaternion.copy(eq);
    b.quaternion.multiply(b.userData.rest);
    if (roll !== 0) b.quaternion.multiply(tq.setFromAxisAngle(AXIS_X, roll));
  };
  /** translate a bone away from its rest position (mouth corners, lip, cheeks) */
  const move = (n: string, x: number, y: number, z: number) => {
    const b = get(n);
    if (!b) return;
    const r = b.userData.restPos as THREE.Vector3;
    b.position.set(r.x + x, r.y + y, r.z + z);
  };
  // arm in T-pose: up = raise(+)/lower(-), fwd = sweep forward, tw = twist,
  // roll = extra roll about the bone's own axis (applied after the swing)
  const armBone = (
    name: string,
    side: "L" | "R",
    up: number,
    fwd: number,
    tw: number,
    roll = 0,
    preRoll = 0,
  ) => {
    const s = side === "L" ? 1 : -1;
    swing(name + "." + side, tw, -s * fwd, s * up, roll, preRoll);
  };

  let phase = 0,
    kphase = 0,
    wphase = 0;
  const F: Face = { ...FACE0 };

  function update(m: Motion, t: number, dt: number) {
    phase += dt * m.rate;
    kphase += dt * m.krate;
    wphase += dt * 9;
    const live = m.live,
      A = m.flap,
      K = m.kick,
      sl = m.sleep;

    // spine / head / tail / snorkel
    swing("root", 0, 0.04 * live * Math.sin(phase * 0.5), 0);
    swing(
      "spine",
      0.1 * A * Math.sin(phase - 0.6),
      0.05 * live * Math.sin(t * 0.8),
      0,
    );
    swing(
      "chest",
      0.08 * A * Math.sin(phase - 1.1) + 0.03 * sl * Math.sin(t * 1.2),
      0,
      0,
    );
    swing(
      "neck",
      0.05 * live * Math.sin(t * 0.9) + 0.35 * sl,
      0.15 * live * Math.sin(t * 0.6),
      0,
    );
    swing("head", 0.2 * sl, 0.1 * live * Math.sin(t * 0.5 + 1), 0);
    ["snorkel.02", "snorkel.03", "snorkel.04", "snorkel.05"].forEach((n, i) =>
      swing(
        n,
        0.08 * live * Math.sin(t * 2.2 - i * 0.7) * (1 + A),
        0,
        0.08 * live * Math.sin(t * 1.7 - i * 0.6),
      ),
    );
    swing(
      "tail.01",
      0.15 * live * Math.sin(t * 1.4),
      0.35 * live * Math.sin(t * 2.0),
      0,
    );
    swing(
      "tail.02",
      0.2 * live * Math.sin(t * 1.4 - 0.6),
      0.45 * live * Math.sin(t * 2.0 - 0.8),
      0,
    );

    // arms (flipper stroke; right arm waves)
    for (const side of ["L", "R"] as const) {
      const isR = side === "R";
      const wv = isR ? m.wave : 0;
      const Ak = A * (isR ? 1 - 0.85 * m.wave : 1);
      const ph = phase + (isR ? 0.5 : 0);
      const totalRoll = WAVE_PALM_TWIST * wv; // palm -> screen as the wave blends in
      const forearmRoll = totalRoll * WAVE_TWIST_FOREARM;
      const handRoll = totalRoll; // hand ends up at the full twist (forearm part + its own share)
      armBone(
        "upper_arm",
        side,
        Ak * Math.sin(ph) + 1.35 * wv - 1.1 * sl,
        0.45 * Ak * Math.sin(ph + 1.57) + 0.25 * wv,
        0.25 * Ak * Math.sin(ph + 0.5),
      );
      armBone(
        "forearm",
        side,
        0.6 * Ak * Math.sin(ph - 0.8) + 0.55 * wv * Math.sin(wphase),
        0.25 * Ak * Math.sin(ph - 0.3) + 0.2 * wv,
        0,
        forearmRoll, // first part of the palm twist
      );
      armBone(
        "hand",
        side,
        0.5 * Ak * Math.sin(ph - 1.5) + 0.4 * wv * Math.sin(wphase - 0.9),
        0,
        0,
        handRoll, // rest of the twist -> total roll turns the palm toward the screen
        -forearmRoll, // keep the hand flick in the screen plane
      );
      const sg = isR ? -1 : 1;
      // thumb: while waving, drop the outward idle spread and tuck it in toward the fingers
      const spread = 1 - wv; // idle outward spread fades out during the wave
      swing(
        "thumb.01." + side,
        0.15 * live * Math.sin(ph - 2.2) * (0.5 + Ak) +
          0.04 * wv * Math.sin(wphase + 1.0) +
          THUMB_TUCK_X * wv,
        sg *
          (0.22 * Ak * Math.sin(ph - 2.2) -
            0.15 * live * spread +
            0.08 * wv * Math.sin(wphase + 1.0) +
            THUMB_TUCK_Y * wv),
        0,
      );
      swing(
        "thumb.02." + side,
        0.25 * Ak * Math.sin(ph - 2.8) +
          0.05 * wv * Math.sin(wphase + 0.4) +
          THUMB_CURL * wv,
        sg *
          (0.25 * Ak * Math.sin(ph - 2.8) + 0.08 * wv * Math.sin(wphase + 0.4)),
        0,
      );
    }

    // legs: alternating flutter kick
    for (const [side, a0] of [
      ["R", 0],
      ["L", Math.PI],
    ] as const) {
      const a = kphase + a0;
      swing("thigh." + side, 0.9 * K * Math.sin(a), 0, 0);
      swing("shin." + side, 1.1 * K * (0.5 + 0.5 * Math.sin(a - 1.0)), 0, 0);
      swing("foot." + side, 0.6 * K * Math.sin(a - 1.8), 0, 0);
    }

    // face
    const FT = { ...FACE0, ...EXPR[m.expr] };
    const kf = 1 - Math.exp(-dt * 7);
    for (const k of FACE_KEYS) F[k] += (FT[k] - F[k]) * kf;
    const jaw = clamp(
      F.jaw + m.jawOpen + live * 0.012 * Math.sin(t * 1.3),
      -0.2,
      0.5,
    );
    swing("jaw", jaw, 0, 0);
    for (const side of ["L", "R"] as const) {
      const s = side === "L" ? 1 : -1;
      const up = F.cu + (side === "L" ? F.cuL : F.cuR) - 0.1 * jaw;
      const out = F.co + (side === "L" ? F.coL : F.coR);
      move("mouth." + side, s * out, up, F.cf);
      move("cheek." + side, s * F.ck, 0.3 * F.ck, 0.3 * F.ck);
    }
    move("lip.upper", 0, F.lip, 0.5 * F.cf);
  }

  return { update };
}
