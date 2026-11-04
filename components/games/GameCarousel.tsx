"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";
import type { Game } from "@/lib/games";
import { btnSolid } from "@/components/ui/classes";
import { cssVars } from "./GameBox";
import { createGameBox } from "./three/gameBox3d";
import {
  createBlobShadow,
  createPlatform,
  PLATFORM_RADIUS,
} from "./three/platform3d";
import { createStage, frameCamera } from "./three/stage3d";
import styles from "./games3d.module.css";

/**
 * Revolving "merry-go-round" carousel of real 3D game boxes, drawn in ONE three.js canvas.
 *  - The highlighted box hovers above a platform in the centre, its neighbours stand beside it,
 *    the rest are further back and dimmer.
 *  - Drag the HIGHLIGHTED box to turn it round (front, spine, back, top, bottom). It settles back on its own.
 *  - Drag anywhere else, or use the arrows / dots / arrow keys, to spin the ring.
 *
 * CENTER_FIRST true  : tapping a side box first spins it to the centre, tapping the centred box opens it
 * CENTER_FIRST false : every box opens its page straight away
 */
const CENTER_FIRST = true;

/* ---- layout tuning (world units: 1 = one box width) ---- */
/** distance between neighbouring front boxes */
const SPACING = 1.4;
/** largest angle between two boxes on the ring (keeps small collections tidy) */
const MAX_STEP = 0.8;
/** the ring is flattened front-to-back so far boxes don't leave the canvas */
const DEPTH_SQUASH = 0.4;
/** how high the centred box floats above the platform */
const HOVER = 0.16;
const BOB_AMP = 0.025;
/** canvas height, in box widths */
const VIEW_H = 2.3;
/** height the camera looks at */
const TARGET_Y = 0.45;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (x: number) => x * x * (3 - 2 * x);
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** shortest signed distance on the ring, in the range (-n/2, n/2] */
const wrap = (d: number, n: number) => {
  const m = mod(d, n);
  return m > n / 2 ? m - n : m;
};
const rad = THREE.MathUtils.degToRad;

/** Sizes live inline so the layout never depends on a stylesheet loading. */
const CAROUSEL_VARS = cssVars({
  "--item": "clamp(110px, 24vw, 260px)",
});

