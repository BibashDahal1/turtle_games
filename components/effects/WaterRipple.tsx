"use client";

import { useEffect, useRef } from "react";
import { startWaterBackdrop } from "@/lib/waterRippleEngine";

export interface WaterRippleProps {
  /** Extra Tailwind classes for the canvas (e.g. a mask-image fade at the bottom). */
  className?: string;
  /**
   * "parent": fills its nearest `relative` parent and only that area reacts to the pointer.
   * "window": `fixed` over the whole viewport; the whole page reacts.
   */
  scope?: "parent" | "window";
  /** How strongly the ripples bend the background (0.2 soft to 1.2 strong). */
  intensity?: number;
  /** Life of a ripple in ms. Longer = slower, calmer fade. */
  lifetime?: number;
  /** Pointer travel (px) between ripples while moving. Larger = fewer ripples. */
  spawnDistance?: number;
  /** Render resolution relative to the screen (0.4 to 1). Lower is cheaper and softer. */
  quality?: number;
  /** Optional background image, e.g. "/hero-underwater.jpg". Leave out for the built-in underwater scene. */
  src?: string;
  /** Switch the effect off without removing the component. */
  disabled?: boolean;
}

/**
 * Underwater backdrop with soft refraction ripples that follow the cursor.
 * The water draws its own background (built-in scene or your `src` image), so it
 * IS the background of the container; place it first and put content above it.
 *
 *   <section className="relative"> <WaterRipple /> ...content (relative z-10)... </section>
 *
 * Delete the line to remove it. No WebGL? It renders nothing and the page's own background shows.
 */
export default function WaterRipple({
  className = "",
  scope = "parent",
  intensity = 0.6,
  lifetime = 3600,
  spawnDistance = 30,
  quality = 0.7,
  src,
  disabled = false,
}: WaterRippleProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || disabled) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return startWaterBackdrop(canvas, {
      intensity: calm ? intensity * 0.6 : intensity,
      lifetime: calm ? lifetime * 0.7 : lifetime,
      spawnDistance: calm ? spawnDistance * 2 : spawnDistance,
      quality,
      src,
      calm,
    });
  }, [intensity, lifetime, spawnDistance, quality, src, disabled]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none inset-0 z-[1] h-full w-full ${scope === "window" ? "fixed" : "absolute"} ${className}`}
    />
  );
}
