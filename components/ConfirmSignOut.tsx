"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SignOutButton from "@/components/visitor/SignOutButton";
import { btnGhost, btnSolid } from "@/components/ui/classes";

type Props = {
  /** Classes for the trigger button (the one shown in the header/drawer). */
  className?: string;
};

export default function ConfirmSignOut({ className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Escape closes the dialog only (not the mobile drawer behind it),
  // and Tab is kept inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;
        if (e.shiftKey && current === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && current === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Capture phase so this runs before the header's own Escape handler.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Lock page scroll while open, restoring whatever it was before
  // (the mobile drawer may already have it locked).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus the safe option (Cancel) when the dialog opens
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={className}
      >
        Sign out
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center p-4"
            role="presentation"
          >
            {/* Backdrop: click to dismiss (unchanged) */}
            <div
              aria-hidden
              onClick={close}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Panel: much more transparent, with a faint light border */}
            <div
              ref={panelRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="signout-title"
              aria-describedby="signout-desc"
              className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-page/40 p-6 text-center shadow-2xl backdrop-blur-md"
            >
              <h2 id="signout-title" className="mb-2 text-xl font-semibold">
                Sign out?
              </h2>
              <p id="signout-desc" className="mb-6 text-sm text-ink">
                Are you sure you want to sign out?
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={close}
                  className={`${btnGhost} w-full justify-center sm:w-auto`}
                >
                  Cancel
                </button>

                {/* Your existing button: performs the real sign-out */}
                <SignOutButton
                  className={`${btnSolid} w-full justify-center sm:w-auto`}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
