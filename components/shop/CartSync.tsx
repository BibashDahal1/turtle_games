"use client";

import { useEffect } from "react";

import { useAppDispatch } from "@/store/hooks";
import { fetchGames } from "@/store/gamesSlice";
import { loadServerCart } from "@/store/cartSlice";

/**
 * Renders nothing. Wherever the cart is used it makes sure that
 *  - the games (and so the prices) are loaded, and
 *  - the visitor's saved cart is loaded from the server.
 * Saving the cart happens in the store (see store/index.ts). Both calls do nothing when not needed.
 */
export default function CartSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(fetchGames());
    void dispatch(loadServerCart());
  }, [dispatch]);

  return null;
}
