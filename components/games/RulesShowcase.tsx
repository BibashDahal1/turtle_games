"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Fredoka, Lilita_One } from "next/font/google";
import type { Game, GameRule } from "@/lib/games";
import { eyebrow, grad, sec } from "@/components/ui/classes";

const display = Lilita_One({ subsets: ["latin"], weight: "400" });
const body = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Rule = GameRule;

/* Cartoon-map palette (the map is a physical object, so these are fixed
   colours rather than theme tokens). */
const INK = "#3b2a1a";
const FRAME = "#c19a5b";
const PAPER = ["#efdcab", "#f6e8c8"]; // alternating panels, like the lit/shaded folds
const BADGE = "#d9473b";

const MAX_COLUMNS = 3;
const SKEW_DEG = 6; // how sharply the panels zigzag
const REVEAL_STEP_MS = 120;
const REVEAL_MAX_MS = 2000;

const SPECKLE: CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(110,75,30,0.10) 1px, transparent 1.2px)",
  backgroundSize: "13px 13px",
};

/**
 * Splits rules into up to 3 panels. Panels fill left -> right and each panel
 * reads top -> bottom. Sizes stay balanced (7 rules -> 3/2/2, 4 -> 2/1/1).
 */
function splitIntoColumns(rules: Rule[]): Rule[][] {
  const count = Math.min(MAX_COLUMNS, rules.length);
  const base = Math.floor(rules.length / count);
  const extra = rules.length % count;

  const columns: Rule[][] = [];
  let cursor = 0;
  for (let c = 0; c < count; c++) {
    const size = base + (c < extra ? 1 : 0);
    columns.push(rules.slice(cursor, cursor + size));
    cursor += size;
  }
  return columns;
}

/** Zigzag like the folded map: left leans one way, middle the other, right again. */
const SKEW_CLASS = [
  "md:[transform:skewY(6deg)]",
  "md:[transform:skewY(-6deg)]",
  "md:[transform:skewY(6deg)]",
];

const GRID_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

/** Opens outward from the middle fold. */
function originFor(col: number, count: number): string {
  if (count === 1) return "origin-center";
  if (col === 0) return "origin-right";
  if (col === count - 1) return "origin-left";
  return "origin-center";
}

