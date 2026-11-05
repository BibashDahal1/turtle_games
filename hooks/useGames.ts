import { useEffect } from "react";

import {
  fetchGames,
  selectAllGames,
  selectGamesError,
  selectGamesStatus,
} from "@/store/gamesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/** All published games. Loads them from the API the first time it is used. */
export function useGames() {
  const dispatch = useAppDispatch();
  const games = useAppSelector(selectAllGames);
  const status = useAppSelector(selectGamesStatus);
  const error = useAppSelector(selectGamesError);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchGames());
    }
  }, [status, dispatch]);

  return {
    games,
    status,
    error,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    retry: () => dispatch(fetchGames()),
  };
}

/** One game by its slug (the /games/<slug> page). */
export function useGame(slug: string | undefined) {
  const state = useGames();
  const game = state.games.find((g) => g.slug === slug);

  return {
    ...state,
    game,
    notFound: state.status === "succeeded" && !game,
  };
}
