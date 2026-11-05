"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Game, GameCardInfo } from "@/lib/games";
import { eyebrow, lead, sec, title } from "@/components/ui/classes";

/** width / height of the card artwork (368 x 516 px) */
const RATIO = 368 / 516;
/** rounded corners that match the artwork */
const CORNERS = "6% / 4.3%";

/**
 * "Inside the box": every card of the game as a real 3D card.
 *  - FRONT: the card artwork.
 *  - BACK:  the blurred thumb print with the card's description on top.
 * Press / tap a card (or Enter / Space) to flip it. On a mouse it also tilts towards the pointer.
 *
 * The size is ONE css variable (--w) that changes with the screen. Everything inside the card
 * (text, spacing) is sized from --w, so the card looks the same at every size.
 */
export default function CardShowcase({ game }: { game: Game }) {
  const cards = game.cards ?? [];
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="cards-heading" className={`${sec} gap-10 py-16`}>
      <div className="max-w-[560px]">
        <p className={eyebrow}>Inside the box</p>
        <h2 id="cards-heading" className={title}>
          Meet the cards
        </h2>
        <p className={lead}>Tap a card to flip it and read what it does.</p>
      </div>

      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-12 p-0">
        {cards.map((card, i) => (
          <li key={`${card.name}-${i}`}>
            <FlipCard game={game} card={card} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlipCard({
  game,
  card,
  index,
}: {
  game: Game;
  card: GameCardInfo;
  index: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = tilt.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty(
      "--px",
      (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3),
    );
    el.style.setProperty(
      "--py",
      (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3),
    );
  };
  const onLeave = () => {
    tilt.current?.style.setProperty("--px", "0");
    tilt.current?.style.setProperty("--py", "0");
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: CORNERS,
  };
  /** font sizes and spacing are fractions of the card width */
  const w = (f: number) => `calc(var(--w) * ${f})`;

  return (
    <div
      // card width: one column on phones, then a fixed size that lets three cards share a row on desktop
      className="relative [--w:min(74vw,280px)] sm:[--w:230px] md:[--w:215px] lg:[--w:260px]"
      style={{
        width: "var(--w)",
        aspectRatio: String(RATIO),
        perspective: "1100px",
      }}
    >
      {/* soft shadow on the floor (kept separate: a filter on the card itself would flatten the 3D) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-5 left-[10%] right-[10%] h-4 rounded-full bg-black/45 blur-md"
      />

      <div
        ref={tilt}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`${card.name} card. ${flipped ? "Showing what it does. Press to show the card." : "Press to read what it does."}`}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={onKey}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={`absolute inset-0 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
          flipped ? "" : "animate-bob motion-reduce:animate-none"
        }`}
        style={{
          borderRadius: CORNERS,
          transformStyle: "preserve-3d",
          transform:
            "rotateX(calc(var(--py, 0) * -9deg)) rotateY(calc(var(--px, 0) * 10deg))",
          transition: "transform 0.15s ease-out",
          animationDelay: `${index * 0.6}s`,
        }}
      >
        {/* the part that flips */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.4,0.2,0.2,1)] motion-reduce:transition-none"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
          }}
        >
          {/* FRONT: the artwork */}
          <div style={face} aria-hidden={flipped}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={`${card.name} card artwork`}
              draggable={false}
              className="block h-full w-full"
            />
          </div>

          {/* BACK: blurred thumb print + description */}
          <div
            style={{
              ...face,
              transform: "rotateY(180deg)",
              overflow: "hidden",
              backgroundColor: game.color2,
            }}
            aria-hidden={!flipped}
          >
            {game.cardBack && (
              // scaled up a little so the blur never shows a soft edge
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={game.cardBack}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full scale-125 object-cover blur-[5px]"
              />
            )}
            {/* dark veil: keeps the white text readable on any artwork */}
            <span className="absolute inset-0 bg-black/60" />

            <div
              className="relative flex h-full flex-col items-center justify-center text-center text-white"
              style={{ padding: `${w(0.08)} ${w(0.09)}`, gap: w(0.035) }}
            >
              {card.nameNative && (
                <p
                  lang="ne"
                  className="font-bold leading-tight"
                  style={{ fontSize: w(0.1), color: game.accent }}
                >
                  {card.nameNative}
                </p>
              )}
              <p
                className="font-semibold tracking-[0.12em] uppercase"
                style={{ fontSize: w(0.05) }}
              >
                {card.name}
              </p>
              <span
                className="block h-px w-1/3"
                style={{ backgroundColor: game.accent, opacity: 0.6 }}
              />
              <p
                className="leading-snug text-white/90"
                style={{ fontSize: w(0.057) }}
              >
                {card.description}
              </p>
              {card.quote && (
                <p
                  className="leading-snug text-white/75 italic"
                  style={{ fontSize: w(0.048) }}
                >
                  <span lang="ne">“{card.quote}”</span>
                  {card.quoteEn && (
                    <span className="mt-1 block not-italic text-white/60">
                      {card.quoteEn}
                    </span>
                  )}
                </p>
              )}
              <p
                className="tracking-[0.18em] text-white/55 uppercase"
                style={{ fontSize: w(0.036), marginTop: w(0.01) }}
              >
                Tap to flip back
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