export default function GameCarousel({ games }: { games: Game[] }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const api = useRef({
    goTo: (_i: number) => {},
    spin: (_k: number) => {},
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const n = games.length;
    if (!canvas || n === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stage = createStage(canvas);
    const { renderer, scene, camera } = stage;
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const platform = createPlatform(PLATFORM_RADIUS);
    scene.add(platform.group);

    const items = games.map((game, i) => {
      const box = createGameBox(game, { anisotropy: aniso });
      box.mesh.userData.index = i;
      const shadow = createBlobShadow();
      scene.add(shadow.mesh, box.root);
      return { box, shadow };
    });
    const meshes = items.map((it) => it.box.mesh);

    /* ---------- state ---------- */
    const r = {
      pos: 0, // where the ring is now (in boxes, can be fractional)
      target: 0, // where it is heading
      v: 0, // boxes per second
      S: 200, // px between neighbouring front boxes (for drag speed)
      dragging: false,
      moved: false,
      startX: 0,
      startY: 0,
      startPos: 0,
      lastX: 0,
      lastY: 0,
      lastT: 0,
      vel: 0,
    };
    /** free rotation of the highlighted box, in degrees */
    const b = { ry: 0, rx: 0, vry: 0, dragging: false, idleAt: 0 };
    activeRef.current = 0;
    setActive(0);

    const accent = new THREE.Color(games[0].accent);
    const accentTo = new THREE.Color();

    /* ---------- place everything for the current ring position ---------- */
    const layout = (t: number) => {
      const step = Math.min((Math.PI * 2) / n, MAX_STEP);
      const R = SPACING / Math.sin(step);
      const bob = reduce ? 0 : Math.sin(t * 1.6);

      items.forEach(({ box, shadow }, i) => {
        const d = wrap(i - r.pos, n); // 0 = centre, +1 = one box to the right
        const th = d * step;
        const sx = Math.sin(th);
        const depth = (Math.cos(th) + 1) / 2; // 1 = front, 0 = very back
        const near = ease(1 - clamp(Math.abs(d), 0, 1)); // 1 only at the centre

        const x = sx * R;
        const z = (Math.cos(th) - 1) * R * DEPTH_SQUASH;
        const s = 1 + 0.1 * near;

        box.root.position.set(x, near * (HOVER + bob * BOB_AMP), z);
        box.root.rotation.y = clamp(-sx * 0.9, -0.8, 0.8) - 0.2 * near;
        box.root.scale.setScalar(s);
        box.setBrightness(0.45 + 0.55 * depth);

        // free rotation only applies to the centred box (fades out as the ring turns)
        box.spin.rotation.set(rad(b.rx * near), rad(b.ry * near), 0);

        shadow.place(
          x,
          z,
          box.size.w * 1.3 * s,
          (box.size.d + 0.5) * s,
          0.55 * (0.4 + 0.6 * depth) * (1 - 0.3 * near - 0.1 * near * bob),
        );
      });

      const idx = mod(Math.round(r.pos), n);
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const resize = () => {
      const { h } = stage.resize();
      if (!h) return;
      frameCamera(camera, VIEW_H, TARGET_Y);
      r.S = (h / VIEW_H) * SPACING;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ---------- animation loop ---------- */
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      // ring: a critically damped spring, so it eases in, glides and eases out
      if (!r.dragging) {
        const k = reduce ? 220 : 42;
        const c = 2 * Math.sqrt(k);
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let j = 0; j < steps; j++) {
          r.v += (k * (r.target - r.pos) - c * r.v) * h;
          r.pos += r.v * h;
        }
        if (Math.abs(r.target - r.pos) < 0.0005 && Math.abs(r.v) < 0.003) {
          r.pos = r.target;
          r.v = 0;
        }
      }
      const ringMoving =
        Math.abs(r.target - r.pos) > 0.0005 || Math.abs(r.v) > 0.003;

      // highlighted box: coast after a throw, then ease back to facing front
      if (!b.dragging) {
        b.ry += b.vry * dt;
        b.vry *= Math.exp(-dt * 3);
        if (ringMoving || now - b.idleAt > 1500) {
          const home = Math.round(b.ry / 360) * 360;
          const k = reduce ? 1 : 1 - Math.exp(-dt * 4);
          b.ry += (home - b.ry) * k;
          b.rx += (0 - b.rx) * k;
          b.vry *= Math.exp(-dt * 6);
        }
        const home = Math.round(b.ry / 360) * 360;
        const busy =
          Math.abs(b.vry) > 0.5 ||
          Math.abs(b.ry - home) > 0.05 ||
          Math.abs(b.rx) > 0.05;
        if (!busy) {
          b.ry = 0;
          b.rx = 0;
          b.vry = 0;
        }
      }

      // platform accent follows the highlighted game
      accentTo.set(games[activeRef.current].accent);
      accent.lerp(accentTo, 1 - Math.exp(-dt * 6));
      platform.setAccent(accent);
      platform.update(reduce ? 0 : now / 1000);

      layout(now / 1000);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // do not burn GPU while the carousel is scrolled out of view
    const io = new IntersectionObserver(([e]) =>
      e.isIntersecting ? start() : stop(),
    );
    io.observe(canvas);
    start();

    /* ---------- navigation ---------- */
    const goTo = (i: number) => {
      const cur = Math.round(r.target);
      r.target = cur + wrap(i - cur, n);
    };
    const spin = (k: number) => {
      r.target = Math.round(r.target) + k;
    };
    api.current = { goTo, spin };

    /* ---------- picking + drag / swipe (mouse, touch, pen) ---------- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    /** index of the box under the pointer, or -1 */
    const pick = (cx: number, cy: number) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      return hit ? (hit.object.userData.index as number) : -1;
    };

    const activate = (i: number) => {
      if (CENTER_FIRST && i !== activeRef.current) goTo(i);
      else router.push(`/games/${games[i].slug}`);
    };

    let drag: { id: number; box: boolean } | null = null;

    const onDown = (e: PointerEvent) => {
      if (drag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // grabbing the highlighted box turns the box; grabbing anything else spins the ring
      const box =
        pick(e.clientX, e.clientY) === activeRef.current &&
        Math.abs(r.target - r.pos) < 0.05;
      drag = { id: e.pointerId, box };
      canvas.setPointerCapture(e.pointerId);

      r.moved = false;
      r.startX = r.lastX = e.clientX;
      r.startY = r.lastY = e.clientY;
      r.lastT = performance.now();
      r.vel = 0;
      if (box) {
        b.dragging = true;
        b.vry = 0;
      } else {
        r.dragging = true;
        r.startPos = r.pos;
        r.v = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      if (!r.moved && Math.hypot(dx, dy) > 6) r.moved = true;
      if (!r.moved) return;
      const now = performance.now();
      const dtMs = now - r.lastT;

      if (drag.box) {
        const ddx = e.clientX - r.lastX;
        const ddy = e.clientY - r.lastY;
        b.ry += ddx * 0.6;
        b.rx = clamp(b.rx + ddy * 0.4, -35, 35);
        if (dtMs > 0) b.vry = 0.8 * b.vry + 0.2 * ((ddx * 0.6) / (dtMs / 1000));
      } else {
        r.pos = r.startPos - dx / r.S;
        r.target = r.pos;
        if (dtMs > 0) {
          const inst = -(e.clientX - r.lastX) / r.S / (dtMs / 1000);
          r.vel = 0.8 * r.vel + 0.2 * inst;
        }
      }
      r.lastX = e.clientX;
      r.lastY = e.clientY;
      r.lastT = now;
    };

    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasBox = drag.box;
      drag = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);

      if (wasBox) {
        b.dragging = false;
        b.vry = clamp(b.vry, -720, 720);
        b.idleAt = performance.now();
      } else {
        r.dragging = false;
        r.target = Math.round(r.pos + clamp(r.vel * 0.15, -1.5, 1.5));
        r.v = clamp(r.vel, -6, 6);
      }
      // a tap (no drag) on a box selects / opens it
      if (!r.moved && e.type === "pointerup") {
        const i = pick(e.clientX, e.clientY);
        if (i >= 0) activate(i);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      items.forEach(({ box, shadow }) => {
        scene.remove(box.root, shadow.mesh);
        box.dispose();
        shadow.dispose();
      });
      scene.remove(platform.group);
      platform.dispose();
      stage.dispose();
    };
  }, [games, router]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") api.current.spin(1);
    else if (e.key === "ArrowLeft") api.current.spin(-1);
    else if (e.key === "Home") api.current.goTo(0);
    else if (e.key === "End") api.current.goTo(games.length - 1);
    else return;
    e.preventDefault();
  };

  const g = games[active];
  if (!g) return null;

  return (
    <div
      className="relative w-full min-w-0 overflow-hidden"
      style={CAROUSEL_VARS}
      role="region"
      aria-roledescription="carousel"
      aria-label="Our games"
      onKeyDown={onKeyDown}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Previous game"
          onClick={() => api.current.spin(-1)}
          className="absolute top-1/2 left-0 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-accent/30 bg-panel/60 backdrop-blur-md transition hover:bg-accent/15"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next game"
          onClick={() => api.current.spin(1)}
          className="absolute top-1/2 right-0 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-accent/30 bg-panel/60 backdrop-blur-md transition hover:bg-accent/15"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {/* the whole ring (boxes, platform, shadows) is drawn on this one canvas */}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${g.name} game box. Drag to turn it, drag the sides to spin the carousel.`}
          className="block w-full cursor-grab select-none active:cursor-grabbing"
          style={{
            height: `calc(var(--item) * ${VIEW_H})`,
            touchAction: "pan-y",
          }}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>

      {/* keyboard / screen-reader access to every game (the canvas itself is not focusable) */}
      <ul className="sr-only">
        {games.map((game, i) => (
          <li key={`${game.slug}-${i}`}>
            <Link
              href={`/games/${game.slug}`}
              aria-current={i === active}
              onFocus={() => i !== activeRef.current && api.current.goTo(i)}
            >
              {game.name} - open game page
            </Link>
          </li>
        ))}
      </ul>

      <p className="-mt-2 mb-3 text-center text-xs text-muted">
        Drag the centre box to turn it · drag the sides or use the arrows to
        spin the ring
      </p>

      {/* details of the highlighted (centred) game */}
      <div
        className="mt-1 flex flex-col items-center gap-4 text-center"
        aria-live="polite"
      >
        <div
          key={g.slug + active}
          className={`${styles.fadeUp} flex flex-col items-center gap-2`}
        >
          <h3 className="text-xl font-bold">{g.name}</h3>
          <p className="max-w-[52ch] text-sm text-ink/85">{g.tagline}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <ul className="flex gap-6 text-xs text-muted">
              <li className="flex flex-col">
                <b className="text-base text-ink">{g.players}</b>
                <span>Players</span>
              </li>
              <li className="flex flex-col">
                <b className="text-base text-ink">{g.minutes}</b>
                <span>Min</span>
              </li>
              <li className="flex flex-col">
                <b className="text-base text-ink">{g.age}</b>
                <span>Ages</span>
              </li>
            </ul>
            <Link
              href={`/games/${g.slug}`}
              className={`${btnSolid} !px-6 !py-2.5`}
            >
              Open {g.name}
            </Link>
          </div>
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Choose a game">
          {games.map((game, i) => (
            <button
              key={`${game.slug}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={game.name}
              onClick={() => api.current.goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === active ? "w-6 bg-accent" : "w-2 bg-ink/30 hover:bg-ink/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
