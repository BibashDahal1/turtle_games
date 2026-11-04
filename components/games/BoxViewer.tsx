"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Game } from "@/lib/games";
import { cssVars } from "./GameBox";
import { createGameBox } from "./three/gameBox3d";
import {
  createBlobShadow,
  createPlatform,
  PLATFORM_RADIUS,
} from "./three/platform3d";
import { createStage, frameCamera } from "./three/stage3d";

const HOME_RX = 0; // degrees
const HOME_RY = -24;
const HOVER = 0.16;
const BOB_AMP = 0.025;
/** canvas height in box widths, and the height the camera looks at */
const VIEW_H = 2.05;
const TARGET_Y = 0.42;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const rad = THREE.MathUtils.degToRad;

/**
 * The game's real 3D box hovering over a platform (three.js).
 * Drag (mouse, touch or pen) to turn it to any side: front, back, spines, top, bottom.
 * After a throw it coasts, and when left alone it slowly turns by itself.
 */
export default function BoxViewer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stage = createStage(canvas);
    const { renderer, scene, camera } = stage;

    const platform = createPlatform(PLATFORM_RADIUS);
    platform.setAccent(new THREE.Color(game.accent));
    scene.add(platform.group);

    const box = createGameBox(game, {
      anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    });
    const shadow = createBlobShadow();
    scene.add(shadow.mesh, box.root);

    const s = {
      ry: HOME_RY, // degrees
      rx: HOME_RX,
      vry: 0, // deg per second
      dragging: false,
      lastX: 0,
      lastY: 0,
      lastT: 0,
      idleAt: performance.now(),
    };

    const resize = () => {
      const { h } = stage.resize();
      if (h) frameCamera(camera, VIEW_H, TARGET_Y);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      if (!s.dragging) {
        s.ry += s.vry * dt;
        s.vry *= Math.exp(-dt * 2.5);
        if (now - s.idleAt > 1800) {
          if (!reduce) s.ry += 14 * dt; // slow turntable spin
          s.rx += (HOME_RX - s.rx) * (1 - Math.exp(-dt * 3));
        }
      }

      const bob = reduce ? 0 : Math.sin((now / 1000) * 1.6);
      platform.update(reduce ? 0 : now / 1000);
      box.root.position.y = HOVER + bob * BOB_AMP;
      box.root.scale.setScalar(1.05);
      box.spin.rotation.set(rad(s.rx), rad(s.ry), 0);
      shadow.place(
        0,
        0,
        box.size.w * 1.4,
        box.size.d + 0.7,
        0.5 * (1 - 0.1 * bob),
      );

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
    const io = new IntersectionObserver(([e]) =>
      e.isIntersecting ? start() : stop(),
    );
    io.observe(canvas);
    start();

    /* ---- drag to turn ---- */
    let pid = -1;
    const onDown = (e: PointerEvent) => {
      if (pid !== -1) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pid = e.pointerId;
      canvas.setPointerCapture(pid);
      s.dragging = true;
      s.vry = 0;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid || !s.dragging) return;
      const now = performance.now();
      const dtMs = now - s.lastT;
      const ddx = e.clientX - s.lastX;
      const ddy = e.clientY - s.lastY;
      s.ry += ddx * 0.6;
      s.rx = clamp(s.rx + ddy * 0.4, -50, 50);
      if (dtMs > 0) s.vry = 0.8 * s.vry + 0.2 * ((ddx * 0.6) / (dtMs / 1000));
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      if (canvas.hasPointerCapture(pid)) canvas.releasePointerCapture(pid);
      pid = -1;
      s.dragging = false;
      s.vry = clamp(s.vry, -900, 900);
      s.idleAt = performance.now();
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
      scene.remove(box.root, shadow.mesh, platform.group);
      box.dispose();
      shadow.dispose();
      platform.dispose();
      stage.dispose();
    };
  }, [game]);

  return (
    <div className="flex flex-col items-center md:flex-1">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${game.name} box. Drag to rotate.`}
        className="block w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{
          ...cssVars({ "--item": "min(72vw, 340px)" }),
          height: `calc(var(--item) * ${VIEW_H})`,
        }}
        onDragStart={(e) => e.preventDefault()}
      />
      <p className="mt-1 text-xs text-muted">Drag to turn the box</p>
    </div>
  );
}