export default function RulesShowcase({ game }: { game: Game }) {
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  // Unfold once, when the map scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOpen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOpen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rules: Rule[] = [...(game.rules ?? [])].sort(
    (a, b) => a.number - b.number,
  );
  if (rules.length === 0) return null;

  const columns = splitIntoColumns(rules);
  const count = columns.length;
  const revealStep = Math.min(REVEAL_STEP_MS, REVEAL_MAX_MS / rules.length);
  // Reading-order position of each panel's first rule (left panel top -> bottom, then the next).
  const offsets = columns.map((_, i) =>
    columns.slice(0, i).reduce((sum, c) => sum + c.length, 0),
  );

  // Half the vertical shift a skewed panel makes between its two edges.
  // Used as padding so the straight text always sits inside the slanted paper.
  const fold = `calc(100cqw / ${count} * tan(${SKEW_DEG}deg) / 2)`;

  return (
    <section ref={rootRef} className={`${sec} items-center py-16`}>
      <div className="w-full max-w-6xl">
        <p className={eyebrow}>How to play</p>
        <h2
          className={`${grad} ${display.className} mb-10 text-[clamp(2rem,4.5vw,3rem)] tracking-wide`}
        >
          The rules of {game.name}
        </h2>

        <div
          className="[container-type:inline-size]"
          style={{ "--fold": fold } as CSSProperties}
        >
          <div
            className={`grid grid-cols-1 md:py-[var(--fold)] ${GRID_COLS[count]} ${body.className}`}
          >
            {columns.map((column, colIndex) => {
              const first = colIndex === 0;
              const last = colIndex === count - 1;
              const panelDelay = count === 3 && colIndex !== 1 ? 300 : 0;

              return (
                <div
                  key={colIndex}
                  className={[
                    "relative transition-[transform] duration-700 ease-out",
                    originFor(colIndex, count),
                    "motion-reduce:transition-none motion-reduce:[transform:none]",
                    open ? "[transform:scaleX(1)]" : "[transform:scaleX(0)]",
                  ].join(" ")}
                  style={{ transitionDelay: open ? `${panelDelay}ms` : "0ms" }}
                >
                  {/* Paper: slanted frame + paper, drawn behind straight text */}
                  <div
                    aria-hidden
                    className={`absolute inset-0 ${SKEW_CLASS[colIndex % 3]}`}
                    style={{
                      background: FRAME,
                      border: `0 solid ${INK}`,
                      borderWidth: `3px 3px 3px ${first ? 3 : 0}px`,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        ...SPECKLE,
                        backgroundColor: PAPER[colIndex % 2],
                        borderStyle: "solid",
                        borderColor: INK,
                        borderWidth: `2px ${last ? 2 : 0}px 2px ${first ? 2 : 0}px`,
                        top: 7,
                        bottom: 7,
                        left: first ? 7 : 0,
                        right: last ? 7 : 0,
                      }}
                    />
                  </div>

                  <ol className="relative z-10 flex flex-col px-6 py-7 sm:px-8 md:py-[calc(var(--fold)_+_2rem)]">
                    {column.map((rule, rowIndex) => {
                      const order = offsets[colIndex] + rowIndex;
                      const isLastInColumn = rowIndex === column.length - 1;

                      return (
                        <li
                          key={rule.number}
                          className={[
                            "flex gap-4 transition-[opacity,transform] duration-500 ease-out",
                            "motion-reduce:opacity-100 motion-reduce:transition-none motion-reduce:[transform:none]",
                            open
                              ? "opacity-100 [transform:translateY(0)]"
                              : "opacity-0 [transform:translateY(-10px)]",
                          ].join(" ")}
                          style={{
                            transitionDelay: open
                              ? `${panelDelay + 500 + order * revealStep}ms`
                              : "0ms",
                          }}
                        >
                          {/* Number badge + dashed trail to the next rule */}
                          <div className="flex flex-col items-center">
                            <span
                              aria-hidden
                              className={`${display.className} flex size-10 shrink-0 items-center justify-center rounded-full text-lg text-white`}
                              style={{
                                background: BADGE,
                                border: `3px solid ${INK}`,
                                boxShadow: `0 2px 0 ${INK}`,
                              }}
                            >
                              {rule.number}
                            </span>
                            {!isLastInColumn ? (
                              <span
                                aria-hidden
                                className="my-1 min-h-4 w-0 flex-1"
                                style={{
                                  borderLeft: `3px dashed ${INK}`,
                                  opacity: 0.55,
                                }}
                              />
                            ) : null}
                          </div>

                          <div
                            className={`min-w-0 flex-1 ${isLastInColumn ? "" : "pb-7"}`}
                            style={{ color: INK }}
                          >
                            {rule.title ? (
                              <h3
                                className={`${display.className} mb-1 text-xl leading-tight tracking-wide`}
                              >
                                {rule.title}
                              </h3>
                            ) : null}
                            <p
                              className="text-[0.95rem] font-medium leading-snug"
                              style={{ color: "#4a3724" }}
                            >
                              {rule.text}
                            </p>

                            {rule.image ? (
                              <figure
                                className="mt-3 rounded-lg p-1.5"
                                style={{
                                  border: `3px solid ${INK}`,
                                  background: "rgba(255,255,255,0.65)",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rule.image}
                                  alt={
                                    rule.imageCaption || `Rule ${rule.number}`
                                  }
                                  loading="lazy"
                                  className="h-auto max-h-64 w-full rounded object-contain"
                                />
                                {rule.imageCaption ? (
                                  <figcaption
                                    className="mt-1.5 text-center text-xs font-semibold"
                                    style={{ color: "#6b5238" }}
                                  >
                                    {rule.imageCaption}
                                  </figcaption>
                                ) : null}
                              </figure>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
