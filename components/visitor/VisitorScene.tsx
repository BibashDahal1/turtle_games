"use client";

import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { createTurtleDirector } from "@/lib/turtleDirector";
import TurtleSwimmer, {
  createSwimState,
} from "@/components/scene/TurtleSwimmer";

const CAM_Z = 6.5;
const HALF_FOV = Math.tan(THREE.MathUtils.degToRad(22.5));

/** how long the turtle waves at the hero spot before it dives in and starts its moves */
const WAVE_SECONDS = 4;

const smooth = (p: number, a: number, b: number) =>
  THREE.MathUtils.smoothstep(p, a, b);

interface Pose {
  still: number;
  trail: number;
  dir: 1 | -1;
  alpha: number;
}

/* ---------- bubbles that stream behind the turtle (same as Scene.tsx) ---------- */
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

function World() {
  const { viewport } = useThree();
  const swimGroup = useRef<THREE.Group>(null!);
  const swim = useRef(createSwimState());
  const swimTrail = useRef<Pose>({ still: 0, trail: 0, dir: 1, alpha: 1 });
  const director = useMemo(() => createTurtleDirector(), []);
  const elapsed = useRef(0);

  const wide = viewport.width > 7;

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    elapsed.current += dt;
    const e = elapsed.current;
    const t = state.clock.elapsedTime;

    const aspect = state.size.width / state.size.height;
    const heroS = wide ? 1 : 0.7;

    // where the turtle stands while waving (same spot as the home page hero)
    const halfH0 = HALF_FOV * CAM_Z;
    const halfW0 = halfH0 * aspect;
    const heroX = wide ? aspect * HALF_FOV * CAM_Z * 0.48 + 0.2 : 0;
    const heroY = wide ? -0.15 : -1.1;

    const o = director.update({
      dt,
      aspect,
      // 0 = stay in hero mode (waving). 1 = leave the hero: dive, then run the 41 moves forever
      desired: e < WAVE_SECONDS ? 0 : 1,
      count: 2,
      mascotMix: 0, // no 2D mascot here, so the hand-off is instant
      hero: { sx: heroX / halfW0, sy: heroY / halfH0 },
      scrollY: 0,
      vh: state.size.height,
      // the page has no scrolling: its one "section" is exactly the visible screen,
      // so the turtle's roaming area is the whole screen and it never goes off-screen
      sectionBounds: () => ({ top: 0, bottom: state.size.height }),
    });

    // perspective-correct screen -> world mapping at the turtle's depth (same as Scene.tsx)
    const halfH = HALF_FOV * (CAM_Z - o.z);
    const halfW = halfH * aspect;
    const hover = 1 - o.moveAmt;

    const sg = swimGroup.current;
    sg.position.set(
      o.sx * halfW + Math.sin(t * 0.55) * 0.12 * hover,
      o.sy * halfH +
        o.bumpY +
        Math.sin(t * 0.8) * 0.1 * hover +
        Math.sin(t * 3.2) * 0.03 * o.moveAmt,
      o.z,
    );
    sg.scale.setScalar(o.scale * heroS);

    const depthN = smooth(-o.z, 0, 6);
    const sf = swim.current;
    sf.quat.copy(o.quat);
    sf.motion = o.motion;
    sf.alpha = smooth(e, 0, 0.8); // fade in on load, never fades out
    sf.depth = depthN;
    sf.fog = depthN * 0.4;
    swimTrail.current.trail = o.trail * sf.alpha;
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} color="#fff1cf" />
      <pointLight position={[-3, 2, 3]} intensity={16} color="#ffb347" />

      <group ref={swimGroup}>
        <Suspense fallback={null}>
          <TurtleSwimmer swim={swim} />
        </Suspense>
        <group position={[0, -0.8, 1.4]}>
          <Trail pose={swimTrail} />
        </group>
      </group>

      <Sparkles
        count={90}
        scale={[16, 12, 8]}
        position={[0, 0, 0]}
        size={3}
        speed={0.25}
        color="#fbd61e"
      />
    </>
  );
}

export default function VisitorScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2]" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, CAM_Z], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
      >
        <World />
      </Canvas>
    </div>
  );
}
