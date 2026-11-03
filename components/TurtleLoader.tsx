"use client";

import { useEffect, useRef, useState } from "react";
import { startTurtleLoader } from "@/lib/turtleLoaderEngine";

const SPARKS = [
  { left: "0%", top: "4%", size: 34, delay: "0.4s" },
  { left: "93%", top: "12%", size: 26, delay: "1.1s" },
  { left: "88%", top: "88%", size: 30, delay: "0.8s" },
  { left: "3%", top: "84%", size: 22, delay: "1.5s" },
  { left: "48%", top: "-6%", size: 20, delay: "1.9s" },
];

export default function TurtleLoader() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!loaderRef.current || !canvasRef.current) return;
    return startTurtleLoader(loaderRef.current, canvasRef.current, () =>
      setGone(true),
    );
  }, []);

  if (gone) return null;

  return (
    <div
      id="turtle-loader"
      ref={loaderRef}
      role="status"
      aria-label="Loading Turtle Games"
      // white in light mode, pure black in dark mode. The engine adds `idle` / `done` classes.
      className="group fixed inset-0 z-[9999] flex touch-none flex-col items-center justify-center overscroll-none bg-white px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-[opacity,visibility] duration-[600ms] ease-out dark:bg-black [&.done]:pointer-events-none [&.done]:invisible [&.done]:opacity-0"
    >
      <span className="sr-only">Loading…</span>

      <div className="relative w-[min(88vw,660px,calc(58vh*1.3356))]">
        <canvas
          id="turtle-art"
          ref={canvasRef}
          aria-hidden="true"
          className="block aspect-[1584/1186] w-full will-change-transform group-[.idle]:motion-safe:animate-bob"
        />
        {SPARKS.map((s, i) => (
          <i
            key={i}
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              animationDelay: s.delay,
            }}
            className="pointer-events-none absolute aspect-square bg-[#ffc933] opacity-0 [clip-path:polygon(50%_0,61%_39%,100%_50%,61%_61%,50%_100%,39%_61%,0_50%,39%_39%)] motion-reduce:hidden group-[.idle]:motion-safe:animate-twinkle"
          />
        ))}
      </div>

      <div className="mx-auto mt-4 h-[18px] w-[62%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(60,30,5,0.28),transparent)] opacity-90 group-[.idle]:motion-safe:animate-breathe dark:bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent)]" />
    </div>
  );
}
