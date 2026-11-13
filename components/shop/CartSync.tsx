"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGames } from "@/store/gamesSlice";
import { loadServerCart } from "@/store/cartSlice";
import { selectVisitorStatus } from "@/store/visitorSlice";

/**
 * Renders nothing. For signed-in visitors it makes sure that
 *  - the games (and so the prices) are loaded, and
 *  - the visitor's saved cart is loaded from the server.
 * Saving the cart happens in the store (see store/index.ts). Both calls do nothing when not needed.
 */
export default function CartSync() {
  const dispatch = useAppDispatch();
  const visitorStatus = useAppSelector(selectVisitorStatus);

  useEffect(() => {
    if (visitorStatus !== "signedIn") return;
    void dispatch(fetchGames());
    void dispatch(loadServerCart());
  }, [dispatch, visitorStatus]);

  return null;
}
