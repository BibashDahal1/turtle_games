"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import type { Game, GameRule } from "@/lib/games";

/**
 * Rules of a game. Normally they arrive with the games list; if the list has no `rules` key
 * (stale store or cache), this fetches the single game and uses its rules instead.
 */
export function useGameRules(game: Game): GameRule[] {
  const fromList = game.rules;
  const [fetched, setFetched] = useState<GameRule[] | null>(null);

  useEffect(() => {
    if (fromList !== undefined) return;
    const controller = new AbortController();

    apiGet<Game>(`/games/${encodeURIComponent(game.slug)}/`, controller.signal)
      .then((full) => {
        if (full.rules === undefined) {
          console.warn(
            "[rules] /api/games/<slug>/ has no 'rules' key: the server answering the API is not running the current serializer.",
            Object.keys(full),
          );
        }
        setFetched(full.rules ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.warn("[rules] could not load rules", error);
        setFetched([]);
      });

    return () => controller.abort();
  }, [fromList, game.slug]);

  return fromList ?? fetched ?? [];
}
