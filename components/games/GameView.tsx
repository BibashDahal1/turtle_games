"use client";

import { notFound } from "next/navigation";
import { useEffect } from "react";
import BoxViewer from "@/components/games/BoxViewer";
import HomeLink from "@/components/ui/HomeLink";
import {
  btnGhost,
  btnSolid,
  eyebrow,
  lead,
  sec,
  title,
} from "@/components/ui/classes";
import { useGame } from "@/hooks/useGames";
import GameTabs from "@/components/games/GameTabs";

/**
 * The game page content. The game comes from the Redux store, which is filled from the
 * Django API (GET /api/games/). If the games were already loaded on the home page, this shows instantly.
 */
export default function GameView({ slug }: { slug: string }) {
  const {
    game,
    isLoading,
    isError,
    error,
    retry,
    notFound: missing,
  } = useGame(slug);

  useEffect(() => {
    if (game) document.title = `${game.name} | Turtle Games`;
  }, [game]);

  if (isLoading) return <GameFallback />;
  if (isError) return <GameError message={error} onRetry={retry} />;
  if (missing || !game) notFound();
  console.log("RULES AT GAMEVIEW:", game.rules, Object.keys(game));

  return (
    <>
      <section
        className={`${sec} min-h-svh gap-10 py-28 md:flex-row md:items-center md:justify-between`}
      >
        {/* text column: half the width on tablets and desktops, so the 3D box gets the other half */}
        <div className="max-w-[560px] md:w-1/2">
          <HomeLink
            hash="games"
            className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink"
          >
            ← Back to all games
          </HomeLink>
          <p className={eyebrow}>Turtle Games</p>
          <h1 className={title}>{game.name}</h1>
          <p className={lead}>{game.tagline}</p>

          <ul className="mb-8 flex gap-8 text-xs text-muted">
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.players}</b>
              <span>Players</span>
            </li>
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.minutes}</b>
              <span>Min</span>
            </li>
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.age}</b>
              <span>Ages</span>
            </li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <HomeLink hash="cta" className={btnSolid}>
              Get the Game
            </HomeLink>
            <HomeLink hash="games" className={btnGhost}>
              More games
            </HomeLink>
          </div>
        </div>

        {/* the 3D box: hovers over a platform, drag to rotate */}
        <BoxViewer game={game} />
      </section>

      {/* the cards inside the box: flip them to read what they do (renders nothing if the game has no cards) */}
      <GameTabs game={game} />
    </>
  );
}

/** Same layout as the hero, with grey placeholders, shown while the game loads. */
export function GameFallback() {
  return (
    <section
      aria-busy="true"
      className={`${sec} min-h-svh gap-10 py-28 md:flex-row md:items-center md:justify-between`}
    >
      <div className="w-full max-w-[560px] animate-pulse md:w-1/2" aria-hidden>
        <div className="mb-6 h-4 w-40 rounded bg-ink/10" />
        <div className="mb-4 h-3 w-28 rounded bg-ink/10" />
        <div className="mb-4 h-12 w-3/4 rounded bg-ink/10" />
        <div className="mb-8 h-4 w-2/3 rounded bg-ink/10" />
        <div className="h-12 w-44 rounded-full bg-ink/10" />
      </div>
      <div
        className="h-80 w-full max-w-[340px] animate-pulse rounded-2xl bg-ink/5 md:w-1/2 md:max-w-none md:flex-none"
        aria-hidden
      />
    </section>
  );
}

/** Shown when the API cannot be reached or returns an error. */
function GameError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <section className={`${sec} min-h-svh gap-10 py-28`}>
      <div className="max-w-[560px]">
        <HomeLink
          hash="games"
          className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink"
        >
          ← Back to all games
        </HomeLink>
        <h1 className={title}>Couldn&apos;t load this game</h1>
        <p className={lead}>
          {message ?? "Something went wrong."} Please try again.
        </p>
        <button type="button" onClick={onRetry} className={btnSolid}>
          Try again
        </button>
      </div>
    </section>
  );
}
