"use client";

import { Suspense } from "react";
import GameCarousel from "@/components/games/GameCarousel";
import { btnSolid, eyebrow, lead, sec, title } from "@/components/ui/classes";
import { useGames } from "@/hooks/useGames";
import StoreProvider from "@/store/StoreProvider";

/**
 * Section 2 — "Our Games". Nav anchor: #games
 * The games come from the Django API (see hooks/useGames.ts). Add or edit a game in the
 * Django admin and it shows up here.
 *
 * The heading is static. Only the list sits inside <Suspense> + <StoreProvider>.
 */
export default function TurtleGames() {
  return (
    <section id="games" className={`${sec} min-h-svh gap-4 py-20`}>
      <div data-reveal className="max-w-[560px]">
        <p className={eyebrow}>Our Games</p>
        <h2 className={title}>Pick Your Next Adventure</h2>
        <p className={lead}>
          Card and board games made by Turtle Games. Slide through the shelf,
          then tap a box to open its game.
        </p>
      </div>

      <div data-reveal className="w-full min-w-0">
        <Suspense fallback={<GamesSkeleton />}>
          <StoreProvider>
            <GamesList />
          </StoreProvider>
        </Suspense>
      </div>
    </section>
  );
}

function GamesList() {
  const { games, isLoading, isError, error, retry } = useGames();

  if (isLoading) return <GamesSkeleton />;

  if (isError) {
    return (
      <div className="max-w-[560px]">
        <p className={lead}>
          Couldn&apos;t load the games: {error ?? "something went wrong"}
        </p>
        <button type="button" onClick={retry} className={btnSolid}>
          Try again
        </button>
      </div>
    );
  }

  if (games.length === 0)
    return <p className={lead}>No games yet. Check back soon.</p>;

  return <GameCarousel games={games} />;
}

/** Grey placeholder boxes shown while the games load. */
function GamesSkeleton() {
  return (
    <div aria-busy="true" className="flex gap-6 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-80 w-56 shrink-0 animate-pulse rounded-2xl bg-ink/5"
          aria-hidden
        />
      ))}
    </div>
  );
}
