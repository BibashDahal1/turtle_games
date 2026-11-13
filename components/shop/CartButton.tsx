"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openCart, selectCartCount } from "@/store/cartSlice";
import { selectVisitorStatus } from "@/store/visitorSlice";
import { useVisitorAuth } from "@/components/visitor/VisitorAuthProvider";

/** Header button that opens the cart when signed in and otherwise prompts sign-in. */
export default function CartButton({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);
  const visitorStatus = useAppSelector(selectVisitorStatus);
  const { openSignIn } = useVisitorAuth();
  const signedIn = visitorStatus === "signedIn";

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (signedIn) dispatch(openCart());
        else openSignIn(undefined, () => dispatch(openCart()));
      }}
      aria-label={
        signedIn
          ? `Open cart, ${count} ${count === 1 ? "item" : "items"}`
          : "Sign in to access your cart"
      }
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
