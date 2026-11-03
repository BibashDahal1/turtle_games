"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Sparkles, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { scroll } from "@/lib/scrollState";
import { MASCOT_FRAG, MASCOT_SIZE, MASCOT_VERT } from "@/lib/mascotShader";
import { createTurtleDirector } from "@/lib/turtleDirector";
import { createSectionTracker } from "@/lib/sectionTracker";
import TurtleSwimmer, {
  createSwimState,
} from "@/components/scene/TurtleSwimmer";

/* Tune these to match your page height / section positions. */
const DEPTH = 14; // how far the camera travels down the world over the full scroll
const STAGE_Y = -4.2; // "Ocean Legends" showcase  (~30% scroll)
const FAN_Y = -8.2; // "About" card fan          (~58% scroll)
const MASCOT_H = 4.3; // mascot height in world units
const CAM_Z = 6.5; // camera distance
const HALF_FOV = Math.tan(THREE.MathUtils.degToRad(22.5));
/** Fine-tune so the 3D turtle sits exactly on the 2D artwork at the swap (units: world / scale factor). */
const HERO_FIT = { x: 0, y: 0, s: 0 };

const smooth = (p: number, a: number, b: number) =>
  THREE.MathUtils.smoothstep(p, a, b);

/** Shared between the scroll logic (writer) and the mascot / bubble trail (readers). */
interface Pose {
  still: number; // 0 = waving, 1 = holding still while diving
  trail: number; // 0..1 bubble trail strength
  dir: 1 | -1; // 1 = diving down (bubbles rise behind), -1 = swimming up
  alpha: number; // 1 = visible, 0 = faded out
}

/* ---------- waving diver turtle (exact artwork, skinned in the vertex shader) — UNCHANGED ---------- */
function Mascot({ pose }: { pose: MutableRefObject<Pose> }) {
  const tex = useTexture("/turtle/turtle-mascot.png");
  const width = (MASCOT_H * MASCOT_SIZE[0]) / MASCOT_SIZE[1];

  const material = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uSize: { value: new THREE.Vector2(MASCOT_SIZE[0], MASCOT_SIZE[1]) },
        uWorldPerPx: { value: MASCOT_H / MASCOT_SIZE[1] },
        uA: { value: 0 },
        uH: { value: 0 },
        uAlpha: { value: 1 },
      },
      vertexShader: MASCOT_VERT,
      fragmentShader: MASCOT_FRAG.replace(
        "//__COLORSPACE__",
        "#include <colorspace_fragment>",
      ),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [tex]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    material.uniforms.uAlpha.value = pose.current.alpha;
    const wave = 1 - pose.current.still; // waving fades out while diving
    const burst = 0.65 + 0.35 * Math.sin(t * 0.9); // the wave swells and eases
    material.uniforms.uH.value = Math.sin(t * 5.2) * 0.3 * burst * wave; // hand waves from the wrist
    material.uniforms.uA.value =
      Math.sin(t * 2.6 + 0.8) * 0.045 * wave - 0.06 * pose.current.still; // arm sways from the shoulder
  });

  return (
    <mesh material={material}>
      <planeGeometry args={[width, MASCOT_H, 90, 120]} />
    </mesh>
  );
}

