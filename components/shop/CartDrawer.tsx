"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  leaveSavedView,
  loadServerCart,
  removeFromCart,
  selectCartDetails,
  selectCartItems,
  selectCartLines,
  selectCartOpen,
  selectCartSaveError,
  selectCartServerStatus,
  selectCartTotal,
  selectShowSaved,
  selectUnavailableItems,
  setQuantity,
} from "@/store/cartSlice";
import type { CartDetails } from "@/store/cartSlice";

import CartDetailsForm from "./CartDetailsForm";

type Step = "cart" | "details";

const WAIT_TEXT =
  "Please wait for our call or email to confirm your cart and arrange payment and delivery.";

function Unavailable({
  items,
  onRemove,
}: {
  items: { slug: string; name: string }[];
  onRemove: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="my-4 rounded-xl border border-accent/30 p-3 text-xs">
      <p className="mb-2 font-semibold">
        No price available right now (left out of your total):
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.slug}
            className="flex items-center justify-between gap-3"
          >
            <span>{item.name}</span>
            <button
              type="button"
              onClick={() => onRemove(item.slug)}
              className="underline underline-offset-4"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailsSummary({
  details,
  onEdit,
}: {
  details: CartDetails;
  onEdit: () => void;
}) {
  const name = [details.firstName, details.middleName, details.lastName]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      role="status"
      className="mt-5 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
    >
      <p className="mb-1 font-semibold">Your details are with us.</p>
      <p className="mb-3 text-ink/85">{WAIT_TEXT}</p>
      <p className="text-xs text-ink/85">
        {name}
        <br />
        {details.phone} · {details.email}
        <br />
        {details.address}, {details.city}, {details.country}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 text-xs underline underline-offset-4"
      >
        Edit details
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectCartOpen);
  const lines = useAppSelector(selectCartLines);
  const total = useAppSelector(selectCartTotal);
  const details = useAppSelector(selectCartDetails);
  const showSaved = useAppSelector(selectShowSaved);
  const items = useAppSelector(selectCartItems);
  const gamesStatus = useAppSelector(selectGamesStatus);
  const gamesError = useAppSelector(selectGamesError);
  const unavailable = useAppSelector(selectUnavailableItems);
  const serverStatus = useAppSelector(selectCartServerStatus);
  const saveError = useAppSelector(selectCartSaveError);
  const [step, setStep] = useState<Step>("cart");
  const panelRef = useRef<HTMLDivElement>(null);

  // Items are in the cart but their game details (name, price) are not available yet.
  const waitingForGames = items.length > 0 && lines.length === 0;
  const loadingDetails =
    (waitingForGames &&
      (gamesStatus === "idle" || gamesStatus === "loading")) ||
    (items.length === 0 &&
      (serverStatus === "idle" || serverStatus === "loading"));
  const detailsFailed = waitingForGames && gamesStatus === "failed";

  const close = useCallback(() => {
    dispatch(closeCart());
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

  // Opening the cart refreshes it from the server and makes sure the games (prices) are loaded.
  useEffect(() => {
    if (open) {
      void dispatch(fetchGames());
      void dispatch(loadServerCart({ force: true }));
    }
  }, [open, dispatch]);

  if (!open) return null;

  // If the cart empties while on the details step, go back.
  const activeStep: Step = lines.length === 0 ? "cart" : step;

  return createPortal(
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
        className="h-full w-full max-w-lg overflow-y-auto border-l border-accent/30 bg-page/45 p-5 text-ink shadow-2xl outline-none backdrop-blur-2xl backdrop-saturate-150 transform-gpu sm:p-7"
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

        {serverStatus === "failed" && (
          <p role="status" className="mb-4 text-xs text-muted">
            Your saved cart could not be loaded.{" "}
            <button
              type="button"
              onClick={() => void dispatch(loadServerCart())}
              className="underline underline-offset-4"
            >
              Try again
            </button>
          </p>
        )}

        {saveError && serverStatus !== "failed" && (
          <p role="status" className="mb-4 text-xs text-muted">
            That change could not be saved to your account ({saveError}), so it
            was undone. Please try again.
          </p>
        )}

        {showSaved && details ? (
          // Right after saving the details
          <div>
            <h2 className="mb-2 text-xl font-bold">Details saved</h2>
            <div
              role="status"
              className="mb-5 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
            >
              <p className="mb-1 font-semibold">Your cart is with us.</p>
              <p className="text-ink/85">
                {WAIT_TEXT} We will contact you on{" "}
                <strong>{details.phone}</strong> or at{" "}
                <strong>{details.email}</strong>. Keep your phone nearby and
                check your email, including the spam folder.
              </p>
            </div>

            <ul className="mb-4 divide-y divide-accent/20 text-sm">
              {lines.map((line) => (
                <li
                  key={line.game.slug}
                  className="flex items-start justify-between gap-3 py-2"
                >
                  <span>
                    {line.game.name} × {line.quantity}
                  </span>
                  <span className="shrink-0">
                    {formatMoney(line.lineTotal, line.game.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mb-6 flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(total.amount, total.currency)}</span>
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  dispatch(leaveSavedView());
                  setStep("details");
                }}
                className={btnGhost}
              >
                Edit details
              </button>
              <button type="button" onClick={close} className={btnSolid}>
                Close
              </button>
            </div>
          </div>
        ) : activeStep === "details" ? (
          <CartDetailsForm onBack={() => setStep("cart")} />
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
            <p className="mb-2 text-sm text-ink/85">
              {unavailable.length > 0
                ? "None of the games in your cart have a price right now."
                : "Your cart is empty."}
            </p>
            <Unavailable
              items={unavailable}
              onRemove={(slug) => void dispatch(removeFromCart(slug))}
            />
            <button
              type="button"
              onClick={close}
              className={`${btnGhost} mt-3`}
            >
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
                          void dispatch(
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
                          void dispatch(
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
                      onClick={() =>
                        void dispatch(removeFromCart(line.game.slug))
                      }
                      className="text-xs text-muted underline underline-offset-4 hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <Unavailable
              items={unavailable}
              onRemove={(slug) => void dispatch(removeFromCart(slug))}
            />

            <p className="mt-2 flex justify-between border-t border-accent/30 pt-4 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(total.amount, total.currency)}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              No payment is taken here. We contact you by phone or email to
              confirm your cart and arrange payment and delivery.
            </p>

            {details ? (
              <DetailsSummary
                details={details}
                onEdit={() => setStep("details")}
              />
            ) : (
              <button
                type="button"
                onClick={() => setStep("details")}
                className={`${btnSolid} mt-6 w-full`}
              >
                Add delivery details so we can contact you
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
