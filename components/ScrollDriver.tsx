"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scroll } from "@/lib/scrollState";

/** Feeds page scroll progress to the 3D scene, and runs the DOM reveals. */
export default function ScrollDriver() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let onDone: (() => void) | undefined;

    const ctx = gsap.context(() => {
      // 0 -> 1 across the whole page; the R3F scene damps toward this.
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          scroll.target = self.progress;
        },
      });

      // Section reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 48,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // Hero intro waits for the loader to finish
      const hero = gsap.utils.toArray<HTMLElement>("[data-hero]");
      gsap.set(hero, { y: 40, opacity: 0 });
      const play = () =>
        gsap.to(hero, {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
        });
      if (document.getElementById("turtle-loader")) {
        onDone = play;
        window.addEventListener("turtleloader:done", play, { once: true });
      } else {
        play();
      }
    });

    return () => {
      if (onDone) window.removeEventListener("turtleloader:done", onDone);
      ctx.revert();
    };
  }, []);

  return null;
}
