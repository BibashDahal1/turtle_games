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

/**
 * Which elements count as "sections" the turtle moves between. The innermost matches win.
 * Use <section> inside <main>, or add data-turtle-section to any element.
 */
const SECTION_SELECTOR = "[data-turtle-section], main section";
/** a section must stay under the middle of the screen this long before the turtle changes section */
const DWELL_SECONDS = 0.3;

const smooth = (p: number, a: number, b: number) =>
  THREE.MathUtils.smoothstep(p, a, b);

interface Pose {
  still: number;
  trail: number;
  dir: 1 | -1;
  alpha: number;
}

/* ------------------------------------------------------------------ page sections */
/**
 * Finds the page's sections and says which one is under the middle of the screen.
 * The director's section 0 is the hero (not used on this page), so section i of the page is
 * director section i + 1. Scrolling down gives a bigger number (dive), scrolling up a smaller one (swim up).
 */
function createPageSections() {
  let els: HTMLElement[] = [];
  let sinceQuery = 99;
  let current = 0;
  let cand = -1;
  let candT = 0;

  const query = () => {
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    );
    els = all
      .filter((a) => !all.some((b) => b !== a && a.contains(b))) // innermost only
      .sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      );
  };

  const rect = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  };

  function update(dt: number, scrollY: number, vh: number) {
    sinceQuery += dt;
    if (sinceQuery > 0.3) {
      sinceQuery = 0;
      query(); // content streams in from the API, so look again regularly
    }

    if (els.length === 0) {
      current = 0;
    } else {
      current = Math.min(current, els.length - 1);
      const mid = scrollY + vh / 2;
      let idx = -1;
      let best = Infinity;
      for (let i = 0; i < els.length; i++) {
        const b = rect(els[i]);
        if (mid >= b.top && mid < b.bottom) {
          idx = i;
          break;
        }
        const d = Math.min(Math.abs(mid - b.top), Math.abs(mid - b.bottom));
        if (d < best) {
          best = d;
          idx = i; // in a gap between sections: the nearest one
        }
      }
      if (idx !== current) {
        if (idx === cand) candT += dt;
        else {
          cand = idx;
          candT = 0;
        }
        if (candT >= DWELL_SECONDS) {
          current = idx;
          cand = -1;
        }
      } else cand = -1;
    }

    return {
      desired: current + 1, // never 0: the turtle never goes back to the hero spot
      count: Math.max(1, els.length) + 1,
    };
  }

  /** section edges in document px, for director section `s` (1-based) */
  const bounds = (s: number) => {
    if (els.length === 0) {
      return { top: 0, bottom: document.documentElement.scrollHeight };
    }
    const el = els[Math.min(Math.max(s - 1, 0), els.length - 1)];
    return rect(el);
  };

  return { update, bounds };
}

/* ------------------------------------------------------------------ bubbles */
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

/* ------------------------------------------------------------------ world */
function World() {
  const { viewport } = useThree();
  const swimGroup = useRef<THREE.Group>(null!);
  const swim = useRef(createSwimState());
  const swimTrail = useRef<Pose>({ still: 0, trail: 0, dir: 1, alpha: 1 });
  const director = useMemo(() => createTurtleDirector(), []);
  const sections = useMemo(() => createPageSections(), []);
  const elapsed = useRef(0);
  const lastY = useRef(-1);

  const wide = viewport.width > 7;

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    elapsed.current += dt;
    const e = elapsed.current;
    const t = state.clock.elapsedTime;

    const aspect = state.size.width / state.size.height;
    const heroS = wide ? 1 : 0.7;
    const y = window.scrollY;
    lastY.current = y;

    const sec = sections.update(dt, y, state.size.height);

    const o = director.update({
      dt,
      aspect,
      desired: sec.desired,
      count: sec.count,
      mascotMix: 0, // no 2D mascot: the hero hand-off is instant
      // the "hero" spot is parked above the screen, so the first dive comes in from the top edge
      hero: { sx: 0, sy: 2.6 },
      scrollY: y,
      vh: state.size.height,
      sectionBounds: sections.bounds,
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
    sf.alpha = smooth(e, 0, 0.5);
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

export default function GameScene() {
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
