"use client";

import { useEffect, useRef, useState } from "react";

import { btnGhost, btnSolid } from "@/components/ui/classes";
import { formatMoney } from "@/lib/money";
import type { Game } from "@/lib/games";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  MAX_QUANTITY_PER_GAME,
  addToCart,
  openCart,
  selectQuantityOf,
} from "@/store/cartSlice";

interface AddToCartButtonProps {
  game: Pick<Game, "slug" | "name" | "price" | "currency">;
  className?: string;
}

/** Shows the price and an "Add to cart" button. Renders nothing for games that cannot be ordered. */
export default function AddToCartButton({
  game,
  className,
}: AddToCartButtonProps) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((state) => selectQuantityOf(state, game.slug));
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (game.price == null) return null;

  const atMax = inCart >= MAX_QUANTITY_PER_GAME;

  function add() {
    dispatch(addToCart({ slug: game.slug }));
    // Show the cart straight away so the buyer sees what was added.
    dispatch(openCart());
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-lg font-extrabold">
        {formatMoney(Number(game.price), game.currency)}
      </span>

      <button
        type="button"
        onClick={add}
        disabled={atMax}
        aria-label={`Add ${game.name} to cart`}
        className={`${className ?? btnSolid} disabled:opacity-60`}
      >
        {atMax ? "Maximum in cart" : added ? "Added ✓" : "Add to cart"}
      </button>

      {inCart > 0 && (
        <button
          type="button"
          onClick={() => dispatch(openCart())}
          className={`${btnGhost} !px-4 !py-2 !text-xs`}
        >
          {inCart} in cart · View cart
        </button>
      )}
    </div>
  );
}
