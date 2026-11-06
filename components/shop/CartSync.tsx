"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchGames,
  selectAllGames,
  selectGamesStatus,
} from "@/store/gamesSlice";
import {
  hydrateCart,
  loadCart,
  pruneCart,
  saveCart,
  selectCartHydrated,
  selectCartItems,
} from "@/store/cartSlice";

/**
 * Keeps the cart in step with the browser and the games list. Renders nothing.
 * - loads the saved cart once,
 * - makes sure the games (and so the prices) are loaded,
 * - saves the cart whenever it changes,
 * - drops games that can no longer be ordered.
 */
export default function CartSync() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const hydrated = useAppSelector(selectCartHydrated);
  const games = useAppSelector(selectAllGames);
  const gamesStatus = useAppSelector(selectGamesStatus);

  useEffect(() => {
    if (!hydrated) dispatch(hydrateCart(loadCart()));
  }, [dispatch, hydrated]);

  useEffect(() => {
    // Does nothing if the games are already loading or loaded.
    void dispatch(fetchGames());
  }, [dispatch]);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [hydrated, items]);

  useEffect(() => {
    if (!hydrated || gamesStatus !== "succeeded") return;
    dispatch(
      pruneCart(
        games.filter((game) => game.price != null).map((game) => game.slug),
      ),
    );
  }, [dispatch, hydrated, gamesStatus, games]);

  return null;
}
