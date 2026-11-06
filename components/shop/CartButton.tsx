"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openCart, selectCartCount } from "@/store/cartSlice";

/** Header button that opens the cart and shows how many boxes are in it. */
export default function CartButton({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);

  return (
    <button
      type="button"
      className={className}
      onClick={() => dispatch(openCart())}
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      Cart
      {count > 0 && (
        <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.65rem] font-bold text-onaccent">
          {count}
        </span>
      )}
    </button>
  );
}
