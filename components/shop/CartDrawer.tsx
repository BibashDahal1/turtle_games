"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { btnGhost, btnSolid } from "@/components/ui/classes";
import { formatMoney } from "@/lib/money";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchGames,
  selectGamesError,
  selectGamesStatus,
} from "@/store/gamesSlice";
import {
  MAX_QUANTITY_PER_GAME,
  closeCart,
  dismissOrder,
  removeFromCart,
  selectCartItems,
  selectCartLines,
  selectCartOpen,
  selectCartTotal,
  selectLastContact,
  selectLastOrder,
  setQuantity,
} from "@/store/cartSlice";
import type { OrderConfirmation } from "@/store/cartSlice";

import OrderForm from "./OrderForm";

type Step = "cart" | "details";

function Confirmation({
  order,
  contact,
  onClose,
}: {
  order: OrderConfirmation;
  contact: { email: string; phone: string } | null;
  onClose: () => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold">Order received</h2>
      <p className="text-sm text-ink/85">
        Your reference is{" "}
        <strong className="font-mono text-base tracking-wide">
          {order.reference}
        </strong>
        . Please keep it.
      </p>

      <div
        role="status"
        className="mb-5 mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
      >
        <p className="mb-1 font-semibold">Your order is not confirmed yet.</p>
        <p className="text-ink/85">
          Please wait for our call or email to confirm your order and arrange
          payment and delivery.
          {contact ? (
            <>
              {" "}
              We will contact you on <strong>{contact.phone}</strong> or at{" "}
              <strong>{contact.email}</strong>.
            </>
          ) : null}{" "}
          Keep your phone nearby and check your email, including the spam
          folder.
        </p>
      </div>

      <ul className="mb-4 divide-y divide-accent/20 text-sm">
        {order.items.map((item) => (
          <li
            key={item.name}
            className="flex items-start justify-between gap-3 py-2"
          >
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="shrink-0">
              {formatMoney(item.lineTotal, order.currency)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mb-6 flex justify-between text-base font-bold">
        <span>Total</span>
        <span>{formatMoney(order.total, order.currency)}</span>
      </p>

      <button type="button" onClick={onClose} className={btnSolid}>
        Close
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectCartOpen);
  const lines = useAppSelector(selectCartLines);
  const total = useAppSelector(selectCartTotal);
  const lastOrder = useAppSelector(selectLastOrder);
  const lastContact = useAppSelector(selectLastContact);
  const items = useAppSelector(selectCartItems);
  const gamesStatus = useAppSelector(selectGamesStatus);
  const gamesError = useAppSelector(selectGamesError);

  // Items are in the cart but their game details (name, price) are not available yet.
  const waitingForGames = items.length > 0 && lines.length === 0;
  const loadingDetails =
    waitingForGames && (gamesStatus === "idle" || gamesStatus === "loading");
  const detailsFailed = waitingForGames && gamesStatus === "failed";
  const [step, setStep] = useState<Step>("cart");
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    dispatch(closeCart());
    dispatch(dismissOrder());
    setStep("cart");
  }, [dispatch]);

  // While open: lock page scroll, close on Escape, move focus in, and give focus back afterwards.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, close]);

  // Opening the cart makes sure the games (and so the prices) are loaded. Does nothing if they are.
  useEffect(() => {
    if (open) void dispatch(fetchGames());
  }, [open, dispatch]);

  if (!open) return null;

  // If the cart empties while on the details step (for example a game was withdrawn), go back.
  const activeStep: Step = lines.length === 0 ? "cart" : step;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/25"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        tabIndex={-1}
        className="h-full w-full max-w-lg overflow-y-auto border-l border-accent/30 bg-page/45 p-5 text-ink shadow-2xl outline-none backdrop-blur-2xl backdrop-saturate-150 sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Your cart
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full px-3 py-1 text-lg leading-none hover:bg-accent/10"
          >
            ×
          </button>
        </div>

        {lastOrder ? (
          <Confirmation
            order={lastOrder}
            contact={lastContact}
            onClose={close}
          />
        ) : activeStep === "details" ? (
          <OrderForm onBack={() => setStep("cart")} />
        ) : loadingDetails ? (
          <p role="status" className="text-sm text-ink/85">
            Loading your cart…
          </p>
        ) : detailsFailed ? (
          <div>
            <p role="alert" className="mb-4 text-sm text-red-400">
              {gamesError ?? "Could not load your cart details."}
            </p>
            <button
              type="button"
              onClick={() => void dispatch(fetchGames())}
              className={btnSolid}
            >
              Try again
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div>
            <p className="mb-5 text-sm text-ink/85">Your cart is empty.</p>
            <button type="button" onClick={close} className={btnGhost}>
              Keep browsing
            </button>
          </div>
        ) : (
          <div>
            <ul className="divide-y divide-accent/20">
              {lines.map((line) => (
                <li key={line.game.slug} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{line.game.name}</p>
                      <p className="text-xs text-muted">
                        {formatMoney(line.unitPrice, line.game.currency)} each
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatMoney(line.lineTotal, line.game.currency)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`One less ${line.game.name}`}
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          dispatch(
                            setQuantity({
                              slug: line.game.slug,
                              quantity: line.quantity - 1,
                            }),
                          )
                        }
                        className="size-8 rounded-full border border-accent/40 text-lg leading-none disabled:opacity-40"
                      >
                        −
                      </button>
                      <span
                        className="w-8 text-center text-sm font-semibold"
                        aria-live="polite"
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`One more ${line.game.name}`}
                        disabled={line.quantity >= MAX_QUANTITY_PER_GAME}
                        onClick={() =>
                          dispatch(
                            setQuantity({
                              slug: line.game.slug,
                              quantity: line.quantity + 1,
                            }),
                          )
                        }
                        className="size-8 rounded-full border border-accent/40 text-lg leading-none disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => dispatch(removeFromCart(line.game.slug))}
                      className="text-xs text-muted underline underline-offset-4 hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-2 flex justify-between border-t border-accent/30 pt-4 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(total.amount, total.currency)}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              No payment is taken here. After you order, please wait for our
              call or email to confirm your order and arrange payment and
              delivery.
            </p>

            <button
              type="button"
              onClick={() => setStep("details")}
              className={`${btnSolid} mt-6 w-full`}
            >
              Continue to delivery details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