/* ---------- bubbles that stream behind the turtle while it dives ---------- */
function Trail({ pose }: { pose: MutableRefObject<Pose> }) {
  const group = useRef<THREE.Group>(null!);
  const seeds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: (((i * 0.618) % 1) - 0.5) * 1.8,
        speed: 0.35 + ((i * 0.37) % 1) * 0.5,
        phase: (i * 0.173) % 1,
        size: 0.045 + ((i * 0.29) % 1) * 0.07,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const amt = pose.current.trail;
    const dir = pose.current.dir;
    group.current.visible = amt > 0.02;
    group.current.children.forEach((child, i) => {
      const m = child as THREE.Mesh;
      const sd = seeds[i];
      const k = (t * sd.speed + sd.phase) % 1;
      m.position.set(sd.x * (0.5 + k * 0.5), dir * (-0.2 + k * 2.8), 0.15);
      m.scale.setScalar(sd.size * (0.7 + k * 0.8));
      (m.material as THREE.MeshBasicMaterial).opacity = amt * (1 - k) * 0.75;
    });
  });

  return (
    <group ref={group} visible={false}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial transparent depthWrite={false} color="#fff3c4" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- placeholder card (swap faces for useTexture('/cards/x.png')) ---------- */
function Card({
  color,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[1.5, 2.1, 0.04]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#2a1708" metalness={0.4} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.12, 0.03]}>
        <planeGeometry args={[1.28, 1.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, -0.7, 0.03]}>
        <planeGeometry args={[1.28, 0.45]} />
        <meshStandardMaterial color="#4b2e15" />
      </mesh>
    </group>
  );
}

function World() {
  const { viewport, camera } = useThree();
  const mascot = useRef<THREE.Group>(null!);
  const tilt = useRef<THREE.Group>(null!);
  const pose = useRef<Pose>({ still: 0, trail: 0, dir: 1, alpha: 1 });
  const swimGroup = useRef<THREE.Group>(null!);
  const swim = useRef(createSwimState());
  const swimTrail = useRef<Pose>({ still: 0, trail: 0, dir: 1, alpha: 1 });
  const director = useMemo(() => createTurtleDirector(), []);
  const tracker = useMemo(() => createSectionTracker(), []);
  const mix = useRef(1); // 1 = 2D mascot showing, 0 = 3D turtle showing (timed cross-fade)
  const scrollFx = useRef({ lastY: -1, speed: 0, s: 0 });
  const stage = useRef<THREE.Group>(null!);
  const hero = useRef<THREE.Group>(null!);
  const fan = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const pointer = useRef({ x: 0, y: 0 });

  const wide = viewport.width > 7;
  const sideX = wide ? viewport.width * 0.24 : 0;
  const stageX = wide ? viewport.width * 0.1 : 0;

  // the 3D canvas does not receive pointer events, so track the cursor on the window
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    scroll.current = THREE.MathUtils.damp(scroll.current, scroll.target, 4, dt);
    const p = scroll.current;
    const t = state.clock.elapsedTime;

    // camera dives down the world as you scroll
    camera.position.y = -p * DEPTH;
    camera.position.x = Math.sin(p * Math.PI * 2) * 0.6;
    camera.lookAt(0, camera.position.y, 0);

    // ---- mascot: lives in the hero, then follows the page as a small diver ----
    const fx = scrollFx.current;
    const y = window.scrollY;
    if (fx.lastY < 0) fx.lastY = y;
    const raw = (y - fx.lastY) / Math.max(Math.min(dt, 0.1), 1 / 240);
    fx.lastY = y;
    fx.speed = THREE.MathUtils.damp(fx.speed, raw, 10, dt);
    const v = Math.sign(fx.speed) * Math.max(0, Math.abs(fx.speed) - 90);
    const target = THREE.MathUtils.clamp(v / 1100, -1, 1);
    fx.s = THREE.MathUtils.damp(
      fx.s,
      target,
      Math.abs(target) > Math.abs(fx.s) ? 7 : 2,
      dt,
    );
    const mag = Math.abs(fx.s);
    pose.current.still = smooth(mag, 0.05, 0.4);
    pose.current.trail = smooth(mag, 0.08, 0.5);
    if (mag > 0.05) pose.current.dir = fx.s > 0 ? 1 : -1;

    // ---- where the 2D mascot stands (screen units, at scrollY = 0) — the 3D turtle starts / ends exactly here ----
    const aspect = state.size.width / state.size.height;
    const heroS = wide ? 1 : 0.7;
    const heroX = wide
      ? (state.size.width / state.size.height) * HALF_FOV * CAM_Z * 0.48 + 0.2
      : 0;
    const heroY = wide ? -0.15 : -1.1;
    const halfH0 = HALF_FOV * CAM_Z;
    const halfW0 = halfH0 * aspect;
    const heroSx = heroX / halfW0;
    const heroSy = heroY / halfH0;
    // the hero spot is part of the PAGE: scrolling carries it up (1 unit = half a screen height)
    const su = y / (state.size.height / 2);

    // ---- the turtle's brain: scroll only says WHICH SECTION we are in, it does not scrub the motion ----
    const sec = tracker.update(dt);
    const o = director.update({
      dt: Math.min(dt, 0.1),
      aspect,
      desired: sec.desired,
      count: sec.count,
      mascotMix: mix.current,
      hero: { sx: heroSx, sy: heroSy },
      scrollY: y,
      vh: state.size.height,
      sectionBounds: tracker.bounds,
    });

    // ---- 2D <-> 3D cross-fade: timed (0.7 s), same spot, same size, same waving pose ----
    const mStep = dt / 0.7;
    mix.current += THREE.MathUtils.clamp(
      (o.atHero ? 1 : 0) - mix.current,
      -mStep,
      mStep,
    );
    const h = mix.current;
    const a2d = smooth(h, 0, 1);
    const a3d = smooth(1.7 * (1 - h), 0, 1); // overlaps a little so there is never a see-through dip

    // ---- 1) the waving 2D mascot (artwork unchanged) ----
    pose.current.alpha = a2d;
    pose.current.trail *= h;
    const diveY = -fx.s * 1.0;

    const g = mascot.current;
    g.visible = h > 0.005;
    g.position.set(
      camera.position.x + heroX,
      camera.position.y +
        (heroSy + su) * halfH0 + // stays where it stands in the hero while the page scrolls past
        Math.sin(t * 0.9) * 0.1 +
        diveY,
      0,
    );
    g.scale.setScalar(heroS * (1 - mag * 0.06));

    const tl = tilt.current;
    tl.rotation.z = -fx.s * 0.5 + Math.sin(t * 0.7) * 0.025;
    tl.rotation.y = THREE.MathUtils.damp(
      tl.rotation.y,
      pointer.current.x * 0.3 * (1 - mag),
      3,
      dt,
    );
    tl.rotation.x = THREE.MathUtils.damp(
      tl.rotation.x,
      pointer.current.y * 0.1 + fx.s * 0.6,
      5,
      dt,
    );

    // ---- 2) the rigged 3D turtle ----
    const sg = swimGroup.current;

    // perspective-correct screen -> world mapping at the turtle's depth
    const halfH = HALF_FOV * (CAM_Z - o.z);
    const halfW = halfH * aspect;
    const hover = 1 - o.moveAmt;
    const k2d = h; // 1 while the 2D mascot is showing -> the 3D turtle copies its exact bob
    const swimScale = o.scale * heroS * (1 + HERO_FIT.s * k2d);

    sg.position.set(
      camera.position.x +
        o.sx * halfW +
        Math.sin(t * 0.55) * 0.12 * hover * (1 - k2d) +
        HERO_FIT.x * k2d,
      camera.position.y +
        o.sy * halfH +
        o.bumpY +
        Math.sin(t * 0.8) * 0.1 * hover * (1 - k2d) +
        Math.sin(t * 0.9) * 0.1 * k2d + // same bob as the 2D mascot
        Math.sin(t * 3.2) * 0.03 * o.moveAmt +
        HERO_FIT.y * k2d,
      o.z,
    );
    sg.scale.setScalar(swimScale);

    const depthN = smooth(-o.z, 0, 6);
    const sf = swim.current;
    sf.quat.copy(o.quat);
    sf.motion = o.motion;
    sf.alpha = a3d;
    sf.depth = depthN;
    sf.fog = depthN * 0.4; // the deeper it is, the more it blends into the water
    swimTrail.current.trail = o.trail * a3d;

    // showcase: hero card spins with scroll, platform ring turns
    hero.current.rotation.y = Math.sin(t * 0.5) * 0.25 + p * 6;
    hero.current.position.y = Math.sin(t * 1.2) * 0.06;
    ring.current.rotation.z = t * 0.4;
    stage.current.position.x = stageX;

    // about: cards fan open as the section scrolls in
    const open = smooth(p, 0.42, 0.6);
    fan.current.position.x = sideX;
    fan.current.children.forEach((c, i) => {
      const k = i - 1; // -1, 0, 1
      c.rotation.z = -k * 0.32 * open;
      c.position.x = k * 1.35 * open;
      c.position.y = Math.abs(k) * -0.18 * open + Math.sin(t + i) * 0.05;
    });
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} color="#fff1cf" />
      <pointLight position={[-3, 2, 3]} intensity={16} color="#ffb347" />

      <group ref={mascot}>
        <group ref={tilt}>
          <Suspense fallback={null}>
            <Mascot pose={pose} />
          </Suspense>
        </group>
        <Trail pose={pose} />
      </group>

      <group ref={swimGroup}>
        <Suspense fallback={null}>
          <TurtleSwimmer swim={swim} />
        </Suspense>
        <group position={[0, -0.8, 1.4]}>
          <Trail pose={swimTrail} />
        </group>
      </group>

      <group ref={stage} position={[0, STAGE_Y, 0]}>
        <group ref={hero}>
          <Card color="#f89f0c" scale={1.25} />
        </group>
        <Card
          color="#75582b"
          position={[-1.9, 0, -0.8]}
          rotation={[0, 0.5, 0.06]}
          scale={1.05}
        />
        <Card
          color="#75582b"
          position={[1.9, 0, -0.8]}
          rotation={[0, -0.5, -0.06]}
          scale={1.05}
        />
        <mesh position={[0, -1.9, 0]}>
          <cylinderGeometry args={[2.2, 2.4, 0.25, 48]} />
          <meshStandardMaterial
            color="#3a2410"
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
        <mesh
          ref={ring}
          position={[0, -1.76, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[2.25, 0.03, 8, 80]} />
          <meshBasicMaterial color="#fbd61e" />
        </mesh>
      </group>

      <group ref={fan} position={[0, FAN_Y, 0]}>
        <Card color="#af5115" />
        <Card color="#f89f0c" scale={1.15} position={[0, 0, 0.3]} />
        <Card color="#23805a" />
      </group>

      <Sparkles
        count={140}
        scale={[16, 34, 8]}
        position={[0, -9, 0]}
        size={3}
        speed={0.25}
        color="#fbd61e"
      />
    </>
  );
}

export default function Scene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2]" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
      >
        <World />
      </Canvas>
    </div>
  );
}
